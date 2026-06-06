import { db, schema } from './db.js';
import { eq, and, gte, desc, sql } from 'drizzle-orm';

export interface FeatureDict {
  login_frequency_30d: number;
  feature_adoption_score: number;
  support_ticket_volume: number;
  billing_change_pct: number;
  days_since_last_login: number;
  plan_tier: string;
}

/**
 * Computes engagement features for a customer based on historical events (last 30 days).
 */
export async function computeFeatures(customerId: string, orgId: string): Promise<FeatureDict> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Fetch customer plan_tier
  const customerRows = await db
    .select({ planTier: schema.customers.planTier })
    .from(schema.customers)
    .where(eq(schema.customers.id, customerId))
    .limit(1);
  const plan_tier = customerRows[0]?.planTier || 'Basic';

  // Fetch last 30 days of events
  const events30d = await db
    .select()
    .from(schema.events)
    .where(
      and(
        eq(schema.events.customerId, customerId),
        eq(schema.events.orgId, orgId),
        gte(schema.events.occurredAt, thirtyDaysAgo)
      )
    );

  // 1. login_frequency_30d
  const loginEvents = events30d.filter(
    (e) => e.eventType === 'login' || e.eventType === 'user.login'
  );
  const login_frequency_30d = loginEvents.length / 30.0;

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

  // 3. support_ticket_volume
  const ticketEvents = events30d.filter(
    (e) =>
      e.eventType === 'support_ticket' ||
      e.eventType === 'ticket.created' ||
      e.eventType === 'ticket.opened'
  );
  const support_ticket_volume = ticketEvents.length;

  // 4. billing_change_pct
  const billingEvents = events30d
    .filter((e) => e.eventType.includes('billing'))
    .sort((a, b) => new Date(b.occurredAt!).getTime() - new Date(a.occurredAt!).getTime());
  const billing_change_pct =
    billingEvents.length > 0
      ? (billingEvents[0].payload as any).billing_change_pct ||
        (billingEvents[0].payload as any).change_pct ||
        0.0
      : 0.0;

  // 5. days_since_last_login
  const latestLogin = await db
    .select()
    .from(schema.events)
    .where(
      and(
        eq(schema.events.customerId, customerId),
        eq(schema.events.orgId, orgId),
        sql`${schema.events.eventType} IN ('login', 'user.login')`
      )
    )
    .orderBy(desc(schema.events.occurredAt))
    .limit(1);

  let days_since_last_login = 999;
  if (latestLogin.length > 0 && latestLogin[0].occurredAt) {
    const diffTime = Math.abs(Date.now() - new Date(latestLogin[0].occurredAt).getTime());
    days_since_last_login = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  return {
    login_frequency_30d,
    feature_adoption_score,
    support_ticket_volume,
    billing_change_pct,
    days_since_last_login,
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
