import { db, schema } from './db.js';
import { eq, and, gte, desc, sql, asc } from 'drizzle-orm';

export interface FeatureDict {
  login_frequency_30d: number;
  login_frequency_14d: number;
  login_frequency_7d: number;
  feature_adoption_score: number;
  usage_trend: number;
  days_since_last_login: number;
  support_ticket_volume: number;
  support_sentiment_score: number;
  billing_events: number;
  onboarding_time: number;
  nps_csat_score: number;
  renewal_proximity: number;
  plan_tier: string;
}

/**
 * Computes engagement features for a customer based on historical events (last 30 days).
 */
export async function computeFeatures(customerId: string, orgId: string): Promise<FeatureDict> {
  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Fetch customer plan_tier
  const customerRows = await db
    .select()
    .from(schema.customers)
    .where(eq(schema.customers.id, customerId))
    .limit(1);
  const customer = customerRows[0];
  const plan_tier = customer?.planTier || 'Basic';

  // Fetch last 30 days of events
  const events30d = await db
    .select()
    .from(schema.events)
    .where(
      and(
        eq(schema.events.customerId, customerId),
        eq(schema.events.orgId, orgId),
        gte(schema.events.occurredAt, thirtyDaysAgo),
      ),
    );

  // 1. login frequency (30d, 14d, 7d)
  const logins30d = events30d.filter(
    (e) => e.eventType === 'login' || e.eventType === 'user.login' || e.eventType === 'identify',
  );
  const logins14d = logins30d.filter((e) => new Date(e.occurredAt!) >= fourteenDaysAgo);
  const logins7d = logins30d.filter((e) => new Date(e.occurredAt!) >= sevenDaysAgo);

  const login_frequency_30d = logins30d.length / 30.0;
  const login_frequency_14d = logins14d.length / 14.0;
  const login_frequency_7d = logins7d.length / 7.0;

  // 2. feature_adoption_score
  const uniqueFeatures = new Set<string>();
  for (const e of events30d) {
    if (e.eventType === 'feature_use' || e.eventType.startsWith('feature_')) {
      const payload = e.payload as any;
      if (payload && payload.feature) {
        uniqueFeatures.add(payload.feature);
      }
    }
  }
  const feature_adoption_score = uniqueFeatures.size / 12.0;

  // 3. usage_trend: WoW logins change percentage
  const logins8_14d = logins14d.filter((e) => new Date(e.occurredAt!) < sevenDaysAgo);
  const usage_trend =
    logins8_14d.length > 0
      ? (logins7d.length - logins8_14d.length) / logins8_14d.length
      : logins7d.length > 0
        ? 1.0
        : 0.0;

  // 4. days_since_last_login
  let days_since_last_login = 999;
  if (logins30d.length > 0) {
    const sortedLogins = [...logins30d].sort(
      (a, b) => new Date(b.occurredAt!).getTime() - new Date(a.occurredAt!).getTime(),
    );
    const latestLogin = sortedLogins[0];
    if (latestLogin && latestLogin.occurredAt) {
      const diffTime = Math.abs(now.getTime() - new Date(latestLogin.occurredAt).getTime());
      days_since_last_login = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    }
  }

  // 5. support_ticket_volume
  const supportTickets = events30d.filter(
    (e) =>
      e.eventType === 'support_ticket' ||
      e.eventType === 'ticket.created' ||
      e.eventType === 'ticket.opened',
  );
  const support_ticket_volume = supportTickets.length;

  // 6. support_sentiment_score (average CSAT mapped to -1 to +1)
  const csatEvents = events30d.filter((e) => e.eventType === 'csat_response');
  let support_sentiment_score = 0.5; // neutral default
  if (csatEvents.length > 0) {
    let totalScore = 0;
    for (const e of csatEvents) {
      const rating = (e.payload as any).rating || 3; // 0-5 scale
      totalScore += (rating - 2.5) / 2.5; // map 0-5 to -1 to +1
    }
    support_sentiment_score = totalScore / csatEvents.length;
  }

  // 7. billing_events count (failures or cancels/downgrades)
  const billingEvents = events30d.filter(
    (e) =>
      e.eventType === 'payment_failed' ||
      (e.eventType === 'billing_change' && (e.payload as any).to === 'churned'),
  );
  const billing_events = billingEvents.length;

  // 8. onboarding_time (days between customer creation and first event)
  let onboarding_time = 0;
  if (customer && customer.createdAt) {
    const firstEvent = await db
      .select()
      .from(schema.events)
      .where(eq(schema.events.customerId, customerId))
      .orderBy(asc(schema.events.occurredAt))
      .limit(1)
      .then((rows) => rows[0]);

    if (firstEvent && firstEvent.occurredAt) {
      const diffTime = Math.abs(
        new Date(firstEvent.occurredAt).getTime() - new Date(customer.createdAt).getTime(),
      );
      onboarding_time = Math.max(0.1, diffTime / (1000 * 60 * 60 * 24));
    }
  }

  // 9. nps_csat_score and renewal_proximity from CRM sync
  const crmSyncEvents = await db
    .select()
    .from(schema.events)
    .where(and(eq(schema.events.customerId, customerId), eq(schema.events.eventType, 'crm_sync')))
    .orderBy(desc(schema.events.occurredAt))
    .limit(1)
    .then((rows) => rows[0]);

  let nps_csat_score = 8; // default healthy NPS
  let renewal_proximity = 365; // default far away renewal
  if (crmSyncEvents && crmSyncEvents.payload) {
    const payload = crmSyncEvents.payload as any;
    if (payload.nps_score !== undefined) {
      nps_csat_score = payload.nps_score;
    }
    if (payload.renewal_date) {
      const diffTime = new Date(payload.renewal_date).getTime() - now.getTime();
      renewal_proximity = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
    }
  }

  return {
    login_frequency_30d,
    login_frequency_14d,
    login_frequency_7d,
    feature_adoption_score,
    usage_trend,
    days_since_last_login,
    support_ticket_volume,
    support_sentiment_score,
    billing_events,
    onboarding_time,
    nps_csat_score,
    renewal_proximity,
    plan_tier,
  };
}

/**
 * Computes features, triggers an AI rescoring request to the python service, and saves the new score to DB.
 */
export async function computeAndTriggerRescore(customerId: string, orgId: string) {
  try {
    const features = await computeFeatures(customerId, orgId);

    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    console.log(`[FeatureEngine] Requesting score for customer ${customerId} from ${aiServiceUrl}`);

    const res = await fetch(`${aiServiceUrl}/score/customer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: customerId,
        org_id: orgId,
        features,
      }),
    });

    if (!res.ok) {
      throw new Error(`AI Service returned ${res.status}`);
    }

    const result = (await res.json()) as {
      score: number;
      churn_probability: number;
      risk_tier: 'low' | 'medium' | 'high' | 'critical';
      top_risk_factors: string[];
      recommended_action: string;
      confidence: number;
    };

    console.log(`[FeatureEngine] AI score result:`, result);

    // Save result to health_scores table
    const [inserted] = await db
      .insert(schema.healthScores)
      .values({
        customerId,
        orgId,
        score: result.score,
        churnProbability: result.churn_probability.toString(),
        riskTier: result.risk_tier,
        topRiskFactors: result.top_risk_factors,
        recommendedAction: result.recommended_action,
        confidence: result.confidence.toString(),
      })
      .returning();

    return inserted;
  } catch (error) {
    console.error(`[FeatureEngine] Failed to rescore customer ${customerId}:`, error);
    throw error;
  }
}
