import { db, schema } from '../lib/db.js';
import { eq, and, gte, sql } from 'drizzle-orm';
import { computeAndTriggerRescore } from '../lib/featureEngine.js';
import Papa from 'papaparse';
import { z } from 'zod';

const csvRowSchema = z.object({
  customer_id: z.string().uuid('Invalid customer_id UUID format'),
  event_type: z.string().min(1, 'event_type is required'),
  occurred_at: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid occurred_at date format',
  }),
  feature: z.string().optional(),
  payload: z.string().optional(),
});

export async function processIngestionJobs(): Promise<void> {
  const queuedJobs = await db
    .select()
    .from(schema.jobs)
    .where(eq(schema.jobs.status, 'queued'))
    .limit(5);

  if (queuedJobs.length === 0) {
    return;
  }

  for (const job of queuedJobs) {
    console.log(`[IngestionWorker] Processing job ${job.id} of type ${job.type}...`);
    try {
      await db.update(schema.jobs).set({ status: 'processing' }).where(eq(schema.jobs.id, job.id));

      const payload = job.payload as any;

      if (job.type === 'stripe') {
        await handleStripeJob(payload, job.orgId);
      } else if (job.type === 'csv') {
        await handleCsvJob(payload, job.orgId);
      } else if (job.type === 'intercom') {
        await handleIntercomJob(payload, job.orgId);
      } else if (job.type === 'mixpanel') {
        await handleMixpanelJob(payload, job.orgId);
      } else {
        throw new Error(`Unknown job type: ${job.type}`);
      }

      await db.update(schema.jobs).set({ status: 'completed' }).where(eq(schema.jobs.id, job.id));
      console.log(`[IngestionWorker] Job ${job.id} completed successfully.`);
    } catch (err: any) {
      console.error(`[IngestionWorker] Job ${job.id} failed:`, err.message);
      await db
        .update(schema.jobs)
        .set({ status: 'failed', error: err.message })
        .where(eq(schema.jobs.id, job.id));
    }
  }
}

async function handleStripeJob(event: any, orgId: string): Promise<void> {
  let customerId: string | null = null;
  let email: string | null = null;
  let subscription: any = null;
  let invoice: any = null;

  if (event.type.startsWith('customer.subscription')) {
    subscription = event.data.object;
    email = subscription.customer_email || null;
    customerId =
      ((subscription.metadata?.customer_id || subscription.metadata?.customerId) as string) || null;
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
      .where(and(eq(schema.customers.id, customerId), eq(schema.customers.orgId, orgId)))
      .limit(1)
      .then((rows) => rows[0]);
  }

  if (!customer && email) {
    customer = await db
      .select()
      .from(schema.customers)
      .where(and(eq(schema.customers.email, email), eq(schema.customers.orgId, orgId)))
      .limit(1)
      .then((rows) => rows[0]);
  }

  if (!customer && email) {
    const orgExists = await db
      .select()
      .from(schema.organizations)
      .where(eq(schema.organizations.id, orgId))
      .limit(1)
      .then((rows) => rows[0]);

    if (orgExists) {
      const name = email.split('@')[0];
      const company = `${name}'s Company`;
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
      console.log(
        `[ingestionWorker] Auto-created customer ${customer.id} for email ${email} under org ${orgId}`,
      );
    }
  }

  if (!customer) {
    throw new Error('No customer found to map Stripe event to.');
  }

  const customerIdStr = customer.id;
  const orgIdStr = customer.orgId;

  if (event.type === 'customer.subscription.updated' && subscription) {
    const price = subscription.items?.data?.[0]?.price;
    const mrr = price
      ? price.unit_amount
        ? (price.unit_amount / 100).toFixed(2)
        : '0.00'
      : '0.00';
    const planTier = price?.nickname || subscription.plan?.nickname || 'Pro';

    await db
      .update(schema.customers)
      .set({ planTier, mrr })
      .where(eq(schema.customers.id, customerIdStr));

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

    await computeAndTriggerRescore(customerIdStr, orgIdStr);
  } else if (event.type === 'customer.subscription.deleted' && subscription) {
    await db
      .update(schema.customers)
      .set({ planTier: 'churned', mrr: '0.00' })
      .where(eq(schema.customers.id, customerIdStr));

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

    await computeAndTriggerRescore(customerIdStr, orgIdStr);
  } else if (event.type === 'invoice.payment_failed' && invoice) {
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

    await computeAndTriggerRescore(customerIdStr, orgIdStr);
  }
}

async function handleCsvJob(payload: { csvContent: string }, orgId: string): Promise<void> {
  const { csvContent } = payload;
  if (!csvContent) {
    throw new Error('CSV content is empty');
  }

  const customersList = await db
    .select({ id: schema.customers.id })
    .from(schema.customers)
    .where(eq(schema.customers.orgId, orgId));

  const allowedCustomerIds = new Set(customersList.map((c) => c.id));

  const parsed = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
  });

  const errors: string[] = [];
  const validRows: any[] = [];

  parsed.data.forEach((row: any, idx: number) => {
    const cleanedRow: any = {};
    for (const key of Object.keys(row)) {
      cleanedRow[key.trim()] = row[key] ? row[key].trim() : '';
    }

    const validation = csvRowSchema.safeParse(cleanedRow);

    if (!validation.success) {
      errors.push(
        `Row ${idx + 1}: ` +
          validation.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
      );
    } else {
      const rowData = validation.data;
      if (!allowedCustomerIds.has(rowData.customer_id)) {
        errors.push(`Row ${idx + 1}: customer_id does not belong to organization.`);
      } else {
        validRows.push(rowData);
      }
    }
  });

  if (errors.length > 0) {
    throw new Error(`CSV Validation errors:\n${errors.join('\n')}`);
  }

  for (const row of validRows) {
    const occurredAtDate = new Date(row.occurred_at);

    let eventPayload: Record<string, any> = {};
    if (row.payload) {
      try {
        eventPayload = JSON.parse(row.payload);
      } catch (_) {
        eventPayload = { raw: row.payload };
      }
    }

    if (row.feature) {
      eventPayload.feature = row.feature;
    }

    const existing = await db
      .select()
      .from(schema.events)
      .where(
        and(
          eq(schema.events.customerId, row.customer_id),
          eq(schema.events.eventType, row.event_type),
          eq(schema.events.occurredAt, occurredAtDate),
        ),
      )
      .limit(1);

    if (existing.length === 0) {
      await db.insert(schema.events).values({
        customerId: row.customer_id,
        orgId: orgId,
        eventType: row.event_type,
        source: 'csv_upload',
        payload: eventPayload,
        occurredAt: occurredAtDate,
      });

      await computeAndTriggerRescore(row.customer_id, orgId);
    }
  }
}

async function handleIntercomJob(payload: any, orgId: string): Promise<void> {
  const topic = payload.topic || payload.type;
  const item = payload.data?.item || {};
  const email = item.user?.email || item.contacts?.[0]?.email || '';

  let customer = await db
    .select()
    .from(schema.customers)
    .where(and(eq(schema.customers.email, email), eq(schema.customers.orgId, orgId)))
    .limit(1)
    .then((rows) => rows[0]);

  if (!customer && email) {
    const orgExists = await db
      .select()
      .from(schema.organizations)
      .where(eq(schema.organizations.id, orgId))
      .limit(1)
      .then((rows) => rows[0]);

    if (orgExists) {
      const name = item.user?.name || email.split('@')[0];
      const company = `${name}'s Company`;
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
      console.log(
        `[ingestionWorker] Auto-created customer ${customer.id} for email ${email} under org ${orgId}`,
      );
    }
  }

  if (!customer) {
    throw new Error('No customer found to map Intercom webhook to.');
  }

  const customerId = customer.id;

  if (topic === 'conversation.created') {
    const title = item.title || item.source?.body || 'Support ticket conversation';
    const priority = item.priority || 'standard';
    const url =
      item.links?.conversation_web ||
      item.url ||
      `https://app.intercom.com/conversations/${item.id || 'unknown'}`;

    await db.insert(schema.events).values({
      customerId,
      orgId,
      eventType: 'support_ticket',
      source: 'intercom',
      payload: { title, priority, url },
      occurredAt: new Date(),
    });

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
          gte(schema.events.occurredAt, sevenDaysAgo),
        ),
      );

    if (ticketEvents.length > 3) {
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

    await computeAndTriggerRescore(customerId, orgId);
  } else if (topic === 'conversation.rated') {
    const rating = item.conversation_rating?.rating || 0;
    const comment = item.conversation_rating?.remark || '';

    await db.insert(schema.events).values({
      customerId,
      orgId,
      eventType: 'csat_response',
      source: 'intercom',
      payload: { rating, comment },
      occurredAt: new Date(),
    });

    await computeAndTriggerRescore(customerId, orgId);
  }
}

async function handleMixpanelJob(payload: any, orgId: string): Promise<void> {
  const mixpanelIntegration = await db
    .select()
    .from(schema.integrations)
    .where(and(eq(schema.integrations.orgId, orgId), eq(schema.integrations.provider, 'mixpanel')))
    .limit(1)
    .then((rows) => rows[0]);

  if (!mixpanelIntegration) {
    throw new Error('Mixpanel integration not configured');
  }

  const username = process.env.MIXPANEL_SERVICE_ACCOUNT_USERNAME || '';
  const secret = process.env.MIXPANEL_SERVICE_ACCOUNT_SECRET || '';

  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const fromDateStr = thirtyDaysAgo.toISOString().split('T')[0];
  const toDateStr = today.toISOString().split('T')[0];

  const eventsData: any[] = [];

  if (!username || !secret || username.includes('your-') || secret.includes('your-')) {
    console.warn(
      `[Mixpanel Ingestion] Mixpanel credentials not configured for org ${orgId}. Degrading integration status.`,
    );
    await db
      .update(schema.integrations)
      .set({ status: 'degraded' })
      .where(eq(schema.integrations.id, mixpanelIntegration.id));
    throw new Error('Mixpanel service account credentials not configured.');
  } else {
    try {
      const authHeader = 'Basic ' + Buffer.from(`${username}:${secret}`).toString('base64');
      const url = `https://data.mixpanel.com/api/2.0/export?from_date=${fromDateStr}&to_date=${toDateStr}`;

      const response = await fetch(url, {
        headers: { Authorization: authHeader },
      });

      if (!response.ok) {
        throw new Error(`Mixpanel API returned status: ${response.status}`);
      }

      const text = await response.text();
      const lines = text.split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          eventsData.push(JSON.parse(line));
        } catch (_) {
          // Ignore malformed JSON lines
        }
      }
    } catch (err: any) {
      console.error(
        `[Mixpanel Ingestion] Sync failed: ${err.message}. Degrading integration status.`,
      );
      await db
        .update(schema.integrations)
        .set({ status: 'degraded' })
        .where(eq(schema.integrations.id, mixpanelIntegration.id));
      throw err;
    }
  }

  for (const item of eventsData) {
    const mixpanelEventName = item.event;
    const distinctId = item.properties?.distinct_id || item.properties?.user_id || '';
    const occurredTime = item.properties?.time ? new Date(item.properties.time * 1000) : new Date();

    if (!distinctId) continue;

    let customer = await db
      .select()
      .from(schema.customers)
      .where(and(eq(schema.customers.id, distinctId), eq(schema.customers.orgId, orgId)))
      .limit(1)
      .then((rows) => rows[0]);

    if (!customer) {
      customer = await db
        .select()
        .from(schema.customers)
        .where(and(eq(schema.customers.email, distinctId), eq(schema.customers.orgId, orgId)))
        .limit(1)
        .then((rows) => rows[0]);
    }

    if (!customer) continue;

    let eventType = '';
    let payload: any = {};

    if (mixpanelEventName === '$login') {
      eventType = 'login';
    } else if (mixpanelEventName.startsWith('feature_')) {
      eventType = 'feature_use';
      payload = { feature: mixpanelEventName };
    } else {
      eventType = mixpanelEventName;
    }

    const existing = await db
      .select()
      .from(schema.events)
      .where(
        and(
          eq(schema.events.customerId, customer.id),
          eq(schema.events.eventType, eventType),
          eq(schema.events.occurredAt, occurredTime),
        ),
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

      await computeAndTriggerRescore(customer.id, orgId);
    }
  }

  await db
    .update(schema.integrations)
    .set({ lastSyncedAt: new Date() })
    .where(eq(schema.integrations.id, mixpanelIntegration.id));
}

let pollerInterval: any = null;

export function stopIngestionWorker() {
  console.log('[IngestionWorker] Stopping background ingestion queue poller...');
  if (pollerInterval) {
    clearInterval(pollerInterval);
    pollerInterval = null;
  }
}

export function startIngestionWorker() {
  stopIngestionWorker(); // Ensure clean state before starting

  if (process.env.DISABLE_BACKGROUND_WORKERS === 'true') {
    console.log(
      '[IngestionWorker] Ingestion queue poller disabled via DISABLE_BACKGROUND_WORKERS env var.',
    );
    return;
  }

  console.log(
    '[IngestionWorker] Starting background ingestion queue poller (polling every 10 seconds)...',
  );
  pollerInterval = setInterval(async () => {
    try {
      await processIngestionJobs();
    } catch (err: any) {
      console.error('[IngestionWorker] Error processing queue:', err.message);
    }
  }, 10000);
}
