import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { db, schema } from '../lib/db.js';
import { eq, and } from 'drizzle-orm';
import { decryptConfig } from '../lib/crypto.js';

const router = Router();

const handleWebhook = async (req: Request, res: Response): Promise<void> => {
  const sig = req.headers['x-hub-signature'] as string;
  const orgId = req.params.orgId;

  let clientSecret = process.env.INTERCOM_CLIENT_SECRET || '';

  if (orgId) {
    try {
      const integration = await db
        .select()
        .from(schema.integrations)
        .where(
          and(
            eq(schema.integrations.orgId, orgId as string),
            eq(schema.integrations.provider, 'intercom'),
          ),
        )
        .limit(1)
        .then((rows) => rows[0]);

      if (integration && integration.config) {
        const decryptedConfig = decryptConfig(integration.config as Record<string, any>);
        if (decryptedConfig.intercomClientSecret) {
          clientSecret = decryptedConfig.intercomClientSecret;
        }
      }
    } catch (err: any) {
      console.error('[Intercom webhook] Error resolving integration config:', err.message);
    }
  }

  try {
    if (process.env.NODE_ENV === 'production') {
      if (!sig || !clientSecret) {
        res.status(401).send('Signatures did not match / missing secret keys');
        return;
      }
      const rawBody = (req as any).rawBody || '';
      const computedSig =
        'sha256=' + crypto.createHmac('sha256', clientSecret).update(rawBody).digest('hex');

      if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(computedSig))) {
        res.status(401).send('Signatures did not match');
        return;
      }
    } else {
      if (sig && clientSecret) {
        const rawBody = (req as any).rawBody || '';
        const computedSig =
          'sha256=' + crypto.createHmac('sha256', clientSecret).update(rawBody).digest('hex');

        if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(computedSig))) {
          res.status(401).send('Signatures did not match');
          return;
        }
      } else {
        console.warn(
          '[Intercom webhook] Bypassing signature verification (missing header or client secret).',
        );
      }
    }
  } catch (err: any) {
    console.error(`[Intercom webhook] Signature verification failed: ${err.message}`);
    res.status(400).send(`Webhook signature check failed: ${err.message}`);
    return;
  }

  const payload = req.body;
  console.log(`[Intercom webhook] Received event: ${payload.topic || payload.type}`);

  try {
    const item = payload.data?.item || {};
    const email = item.user?.email || item.contacts?.[0]?.email || '';

    const customer = await db
      .select()
      .from(schema.customers)
      .where(eq(schema.customers.email, email))
      .limit(1)
      .then((rows) => rows[0]);

    const orgId = (req.params.orgId as string | undefined) || customer?.orgId;

    if (!orgId) {
      console.warn(
        '[Intercom webhook] Ignored event: could not resolve tenant organization (customer not found and no orgId in path).',
      );
      res.status(400).json({ error: 'Tenant organization could not be resolved.' });
      return;
    }

    await db.insert(schema.jobs).values({
      orgId,
      type: 'intercom',
      payload,
      status: 'queued',
    });

    res.json({ received: true, queued: true });
  } catch (err: any) {
    console.error(`[Intercom webhook error] ${err.message}`);
    res.status(500).json({ error: err.message });
  }
};

router.post('/webhook', handleWebhook);
router.post('/webhook/:orgId', handleWebhook);

export default router;
