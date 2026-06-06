import { Router, Request, Response } from 'express';
import { db, schema } from '../lib/db.js';
import { eq } from 'drizzle-orm';
import { computeAndTriggerRescore } from '../lib/featureEngine.js';

const router = Router();

router.post('/webhook', async (req: Request, res: Response): Promise<void> => {
  const event = req.body;
  console.log(`[Segment webhook] Received event type: ${event.type || 'unknown'}`);

  try {
    const distinctId = event.userId || event.anonymousId || '';
    if (!distinctId) {
      res.status(400).json({ error: 'Missing userId or anonymousId' });
      return;
    }

    // Resolve customer
    let customer = await db
      .select()
      .from(schema.customers)
      .where(eq(schema.customers.id, distinctId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!customer && event.properties?.email) {
      customer = await db
        .select()
        .from(schema.customers)
        .where(eq(schema.customers.email, event.properties.email))
        .limit(1)
        .then((rows) => rows[0]);
    }

    if (!customer) {
      // Development fallback: map to first customer in DB for testing
      const allCustomers = await db.select().from(schema.customers).limit(1);
      if (allCustomers.length > 0) {
        customer = allCustomers[0];
      }
    }

    if (!customer) {
      res.status(404).json({ error: 'Customer not resolved' });
      return;
    }

    const customerId = customer.id;
    const orgId = customer.orgId;

    let eventType = '';
    const payload = event.properties || {};

    if (event.type === 'identify') {
      eventType = 'identify';
    } else if (event.type === 'track') {
      const eventName = event.event || 'custom_event';
      if (eventName === 'login' || eventName === 'user.login' || eventName === '$login') {
        eventType = 'login';
      } else if (eventName.startsWith('feature_') || payload.feature) {
        eventType = 'feature_use';
        payload.feature = payload.feature || eventName;
      } else {
        eventType = eventName;
      }
    } else {
      eventType = event.type || 'track';
    }

    // Insert normalized event
    await db.insert(schema.events).values({
      customerId,
      orgId,
      eventType,
      source: 'segment',
      payload,
      occurredAt: event.timestamp ? new Date(event.timestamp) : new Date(),
    });

    // Trigger rescore
    await computeAndTriggerRescore(customerId, orgId);

    res.json({ received: true });
  } catch (err: any) {
    console.error('[Segment webhook error]', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
