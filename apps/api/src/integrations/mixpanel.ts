import { Router, Request, Response, NextFunction } from 'express';
import { db, schema } from '../lib/db.js';
import { eq, and, gte, lte } from 'drizzle-orm';

const router = Router();

router.get('/sync/mixpanel', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const orgId = req.user!.org_id;

    // Retrieve Mixpanel integration config
    const mixpanelIntegration = await db
      .select()
      .from(schema.integrations)
      .where(
        and(
          eq(schema.integrations.orgId, orgId),
          eq(schema.integrations.provider, 'mixpanel')
        )
      )
      .limit(1)
      .then((rows) => rows[0]);

    if (!mixpanelIntegration) {
      res.status(404).json({ error: "Mixpanel integration not configured", code: "NOT_FOUND" });
      return;
    }

    const username = process.env.MIXPANEL_SERVICE_ACCOUNT_USERNAME || '';
    const secret = process.env.MIXPANEL_SERVICE_ACCOUNT_SECRET || '';

    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const fromDateStr = thirtyDaysAgo.toISOString().split('T')[0];
    const toDateStr = today.toISOString().split('T')[0];

    let eventsData: any[] = [];
    let isMock = false;

    // Check if credentials are mock/empty
    if (
      !username ||
      !secret ||
      username.includes('your-') ||
      secret.includes('your-')
    ) {
      if (process.env.NODE_ENV === 'production') {
        res.status(400).json({
          error: "Mixpanel API credentials are not configured or are using placeholders. Please check your settings.",
          code: "MIXPANEL_NOT_CONFIGURED"
        });
        return;
      }
      isMock = true;
    } else {
      try {
        const authHeader = 'Basic ' + Buffer.from(`${username}:${secret}`).toString('base64');
        const url = `https://data.mixpanel.com/api/2.0/export?from_date=${fromDateStr}&to_date=${toDateStr}`;

        console.log(`[Mixpanel Sync] Fetching from: ${url}`);
        const response = await fetch(url, {
          headers: {
            Authorization: authHeader,
          },
        });

        if (!response.ok) {
          throw new Error(`Mixpanel API returned status: ${response.status}`);
        }

        const text = await response.text();
        const lines = text.split('\n');
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const rawEvent = JSON.parse(line);
            eventsData.push(rawEvent);
          } catch (e) {
            // ignore bad JSON lines
          }
        }
      } catch (err: any) {
        if (process.env.NODE_ENV === 'production') {
          res.status(502).json({
            error: `Mixpanel API sync failed: ${err.message}`,
            code: "MIXPANEL_SYNC_FAILED"
          });
          return;
        }
        console.warn(`[Mixpanel Sync] Real sync failed (${err.message}). Falling back to mock data.`);
        isMock = true;
      }
    }

    // Generate mock events for demo if mock is enabled
    if (isMock) {
      console.log('[Mixpanel Sync] Generating mock Mixpanel events...');
      const customersList = await db
        .select()
        .from(schema.customers)
        .where(eq(schema.customers.orgId, orgId));

      const mockEvents = ['$login', 'feature_dashboard', 'feature_analytics_export', 'feature_alert_resolve'];

      for (const customer of customersList) {
        // Create 2-3 mock events in last 30 days
        const numEvents = Math.floor(Math.random() * 3) + 1;
        for (let i = 0; i < numEvents; i++) {
          const randomDays = Math.floor(Math.random() * 30);
          const occurredDate = new Date();
          occurredDate.setDate(occurredDate.getDate() - randomDays);

          const eventName = mockEvents[Math.floor(Math.random() * mockEvents.length)];

          eventsData.push({
            event: eventName,
            properties: {
              distinct_id: customer.id, // mapped directly
              time: Math.floor(occurredDate.getTime() / 1000),
            },
          });
        }
      }
    }

    // Process events and upsert to database
    let inserted = 0;
    let skipped = 0;

    for (const item of eventsData) {
      const mixpanelEventName = item.event;
      const distinctId = item.properties?.distinct_id || item.properties?.user_id || '';
      const occurredTime = item.properties?.time ? new Date(item.properties.time * 1000) : new Date();

      if (!distinctId) continue;

      // Lookup customer in DB using distinctId as customer ID or email
      let customer = await db
        .select()
        .from(schema.customers)
        .where(eq(schema.customers.id, distinctId))
        .limit(1)
        .then((rows) => rows[0]);

      if (!customer) {
        // Fallback: try mapping distinctId as email
        customer = await db
          .select()
          .from(schema.customers)
          .where(eq(schema.customers.email, distinctId))
          .limit(1)
          .then((rows) => rows[0]);
      }

      if (!customer) {
        skipped++;
        continue;
      }

      // Map Mixpanel events -> internal schema
      let eventType = '';
      let payload: any = {};

      if (mixpanelEventName === '$login') {
        eventType = 'login';
      } else if (mixpanelEventName.startsWith('feature_')) {
        eventType = 'feature_use';
        payload = { feature: mixpanelEventName };
      } else {
        // Default mapping
        eventType = mixpanelEventName;
      }

      // Check if event already exists to dedup (same customerId, occurredAt, eventType)
      const existing = await db
        .select()
        .from(schema.events)
        .where(
          and(
            eq(schema.events.customerId, customer.id),
            eq(schema.events.eventType, eventType),
            eq(schema.events.occurredAt, occurredTime)
          )
        )
        .limit(1);

      if (existing.length === 0) {
        await db.insert(schema.events).values({
          customerId: customer.id,
          orgId: customer.orgId,
          eventType,
          source: 'mixpanel',
          payload,
          occurredAt: occurredTime,
        });
        inserted++;
      } else {
        skipped++;
      }
    }

    // Update integration last_synced_at
    await db
      .update(schema.integrations)
      .set({ lastSyncedAt: new Date() })
      .where(eq(schema.integrations.id, mixpanelIntegration.id));

    res.json({
      status: 'completed',
      inserted,
      skipped,
      is_mock: isMock,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
