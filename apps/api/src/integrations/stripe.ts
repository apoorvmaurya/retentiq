import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { db, schema } from '../lib/db.js';
import { eq, and } from 'drizzle-orm';
import { decryptConfig } from '../lib/crypto.js';
const router = Router();

const handleWebhook = async (req: Request, res: Response): Promise<void> => {
  const sig = req.headers['stripe-signature'] as string;
  const orgId = req.params.orgId;

  let stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'mock_secret_key';
  let webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

  if (orgId) {
    try {
      const integration = await db
        .select()
        .from(schema.integrations)
        .where(
          and(
            eq(schema.integrations.orgId, orgId as string),
            eq(schema.integrations.provider, 'stripe'),
          ),
        )
        .limit(1)
        .then((rows) => rows[0]);

      if (integration && integration.config) {
        const decryptedConfig = decryptConfig(integration.config as Record<string, any>);
        if (decryptedConfig.stripeSecretKey) {
          stripeSecretKey = decryptedConfig.stripeSecretKey;
        }
        if (decryptedConfig.stripeWebhookSecret) {
          webhookSecret = decryptedConfig.stripeWebhookSecret;
        }
      }
    } catch (err: any) {
      console.error('[Stripe webhook] Error resolving integration config:', err.message);
    }
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2025-01-27.acacia' as any,
  });

  let event: any;

  try {
    if (process.env.NODE_ENV === 'production') {
      if (!sig || !webhookSecret) {
        res
          .status(400)
          .send('Webhook Error: Missing stripe-signature or webhook secret configuration');
        return;
      }
      event = stripe.webhooks.constructEvent((req as any).rawBody, sig, webhookSecret);
    } else {
      if (sig && webhookSecret) {
        event = stripe.webhooks.constructEvent((req as any).rawBody, sig, webhookSecret);
      } else {
        event = req.body;
        console.warn(
          '[Stripe webhook] Bypassing signature verification (missing signature or webhook secret).',
        );
      }
    }
  } catch (err: any) {
    console.error(`[Stripe webhook] Error verifying signature: ${err.message}`);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  console.log(`[Stripe webhook] Received event type: ${event.type}`);

  try {
    let customerId: string | null = null;
    let email: string | null = null;
    let subscription: any = null;
    let invoice: any = null;

    if (event.type.startsWith('customer.subscription')) {
      subscription = event.data.object;
      email = subscription.customer_email || null;
      customerId =
        ((subscription.metadata?.customer_id || subscription.metadata?.customerId) as string) ||
        null;
    } else if (event.type.startsWith('invoice')) {
      invoice = event.data.object;
      email = invoice.customer_email || null;
      customerId = invoice.subscription?.metadata?.customer_id || null;
    }

    let customer: any = null;
    if (customerId) {
      customer = await db
        .select()
        .from(schema.customers)
        .where(eq(schema.customers.id, customerId))
        .limit(1)
        .then((rows) => rows[0]);
    }

    if (!customer && email) {
      customer = await db
        .select()
        .from(schema.customers)
        .where(eq(schema.customers.email, email))
        .limit(1)
        .then((rows) => rows[0]);
    }

    const orgId = (req.params.orgId as string | undefined) || customer?.orgId;

    if (!orgId) {
      console.warn(
        '[Stripe webhook] Ignored event: could not resolve tenant organization (customer not found and no orgId in path).',
      );
      res.status(400).json({ error: 'Tenant organization could not be resolved.' });
      return;
    }

    await db.insert(schema.jobs).values({
      orgId,
      type: 'stripe',
      payload: event,
      status: 'queued',
    });

    res.json({ received: true, queued: true });
  } catch (err: any) {
    console.error('[Stripe webhook error]', err);
    res.status(500).json({ error: err.message });
  }
};

router.post('/webhook', handleWebhook);
router.post('/webhook/:orgId', handleWebhook);

export default router;
