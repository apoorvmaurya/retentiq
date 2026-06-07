import { Router, Request, Response } from 'express';
import { db, schema } from '../lib/db.js';
import { eq } from 'drizzle-orm';
import { computeAndTriggerRescore } from '../lib/featureEngine.js';

const router = Router();

router.post('/webhook/:orgId?', async (req: Request, res: Response): Promise<void> => {
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

    const orgId = req.params.orgId || customer?.orgId;

    if (!orgId) {
      console.warn(
        '[Segment webhook] Ignored event: could not resolve tenant organization (customer not found and no orgId in path).',
      );
      res.status(400).json({ error: 'Tenant organization could not be resolved.' });
      return;
    }

    // Auto-create customer if they don't exist
    if (!customer) {
      // Check if organization exists
      const orgExists = await db
        .select()
        .from(schema.organizations)
        .where(eq(schema.organizations.id, orgId))
        .limit(1)
        .then((rows) => rows[0]);

      if (!orgExists) {
        console.warn(`[Segment webhook] Organization ${orgId} not found in DB.`);
        res.status(400).json({ error: 'Tenant organization not found.' });
        return;
      }

      const email = event.properties?.email || `${distinctId.slice(0, 8)}@segment.placeholder`;
      const name = event.properties?.name || event.properties?.firstName || email.split('@')[0];
      const company =
        event.properties?.company?.name || event.properties?.company || `${name}'s Company`;

      const [newCustomer] = await db
        .insert(schema.customers)
        .values({
          id: distinctId.match(
            /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
          )
            ? distinctId
            : undefined,
          orgId,
          name,
          email,
          company,
          planTier: 'Pro',
          mrr: '0.00',
        })
        .returning();

      customer = newCustomer;
      console.log(`[Segment webhook] Auto-created customer ${customer.id} for email ${email}`);
    }

    const customerId = customer.id;

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
