import { Router, Request, Response, NextFunction } from 'express';
import { db, schema } from '../lib/db.js';
import { eq, sql, and, gte, lte, count } from 'drizzle-orm';

const router = Router();

/**
 * GET /api/analytics/overview
 * Aggregated org overview:
 * { total_customers, avg_health_score, at_risk_count (score<40),
 *   critical_count (score<20), revenue_at_risk (sum mrr where score<40) }
 */
router.get('/overview', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user!.org_id;

    // Subquery to get latest health score with row number partition
    const hsSub = db
      .select({
        customerId: schema.healthScores.customerId,
        score: schema.healthScores.score,
        rowNum:
          sql<number>`ROW_NUMBER() OVER (PARTITION BY ${schema.healthScores.customerId} ORDER BY ${schema.healthScores.scoredAt} DESC)`.as(
            'row_num',
          ),
      })
      .from(schema.healthScores)
      .as('hs_sub');

    const result = await db
      .select({
        totalCustomers: sql<number>`count(distinct ${schema.customers.id})::int`,
        avgHealthScore: sql<number>`coalesce(avg(${hsSub.score}), 0)::int`,
        atRiskCount: sql<number>`count(distinct case when ${hsSub.score} < 40 then ${schema.customers.id} else null end)::int`,
        criticalCount: sql<number>`count(distinct case when ${hsSub.score} < 20 then ${schema.customers.id} else null end)::int`,
        revenueAtRisk: sql<string>`coalesce(sum(case when ${hsSub.score} < 40 then ${schema.customers.mrr} else 0 end), 0)::text`,
      })
      .from(schema.customers)
      .leftJoin(hsSub, and(eq(schema.customers.id, hsSub.customerId), eq(hsSub.rowNum, 1)))
      .where(eq(schema.customers.orgId, orgId))
      .then((rows) => rows[0]);

    res.json({
      total_customers: result?.totalCustomers ?? 0,
      avg_health_score: result?.avgHealthScore ?? 0,
      at_risk_count: result?.atRiskCount ?? 0,
      critical_count: result?.criticalCount ?? 0,
      revenue_at_risk: Math.round(parseFloat(result?.revenueAtRisk ?? '0') * 100) / 100,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/analytics/retention-roi
 * Returns { accounts_saved, total_revenue_saved, actions_this_month }.
 */
router.get('/retention-roi', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user!.org_id;

    const actions = await db
      .select()
      .from(schema.retentionActions)
      .where(eq(schema.retentionActions.orgId, orgId));

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const successfulActions = actions.filter(
      (a) => a.outcome === 'success' || a.outcome === 'completed' || a.outcome === 'recovered',
    );
    const accountsSaved = successfulActions.length;
    const totalRevenueSaved = actions.reduce((sum, a) => sum + parseFloat(a.revenueSaved), 0);
    const actionsThisMonth = actions.filter((a) => {
      const d = new Date(a.actionedAt!);
      return d >= startOfMonth;
    }).length;

    res.json({
      accounts_saved: accountsSaved,
      total_revenue_saved: Math.round(totalRevenueSaved * 100) / 100,
      actions_this_month: actionsThisMonth,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/analytics/score-distribution
 * Returns { low: N, medium: N, high: N, critical: N } counting by risk_tier.
 * Uses the latest health score per customer.
 */
router.get('/score-distribution', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user!.org_id;

    const hsSub = db
      .select({
        customerId: schema.healthScores.customerId,
        riskTier: schema.healthScores.riskTier,
        rowNum:
          sql<number>`ROW_NUMBER() OVER (PARTITION BY ${schema.healthScores.customerId} ORDER BY ${schema.healthScores.scoredAt} DESC)`.as(
            'row_num',
          ),
      })
      .from(schema.healthScores)
      .as('hs_sub');

    const distRows = await db
      .select({
        riskTier: hsSub.riskTier,
        count: sql<number>`count(${schema.customers.id})::int`,
      })
      .from(schema.customers)
      .innerJoin(hsSub, and(eq(schema.customers.id, hsSub.customerId), eq(hsSub.rowNum, 1)))
      .where(eq(schema.customers.orgId, orgId))
      .groupBy(hsSub.riskTier);

    const distribution = { low: 0, medium: 0, high: 0, critical: 0 };
    for (const row of distRows) {
      const tier = row.riskTier as keyof typeof distribution;
      if (tier in distribution) {
        distribution[tier] = row.count;
      }
    }

    res.json(distribution);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/analytics/roi-history
 * Returns the cached monthly aggregates from the roiAggregates table.
 */
router.get('/roi-history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user!.org_id;

    const history = await db
      .select()
      .from(schema.roiAggregates)
      .where(eq(schema.roiAggregates.orgId, orgId))
      .orderBy(schema.roiAggregates.month);

    res.json(history);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/analytics/feature-adoption
 * Calculate feature usage density by user risk segment over the last 30 days.
 */
router.get('/feature-adoption', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user!.org_id;

    const hsSub = db
      .select({
        customerId: schema.healthScores.customerId,
        riskTier: schema.healthScores.riskTier,
        rowNum:
          sql<number>`ROW_NUMBER() OVER (PARTITION BY ${schema.healthScores.customerId} ORDER BY ${schema.healthScores.scoredAt} DESC)`.as(
            'row_num',
          ),
      })
      .from(schema.healthScores)
      .as('hs_sub');

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);

    const eventAggSub = db
      .select({
        customerId: schema.events.customerId,
        hasDashboard:
          sql<number>`max(case when lower(${schema.events.eventType}) in ('user.login', 'dashboard.viewed') or lower(${schema.events.eventType}) like '%dashboard%' or lower(${schema.events.eventType}) like '%login%' then 1 else 0 end)`.as(
            'has_dashboard',
          ),
        hasAlerts:
          sql<number>`max(case when lower(${schema.events.eventType}) like '%alert%' or lower(${schema.events.eventType}) = 'settings.updated' then 1 else 0 end)`.as(
            'has_alerts',
          ),
        hasIntegrations:
          sql<number>`max(case when lower(${schema.events.eventType}) like '%integration%' or lower(${schema.events.eventType}) like '%sync%' or lower(${schema.events.eventType}) = 'settings.updated' or lower(${schema.events.eventType}) like '%billing%' or lower(${schema.events.eventType}) = 'payment_failed' then 1 else 0 end)`.as(
            'has_integrations',
          ),
        hasPlaybooks:
          sql<number>`max(case when lower(${schema.events.eventType}) like '%playbook%' or lower(${schema.events.eventType}) like '%task%' or lower(${schema.events.eventType}) like '%play%' or lower(${schema.events.eventType}) = 'high_touch' then 1 else 0 end)`.as(
            'has_playbooks',
          ),
      })
      .from(schema.events)
      .where(gte(schema.events.occurredAt, thirtyDaysAgo))
      .groupBy(schema.events.customerId)
      .as('event_agg');

    const adoptionRows = await db
      .select({
        riskTier: hsSub.riskTier,
        totalCustomers: sql<number>`count(${schema.customers.id})::int`,
        dashboardCount: sql<number>`sum(coalesce(${eventAggSub.hasDashboard}, 0))::int`,
        alertsCount: sql<number>`sum(coalesce(${eventAggSub.hasAlerts}, 0))::int`,
        integrationsCount: sql<number>`sum(coalesce(${eventAggSub.hasIntegrations}, 0))::int`,
        playbooksCount: sql<number>`sum(coalesce(${eventAggSub.hasPlaybooks}, 0))::int`,
      })
      .from(schema.customers)
      .innerJoin(hsSub, and(eq(schema.customers.id, hsSub.customerId), eq(hsSub.rowNum, 1)))
      .leftJoin(eventAggSub, eq(schema.customers.id, eventAggSub.customerId))
      .where(eq(schema.customers.orgId, orgId))
      .groupBy(hsSub.riskTier);

    const segments = {
      low: { total: 0, dashboard: 0, alerts: 0, integrations: 0, playbooks: 0 },
      medium: { total: 0, dashboard: 0, alerts: 0, integrations: 0, playbooks: 0 },
      high: { total: 0, dashboard: 0, alerts: 0, integrations: 0, playbooks: 0 },
      critical: { total: 0, dashboard: 0, alerts: 0, integrations: 0, playbooks: 0 },
    };

    for (const row of adoptionRows) {
      const tier = row.riskTier as keyof typeof segments;
      if (tier in segments) {
        segments[tier] = {
          total: row.totalCustomers,
          dashboard: row.dashboardCount,
          alerts: row.alertsCount,
          integrations: row.integrationsCount,
          playbooks: row.playbooksCount,
        };
      }
    }

    const result = Object.entries(segments).map(([tier, counts]) => {
      const total = counts.total;
      return {
        tier,
        dashboard: total > 0 ? Math.round((counts.dashboard / total) * 100) : 0,
        alerts: total > 0 ? Math.round((counts.alerts / total) * 100) : 0,
        integrations: total > 0 ? Math.round((counts.integrations / total) * 100) : 0,
        playbooks: total > 0 ? Math.round((counts.playbooks / total) * 100) : 0,
      };
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/analytics/cohort-retention
 * Groups customers into cohorts by their signup month.
 * Calculates active retention rate at Month 1, Month 3, Month 6, and Month 12.
 */
router.get('/cohort-retention', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user!.org_id;

    // 1. Get all customers for the org
    const customersList = await db
      .select()
      .from(schema.customers)
      .where(eq(schema.customers.orgId, orgId));

    if (customersList.length === 0) {
      res.json([]);
      return;
    }

    // 2. Query customer interval flags
    const customerIntervals = await db
      .select({
        customerId: schema.customers.id,
        hasM1:
          sql<number>`max(case when ${schema.events.occurredAt} >= ${schema.customers.createdAt} + interval '0 days' and ${schema.events.occurredAt} <= ${schema.customers.createdAt} + interval '30 days' then 1 else 0 end)`.as(
            'has_m1',
          ),
        hasM3:
          sql<number>`max(case when ${schema.events.occurredAt} >= ${schema.customers.createdAt} + interval '60 days' and ${schema.events.occurredAt} <= ${schema.customers.createdAt} + interval '90 days' then 1 else 0 end)`.as(
            'has_m3',
          ),
        hasM6:
          sql<number>`max(case when ${schema.events.occurredAt} >= ${schema.customers.createdAt} + interval '150 days' and ${schema.events.occurredAt} <= ${schema.customers.createdAt} + interval '180 days' then 1 else 0 end)`.as(
            'has_m6',
          ),
        hasM12:
          sql<number>`max(case when ${schema.events.occurredAt} >= ${schema.customers.createdAt} + interval '330 days' and ${schema.events.occurredAt} <= ${schema.customers.createdAt} + interval '360 days' then 1 else 0 end)`.as(
            'has_m12',
          ),
      })
      .from(schema.customers)
      .leftJoin(schema.events, eq(schema.customers.id, schema.events.customerId))
      .where(eq(schema.customers.orgId, orgId))
      .groupBy(schema.customers.id);

    const intervalLookup = new Map<string, (typeof customerIntervals)[0]>();
    for (const row of customerIntervals) {
      intervalLookup.set(row.customerId, row);
    }

    // 3. Group customers by cohort key (YYYY-MM)
    const cohorts: Record<
      string,
      {
        label: string;
        customers: typeof customersList;
      }
    > = {};

    for (const customer of customersList) {
      const date = new Date(customer.createdAt!);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      if (!cohorts[key]) {
        cohorts[key] = { label, customers: [] };
      }
      cohorts[key].customers.push(customer);
    }

    const sortedKeys = Object.keys(cohorts).sort();
    const intervals = [
      { key: 'm1', start: 0, field: 'hasM1' as const },
      { key: 'm3', start: 60, field: 'hasM3' as const },
      { key: 'm6', start: 150, field: 'hasM6' as const },
      { key: 'm12', start: 330, field: 'hasM12' as const },
    ];

    const result = [];
    const now = new Date();

    for (const key of sortedKeys) {
      const cohort = cohorts[key];
      const row: Record<string, any> = {
        cohortMonth: cohort.label,
        newAccounts: cohort.customers.length,
      };

      for (const interval of intervals) {
        let eligibleCount = 0;
        let activeCount = 0;

        for (const customer of cohort.customers) {
          const createdAt = new Date(customer.createdAt!);
          const msSinceSignup = now.getTime() - createdAt.getTime();
          const daysSinceSignup = msSinceSignup / (24 * 3600 * 1000);

          if (daysSinceSignup >= interval.start) {
            eligibleCount++;
            const flags = intervalLookup.get(customer.id);
            if (flags && flags[interval.field] === 1) {
              activeCount++;
            }
          }
        }

        if (eligibleCount === 0) {
          row[interval.key] = null;
        } else {
          row[interval.key] = Math.round((activeCount / eligibleCount) * 100);
        }
      }

      result.push(row);
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
