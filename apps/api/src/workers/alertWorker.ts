import cron, { ScheduledTask } from 'node-cron';
import nodemailer from 'nodemailer';
import { db, schema } from '../lib/db.js';
import { eq, and, gte, lte, lt, gt, desc, asc, sql } from 'drizzle-orm';
import { decryptConfig } from '../lib/crypto.js';
import { logger } from '../lib/logger.js';
import { ConfigurationError, WorkerError, toAppError } from '../lib/errors.js';
import {
  isAlertSuppressed,
  evaluateDefaultRule,
  evaluateRuleConditions,
  resolveSlackEmoji,
  RuleCondition,
} from '../lib/alertRules.js';

// Nodemailer transport initialization
const host = process.env.SMTP_HOST;
const port = parseInt(process.env.SMTP_PORT || '2525', 10);
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;

if (!host && process.env.NODE_ENV !== 'test') {
  logger.warn('SMTP_HOST is not set. Email delivery will be unavailable.');
}

const transportOptions: nodemailer.TransportOptions | any = {
  host: host || 'smtp.mailtrap.io',
  port,
};

if (user && pass && user !== 'your-smtp-username' && pass !== 'your-smtp-password') {
  transportOptions.auth = { user, pass };
}

export const transporter = nodemailer.createTransport(transportOptions);

export async function checkAndDeliverAlerts(): Promise<void> {
  logger.info('[AlertWorker] Checking health scores against configurations & custom rules...');
  try {
    const orgs = (await db.select().from(schema.organizations)) as Array<{ id: string }>;

    for (const org of orgs) {
      const customRules = await db
        .select()
        .from(schema.alertRules)
        .where(and(eq(schema.alertRules.orgId, org.id), eq(schema.alertRules.isActive, true)));

      let alertConfig = (await db
        .select()
        .from(schema.alertConfigs)
        .where(eq(schema.alertConfigs.orgId, org.id))
        .limit(1)
        .then((rows) => rows[0])) as any;

      if (!alertConfig) {
        alertConfig = {
          id: 'default',
          orgId: org.id,
          threshold: 40,
          notifySlack: false,
          notifyEmail: false,
          updatedAt: new Date(),
        };
      }

      const customersList = (await db
        .select()
        .from(schema.customers)
        .where(eq(schema.customers.orgId, org.id))) as Array<{
        id: string;
        name: string;
        email: string;
        company: string;
      }>;

      for (const customer of customersList) {
        const latestScore = await db
          .select()
          .from(schema.healthScores)
          .where(eq(schema.healthScores.customerId, customer.id))
          .orderBy(desc(schema.healthScores.scoredAt))
          .limit(1)
          .then((rows) => rows[0]);

        if (!latestScore) continue;

        const rulesToEvaluate =
          customRules.length > 0
            ? customRules
            : [
                {
                  id: 'default-rule',
                  name: 'Default Health Threshold Rule',
                  conditions: [
                    {
                      type: 'score_below',
                      threshold: alertConfig.threshold ?? 40,
                      priority: 'warning' as const,
                    },
                  ],
                },
              ];

        for (const rule of rulesToEvaluate) {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

          const recentAlerts = await db
            .select()
            .from(schema.alerts)
            .where(
              and(
                eq(schema.alerts.customerId, customer.id),
                gte(schema.alerts.triggeredAt, sevenDaysAgo),
              ),
            );

          if (isAlertSuppressed(recentAlerts, rule.id)) {
            continue;
          }

          let evaluation = {
            triggered: false,
            priority: 'warning' as 'info' | 'warning' | 'critical',
            reason: '',
          };

          if (rule.id === 'default-rule') {
            evaluation = evaluateDefaultRule(latestScore, alertConfig.threshold ?? 40);
          } else {
            const conditions = (rule.conditions as RuleCondition[]) || [];
            let pastScore: { score: number } | null = null;
            let recentLoginsCount = 1;

            const hasDropCondition = conditions.some((c) => c.type === 'score_drop');
            if (hasDropCondition) {
              const dropCond = conditions.find((c) => c.type === 'score_drop');
              const days = dropCond?.days || 7;
              const cutoff = new Date();
              cutoff.setDate(cutoff.getDate() - days);

              pastScore = await db
                .select()
                .from(schema.healthScores)
                .where(
                  and(
                    eq(schema.healthScores.customerId, customer.id),
                    gte(schema.healthScores.scoredAt, cutoff),
                  ),
                )
                .orderBy(asc(schema.healthScores.scoredAt))
                .limit(1)
                .then((rows) => rows[0] || null);
            }

            const hasInactivityCondition = conditions.some((c) => c.type === 'inactivity');
            if (hasInactivityCondition) {
              const inactCond = conditions.find((c) => c.type === 'inactivity');
              const days = inactCond?.days || 10;
              const cutoff = new Date();
              cutoff.setDate(cutoff.getDate() - days);

              const recentLogins = await db
                .select()
                .from(schema.events)
                .where(
                  and(
                    eq(schema.events.customerId, customer.id),
                    gte(schema.events.occurredAt, cutoff),
                    sql`${schema.events.eventType} IN ('login', 'user.login', 'identify')`,
                  ),
                )
                .limit(1);

              recentLoginsCount = recentLogins.length;
            }

            evaluation = evaluateRuleConditions(
              conditions,
              latestScore,
              pastScore,
              recentLoginsCount,
            );
          }

          if (evaluation.triggered) {
            logger.info(
              {
                orgId: org.id,
                customerId: customer.id,
                ruleName: rule.name,
                priority: evaluation.priority,
              },
              `[AlertWorker] Rule '${rule.name}' triggered for customer ${customer.name}`,
            );

            const [alert] = await db
              .insert(schema.alerts)
              .values({
                orgId: org.id,
                customerId: customer.id,
                scoreAtTrigger: latestScore.score,
                deliveryChannels: {
                  slack: alertConfig.notifySlack || false,
                  email: alertConfig.notifyEmail || false,
                  ruleId: rule.id,
                  priority: evaluation.priority,
                  reason: evaluation.reason || 'Custom alert rule conditions met.',
                },
                acknowledged: false,
              })
              .returning();

            const channelsDelivered = { slack: false, email: false };
            const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/customers/${customer.id}`;
            const slackEmoji = resolveSlackEmoji(evaluation.priority);

            let slackWebhookUrl = process.env.SLACK_WEBHOOK_URL || '';

            if (alertConfig.notifySlack) {
              try {
                const slackIntegration = await db
                  .select()
                  .from(schema.integrations)
                  .where(
                    and(
                      eq(schema.integrations.orgId, org.id),
                      eq(schema.integrations.provider, 'slack'),
                      eq(schema.integrations.status, 'active'),
                    ),
                  )
                  .limit(1)
                  .then((rows) => rows[0]);

                if (slackIntegration && slackIntegration.config) {
                  const decryptedConfig = decryptConfig(
                    slackIntegration.config as Record<string, any>,
                  );
                  if (decryptedConfig.slackWebhookUrl) {
                    slackWebhookUrl = decryptedConfig.slackWebhookUrl;
                  }
                }
              } catch (err: unknown) {
                logger.error(
                  { orgId: org.id, err: toAppError(err) },
                  `[AlertWorker] Error resolving Slack integration for org ${org.id}`,
                );
              }
            }

            if (alertConfig.notifySlack && slackWebhookUrl) {
              try {
                const slackPayload = {
                  blocks: [
                    {
                      type: 'header',
                      text: {
                        type: 'plain_text',
                        text: `${slackEmoji} RetentIQ Churn Risk Alert (${evaluation.priority.toUpperCase()})`,
                        emoji: true,
                      },
                    },
                    {
                      type: 'section',
                      fields: [
                        { type: 'mrkdwn', text: `*Rule:* ${rule.name}` },
                        { type: 'mrkdwn', text: `*Customer:* ${customer.name}` },
                        { type: 'mrkdwn', text: `*Company:* ${customer.company}` },
                        { type: 'mrkdwn', text: `*Health Score:* \`${latestScore.score}/100\`` },
                        {
                          type: 'mrkdwn',
                          text: `*Reason:* ${evaluation.reason || 'Conditions met.'}`,
                        },
                      ],
                    },
                    {
                      type: 'actions',
                      elements: [
                        {
                          type: 'button',
                          text: { type: 'plain_text', text: 'View Customer →', emoji: true },
                          url: dashboardUrl,
                          style: evaluation.priority === 'critical' ? 'danger' : 'primary',
                        },
                      ],
                    },
                  ],
                };

                const slackRes = await fetch(slackWebhookUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(slackPayload),
                });

                if (slackRes.ok) {
                  channelsDelivered.slack = true;
                }
              } catch (slackErr: unknown) {
                logger.error({ err: toAppError(slackErr) }, `[AlertWorker] Slack alert failed`);
              }
            }

            let priorityColor = '#F59E0B';
            if (evaluation.priority === 'critical') priorityColor = '#EF4444';
            else if (evaluation.priority === 'info') priorityColor = '#3B82F6';

            if (alertConfig.notifyEmail) {
              try {
                const emailHtml = `
                  <!DOCTYPE html>
                  <html>
                  <body style="font-family: sans-serif; background-color: #F8FAFC; padding: 20px; color: #1E293B;">
                    <div style="background-color: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8F0; padding: 32px; max-width: 550px; margin: 0 auto;">
                      <div style="font-size: 20px; font-weight: bold; color: ${priorityColor}; margin-bottom: 24px; border-bottom: 1px solid #F1F5F9; padding-bottom: 16px;">
                        ${slackEmoji} RetentIQ Alert (${evaluation.priority.toUpperCase()})
                      </div>
                      <div style="font-size: 16px; font-weight: bold; margin-bottom: 20px;">
                        ${customer.name} from <strong>${customer.company}</strong> has triggered an alert.
                      </div>
                      <div style="font-size: 12px; text-transform: uppercase; color: #64748B; font-weight: bold;">
                        Rule Triggered
                      </div>
                      <div style="font-size: 15px; margin-top: 4px; margin-bottom: 20px; font-weight: bold;">
                        ${rule.name}
                      </div>
                      <div style="font-size: 12px; text-transform: uppercase; color: #64748B; font-weight: bold;">
                        Current Health Score
                      </div>
                      <div style="font-size: 48px; font-weight: 900; color: ${priorityColor}; margin-top: 8px; margin-bottom: 24px;">
                        ${latestScore.score}/100
                      </div>
                      <div style="font-size: 12px; text-transform: uppercase; color: #64748B; font-weight: bold;">
                        Reason
                      </div>
                      <p style="font-size: 14px; color: #475569; margin-top: 4px; margin-bottom: 24px;">
                        ${evaluation.reason || 'Conditions met.'}
                      </p>
                      <a href="${dashboardUrl}" style="display: inline-block; background-color: #0F172A; color: #FFFFFF; font-weight: bold; font-size: 13px; padding: 12px 24px; border-radius: 8px; text-decoration: none;">
                        View in Dashboard &rarr;
                      </a>
                    </div>
                  </body>
                  </html>
                `;

                await transporter.sendMail({
                  from: process.env.SMTP_FROM || 'noreply@retentiq.io',
                  to: customer.email,
                  subject: `[RetentIQ ${evaluation.priority.toUpperCase()}] Churn Risk: ${customer.company}`,
                  html: emailHtml,
                });

                channelsDelivered.email = true;
              } catch (emailErr: unknown) {
                logger.error({ err: toAppError(emailErr) }, `[AlertWorker] Email alert failed`);
              }
            }

            await db
              .update(schema.alerts)
              .set({
                deliveryChannels: {
                  slack: channelsDelivered.slack,
                  email: channelsDelivered.email,
                  ruleId: rule.id,
                  priority: evaluation.priority,
                  reason: evaluation.reason || 'Custom alert rule conditions met.',
                  delivered_at: new Date().toISOString(),
                },
              })
              .where(eq(schema.alerts.id, alert.id));
          }
        }
      }
    }
  } catch (err: unknown) {
    logger.error({ err: toAppError(err) }, '[AlertWorker] Error checking alerts');
  }
}

export async function verifyRoiRecoveries(): Promise<void> {
  logger.info('[AlertWorker] Running ROI recovery validation check...');
  try {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const completedTasks = await db
      .select()
      .from(schema.tasks)
      .where(
        and(
          eq(schema.tasks.status, 'completed'),
          eq(schema.tasks.outcome, 'positive'),
          gte(schema.tasks.completedAt, ninetyDaysAgo),
        ),
      );

    for (const task of completedTasks) {
      const customerId = task.customerId;
      const orgId = task.orgId;
      const actionTime = task.completedAt!;

      const thirtyDaysBefore = new Date(actionTime.getTime());
      thirtyDaysBefore.setDate(thirtyDaysBefore.getDate() - 30);

      const criticalScore = await db
        .select()
        .from(schema.healthScores)
        .where(
          and(
            eq(schema.healthScores.customerId, customerId),
            eq(schema.healthScores.orgId, orgId),
            lt(schema.healthScores.score, 40),
            gte(schema.healthScores.scoredAt, thirtyDaysBefore),
            lte(schema.healthScores.scoredAt, actionTime),
          ),
        )
        .limit(1)
        .then((rows) => rows[0]);

      if (!criticalScore) continue;

      const ninetyDaysAfter = new Date(actionTime.getTime());
      ninetyDaysAfter.setDate(ninetyDaysAfter.getDate() + 90);

      const recoveryScore = await db
        .select()
        .from(schema.healthScores)
        .where(
          and(
            eq(schema.healthScores.customerId, customerId),
            eq(schema.healthScores.orgId, orgId),
            gte(schema.healthScores.score, 60),
            gt(schema.healthScores.scoredAt, actionTime),
            lte(schema.healthScores.scoredAt, ninetyDaysAfter),
          ),
        )
        .limit(1)
        .then((rows) => rows[0]);

      if (recoveryScore) {
        const actionType = `Task: ${task.title}`;
        const existingAction = await db
          .select()
          .from(schema.retentionActions)
          .where(
            and(
              eq(schema.retentionActions.customerId, customerId),
              eq(schema.retentionActions.actionType, actionType),
            ),
          )
          .limit(1)
          .then((rows) => rows[0]);

        if (!existingAction) {
          const customer = await db
            .select()
            .from(schema.customers)
            .where(eq(schema.customers.id, customerId))
            .limit(1)
            .then((rows) => rows[0]);

          const mrr = customer?.mrr || '0.00';

          logger.info(
            { customerId, orgId, score: recoveryScore.score },
            `[AlertWorker] ROI SAVED account validated! Customer recovered.`,
          );
          await db.insert(schema.retentionActions).values({
            orgId,
            customerId,
            actionType,
            outcome: 'recovered',
            revenueSaved: mrr,
            actionedAt: actionTime,
          });
        }
      }
    }
  } catch (err: unknown) {
    logger.error({ err: toAppError(err) }, '[AlertWorker] ROI recovery validation failed');
  }
}

export async function runRoiAggregation(): Promise<void> {
  logger.info('[AlertWorker] Running ROI aggregation task...');
  try {
    await verifyRoiRecoveries();

    const rawAggregates = await db
      .select({
        orgId: schema.retentionActions.orgId,
        month: sql<string>`to_char(${schema.retentionActions.actionedAt}, 'YYYY-MM')`,
        accountsSaved: sql<number>`count(distinct case when ${schema.retentionActions.outcome} in ('success', 'completed', 'recovered') then ${schema.retentionActions.customerId} else null end)::int`,
        revenueSaved: sql<string>`coalesce(sum(case when ${schema.retentionActions.outcome} in ('success', 'completed', 'recovered') then ${schema.retentionActions.revenueSaved} else 0 end), 0)::text`,
      })
      .from(schema.retentionActions)
      .groupBy(
        schema.retentionActions.orgId,
        sql`to_char(${schema.retentionActions.actionedAt}, 'YYYY-MM')`,
      );

    for (const agg of rawAggregates) {
      if (!agg.orgId || !agg.month) continue;

      const existing = await db
        .select()
        .from(schema.roiAggregates)
        .where(
          and(eq(schema.roiAggregates.orgId, agg.orgId), eq(schema.roiAggregates.month, agg.month)),
        )
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(schema.roiAggregates)
          .set({
            accountsSaved: agg.accountsSaved,
            revenueSaved: agg.revenueSaved,
            updatedAt: new Date(),
          })
          .where(eq(schema.roiAggregates.id, existing[0].id));
      } else {
        await db.insert(schema.roiAggregates).values({
          orgId: agg.orgId,
          month: agg.month,
          accountsSaved: agg.accountsSaved,
          revenueSaved: agg.revenueSaved,
        });
      }
    }
    logger.info('[AlertWorker] ROI aggregation completed successfully.');
  } catch (err: unknown) {
    logger.error({ err: toAppError(err) }, '[AlertWorker] ROI aggregation failed');
  }
}

export async function checkIntegrationsHealth(): Promise<void> {
  logger.info('[AlertWorker] Checking integrations health (last sync check)...');
  try {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setDate(twentyFourHoursAgo.getDate() - 1);

    const activeIntegrations = await db
      .select({
        id: schema.integrations.id,
        orgId: schema.integrations.orgId,
        provider: schema.integrations.provider,
        status: schema.integrations.status,
        lastSyncedAt: schema.integrations.lastSyncedAt,
      })
      .from(schema.integrations)
      .where(eq(schema.integrations.status, 'active'));

    for (const integration of activeIntegrations) {
      const lastSync = integration.lastSyncedAt ? new Date(integration.lastSyncedAt) : null;
      if (!lastSync || lastSync < twentyFourHoursAgo) {
        logger.warn(
          { orgId: integration.orgId, provider: integration.provider },
          `[AlertWorker] Integration has not synced for > 24 hours.`,
        );

        const admins = await db
          .select({ email: schema.users.email, name: schema.users.name })
          .from(schema.users)
          .where(
            and(
              eq(schema.users.orgId, integration.orgId),
              sql`${schema.users.role} IN ('owner', 'admin')`,
            ),
          );

        if (admins.length > 0) {
          const emailHtml = `
            <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
              <h2 style="color: #ef4444;">⚠️ Integration Sync Failure Alert</h2>
              <p>Your <strong>${integration.provider}</strong> integration has not successfully synced data in the last 24 hours.</p>
              <p>Please log in to your dashboard to verify API keys and credentials.</p>
              <p style="margin: 20px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/integrations" style="background-color: #0f172a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold;">Check Integration Status</a>
              </p>
            </div>
          `;

          for (const admin of admins) {
            try {
              await transporter.sendMail({
                from: process.env.SMTP_FROM || 'noreply@retentiq.io',
                to: admin.email,
                subject: `[RetentIQ Alert] Integration Sync Failed: ${integration.provider}`,
                html: emailHtml,
              });
              logger.info(
                { email: admin.email },
                `[AlertWorker] Dispatched sync failure notification`,
              );
            } catch (err: unknown) {
              logger.error(
                { err: toAppError(err), email: admin.email },
                `[AlertWorker] Failed to email sync alert`,
              );
            }
          }
        }
      }
    }
  } catch (err: unknown) {
    logger.error({ err: toAppError(err) }, '[AlertWorker] Error checking integrations health');
  }
}

export async function sendWeeklyEmailDigest(): Promise<void> {
  logger.info('[AlertWorker] Compiling weekly Monday morning email digests...');
  try {
    const orgs = await db.select().from(schema.organizations);
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    for (const org of orgs) {
      const criticalAccounts = await db
        .select({
          name: schema.customers.name,
          company: schema.customers.company,
          score: schema.healthScores.score,
        })
        .from(schema.customers)
        .innerJoin(schema.healthScores, eq(schema.customers.id, schema.healthScores.customerId))
        .where(
          and(
            eq(schema.customers.orgId, org.id),
            sql`${schema.healthScores.score} < 40`,
            gte(schema.healthScores.scoredAt, oneWeekAgo),
          ),
        );

      const uniqueCriticalMap = new Map<string, (typeof criticalAccounts)[0]>();
      for (const row of criticalAccounts) {
        if (!uniqueCriticalMap.has(row.name)) uniqueCriticalMap.set(row.name, row);
      }
      const uniqueCriticalList = Array.from(uniqueCriticalMap.values());

      const improvements = await db
        .select({
          name: schema.customers.name,
          company: schema.customers.company,
          revenueSaved: schema.retentionActions.revenueSaved,
        })
        .from(schema.retentionActions)
        .innerJoin(schema.customers, eq(schema.retentionActions.customerId, schema.customers.id))
        .where(
          and(
            eq(schema.retentionActions.orgId, org.id),
            gte(schema.retentionActions.actionedAt, oneWeekAgo),
          ),
        );

      const members = await db.select().from(schema.users).where(eq(schema.users.orgId, org.id));
      if (members.length === 0) continue;

      const criticalRowsHtml =
        uniqueCriticalList.length > 0
          ? uniqueCriticalList
              .map(
                (c) =>
                  `<tr><td style="padding: 8px; border-bottom: 1px solid #E2E8F0;">${c.name} (${c.company})</td><td style="padding: 8px; border-bottom: 1px solid #E2E8F0; color: #EF4444; font-weight: bold;">${c.score}</td></tr>`,
              )
              .join('')
          : '<tr><td colspan="2" style="padding: 8px; color: #64748B;">No new Critical accounts this week! 🎉</td></tr>';

      const improvementRowsHtml =
        improvements.length > 0
          ? improvements
              .map(
                (c) =>
                  `<tr><td style="padding: 8px; border-bottom: 1px solid #E2E8F0;">${c.name} (${c.company})</td><td style="padding: 8px; border-bottom: 1px solid #E2E8F0; color: #10B981; font-weight: bold;">$${c.revenueSaved} saved</td></tr>`,
              )
              .join('')
          : '<tr><td colspan="2" style="padding: 8px; color: #64748B;">No actions recorded.</td></tr>';

      const digestHtml = `
        <!DOCTYPE html>
        <html>
        <body style="font-family: sans-serif; color: #1e293b; background-color: #f8fafc; padding: 20px;">
          <div style="background-color: white; border: 1px solid #e2e8f0; border-radius: 12px; max-width: 600px; margin: 0 auto; padding: 32px;">
            <h2 style="color: #4f46e5; border-bottom: 1px solid #e2e8f0; padding-bottom: 16px;">Weekly RetentIQ Digest</h2>
            <p>Here is your weekly customer success summary for the week ending ${new Date().toLocaleDateString()}:</p>
            <h3 style="color: #ef4444; margin-top: 24px;">🔴 Critical Risk Accounts</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background-color: #f1f5f9; text-align: left;"><th style="padding: 8px;">Customer</th><th style="padding: 8px;">Score</th></tr>
              </thead>
              <tbody>${criticalRowsHtml}</tbody>
            </table>
            <h3 style="color: #10b981; margin-top: 24px;">💚 Recoveries & Interventions</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background-color: #f1f5f9; text-align: left;"><th style="padding: 8px;">Customer</th><th style="padding: 8px;">Outcome</th></tr>
              </thead>
              <tbody>${improvementRowsHtml}</tbody>
            </table>
            <div style="margin-top: 32px; font-size: 12px; color: #94a3b8; text-align: center;">
              Sent by RetentIQ Intelligence Platform.
            </div>
          </div>
        </body>
        </html>
      `;

      for (const member of members) {
        try {
          await transporter.sendMail({
            from: process.env.SMTP_FROM || 'noreply@retentiq.io',
            to: member.email,
            subject: `[RetentIQ] Your Weekly Customer Success Digest`,
            html: digestHtml,
          });
          logger.info({ email: member.email }, `[AlertWorker] Dispatched weekly digest email`);
        } catch (e: unknown) {
          logger.error(
            { err: toAppError(e), email: member.email },
            `[AlertWorker] Failed to send digest`,
          );
        }
      }
    }
  } catch (err: unknown) {
    logger.error({ err: toAppError(err) }, '[AlertWorker] Weekly digest compiling failed');
  }
}

export async function triggerModelRetrain(): Promise<void> {
  logger.info('[AlertWorker] Triggering model retraining...');
  try {
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    const res = await fetch(`${aiServiceUrl}/model/retrain`, {
      method: 'POST',
    });
    if (!res.ok) {
      throw new WorkerError(`AI Service retraining returned status ${res.status}`);
    }
    logger.info('[AlertWorker] Model retraining triggered successfully.');
  } catch (err: unknown) {
    logger.error({ err: toAppError(err) }, '[AlertWorker] Model retraining trigger failed');
  }
}

let scheduledTasks: ScheduledTask[] = [];

export function stopAlertWorker() {
  logger.info('[AlertWorker] Stopping background cron jobs...');
  for (const task of scheduledTasks) {
    try {
      task.stop();
    } catch (e: unknown) {
      logger.error({ err: toAppError(e) }, '[AlertWorker] Failed to stop cron task');
    }
  }
  scheduledTasks = [];
}

export function startAlertWorker() {
  stopAlertWorker();

  if (process.env.DISABLE_BACKGROUND_WORKERS === 'true') {
    logger.info('[AlertWorker] Background cron workers disabled via DISABLE_BACKGROUND_WORKERS.');
    return;
  }

  logger.info('[AlertWorker] Initializing alert delivery cron job (running every 5 minutes)...');
  const task1 = cron.schedule('*/5 * * * *', async () => {
    try {
      await checkAndDeliverAlerts();
    } catch (err: unknown) {
      logger.error({ err: toAppError(err) }, '[AlertWorker] Cron job execution failed');
    }
  });
  scheduledTasks.push(task1);

  const task2 = cron.schedule('*/5 * * * *', async () => {
    try {
      await runRoiAggregation();
    } catch (err: unknown) {
      logger.error({ err: toAppError(err) }, '[AlertWorker] ROI aggregation cron failed');
    }
  });
  scheduledTasks.push(task2);

  const task3 = cron.schedule('0 * * * *', async () => {
    try {
      await checkIntegrationsHealth();
    } catch (err: unknown) {
      logger.error({ err: toAppError(err) }, '[AlertWorker] Integrations health check cron failed');
    }
  });
  scheduledTasks.push(task3);

  const task4 = cron.schedule('0 0 * * 0', async () => {
    try {
      await triggerModelRetrain();
    } catch (err: unknown) {
      logger.error({ err: toAppError(err) }, '[AlertWorker] Weekly retraining cron failed');
    }
  });
  scheduledTasks.push(task4);

  const task5 = cron.schedule('0 8 * * 1', async () => {
    try {
      await sendWeeklyEmailDigest();
    } catch (err: unknown) {
      logger.error({ err: toAppError(err) }, '[AlertWorker] Weekly digest cron failed');
    }
  });
  scheduledTasks.push(task5);
}
