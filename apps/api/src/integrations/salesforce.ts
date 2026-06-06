import { Router, Request, Response } from 'express';
import { db, schema } from '../lib/db.js';
import { eq } from 'drizzle-orm';
import { computeAndTriggerRescore } from '../lib/featureEngine.js';

const router = Router();

router.post('/webhook', async (req: Request, res: Response): Promise<void> => {
  const payload = req.body;
  console.log('[Salesforce webhook] Received sync trigger');

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

    if (!customer) {
      const allCustomers = await db.select().from(schema.customers).limit(1);
      if (allCustomers.length > 0) {
        customer = allCustomers[0];
      }
    }

    if (!customer) {
      res.status(404).json({ error: 'Customer not resolved' });
      return;
    }

    const nps = payload.nps || payload.nps_score || 8;
    const renewalDate =
      payload.renewal_date || new Date(Date.now() + 50 * 24 * 60 * 60 * 1000).toISOString(); // 50 days from now
    const dealStage = payload.deal_stage || 'Closed Won';

    // Insert CRM events
    await db.insert(schema.events).values({
      customerId: customer.id,
      orgId: customer.orgId,
      eventType: 'crm_sync',
      source: 'salesforce',
      payload: {
        nps_score: Number(nps),
        renewal_date: renewalDate,
        deal_stage: dealStage,
      },
    });

    await computeAndTriggerRescore(customer.id, customer.orgId);
    res.json({ success: true });
  } catch (err: any) {
    console.error('[Salesforce sync error]', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
