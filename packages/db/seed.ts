import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

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
    })
    .returning();

  const org = orgs[0];
  console.log(`✓ Seeded Organization: ${org.name} (${org.id})`);

  // 2. Create Users
  const userList = [
    {
      id: '00000000-0000-0000-0000-000000000001', // Fixed UUID for testing
      orgId: org.id,
      email: 'owner@retentiq.io',
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
      createdAt: new Date(Date.now() - (50 - i) * 24 * 3600 * 1000), // Created spread over 50 days
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

    // Seed Events (3 per customer)
    eventsToInsert.push(
      {
        customerId: customer.id,
        orgId: org.id,
        eventType: 'user.login',
        source: 'web-app',
        payload: { browser: 'Chrome', os: 'Windows' },
        occurredAt: new Date(Date.now() - 3600 * 1000 * 12),
      },
      {
        customerId: customer.id,
        orgId: org.id,
        eventType: 'dashboard.viewed',
        source: 'web-app',
        payload: { tabs_clicked: ['analytics', 'alerts'] },
        occurredAt: new Date(Date.now() - 3600 * 1000 * 10),
      },
      {
        customerId: customer.id,
        orgId: org.id,
        eventType: 'settings.updated',
        source: 'web-app',
        payload: { integrations_modified: ['slack'] },
        occurredAt: new Date(Date.now() - 3600 * 1000 * 6),
      },
    );
  }

  await db.insert(schema.healthScores).values(healthScoresToInsert);
  console.log('✓ Seeded 50 Health Scores');

  await db.insert(schema.events).values(eventsToInsert);
  console.log('✓ Seeded 150 Events');

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

  console.log('✨ Seed database completed successfully.');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Error during seeding:', err);
  process.exit(1);
});
