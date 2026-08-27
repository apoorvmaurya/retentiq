import { db, schema } from '../lib/db.js';
import { eq, and, gte, sql, inArray } from 'drizzle-orm';
import { computeAndTriggerRescore } from '../lib/featureEngine.js';
import { decryptConfig } from '../lib/crypto.js';
import { logger } from '../lib/logger.js';
import {
  AppError,
  WorkerError,
  ValidationError,
  NotFoundError,
  IntegrationError,
  toAppError,
} from '../lib/errors.js';
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
    logger.info(
      { jobId: job.id, orgId: job.orgId, type: job.type },
      `[IngestionWorker] Processing job...`,
    );
    try {
      await db.update(schema.jobs).set({ status: 'processing' }).where(eq(schema.jobs.id, job.id));

      const payload = job.payload as any;

      if (job.type === 'stripe') {
        await handleStripeJob(payload, job.orgId, job.id);
      } else if (job.type === 'csv') {
        await handleCsvJob(payload, job.orgId, job.id);
      } else if (job.type === 'intercom') {
        await handleIntercomJob(payload, job.orgId, job.id);
      } else if (job.type === 'mixpanel') {
        await handleMixpanelJob(payload, job.orgId, job.id);
      } else {
        throw new WorkerError(`Unknown job type: ${job.type}`, { jobId: job.id });
      }

      await db.update(schema.jobs).set({ status: 'completed' }).where(eq(schema.jobs.id, job.id));
      logger.info(
        { jobId: job.id, orgId: job.orgId },
        `[IngestionWorker] Job completed successfully.`,
      );
    } catch (err: unknown) {
      const appErr = toAppError(err);
      logger.error(
        { jobId: job.id, orgId: job.orgId, err: appErr },
        `[IngestionWorker] Job failed`,
      );
      await db
        .update(schema.jobs)
        .set({ status: 'failed', error: appErr.message })
        .where(eq(schema.jobs.id, job.id));
    }
  }
}

export async function handleStripeJob(event: any, orgId: string, jobId?: string): Promise<void> {
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
      logger.info(
        { jobId, customerId: customer.id, email, orgId },
        `[IngestionWorker] Auto-created customer for email under org`,
      );
    }
  }

  if (!customer) {
    throw new NotFoundError('No customer found to map Stripe event to.', { jobId, orgId });
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

export async function handleCsvJob(
  payload: { csvContent: string },
  orgId: string,
  jobId?: string,
): Promise<void> {
  const { csvContent } = payload;
  if (!csvContent) {
    throw new ValidationError('CSV content is empty', { jobId, orgId });
  }

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
      validRows.push(validation.data);
    }
  });

  if (errors.length > 0) {
    throw new ValidationError(`CSV Validation errors:\n${errors.join('\n')}`, { jobId, orgId });
  }

  const uniqueCustomerIds = Array.from(new Set(validRows.map((r) => r.customer_id)));

  if (uniqueCustomerIds.length > 0) {
    const existingCustomers = await db
      .select()
      .from(schema.customers)
      .where(inArray(schema.customers.id, uniqueCustomerIds));

    const existingCustomersMap = new Map(existingCustomers.map((c) => [c.id, c]));

    for (const customerId of uniqueCustomerIds) {
      const existingCustomer = existingCustomersMap.get(customerId);
      if (!existingCustomer) {
        await db.insert(schema.customers).values({
          id: customerId,
          orgId: orgId,
          name: `CSV Customer (${customerId.substring(0, 8)})`,
          email: `csv_customer_${customerId.substring(0, 8)}@example.com`,
          company: `CSV Company (${customerId.substring(0, 8)})`,
          planTier: 'Pro',
          mrr: '0.00',
        });
        logger.info(
          { jobId, customerId, orgId },
          `[IngestionWorker] Auto-created customer under org during CSV ingestion.`,
        );
      } else if (existingCustomer.orgId !== orgId) {
        await db
          .update(schema.customers)
          .set({ orgId: orgId })
          .where(eq(schema.customers.id, customerId));
        logger.info(
          { jobId, customerId, orgId, previousOrgId: existingCustomer.orgId },
          `[IngestionWorker] Adopted customer to org during CSV ingestion.`,
        );
      }
    }
  }

  if (validRows.length > 0) {
    const existingEvents = await db
      .select({
        customerId: schema.events.customerId,
        eventType: schema.events.eventType,
        occurredAt: schema.events.occurredAt,
      })
      .from(schema.events)
      .where(inArray(schema.events.customerId, uniqueCustomerIds));

    const existingEventsSet = new Set(
      existingEvents.map(
        (e) => `${e.customerId}|${e.eventType}|${new Date(e.occurredAt!).getTime()}`,
      ),
    );

    const eventsToInsert: any[] = [];
    for (const row of validRows) {
      const occurredAtDate = new Date(row.occurred_at);
      const lookupKey = `${row.customer_id}|${row.event_type}|${occurredAtDate.getTime()}`;

      if (!existingEventsSet.has(lookupKey)) {
        let eventPayload: Record<string, any> = {};
        if (row.payload) {
          try {
            eventPayload = JSON.parse(row.payload);
          } catch {
            eventPayload = { raw: row.payload };
          }
        }
        if (row.feature) {
          eventPayload.feature = row.feature;
        }

        eventsToInsert.push({
          customerId: row.customer_id,
          orgId: orgId,
          eventType: row.event_type,
          source: 'csv_upload',
          payload: eventPayload,
          occurredAt: occurredAtDate,
        });

        existingEventsSet.add(lookupKey);
      }
    }

    if (eventsToInsert.length > 0) {
      logger.info(
        { jobId, count: eventsToInsert.length },
        `[IngestionWorker] Batch inserting new events...`,
      );
      const chunkSize = 50;
      for (let i = 0; i < eventsToInsert.length; i += chunkSize) {
        const chunk = eventsToInsert.slice(i, i + chunkSize);
        await db.insert(schema.events).values(chunk);
      }
    }
  }

  logger.info(
    { jobId, uniqueCustomerCount: uniqueCustomerIds.length },
    `[IngestionWorker] Rescoring unique customers for job...`,
  );
  for (const customerId of uniqueCustomerIds) {
    try {
      await computeAndTriggerRescore(customerId, orgId);
    } catch (err: unknown) {
      logger.error(
        { jobId, customerId, orgId, err: toAppError(err) },
        `[IngestionWorker] Failed to rescore customer`,
      );
    }
  }
}

export async function handleIntercomJob(
  payload: any,
  orgId: string,
  jobId?: string,
): Promise<void> {
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
      logger.info(
        { jobId, customerId: customer.id, email, orgId },
        `[IngestionWorker] Auto-created customer for email under org`,
      );
    }
  }

  if (!customer) {
    throw new NotFoundError('No customer found to map Intercom webhook to.', { jobId, orgId });
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

export async function handleMixpanelJob(
  payload: any,
  orgId: string,
  jobId?: string,
): Promise<void> {
  const mixpanelIntegration = await db
    .select()
    .from(schema.integrations)
    .where(and(eq(schema.integrations.orgId, orgId), eq(schema.integrations.provider, 'mixpanel')))
    .limit(1)
    .then((rows) => rows[0]);

  if (!mixpanelIntegration) {
    throw new NotFoundError('Mixpanel integration not configured', { jobId, orgId });
  }

  let username = '';
  let secret = '';

  if (mixpanelIntegration.config) {
    try {
      const decryptedConfig = decryptConfig(mixpanelIntegration.config as Record<string, any>);
      username = decryptedConfig.mixpanelServiceAccountUsername || '';
      secret = decryptedConfig.mixpanelServiceAccountSecret || '';
    } catch (err: unknown) {
      logger.error({ err: toAppError(err), orgId }, '[Mixpanel Ingestion] Error decrypting config');
    }
  }

  if (!username) {
    username = process.env.MIXPANEL_SERVICE_ACCOUNT_USERNAME || '';
  }
  if (!secret) {
    secret = process.env.MIXPANEL_SERVICE_ACCOUNT_SECRET || '';
  }

  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const fromDateStr = thirtyDaysAgo.toISOString().split('T')[0];
  const toDateStr = today.toISOString().split('T')[0];

  const eventsData: any[] = [];

  if (!username || !secret || username.includes('your-') || secret.includes('your-')) {
    logger.warn(
      { orgId },
      `[Mixpanel Ingestion] Mixpanel credentials not configured. Degrading integration status.`,
    );
    await db
      .update(schema.integrations)
      .set({ status: 'degraded' })
      .where(eq(schema.integrations.id, mixpanelIntegration.id));
    throw new IntegrationError('Mixpanel service account credentials not configured.', {
      jobId,
      orgId,
    });
  } else {
    try {
      const authHeader = 'Basic ' + Buffer.from(`${username}:${secret}`).toString('base64');
      const url = `https://data.mixpanel.com/api/2.0/export?from_date=${fromDateStr}&to_date=${toDateStr}`;

      const response = await fetch(url, {
        headers: { Authorization: authHeader },
      });

      if (!response.ok) {
        throw new IntegrationError(`Mixpanel API returned status: ${response.status}`, {
          jobId,
          orgId,
        });
      }

      const text = await response.text();
      const lines = text.split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          eventsData.push(JSON.parse(line));
        } catch {
          // Ignore malformed JSON lines
        }
      }
    } catch (err: unknown) {
      const appErr = toAppError(err);
      logger.error(
        { err: appErr, orgId },
        `[Mixpanel Ingestion] Sync failed. Degrading integration status.`,
      );
      await db
        .update(schema.integrations)
        .set({ status: 'degraded' })
        .where(eq(schema.integrations.id, mixpanelIntegration.id));
      throw appErr;
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
    let payloadInner: any = {};

    if (mixpanelEventName === '$login') {
      eventType = 'login';
    } else if (mixpanelEventName.startsWith('feature_')) {
      eventType = 'feature_use';
      payloadInner = { feature: mixpanelEventName };
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
        payload: payloadInner,
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

let pollerInterval: NodeJS.Timeout | null = null;

export function stopIngestionWorker() {
  logger.info('[IngestionWorker] Stopping background ingestion queue poller...');
  if (pollerInterval) {
    clearInterval(pollerInterval);
    pollerInterval = null;
  }
}

export function startIngestionWorker() {
  stopIngestionWorker();

  if (process.env.DISABLE_BACKGROUND_WORKERS === 'true') {
    logger.info(
      '[IngestionWorker] Ingestion queue poller disabled via DISABLE_BACKGROUND_WORKERS.',
    );
    return;
  }

  logger.info(
    '[IngestionWorker] Starting background ingestion queue poller (polling every 10 seconds)...',
  );
  pollerInterval = setInterval(async () => {
    try {
      await processIngestionJobs();
    } catch (err: unknown) {
      logger.error({ err: toAppError(err) }, '[IngestionWorker] Error processing queue');
    }
  }, 10000);
}
