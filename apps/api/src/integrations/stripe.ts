import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { db, schema } from '../lib/db.js';
import { eq } from 'drizzle-orm';
import { computeAndTriggerRescore } from '../lib/featureEngine.js';

const router = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'mock_secret_key', {
  apiVersion: '2025-01-27.acacia' as any,
});

router.post('/webhook', async (req: Request, res: Response): Promise<void> => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

  let event: any;

  try {
    if (process.env.NODE_ENV === 'production') {
      if (!sig || !webhookSecret) {
        res.status(400).send('Webhook Error: Missing stripe-signature or STRIPE_WEBHOOK_SECRET');
        return;
      }
      event = stripe.webhooks.constructEvent((req as any).rawBody, sig, webhookSecret);
    } else {
      if (sig && webhookSecret) {
        event = stripe.webhooks.constructEvent((req as any).rawBody, sig, webhookSecret);
      } else {
        event = req.body;
        console.warn('[Stripe webhook] Bypassing signature verification (missing signature or webhook secret).');
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
      customerId = (subscription.metadata?.customer_id || subscription.metadata?.customerId) as string || null;
    } else if (event.type.startsWith('invoice')) {
      invoice = event.data.object;
      email = invoice.customer_email || null;
      customerId = invoice.subscription?.metadata?.customer_id || null;
    }

    // Lookup customer in database
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

    // Development fallback if testing via Stripe CLI without matching emails (non-production only)
    if (!customer && process.env.NODE_ENV !== 'production') {
      const allCustomers = await db.select().from(schema.customers).limit(1);
      if (allCustomers.length > 0) {
        customer = allCustomers[0];
        console.log(`[Stripe webhook] Customer lookup failed. Using fallback first customer ID: ${customer.id}`);
      }
    }

    if (!customer) {
      console.error('[Stripe webhook] No customers exist in DB to map event to.');
      res.json({ received: true, error: 'No customers available in database' });
      return;
    }

    const customerIdStr = customer.id as string;
    const orgIdStr = customer.orgId as string;

    if (event.type === 'customer.subscription.updated' && subscription) {
      const price = subscription.items?.data?.[0]?.price;
      const mrr = price ? (price.unit_amount ? (price.unit_amount / 100).toFixed(2) : '0.00') : '0.00';
      const planTier = price?.nickname || subscription.plan?.nickname || 'Pro';

      // Update plan_tier + mrr in DB
      await db
        .update(schema.customers)
        .set({
          planTier,
          mrr,
        })
        .where(eq(schema.customers.id, customerIdStr));

      // Create event record
      await db.insert(schema.events).values({
        customerId: customerIdStr,
        orgId: orgIdStr,
        eventType: 'billing_change',
        source: 'stripe',
        payload: {
          from: customer.planTier,
          to: planTier,
          mrr,
        },
        occurredAt: new Date(),
      });

      // Trigger AI rescoring
      await computeAndTriggerRescore(customerIdStr, orgIdStr);
    } else if (event.type === 'customer.subscription.deleted' && subscription) {
      // Mark plan_tier as 'churned'
      await db
        .update(schema.customers)
        .set({
          planTier: 'churned',
          mrr: '0.00',
        })
        .where(eq(schema.customers.id, customerIdStr));

      // Create event record
      await db.insert(schema.events).values({
        customerId: customerIdStr,
        orgId: orgIdStr,
        eventType: 'billing_change',
        source: 'stripe',
        payload: {
          from: customer.planTier,
          to: 'churned',
          mrr: '0.00',
        },
        occurredAt: new Date(),
      });

      // Trigger AI rescoring
      await computeAndTriggerRescore(customerIdStr, orgIdStr);
    } else if (event.type === 'invoice.payment_failed' && invoice) {
      // Create payment_failed event
      await db.insert(schema.events).values({
        customerId: customerIdStr,
        orgId: orgIdStr,
        eventType: 'payment_failed',
        source: 'stripe',
        payload: {
          invoiceId: invoice.id,
          amountDue: invoice.amount_due ? invoice.amount_due / 100 : 0,
        },
        occurredAt: new Date(),
      });

      // Trigger AI rescoring
      await computeAndTriggerRescore(customerIdStr, orgIdStr);
    }

    res.json({ received: true });
  } catch (err: any) {
    console.error('[Stripe webhook error]', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
