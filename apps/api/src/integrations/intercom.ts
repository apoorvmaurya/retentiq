import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { db, schema } from '../lib/db.js';
import { eq } from 'drizzle-orm';

const router = Router();

router.post('/webhook', async (req: Request, res: Response): Promise<void> => {
  const sig = req.headers['x-hub-signature'] as string;
  const clientSecret = process.env.INTERCOM_CLIENT_SECRET || '';

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

    let customer = await db
      .select()
      .from(schema.customers)
      .where(eq(schema.customers.email, email))
      .limit(1)
      .then((rows) => rows[0]);

    if (!customer && process.env.NODE_ENV !== 'production') {
      const allCustomers = await db.select().from(schema.customers).limit(1);
      if (allCustomers.length > 0) {
        customer = allCustomers[0];
      }
    }

    const orgId = customer ? customer.orgId : '00000000-0000-0000-0000-000000000000';

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
});

export default router;
