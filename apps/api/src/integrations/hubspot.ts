import { Router, Request, Response } from 'express';
import { db, schema } from '../lib/db.js';
import { eq } from 'drizzle-orm';
import { computeAndTriggerRescore } from '../lib/featureEngine.js';

const router = Router();

router.post('/webhook/:orgId?', async (req: Request, res: Response): Promise<void> => {
  const payload = req.body;
  console.log('[HubSpot webhook] Received sync trigger');

  try {
    const email = payload.email || payload.contact_email || '';
    let customer = null;

    if (email) {
      customer = await db
        .select()
        .from(schema.customers)
        .where(eq(schema.customers.email, email))
        .limit(1)
        .then((rows) => rows[0]);
    }

    const orgId = req.params.orgId || customer?.orgId;

    if (!orgId) {
      console.warn(
        '[HubSpot webhook] Ignored event: could not resolve tenant organization (customer not found and no orgId in path).',
      );
      res.status(400).json({ error: 'Tenant organization could not be resolved.' });
      return;
    }

    // Auto-create customer if they don't exist
    if (!customer) {
      if (!email) {
        res.status(400).json({ error: 'Customer email is required for auto-creation.' });
        return;
      }

      // Check if organization exists
      const orgExists = await db
        .select()
        .from(schema.organizations)
        .where(eq(schema.organizations.id, orgId))
        .limit(1)
        .then((rows) => rows[0]);

      if (!orgExists) {
        console.warn(`[HubSpot webhook] Organization ${orgId} not found in DB.`);
        res.status(400).json({ error: 'Tenant organization not found.' });
        return;
      }

      const name = payload.name || payload.firstName || email.split('@')[0];
      const company = payload.company?.name || payload.company || `${name}'s Company`;

      const [newCustomer] = await db
        .insert(schema.customers)
        .values({
          orgId,
          name,
          email,
          company,
          planTier: 'Pro',
          mrr: '0.00',
        })
        .returning();

      customer = newCustomer;
      console.log(`[HubSpot webhook] Auto-created customer ${customer.id} for email ${email}`);
    }

    const nps = payload.nps || payload.nps_score || 9;
    const renewalDate =
      payload.renewal_date || new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(); // 45 days from now
    const dealStage = payload.deal_stage || 'Closed Won';

    // Insert CRM events
    await db.insert(schema.events).values({
      customerId: customer.id,
      orgId: customer.orgId,
      eventType: 'crm_sync',
      source: 'hubspot',
      payload: {
        nps_score: Number(nps),
        renewal_date: renewalDate,
        deal_stage: dealStage,
      },
    });

    await computeAndTriggerRescore(customer.id, customer.orgId);
    res.json({ success: true });
  } catch (err: any) {
    console.error('[HubSpot sync error]', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
