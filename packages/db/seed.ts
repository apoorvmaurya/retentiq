import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const connectionString =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres';

const client = postgres(connectionString, { max: 1 });
const db = drizzle(client, { schema });

const FIRST_NAMES = [
  'Emma',
  'Liam',
  'Olivia',
  'Noah',
  'Ava',
  'Oliver',
  'Sophia',
  'Elijah',
  'Isabella',
  'James',
  'Mia',
  'Benjamin',
  'Charlotte',
  'Lucas',
  'Amelia',
  'Alexander',
  'Harper',
  'Mason',
  'Evelyn',
  'Michael',
  'Abigail',
  'Ethan',
  'Emily',
  'Daniel',
  'Elizabeth',
  'Jacob',
  'Sofia',
  'Logan',
  'Avery',
  'Jackson',
  'Ella',
  'Sebastian',
  'Madison',
  'Jack',
  'Scarlett',
  'Aiden',
  'Victoria',
  'Owen',
  'Aria',
  'Samuel',
  'Grace',
  'Matthew',
  'Chloe',
  'Joseph',
  'Camila',
  'Levi',
  'Penelope',
  'Mateo',
  'Riley',
  'David',
];

const LAST_NAMES = [
  'Smith',
  'Johnson',
  'Williams',
  'Brown',
  'Jones',
  'Garcia',
  'Miller',
  'Davis',
  'Rodriguez',
  'Martinez',
  'Hernandez',
  'Lopez',
  'Gonzalez',
  'Wilson',
  'Anderson',
  'Thomas',
  'Taylor',
  'Moore',
  'Jackson',
  'Martin',
  'Lee',
  'Perez',
  'Thompson',
  'White',
  'Harris',
  'Sanchez',
  'Clark',
  'Ramirez',
  'Lewis',
  'Robinson',
  'Walker',
  'Young',
  'Allen',
  'King',
  'Wright',
  'Scott',
  'Torres',
  'Nguyen',
  'Hill',
  'Flores',
  'Green',
  'Adams',
  'Nelson',
  'Baker',
  'Hall',
  'Rivera',
  'Campbell',
  'Mitchell',
  'Carter',
  'Roberts',
];

const COMPANIES = [
  'CloudScale',
  'InnovateFlow',
  'ApexSystems',
  'StellarWeb',
  'DevSymphony',
  'TechPioneer',
  'ByteNexus',
  'QuantumLogic',
  'DataPulse',
  'ApexAnalytics',
  'Synthetix',
  'CoreSaaS',
  'StratumGroup',
  'ZenithIT',
  'VertigoLabs',
  'AetherCorp',
  'SkyLineCloud',
  'ShiftDigital',
  'PrismGlobal',
  'VortexSoftware',
  'NexaPlatform',
  'OmniScale',
  'LogixHub',
  'HelixMedia',
  'VectorData',
  'AlphaByte',
  'TrueSync',
  'WebForge',
  'OptimaSaaS',
  'NovaLink',
  'MetaHive',
  'PixelCraft',
  'Infiniroute',
  'CloudForge',
  'GridCore',
  'EmberTech',
  'BrightSpark',
  'SignalHQ',
  'VanguardSystems',
  'DeltaLogic',
  'FlowState',
  'CodeCraft',
  'AuraDigital',
  'KryptonLabs',
  'SynapseCo',
  'OrbitTech',
  'NetSprint',
  'PathFinder',
  'EdgeComputing',
  'LaunchPad',
];

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data (in order of foreign key relationships to prevent constraint issues)
  console.log('🧹 Clearing existing database tables...');
  await db.delete(schema.invites);
  await db.delete(schema.roiAggregates);
  await db.delete(schema.tasks);
  await db.delete(schema.playbooks);
  await db.delete(schema.emailTemplates);
  await db.delete(schema.scoreWeights);
  await db.delete(schema.alertRules);
  await db.delete(schema.groqUsage);
  await db.delete(schema.retentionActions);
  await db.delete(schema.alertConfigs);
  await db.delete(schema.integrations);
  await db.delete(schema.alerts);
  await db.delete(schema.events);
  await db.delete(schema.healthScores);
  await db.delete(schema.users);
  await db.delete(schema.customers);
  await db.delete(schema.organizations);
  console.log('✓ Database cleared.');

  // 1. Create Organization
  const orgs = await db
    .insert(schema.organizations)
    .values({
      name: 'Acme Churn Control',
      slug: 'acme-churn-control',
      teamSize: 5,
      productCategory: 'B2B',
    })
    .returning();

  const org = orgs[0];
  console.log(`✓ Seeded Organization: ${org.name} (${org.id})`);

  // 2. Create Users
  const userList = [
    {
      id: '07898715-c17c-4e76-9d0a-35acb50be73e', // Bound to test_confirmed_user@retentiq.com
      orgId: org.id,
      email: 'test_confirmed_user@retentiq.com',
      role: 'owner' as const,
      onboardingComplete: true,
    },
    {
      id: '00000000-0000-0000-0000-000000000002',
      orgId: org.id,
      email: 'admin@retentiq.io',
      role: 'admin' as const,
      onboardingComplete: true,
    },
    {
      id: '00000000-0000-0000-0000-000000000003',
      orgId: org.id,
      email: 'analyst@retentiq.io',
      role: 'member' as const,
      onboardingComplete: false,
    },
  ];

  await db.insert(schema.users).values(userList);
  console.log('✓ Seeded 3 Users');

  // 3. Create Alert Config
  await db.insert(schema.alertConfigs).values({
    orgId: org.id,
    threshold: 45,
    notifySlack: true,
    notifyEmail: true,
  });
  console.log('✓ Seeded Alert Configuration');

  // 4. Create Integrations
  const integrationsList = [
    {
      orgId: org.id,
      provider: 'stripe',
      status: 'active',
      config: { webhook_configured: true, sync_history_months: 12 },
      lastSyncedAt: new Date(Date.now() - 3600000), // 1 hour ago
    },
    {
      orgId: org.id,
      provider: 'slack',
      status: 'active',
      config: { channel: '#churn-alerts', workspace: 'Acme Slack' },
      lastSyncedAt: new Date(Date.now() - 3600000),
    },
    {
      orgId: org.id,
      provider: 'intercom',
      status: 'active',
      config: { import_tickets: true, import_conversations: true },
      lastSyncedAt: new Date(Date.now() - 7200000), // 2 hours ago
    },
    {
      orgId: org.id,
      provider: 'mixpanel',
      status: 'inactive',
      config: {},
      lastSyncedAt: null,
    },
  ];
  await db.insert(schema.integrations).values(integrationsList);
  console.log('✓ Seeded 4 Integrations');

  // 5. Generate 50 Customers with Health Scores and Events
  console.log('Generating 50 customers...');
  const customersToInsert = [];
  for (let i = 0; i < 50; i++) {
    const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
    const lastName = LAST_NAMES[i % LAST_NAMES.length];
    const companyName = COMPANIES[i % COMPANIES.length];
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${companyName.toLowerCase()}.com`;

    // Plan tier selection
    let planTier = 'Basic';
    let mrr = '99.00';
    if (i % 3 === 1) {
      planTier = 'Pro';
      mrr = '499.00';
    } else if (i % 3 === 2) {
      planTier = 'Enterprise';
      mrr = '2499.00';
    }

    customersToInsert.push({
      orgId: org.id,
      name: `${firstName} ${lastName}`,
      email,
      company: companyName,
      planTier,
      mrr,
      createdAt: new Date(Date.now() - (360 - i * 7) * 24 * 3600 * 1000), // Created spread over 360 days
    });
  }

  const seededCustomers = await db.insert(schema.customers).values(customersToInsert).returning();
  console.log(`✓ Seeded ${seededCustomers.length} Customers`);

  // Spread the health scores across all risk tiers:
  // - Low risk: 20 customers
  // - Medium risk: 15 customers
  // - High risk: 10 customers
  // - Critical risk: 5 customers
  const healthScoresToInsert = [];
  const alertsToInsert = [];
  const retentionActionsToInsert = [];
  const eventsToInsert = [];

  for (let idx = 0; idx < seededCustomers.length; idx++) {
    const customer = seededCustomers[idx];
    let score = 90;
    let churnProbability = '0.05';
    let riskTier: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let topRiskFactors: string[] = [];
    let recommendedAction = 'Continue Standard Engagement';
    const confidence = (0.75 + Math.random() * 0.2).toFixed(2);

    if (idx < 20) {
      // Low risk (20)
      score = 80 + Math.floor(Math.random() * 21); // 80 - 100
      churnProbability = (0.01 + Math.random() * 0.14).toFixed(2);
      riskTier = 'low';
      topRiskFactors = ['No significant risk indicators', 'Healthy feature usage'];
      recommendedAction = 'Engage for case study opportunities and cross-selling.';
    } else if (idx < 35) {
      // Medium risk (15)
      score = 50 + Math.floor(Math.random() * 30); // 50 - 79
      churnProbability = (0.15 + Math.random() * 0.24).toFixed(2);
      riskTier = 'medium';
      topRiskFactors = ['Decline in login frequency (-15%)', 'Slow ticket resolution feedback'];
      recommendedAction = 'Send targeted feature education email; schedule check-in call.';
    } else if (idx < 45) {
      // High risk (10)
      score = 25 + Math.floor(Math.random() * 25); // 25 - 49
      churnProbability = (0.4 + Math.random() * 0.34).toFixed(2);
      riskTier = 'high';
      topRiskFactors = [
        'Critical decline in dashboard events (-40%)',
        '3 open billing support tickets',
      ];
      recommendedAction =
        'Assign Customer Success Manager for high-touch intervention immediately.';

      // Seed an active alert for high risk
      if (idx % 2 === 0) {
        alertsToInsert.push({
          orgId: org.id,
          customerId: customer.id,
          scoreAtTrigger: score,
          deliveryChannels: { slack: true, email: true },
          acknowledged: false,
          triggeredAt: new Date(Date.now() - 3600 * 1000 * 4), // 4 hours ago
        });
      }
    } else {
      // Critical risk (5)
      score = 5 + Math.floor(Math.random() * 20); // 5 - 24
      churnProbability = (0.75 + Math.random() * 0.23).toFixed(2);
      riskTier = 'critical';
      topRiskFactors = [
        'Zero logins in the last 14 days',
        'Stripe payment failed (2 attempts)',
        'Key executive sponsor left company',
      ];
      recommendedAction = 'Executive sponsor outreach. Initiate contract renewal rescue workflow.';

      // Active alert for critical risk
      alertsToInsert.push({
        orgId: org.id,
        customerId: customer.id,
        scoreAtTrigger: score,
        deliveryChannels: { slack: true, email: true },
        acknowledged: false,
        triggeredAt: new Date(Date.now() - 3600 * 1000 * 1), // 1 hour ago
      });

      // Seed a retention action
      retentionActionsToInsert.push({
        orgId: org.id,
        customerId: customer.id,
        actionType: 'Executive Outreach',
        outcome: 'in_progress',
        revenueSaved: '0.00',
        actionedAt: new Date(Date.now() - 3600 * 1000 * 12),
      });
    }

    healthScoresToInsert.push({
      customerId: customer.id,
      orgId: org.id,
      score,
      churnProbability,
      riskTier,
      topRiskFactors,
      recommendedAction,
      confidence,
      scoredAt: new Date(Date.now() - 3600 * 1000 * 2), // 2 hours ago
    });

    // Seed Events spread over customer's lifetime
    const startMs = new Date(customer.createdAt!).getTime();
    const endMs = Date.now();
    const daysActive = (endMs - startMs) / (24 * 3600 * 1000);

    let loginInterval = 2; // Low risk logs in every 2 days
    if (riskTier === 'medium') loginInterval = 4;
    else if (riskTier === 'high') loginInterval = 7;
    else if (riskTier === 'critical') loginInterval = 14;

    // Logins
    for (let day = 0; day <= daysActive; day += loginInterval) {
      if (riskTier === 'critical' && daysActive > 14 && day > daysActive - 14) {
        continue; // Critical risk stopped logging in
      }
      eventsToInsert.push({
        customerId: customer.id,
        orgId: org.id,
        eventType: 'user.login',
        source: 'web-app',
        payload: { browser: 'Chrome', os: 'Windows' },
        occurredAt: new Date(startMs + day * 24 * 3600 * 1000 + Math.random() * 3600 * 1000 * 4),
      });
    }

    // Dashboard views
    for (let day = 1; day <= daysActive; day += loginInterval + 1) {
      if (riskTier === 'critical' && daysActive > 14 && day > daysActive - 14) {
        continue;
      }
      eventsToInsert.push({
        customerId: customer.id,
        orgId: org.id,
        eventType: 'dashboard.viewed',
        source: 'web-app',
        payload: { tabs_clicked: ['analytics', 'alerts'] },
        occurredAt: new Date(startMs + day * 24 * 3600 * 1000 + Math.random() * 3600 * 1000 * 4),
      });
    }

    // Settings update once in first 2 days
    eventsToInsert.push({
      customerId: customer.id,
      orgId: org.id,
      eventType: 'settings.updated',
      source: 'web-app',
      payload: { integrations_modified: ['slack'] },
      occurredAt: new Date(startMs + Math.random() * 2 * 24 * 3600 * 1000),
    });

    // Playbook/Task events (only for some customers based on tier to make heatmap look real)
    if (riskTier === 'low' && idx % 2 === 0) {
      eventsToInsert.push({
        customerId: customer.id,
        orgId: org.id,
        eventType: 'playbook.executed',
        source: 'automation',
        payload: { playbook_name: 'Onboarding Check-in' },
        occurredAt: new Date(startMs + Math.random() * daysActive * 24 * 3600 * 1000),
      });
    } else if (riskTier === 'medium' && idx % 3 === 0) {
      eventsToInsert.push({
        customerId: customer.id,
        orgId: org.id,
        eventType: 'task.completed',
        source: 'playbook',
        payload: { task_title: 'Schedule QBR' },
        occurredAt: new Date(startMs + Math.random() * daysActive * 24 * 3600 * 1000),
      });
    }
  }

  await db.insert(schema.healthScores).values(healthScoresToInsert);
  console.log('✓ Seeded 50 Health Scores');

  await db.insert(schema.events).values(eventsToInsert);
  console.log(`✓ Seeded ${eventsToInsert.length} Events`);

  if (alertsToInsert.length > 0) {
    await db.insert(schema.alerts).values(alertsToInsert);
    console.log(`✓ Seeded ${alertsToInsert.length} Churn Alerts`);
  }

  if (retentionActionsToInsert.length > 0) {
    await db.insert(schema.retentionActions).values(retentionActionsToInsert);
    console.log(`✓ Seeded ${retentionActionsToInsert.length} Active Retention Actions`);
  }

  // 6. Create some completed retention actions (historical records)
  const pastRetentionActions = [
    {
      orgId: org.id,
      customerId: seededCustomers[5].id,
      actionType: 'Discount Offered',
      outcome: 'won',
      revenueSaved: '500.00',
      actionedAt: new Date(Date.now() - 5 * 24 * 3600 * 1000), // 5 days ago
    },
    {
      orgId: org.id,
      customerId: seededCustomers[10].id,
      actionType: 'Feature Training Session',
      outcome: 'won',
      revenueSaved: '2499.00',
      actionedAt: new Date(Date.now() - 12 * 24 * 3600 * 1000), // 12 days ago
    },
    {
      orgId: org.id,
      customerId: seededCustomers[25].id,
      actionType: 'CSM Review Call',
      outcome: 'lost',
      revenueSaved: '0.00',
      actionedAt: new Date(Date.now() - 20 * 24 * 3600 * 1000), // 20 days ago
    },
  ];
  await db.insert(schema.retentionActions).values(pastRetentionActions);
  console.log('✓ Seeded 3 Past Retention Actions');

  // 7. Seed Groq usage data
  const usageStats = [
    {
      orgId: org.id,
      endpoint: '/api/ai/predict-churn',
      tokensUsed: 1240,
      model: 'llama3-70b-8192',
      costUsd: '0.000744',
      createdAt: new Date(Date.now() - 3600 * 1000 * 12),
    },
    {
      orgId: org.id,
      endpoint: '/api/ai/predict-churn',
      tokensUsed: 1550,
      model: 'llama3-70b-8192',
      costUsd: '0.000930',
      createdAt: new Date(Date.now() - 3600 * 1000 * 6),
    },
    {
      orgId: org.id,
      endpoint: '/api/ai/predict-churn',
      tokensUsed: 980,
      model: 'llama-3.3-70b-versatile',
      costUsd: '0.000588',
      createdAt: new Date(Date.now() - 3600 * 1000 * 1),
    },
  ];
  await db.insert(schema.groqUsage).values(usageStats);
  console.log('✓ Seeded Groq Usage logs');

  // 8. Seed custom Score Weights
  await db.insert(schema.scoreWeights).values({
    orgId: org.id,
    loginFrequency30dWeight: 15,
    loginFrequency14dWeight: 10,
    loginFrequency7dWeight: 10,
    featureAdoptionWeight: 20,
    usageTrendWeight: 15,
    supportVolumeWeight: 10,
    supportSentimentWeight: 5,
    billingEventsWeight: 10,
    onboardingTimeWeight: 5,
  });
  console.log('✓ Seeded Score Weights');

  // 9. Seed default Email Templates
  const defaultTemplates = [
    {
      orgId: org.id,
      name: 'critical_score_drop',
      subject: 'Is everything okay at {{account_name}}?',
      body: 'Hello,\n\nWe noticed a drop in activity/health score for {{account_name}} (currently at {{health_score}}).\n\nLet us know if there is anything we can help with.\n\nBest,\n{{csm_name}}',
    },
    {
      orgId: org.id,
      name: 'billing_failure',
      subject: 'Action Required: Payment Failed for {{account_name}}',
      body: 'Hello,\n\nWe were unable to process your recent payment for your subscription. Please update your billing details to avoid service disruption.\n\nBest,\n{{csm_name}}',
    },
    {
      orgId: org.id,
      name: '30d_inactivity',
      subject: 'We miss you at {{account_name}}!',
      body: "Hello,\n\nWe noticed you haven't logged in for 30 days. Let us know if you need help with onboarding or have any questions.\n\nBest,\n{{csm_name}}",
    },
    {
      orgId: org.id,
      name: 'renewal_risk',
      subject: 'Upcoming Renewal Review for {{account_name}}',
      body: 'Hello,\n\nYour subscription renewal is coming up. We would love to connect and review your usage and goals.\n\nBest,\n{{csm_name}}',
    },
  ];
  await db.insert(schema.emailTemplates).values(defaultTemplates);
  console.log('✓ Seeded Email Templates');

  // 10. Seed custom Alert Rules
  const alertRules = [
    {
      orgId: org.id,
      name: 'Critical Health Alert',
      conditions: [
        {
          type: 'score_below',
          threshold: 40,
          priority: 'critical',
        },
      ],
      isActive: true,
    },
    {
      orgId: org.id,
      name: 'Sudden Activity Drop',
      conditions: [
        {
          type: 'score_drop',
          days: 7,
          drop: 15,
          priority: 'warning',
        },
      ],
      isActive: true,
    },
  ];
  await db.insert(schema.alertRules).values(alertRules);
  console.log('✓ Seeded Alert Rules');

  // 11. Seed default Playbooks
  const playbooks = [
    {
      orgId: org.id,
      name: 'Critical Score Drop Playbook',
      triggerType: 'health_drop' as const,
      triggerThreshold: 40,
      steps: [
        {
          step: 1,
          headline: 'Review recent logs',
          detail: 'Analyze the events of the customer to understand their drop in usage.',
        },
        {
          step: 2,
          headline: 'Schedule CSM call',
          detail: 'Send a personalized email to the primary contact to set up a 15-minute call.',
        },
        {
          step: 3,
          headline: 'Align on success plan',
          detail: 'Work with the customer to create a plan to improve their onboarding and usage.',
        },
      ],
      isActive: true,
    },
    {
      orgId: org.id,
      name: 'Billing Rescue Playbook',
      triggerType: 'manual' as const,
      triggerThreshold: 0,
      steps: [
        {
          step: 1,
          headline: 'Verify payment details',
          detail: 'Check Stripe to see why the invoice failed.',
        },
        {
          step: 2,
          headline: 'Reach out to billing contact',
          detail: 'Email the finance or billing contact directly to resolve payment issue.',
        },
      ],
      isActive: true,
    },
  ];
  await db.insert(schema.playbooks).values(playbooks);
  console.log('✓ Seeded Playbooks');

  // 12. Seed Tasks for the CS team linked to the seeded customers
  const tasksToInsert = [];
  tasksToInsert.push({
    orgId: org.id,
    customerId: seededCustomers[45].id,
    title: 'Critical Score Drop Playbook: Review recent logs',
    description: 'Analyze the events of the customer to understand their drop in usage.',
    dueDate: new Date(Date.now() + 2 * 24 * 3600 * 1000),
    status: 'pending' as const,
  });
  tasksToInsert.push({
    orgId: org.id,
    customerId: seededCustomers[46].id,
    title: 'Critical Score Drop Playbook: Schedule CSM call',
    description: 'Send a personalized email to the primary contact to set up a 15-minute call.',
    dueDate: new Date(Date.now() + 1 * 24 * 3600 * 1000),
    status: 'pending' as const,
  });
  tasksToInsert.push({
    orgId: org.id,
    customerId: seededCustomers[5].id,
    title: 'CSM Outreach: Offer 20% discount',
    description: 'Offered 20% discount for renewal.',
    dueDate: new Date(Date.now() - 6 * 24 * 3600 * 1000),
    status: 'completed' as const,
    outcome: 'positive' as const,
    completedBy: 'admin@retentiq.io',
    completedAt: new Date(Date.now() - 5 * 24 * 3600 * 1000),
  });
  tasksToInsert.push({
    orgId: org.id,
    customerId: seededCustomers[10].id,
    title: 'CSM Review: Feature training session',
    description: 'Walkthrough of the integration hub completed.',
    dueDate: new Date(Date.now() - 13 * 24 * 3600 * 1000),
    status: 'completed' as const,
    outcome: 'positive' as const,
    completedBy: 'admin@retentiq.io',
    completedAt: new Date(Date.now() - 12 * 24 * 3600 * 1000),
  });
  await db.insert(schema.tasks).values(tasksToInsert);
  console.log('✓ Seeded Tasks');

  // 13. Seed ROI History Cache Aggregates
  const currentMonth = new Date().toISOString().slice(0, 7);
  const prevMonth = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 7);

  await db.insert(schema.roiAggregates).values([
    {
      orgId: org.id,
      month: prevMonth,
      accountsSaved: 1,
      revenueSaved: '499.00',
    },
    {
      orgId: org.id,
      month: currentMonth,
      accountsSaved: 2,
      revenueSaved: '2998.00',
    },
  ]);
  console.log('✓ Seeded ROI History Cache Aggregates');

  console.log('✨ Seed database completed successfully.');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Error during seeding:', err);
  process.exit(1);
});
