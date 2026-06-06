import cron from 'node-cron';
import nodemailer from 'nodemailer';
import { db, schema } from '../lib/db.js';
import { eq, and, gte, desc } from 'drizzle-orm';

// Nodemailer transport initialization
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
  port: parseInt(process.env.SMTP_PORT || '2525', 10),
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
});

export async function checkAndDeliverAlerts(): Promise<void> {
  console.log('[AlertWorker] Checking health scores against configurations...');

  // Fetch all organizations
  const orgs = (await db.select().from(schema.organizations)) as any[];

  for (const org of orgs) {
    // Get alert config for this org
    let alertConfig = (await db
      .select()
      .from(schema.alertConfigs as any)
      .where(eq((schema.alertConfigs as any).orgId, org.id))
      .limit(1)
      .then((rows) => rows[0])) as any;

    // Default configuration if none exists
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

    const threshold = alertConfig.threshold ?? 40;

    // Get all customers for this org
    const customersList = (await db
      .select()
      .from(schema.customers as any)
      .where(eq((schema.customers as any).orgId, org.id))) as any[];

    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setDate(twentyFourHoursAgo.getDate() - 1);

    for (const customer of customersList) {
      // Get latest health score
      const latestScore = (await db
        .select()
        .from(schema.healthScores as any)
        .where(eq((schema.healthScores as any).customerId, customer.id))
        .orderBy(desc((schema.healthScores as any).scoredAt))
        .limit(1)
        .then((rows) => rows[0])) as any;

      if (!latestScore) continue;

      // Check if health score is below threshold
      if (latestScore.score < threshold) {
        // Check if an alert was already triggered in the last 24h
        const recentAlerts = (await db
          .select()
          .from(schema.alerts as any)
          .where(
            and(
              eq((schema.alerts as any).customerId, customer.id),
              gte((schema.alerts as any).triggeredAt, twentyFourHoursAgo)
            )
          )
          .limit(1)) as any[];

        if (recentAlerts.length > 0) {
          console.log(
            `[AlertWorker] Skipping customer ${customer.name} (ID: ${customer.id}) — alert already sent in last 24h.`
          );
          continue;
        }

        console.log(
          `[AlertWorker] Triggering alert for customer ${customer.name} (ID: ${customer.id}) — score ${latestScore.score} < ${threshold}.`
        );

        // 1. Insert alert row
        const [alert] = (await db
          .insert(schema.alerts as any)
          .values({
            orgId: org.id,
            customerId: customer.id,
            scoreAtTrigger: latestScore.score,
            deliveryChannels: {
              slack: alertConfig.notifySlack || false,
              email: alertConfig.notifyEmail || false,
            },
            acknowledged: false,
          } as any)
          .returning()) as any[];

        const channelsDelivered: Record<string, boolean> = {
          slack: false,
          email: false,
        };

        const dashboardUrl = `${
          process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        }/dashboard/customers/${customer.id}`;

        // 2. Slack delivery
        if (alertConfig.notifySlack && process.env.SLACK_WEBHOOK_URL) {
          try {
            const firstRiskFactor =
              Array.isArray(latestScore.topRiskFactors) && latestScore.topRiskFactors.length > 0
                ? latestScore.topRiskFactors[0]
                : 'No specific risk factors logged.';

            const slackPayload = {
              blocks: [
                {
                  type: 'header',
                  text: {
                    type: 'plain_text',
                    text: '⚠️ RetentIQ Churn Risk Alert',
                    emoji: true,
                  },
                },
                {
                  type: 'section',
                  fields: [
                    { type: 'mrkdwn', text: `*Customer:* ${customer.name}` },
                    { type: 'mrkdwn', text: `*Company:* ${customer.company}` },
                    { type: 'mrkdwn', text: `*Health Score:* \`${latestScore.score}/100\`` },
                    { type: 'mrkdwn', text: `*Top Risk Factor:* ${firstRiskFactor}` },
                  ],
                },
                {
                  type: 'actions',
                  elements: [
                    {
                      type: 'button',
                      text: {
                        type: 'plain_text',
                        text: 'View Customer →',
                        emoji: true,
                      },
                      url: dashboardUrl,
                      style: 'primary',
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

            if (!slackRes.ok) {
              throw new Error(`Slack webhook responded with status ${slackRes.status}`);
            }

            console.log(`[AlertWorker] Slack alert delivered for customer ${customer.name}`);
            channelsDelivered.slack = true;
          } catch (slackErr: any) {
            console.error(`[AlertWorker] Failed to deliver Slack alert: ${slackErr.message}`);
          }
        }

        // 3. Email delivery
        if (alertConfig.notifyEmail) {
          try {
            const riskFactorsList = Array.isArray(latestScore.topRiskFactors)
              ? latestScore.topRiskFactors.map((f: string) => `<li style="margin-bottom: 8px; font-size: 14px; color: #475569;">${f}</li>`).join('')
              : '<li style="margin-bottom: 8px; font-size: 14px; color: #475569;">No specific risk factors logged.</li>';

            const emailHtml = `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <title>RetentIQ Churn Risk Alert</title>
              </head>
              <body style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #F8FAFC; padding: 20px; color: #1E293B; margin: 0;">
                <div style="background-color: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8F0; padding: 32px; max-width: 550px; margin: 0 auto; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                  <div style="font-size: 20px; font-weight: bold; color: #4F46E5; margin-bottom: 24px; border-bottom: 1px solid #F1F5F9; padding-bottom: 16px;">
                    ⚠️ RetentIQ Alert
                  </div>
                  <div style="font-size: 16px; font-weight: bold; margin-bottom: 20px;">
                    ${customer.name} from <strong>${customer.company}</strong> has dropped below your health threshold.
                  </div>
                  <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748B; font-weight: bold;">
                    Current Health Score
                  </div>
                  <div style="font-size: 48px; font-weight: 900; color: #EF4444; margin-top: 8px; margin-bottom: 24px; line-height: 1;">
                    ${latestScore.score}/100
                  </div>
                  
                  <div style="font-size: 13px; font-weight: bold; text-transform: uppercase; color: #64748B; margin-top: 24px; margin-bottom: 12px;">
                    Top Risk Factors
                  </div>
                  <ul style="padding-left: 20px; margin: 0 0 28px 0;">
                    ${riskFactorsList}
                  </ul>
                  
                  <div style="margin-top: 28px;">
                    <a href="${dashboardUrl}" style="display: inline-block; background-color: #0F172A; color: #FFFFFF; font-weight: bold; font-size: 13px; padding: 12px 24px; border-radius: 8px; text-decoration: none; text-align: center;">
                      View in Dashboard &rarr;
                    </a>
                  </div>
                </div>
                <div style="text-align: center; font-size: 11px; color: #94A3B8; margin-top: 32px; line-height: 1.5;">
                  Sent automatically by RetentIQ Churn Intelligence Platform.<br>
                  To manage your alerts, visit your settings page. | <a href="#" style="color: #94A3B8; text-decoration: underline;">Unsubscribe</a>
                </div>
              </body>
              </html>
            `;

            await transporter.sendMail({
              from: process.env.SMTP_FROM || 'noreply@retentiq.io',
              to: customer.email,
              subject: `[RetentIQ Alert] Churn Risk Detected: ${customer.company}`,
              html: emailHtml,
            });

            console.log(`[AlertWorker] Email alert delivered for customer ${customer.name}`);
            channelsDelivered.email = true;
          } catch (emailErr: any) {
            console.error(`[AlertWorker] Failed to deliver Email alert: ${emailErr.message}`);
          }
        }

        // 4. Update alert delivery state and delivered_at timestamp inside JSON
        await db
          .update(schema.alerts as any)
          .set({
            deliveryChannels: {
              slack: channelsDelivered.slack,
              email: channelsDelivered.email,
              delivered_at: new Date().toISOString(),
            },
          } as any)
          .where(eq((schema.alerts as any).id, alert.id));
      }
    }
  }
}

export function startAlertWorker() {
  console.log('[AlertWorker] Initializing alert delivery cron job (running every 5 minutes)...');
  // Runs every 5 minutes: '*/5 * * * *'
  cron.schedule('*/5 * * * *', async () => {
    console.log('[AlertWorker] Cron triggered. Running health check...');
    try {
      await checkAndDeliverAlerts();
    } catch (err: any) {
      console.error('[AlertWorker] Cron job execution failed:', err.message);
    }
  });
}
