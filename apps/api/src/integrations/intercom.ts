import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { db, schema } from '../lib/db.js';
import { eq, and, gte, sql } from 'drizzle-orm';

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
        'sha256=' +
        crypto.createHmac('sha256', clientSecret).update(rawBody).digest('hex');

      if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(computedSig))) {
        res.status(401).send('Signatures did not match');
        return;
      }
    } else {
      if (sig && clientSecret) {
        const rawBody = (req as any).rawBody || '';
        const computedSig =
          'sha256=' +
          crypto.createHmac('sha256', clientSecret).update(rawBody).digest('hex');

        if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(computedSig))) {
          res.status(401).send('Signatures did not match');
          return;
        }
      } else {
        console.warn('[Intercom webhook] Bypassing signature verification (missing header or client secret).');
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
    const topic = payload.topic || payload.type;
    const item = payload.data?.item || {};
    const email = item.user?.email || item.contacts?.[0]?.email || '';

    // Lookup customer in database
    let customer = await db
      .select()
      .from(schema.customers)
      .where(eq(schema.customers.email, email))
      .limit(1)
      .then((rows) => rows[0]);

    if (!customer && process.env.NODE_ENV !== 'production') {
      // Dev fallback: pick first customer
      const allCustomers = await db.select().from(schema.customers).limit(1);
      if (allCustomers.length > 0) {
        customer = allCustomers[0];
        console.log(`[Intercom webhook] Customer lookup failed for ${email}. Fallback customer ID: ${customer.id}`);
      }
    }

    if (!customer) {
      console.error('[Intercom webhook] No customers found in DB.');
      res.json({ received: true, error: 'No customers available in database' });
      return;
    }

    const customerId = customer.id;
    const orgId = customer.orgId;

    if (topic === 'conversation.created') {
      const title = item.title || item.source?.body || 'Support ticket conversation';
      const priority = item.priority || 'standard';
      const url =
        item.links?.conversation_web ||
        item.url ||
        `https://app.intercom.com/conversations/${item.id || 'unknown'}`;

      // Insert support_ticket event
      await db.insert(schema.events).values({
        customerId,
        orgId,
        eventType: 'support_ticket',
        source: 'intercom',
        payload: {
          title,
          priority,
          url,
        },
        occurredAt: new Date(),
      });

      // Check support ticket volume in the last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const ticketEvents = await db
        .select()
        .from(schema.events)
        .where(
          and(
            eq(schema.events.customerId, customerId),
            eq(schema.events.orgId, orgId),
            sql`${schema.events.eventType} IN ('support_ticket', 'ticket.created', 'ticket.opened')`,
            gte(schema.events.occurredAt, sevenDaysAgo)
          )
        );

      if (ticketEvents.length > 3) {
        console.log(`[Intercom] Customer ${customerId} flagged as high-touch. Ticket volume: ${ticketEvents.length}`);
        
        // Flag customer as high-touch by creating a high_touch event marker
        await db.insert(schema.events).values({
          customerId,
          orgId,
          eventType: 'high_touch',
          source: 'intercom',
          payload: {
            reason: `Support ticket volume is ${ticketEvents.length} in last 7 days (threshold > 3).`,
          },
          occurredAt: new Date(),
        });
      }
    } else if (topic === 'conversation.rated') {
      const rating = item.conversation_rating?.rating || 0;
      const comment = item.conversation_rating?.remark || '';

      // Insert csat_response event
      await db.insert(schema.events).values({
        customerId,
        orgId,
        eventType: 'csat_response',
        source: 'intercom',
        payload: {
          rating,
          comment,
        },
        occurredAt: new Date(),
      });
    }

    res.json({ received: true });
  } catch (err: any) {
    console.error(`[Intercom webhook error] ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

export default router;
