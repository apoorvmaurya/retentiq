import cron from 'node-cron';
import nodemailer from 'nodemailer';
import { db, schema } from '../lib/db.js';
import { eq, and, gte, lte, lt, gt, desc, asc, sql } from 'drizzle-orm';

// Nodemailer transport initialization
const host = process.env.SMTP_HOST || 'smtp.mailtrap.io';
const port = parseInt(process.env.SMTP_PORT || '2525', 10);
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;

const transportOptions: any = {
  host,
  port,
};

if (user && pass && user !== 'your-smtp-username' && pass !== 'your-smtp-password') {
  transportOptions.auth = { user, pass };
}

const transporter = nodemailer.createTransport(transportOptions);

export async function checkAndDeliverAlerts(): Promise<void> {
  console.log('[AlertWorker] Checking health scores against configurations & custom rules...');
  try {
    const orgs = (await db.select().from(schema.organizations)) as any[];

    for (const org of orgs) {
      // 1. Fetch custom alert rules for this organization
      const customRules = await db
        .select()
        .from(schema.alertRules)
        .where(and(eq(schema.alertRules.orgId, org.id), eq(schema.alertRules.isActive, true)));

      // Fetch alert config (for default settings fallback)
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
        .where(eq(schema.customers.orgId, org.id))) as any[];

      for (const customer of customersList) {
        // Get latest health score
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
                      priority: 'warning',
                    },
                  ],
                },
              ];

        for (const rule of rulesToEvaluate) {
          // Cooldown suppression check: 7 days default
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

          // Check if this specific rule was triggered recently
          const isSuppressed = recentAlerts.some((a: any) => {
            const channels = a.deliveryChannels as any;
            return channels && channels.ruleId === rule.id;
          });

          if (isSuppressed) {
            continue; // Snoozed!
          }

          // Evaluate conditions
          const conditions = (rule.conditions as any[]) || [];
          let ruleTriggered = false;
          let rulePriority = 'warning'; // default
          let triggerReason = '';

          if (rule.id === 'default-rule') {
            // Fallback rule evaluation
            if (latestScore.score < (alertConfig.threshold ?? 40)) {
              ruleTriggered = true;
              rulePriority = 'warning';
              triggerReason = `Health score (${latestScore.score}) dropped below default threshold (${alertConfig.threshold ?? 40})`;
            }
          } else {
            // Evaluate custom rule conditions (AND logic: all conditions must match)
            let allMatch = conditions.length > 0;
            for (const cond of conditions) {
              if (cond.priority) rulePriority = cond.priority;

              if (cond.type === 'score_below') {
                if (!(latestScore.score < cond.threshold)) {
                  allMatch = false;
                } else {
                  triggerReason += `Score below ${cond.threshold}. `;
                }
              } else if (cond.type === 'score_drop') {
                const days = cond.days || 7;
                const dropThreshold = cond.drop || 15;
                const cutoff = new Date();
                cutoff.setDate(cutoff.getDate() - days);

                const pastScore = await db
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
                  .then((rows) => rows[0]);

                if (pastScore && pastScore.score - latestScore.score >= dropThreshold) {
                  triggerReason += `Score dropped by ${pastScore.score - latestScore.score} points in ${days} days. `;
                } else {
                  allMatch = false;
                }
              } else if (cond.type === 'inactivity') {
                const inactiveDays = cond.days || 10;
                const cutoff = new Date();
                cutoff.setDate(cutoff.getDate() - inactiveDays);

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

                if (recentLogins.length === 0) {
                  triggerReason += `No logins in last ${inactiveDays} days. `;
                } else {
                  allMatch = false;
                }
              } else {
                allMatch = false;
              }
            }
            ruleTriggered = allMatch;
          }

          if (ruleTriggered) {
            console.log(
              `[AlertWorker] Rule '${rule.name}' triggered for customer ${customer.name} (Priority: ${rulePriority})`,
            );

            // 1. Insert alert
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
                  priority: rulePriority,
                  reason: triggerReason || 'Custom alert rule conditions met.',
                },
                acknowledged: false,
              })
              .returning();

            const channelsDelivered = { slack: false, email: false };
            const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/customers/${customer.id}`;

            // Slack theme colors/formatting
            let slackEmoji = '⚠️';
            if (rulePriority === 'critical') slackEmoji = '🚨';
            else if (rulePriority === 'info') slackEmoji = 'ℹ️';

            if (alertConfig.notifySlack && process.env.SLACK_WEBHOOK_URL) {
              try {
                const slackPayload = {
                  blocks: [
                    {
                      type: 'header',
                      text: {
                        type: 'plain_text',
                        text: `${slackEmoji} RetentIQ Churn Risk Alert (${rulePriority.toUpperCase()})`,
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
                        { type: 'mrkdwn', text: `*Reason:* ${triggerReason || 'Conditions met.'}` },
                      ],
                    },
                    {
                      type: 'actions',
                      elements: [
                        {
                          type: 'button',
                          text: { type: 'plain_text', text: 'View Customer →', emoji: true },
                          url: dashboardUrl,
                          style: rulePriority === 'critical' ? 'danger' : 'primary',
                        },
                      ],
                    },
                  ],
                };

                const slackRes = await fetch(process.env.SLACK_WEBHOOK_URL, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(slackPayload),
                });

                if (slackRes.ok) {
                  channelsDelivered.slack = true;
                }
              } catch (slackErr: any) {
                console.error(`[AlertWorker] Slack alert failed: ${slackErr.message}`);
              }
            }

            // Email Priority Colors
            let priorityColor = '#F59E0B'; // Warning
            if (rulePriority === 'critical') priorityColor = '#EF4444';
            else if (rulePriority === 'info') priorityColor = '#3B82F6';

            if (alertConfig.notifyEmail) {
              try {
                const emailHtml = `
                  <!DOCTYPE html>
                  <html>
                  <body style="font-family: sans-serif; background-color: #F8FAFC; padding: 20px; color: #1E293B;">
                    <div style="background-color: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8F0; padding: 32px; max-width: 550px; margin: 0 auto;">
                      <div style="font-size: 20px; font-weight: bold; color: ${priorityColor}; margin-bottom: 24px; border-bottom: 1px solid #F1F5F9; padding-bottom: 16px;">
                        ${slackEmoji} RetentIQ Alert (${rulePriority.toUpperCase()})
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
                        ${triggerReason || 'Conditions met.'}
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
                  subject: `[RetentIQ ${rulePriority.toUpperCase()}] Churn Risk: ${customer.company}`,
                  html: emailHtml,
                });

                channelsDelivered.email = true;
              } catch (emailErr: any) {
                console.error(`[AlertWorker] Email alert failed: ${emailErr.message}`);
              }
            }

            // Update delivery state
            await db
              .update(schema.alerts)
              .set({
                deliveryChannels: {
                  slack: channelsDelivered.slack,
                  email: channelsDelivered.email,
                  ruleId: rule.id,
                  priority: rulePriority,
                  reason: triggerReason || 'Custom alert rule conditions met.',
                  delivered_at: new Date().toISOString(),
                },
              })
              .where(eq(schema.alerts.id, alert.id));
          }
        }
      }
    }
  } catch (err: any) {
    console.error('[AlertWorker] Error checking alerts:', err.message);
  }
}

export async function verifyRoiRecoveries(): Promise<void> {
  console.log('[AlertWorker] Running ROI recovery validation check...');
  try {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // 1. Find all completed tasks in last 90 days with positive outcome
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

      // 2. Check if customer had a critical score (< 40) in the 30 days before/at completion
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

      if (!criticalScore) {
        // Not a critical account at time of intervention, skip
        continue;
      }

      // 3. Look for a recovery score (>= 60) within 90 days after completion
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
        // Customer recovered! Let's check if we recorded a retention action for this task
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
          // Get customer's MRR
          const customer = await db
            .select()
            .from(schema.customers)
            .where(eq(schema.customers.id, customerId))
            .limit(1)
            .then((rows) => rows[0]);

          const mrr = customer?.mrr || '0.00';

          console.log(
            `[AlertWorker] ROI SAVED account validated! Customer ${customerId} recovered to ${recoveryScore.score} after task completion.`,
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
  } catch (err: any) {
    console.error('[AlertWorker] ROI recovery validation failed:', err.message);
  }
}

export async function runRoiAggregation(): Promise<void> {
  console.log('[AlertWorker] Running ROI aggregation task...');
  try {
    // Run recoveries check first
    await verifyRoiRecoveries();

    const rawAggregates = await db
      .select({
        orgId: schema.retentionActions.orgId,
        month: sql<string>`to_char(${schema.retentionActions.actionedAt}, 'YYYY-MM')`,
        accountsSaved: sql<number>`count(distinct ${schema.retentionActions.customerId})::int`,
        revenueSaved: sql<string>`coalesce(sum(${schema.retentionActions.revenueSaved}), 0)::text`,
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
    console.log('[AlertWorker] ROI aggregation completed successfully.');
  } catch (err: any) {
    console.error('[AlertWorker] ROI aggregation failed:', err.message);
  }
}

export async function checkIntegrationsHealth(): Promise<void> {
  console.log('[AlertWorker] Checking integrations health (last sync check)...');
  try {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setDate(twentyFourHoursAgo.getDate() - 1);

    // Fetch all active integrations
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
        console.warn(
          `[AlertWorker] Integration ${integration.provider} for org ${integration.orgId} has not synced for > 24 hours.`,
        );

        // Find organization owner or admin to notify
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
              console.log(`[AlertWorker] Dispatched sync failure notification to ${admin.email}`);
            } catch (err: any) {
              console.error(
                `[AlertWorker] Failed to email sync alert to ${admin.email}:`,
                err.message,
              );
            }
          }
        }
      }
    }
  } catch (err: any) {
    console.error('[AlertWorker] Error checking integrations health:', err.message);
  }
}

export async function sendWeeklyEmailDigest(): Promise<void> {
  console.log('[AlertWorker] Compiling weekly Monday morning email digests...');
  try {
    const orgs = await db.select().from(schema.organizations);
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    for (const org of orgs) {
      // 1. Find accounts that moved into Critical this week (score < 40)
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

      // 2. Find accounts that improved (interventions in last 7 days)
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

      // 3. Find upcoming renewals to watch (renewal proximity in next 60 days)
      const upcomingRenewals: any[] = [];
      const sixtyDaysFromNow = new Date();
      sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);

      const crmEvents = await db
        .select()
        .from(schema.events)
        .where(
          and(
            eq(schema.events.orgId, org.id),
            eq(schema.events.eventType, 'crm_sync'),
            gte(schema.events.occurredAt, oneWeekAgo),
          ),
        );

      const customerLatestCrm = new Map<string, any>();
      for (const event of crmEvents) {
        const payload = event.payload as any;
        if (payload && payload.renewal_date) {
          const renDate = new Date(payload.renewal_date);
          if (renDate >= new Date() && renDate <= sixtyDaysFromNow) {
            customerLatestCrm.set(event.customerId, {
              renewalDate: payload.renewal_date,
              nps: payload.nps_score || 'N/A',
            });
          }
        }
      }

      for (const [custEvId, details] of customerLatestCrm.entries()) {
        const cust = await db
          .select()
          .from(schema.customers)
          .where(eq(schema.customers.id, custEvId))
          .limit(1)
          .then((rows) => rows[0]);

        if (cust) {
          upcomingRenewals.push({
            name: cust.name,
            company: cust.company,
            renewalDate: new Date(details.renewalDate).toLocaleDateString(),
            nps: details.nps,
          });
        }
      }

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

      const renewalRowsHtml =
        upcomingRenewals.length > 0
          ? upcomingRenewals
              .map(
                (c) =>
                  `<tr><td style="padding: 8px; border-bottom: 1px solid #E2E8F0;">${c.name} (${c.company})</td><td style="padding: 8px; border-bottom: 1px solid #E2E8F0;">${c.renewalDate}</td></tr>`,
              )
              .join('')
          : '<tr><td colspan="2" style="padding: 8px; color: #64748B;">No renewals in the next 60 days.</td></tr>';

      const digestHtml = `
        <!DOCTYPE html>
        <html>
        <body style="font-family: sans-serif; color: #1e293b; background-color: #f8fafc; padding: 20px;">
          <div style="background-color: white; border: 1px solid #e2e8f0; border-radius: 12px; max-width: 600px; margin: 0 auto; padding: 32px;">
            <h2 style="color: #4f46e5; border-bottom: 1px solid #e2e8f0; padding-bottom: 16px;">Weekly ChurnRadar Digest</h2>
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

            <h3 style="color: #3b82f6; margin-top: 24px;">📅 Upcoming Renewals (60 Days)</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background-color: #f1f5f9; text-align: left;"><th style="padding: 8px;">Customer</th><th style="padding: 8px;">Renewal Date</th></tr>
              </thead>
              <tbody>${renewalRowsHtml}</tbody>
            </table>

            <div style="margin-top: 32px; font-size: 12px; color: #94a3b8; text-align: center;">
              Sent by ChurnRadar intelligence platform.
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
            subject: `[ChurnRadar] Your Weekly Customer Success Digest`,
            html: digestHtml,
          });
          console.log(`[AlertWorker] Dispatched weekly digest email to ${member.email}`);
        } catch (e: any) {
          console.error(`[AlertWorker] Failed to send digest to ${member.email}:`, e.message);
        }
      }
    }
  } catch (err: any) {
    console.error('[AlertWorker] Weekly digest compiling failed:', err.message);
  }
}

export async function triggerModelRetrain(): Promise<void> {
  console.log('[AlertWorker] Triggering model retraining...');
  try {
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    const res = await fetch(`${aiServiceUrl}/model/retrain`, {
      method: 'POST',
    });
    if (!res.ok) {
      throw new Error(`AI Service retraining returned status ${res.status}`);
    }
    console.log('[AlertWorker] Model retraining triggered successfully.');
  } catch (err: any) {
    console.error('[AlertWorker] Model retraining trigger failed:', err.message);
  }
}

let scheduledTasks: any[] = [];

export function stopAlertWorker() {
  console.log('[AlertWorker] Stopping background cron jobs...');
  for (const task of scheduledTasks) {
    try {
      task.stop();
    } catch (e: any) {
      console.error('[AlertWorker] Failed to stop cron task:', e.message);
    }
  }
  scheduledTasks = [];
}

export function startAlertWorker() {
  stopAlertWorker(); // Ensure clean state before scheduling

  console.log('[AlertWorker] Initializing alert delivery cron job (running every 5 minutes)...');
  const task1 = cron.schedule('*/5 * * * *', async () => {
    console.log('[AlertWorker] Cron triggered. Running health check...');
    try {
      await checkAndDeliverAlerts();
    } catch (err: any) {
      console.error('[AlertWorker] Cron job execution failed:', err.message);
    }
  });
  scheduledTasks.push(task1);

  console.log('[AlertWorker] Initializing ROI aggregation cron job (running every 5 minutes)...');
  const task2 = cron.schedule('*/5 * * * *', async () => {
    console.log('[AlertWorker] ROI Cron triggered. Running aggregation...');
    try {
      await runRoiAggregation();
    } catch (err: any) {
      console.error('[AlertWorker] ROI aggregation cron failed:', err.message);
    }
  });
  scheduledTasks.push(task2);

  console.log(
    '[AlertWorker] Initializing integrations health check cron job (running every hour)...',
  );
  const task3 = cron.schedule('0 * * * *', async () => {
    console.log('[AlertWorker] Health Cron triggered. Checking integrations...');
    try {
      await checkIntegrationsHealth();
    } catch (err: any) {
      console.error('[AlertWorker] Integrations health check cron failed:', err.message);
    }
  });
  scheduledTasks.push(task3);

  console.log(
    '[AlertWorker] Initializing weekly model retraining cron (running every Sunday at midnight)...',
  );
  const task4 = cron.schedule('0 0 * * 0', async () => {
    console.log('[AlertWorker] Retraining Cron triggered.');
    try {
      await triggerModelRetrain();
    } catch (err: any) {
      console.error('[AlertWorker] Weekly retraining cron failed:', err.message);
    }
  });
  scheduledTasks.push(task4);

  console.log(
    '[AlertWorker] Initializing weekly Monday morning email digest (running every Monday at 8 AM)...',
  );
  const task5 = cron.schedule('0 8 * * 1', async () => {
    console.log('[AlertWorker] Weekly digest Cron triggered.');
    try {
      await sendWeeklyEmailDigest();
    } catch (err: any) {
      console.error('[AlertWorker] Weekly digest cron failed:', err.message);
    }
  });
  scheduledTasks.push(task5);
}
