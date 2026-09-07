import { SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const DEMO_COMPANIES = [
  { name: 'ApexSystems', domain: 'apexsystems.io', tier: 'Enterprise', mrr: 2499.0 },
  { name: 'CloudScale Technologies', domain: 'cloudscale.tech', tier: 'Enterprise', mrr: 3200.0 },
  { name: 'DevSymphony Software', domain: 'devsymphony.com', tier: 'Pro', mrr: 799.0 },
  { name: 'QuantumLogic AI', domain: 'quantumlogic.ai', tier: 'Enterprise', mrr: 4500.0 },
  { name: 'InnovateFlow', domain: 'innovateflow.io', tier: 'Pro', mrr: 499.0 },
  { name: 'DataPulse Analytics', domain: 'datapulse.net', tier: 'Pro', mrr: 899.0 },
  { name: 'StellarWeb Cloud', domain: 'stellarweb.com', tier: 'Basic', mrr: 149.0 },
  { name: 'AetherCorp', domain: 'aethercorp.org', tier: 'Enterprise', mrr: 1999.0 },
  { name: 'ByteNexus Solutions', domain: 'bytenexus.io', tier: 'Pro', mrr: 599.0 },
  { name: 'PrismGlobal Media', domain: 'prismglobal.com', tier: 'Pro', mrr: 699.0 },
  { name: 'Zenith Systems', domain: 'zenithsys.co', tier: 'Enterprise', mrr: 3500.0 },
  { name: 'ShiftDigital Hub', domain: 'shiftdigital.io', tier: 'Basic', mrr: 199.0 },
  { name: 'TrueSync Cloud', domain: 'truesync.net', tier: 'Pro', mrr: 499.0 },
  { name: 'LogixHub Networks', domain: 'logixhub.tech', tier: 'Basic', mrr: 99.0 },
  { name: 'AuraDigital', domain: 'auradigital.io', tier: 'Pro', mrr: 649.0 },
  { name: 'CodeCraft Engineering', domain: 'codecraft.dev', tier: 'Enterprise', mrr: 2800.0 },
  { name: 'KryptonLabs', domain: 'kryptonlabs.ai', tier: 'Enterprise', mrr: 3900.0 },
  { name: 'EmberTech Labs', domain: 'embertech.co', tier: 'Basic', mrr: 99.0 },
  { name: 'SignalHQ Monitoring', domain: 'signalhq.io', tier: 'Pro', mrr: 850.0 },
  { name: 'AlphaByte Commerce', domain: 'alphabyte.com', tier: 'Basic', mrr: 199.0 },
  { name: 'MetaHive Solutions', domain: 'metahive.net', tier: 'Pro', mrr: 550.0 },
  { name: 'OrbitTech Systems', domain: 'orbittech.io', tier: 'Enterprise', mrr: 2100.0 },
  { name: 'NetSprint Communications', domain: 'netsprint.net', tier: 'Pro', mrr: 499.0 },
  { name: 'SkyLine Infrastructure', domain: 'skylineinfra.com', tier: 'Enterprise', mrr: 4200.0 },
  { name: 'VortexSoftware', domain: 'vortexsoftware.io', tier: 'Basic', mrr: 149.0 },
  { name: 'VectorData Corp', domain: 'vectordata.ai', tier: 'Pro', mrr: 750.0 },
  { name: 'HelixMedia Digital', domain: 'helixmedia.co', tier: 'Basic', mrr: 99.0 },
  { name: 'Infiniroute Networks', domain: 'infiniroute.com', tier: 'Enterprise', mrr: 3100.0 },
  { name: 'GridCore Computing', domain: 'gridcore.tech', tier: 'Pro', mrr: 620.0 },
  { name: 'FlowState Labs', domain: 'flowstate.io', tier: 'Basic', mrr: 129.0 },
  { name: 'NovaLink Telecom', domain: 'novalink.net', tier: 'Enterprise', mrr: 2650.0 },
  { name: 'PixelCraft Studio', domain: 'pixelcraft.design', tier: 'Basic', mrr: 99.0 },
  { name: 'WebForge Hosting', domain: 'webforge.io', tier: 'Basic', mrr: 149.0 },
  { name: 'OptimaSaaS', domain: 'optima-saas.com', tier: 'Pro', mrr: 899.0 },
  { name: 'LaunchPad Ventures', domain: 'launchpad.xyz', tier: 'Enterprise', mrr: 1800.0 },
  { name: 'SynapseCo Data', domain: 'synapseco.ai', tier: 'Enterprise', mrr: 3400.0 },
  { name: 'BrightSpark Energy', domain: 'brightspark.co', tier: 'Basic', mrr: 199.0 },
  {
    name: 'Vanguard Enterprise',
    domain: 'vanguardenterprise.com',
    tier: 'Enterprise',
    mrr: 5100.0,
  },
  { name: 'DeltaLogic Analytics', domain: 'deltalogic.net', tier: 'Pro', mrr: 720.0 },
  { name: 'NexaPlatform', domain: 'nexaplatform.io', tier: 'Pro', mrr: 590.0 },
  { name: 'StratumGroup Consulting', domain: 'stratumgroup.org', tier: 'Enterprise', mrr: 2900.0 },
  { name: 'EdgeComputing Labs', domain: 'edgecomputing.io', tier: 'Pro', mrr: 810.0 },
  { name: 'PathFinder Operations', domain: 'pathfinder.tech', tier: 'Basic', mrr: 149.0 },
  { name: 'OmniScale Global', domain: 'omniscale.com', tier: 'Enterprise', mrr: 4800.0 },
  { name: 'Vertigo Labs', domain: 'vertigolabs.ai', tier: 'Pro', mrr: 950.0 },
  { name: 'CoreSaaS Group', domain: 'coresaas.io', tier: 'churned', mrr: 0.0 },
  { name: 'Synthetix Data', domain: 'synthetix.tech', tier: 'churned', mrr: 0.0 },
  { name: 'ApexAnalytics Hub', domain: 'apexanalytics.net', tier: 'churned', mrr: 0.0 },
  { name: 'TrueNorth Systems', domain: 'truenorth.co', tier: 'churned', mrr: 0.0 },
  { name: 'BlueHorizon Digital', domain: 'bluehorizon.io', tier: 'churned', mrr: 0.0 },
];

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
  'Charlotte',
  'Lucas',
  'Amelia',
  'Alexander',
  'Mia',
  'Benjamin',
  'Harper',
  'Mason',
  'Evelyn',
  'Ethan',
  'Abigail',
  'Michael',
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
  'Grace',
  'Samuel',
  'Chloe',
  'Matthew',
  'Camila',
  'David',
  'Penelope',
  'Joseph',
  'Riley',
  'Levi',
  'Elena',
  'Marcus',
];

const LAST_NAMES = [
  'Vance',
  'Sterling',
  'Chen',
  'Patel',
  'Hayes',
  'Morrison',
  'Reynolds',
  'Thorne',
  'Kowalski',
  'Sinclair',
  'Mercer',
  'Gallagher',
  'Novak',
  'Santiago',
  'Lindqvist',
  'Holloway',
  'Blackwood',
  'Adler',
  'Prescott',
  'Fletcher',
  'Caldwell',
  'Montgomery',
  'Whitaker',
  'Mercado',
  'Rasmussen',
  'Kearney',
  'Delgado',
  'Vargas',
  'Ostergard',
  'Harrington',
  'Dupont',
  'Katsaros',
  'Sato',
  'Nakamura',
  'Moreau',
  'Bauer',
  'Al-Mansoor',
  'DeVries',
  'O’Connor',
  'Fitzgerald',
  'Castillo',
  'Barone',
  'Fontaine',
  'Garrick',
  'Leighton',
  'Stark',
  'Davenport',
  'Holt',
  'Bishop',
  'Cross',
];

/**
 * Seeds or resets the sample retention workspace for the Guest Recruiter.
 * Ensures the organization, customers, health scores, alerts, events, and metrics are ready.
 */
export async function seedGuestWorkspace(
  adminSupabase: SupabaseClient,
  guestUserId: string,
  forceReset: boolean = false,
) {
  const DEMO_ORG_SLUG = 'acme-sample-workspace';

  // 1. Check if the demo org already exists
  let orgId: string | null = null;
  const { data: existingOrg } = await adminSupabase
    .from('organizations')
    .select('id, name')
    .eq('slug', DEMO_ORG_SLUG)
    .maybeSingle();

  if (existingOrg) {
    orgId = existingOrg.id;
  } else {
    // Create the Demo Organization
    const { data: newOrg, error: orgErr } = await adminSupabase
      .from('organizations')
      .insert({
        name: 'Acme Cloud Intelligence (Sample Workspace)',
        slug: DEMO_ORG_SLUG,
        team_size: 25,
        product_category: 'B2B',
      })
      .select()
      .single();

    if (orgErr || !newOrg) {
      throw new Error(`Failed to create sample organization: ${orgErr?.message}`);
    }
    orgId = newOrg.id;
  }

  // 2. Ensure user profile in public.users is attached to this org
  await adminSupabase.from('users').upsert({
    id: guestUserId,
    email: 'guest.recruiter@retentiq.io',
    name: 'Recruiter Guest',
    role: 'owner',
    org_id: orgId,
    onboarding_complete: true,
  });

  // 3. Check customer count for this org
  const { count: customerCount } = await adminSupabase
    .from('customers')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId);

  // If already populated and not force resetting, return early
  if (!forceReset && (customerCount ?? 0) >= 40) {
    return { orgId, seeded: false, customerCount };
  }

  // 4. Wipe existing demo org records to prevent duplicate constraints
  if (forceReset || (customerCount ?? 0) > 0) {
    await adminSupabase.from('alerts').delete().eq('org_id', orgId);
    await adminSupabase.from('events').delete().eq('org_id', orgId);
    await adminSupabase.from('health_scores').delete().eq('org_id', orgId);
    await adminSupabase.from('tasks').delete().eq('org_id', orgId);
    await adminSupabase.from('playbooks').delete().eq('org_id', orgId);
    await adminSupabase.from('roi_aggregates').delete().eq('org_id', orgId);
    await adminSupabase.from('customers').delete().eq('org_id', orgId);
  }

  // 5. Seed Alert Configs & Score Weights
  await adminSupabase.from('alert_configs').upsert(
    {
      org_id: orgId,
      threshold: 45,
      notify_slack: true,
      notify_email: true,
    },
    { onConflict: 'org_id' },
  );

  await adminSupabase.from('score_weights').upsert(
    {
      org_id: orgId,
      login_frequency_30d_weight: 15,
      login_frequency_14d_weight: 10,
      login_frequency_7d_weight: 10,
      feature_adoption_weight: 20,
      usage_trend_weight: 15,
      support_volume_weight: 10,
      support_sentiment_weight: 5,
      billing_events_weight: 10,
      onboarding_time_weight: 5,
    },
    { onConflict: 'org_id' },
  );

  // 6. Seed Integrations
  await adminSupabase.from('integrations').upsert([
    {
      org_id: orgId,
      provider: 'stripe',
      status: 'active',
      config: { webhook_configured: true, auto_rescore: true },
      last_synced_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    },
    {
      org_id: orgId,
      provider: 'slack',
      status: 'active',
      config: { channel: '#retention-alerts', workspace: 'Acme HQ' },
      last_synced_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    },
    {
      org_id: orgId,
      provider: 'intercom',
      status: 'active',
      config: { sync_conversations: true },
      last_synced_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    },
  ]);

  // 7. Seed 50 Customers
  const customerRows: any[] = [];
  for (let i = 0; i < DEMO_COMPANIES.length; i++) {
    const comp = DEMO_COMPANIES[i];
    const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
    const lastName = LAST_NAMES[i % LAST_NAMES.length];
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${comp.domain}`;
    const createdAt = new Date(Date.now() - (365 - i * 7) * 24 * 3600 * 1000).toISOString();

    customerRows.push({
      id: uuidv4(),
      org_id: orgId,
      name: `${firstName} ${lastName}`,
      email,
      company: comp.name,
      plan_tier: comp.tier,
      mrr: comp.mrr.toFixed(2),
      notes: `Key enterprise account managed under RetentIQ proactive monitoring.`,
      created_at: createdAt,
    });
  }

  const { data: insertedCustomers, error: custErr } = await adminSupabase
    .from('customers')
    .insert(customerRows)
    .select('id, name, company, plan_tier, mrr');

  if (custErr || !insertedCustomers) {
    throw new Error(`Failed to insert demo customers: ${custErr?.message}`);
  }

  // 8. Seed Health Scores across all 4 Risk Tiers:
  // - Low Risk (20): Score 80-98, healthy telemetry
  // - Medium Risk (15): Score 50-78, warning signs
  // - High Risk (10): Score 25-48, active alerts
  // - Critical Risk (5): Score 8-22, immediate churn risk
  const healthScoreRows: any[] = [];
  const alertRows: any[] = [];
  const eventRows: any[] = [];

  for (let i = 0; i < insertedCustomers.length; i++) {
    const cust = insertedCustomers[i];
    let score = 90;
    let churnProbability = '0.06';
    let riskTier: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let riskFactors: string[] = [];
    let action = 'Maintain standard quarterly cadence and identify expansion opps.';
    const confidence = (0.82 + (i % 15) * 0.01).toFixed(2);

    if (i < 20) {
      // Low Risk
      score = 80 + (i % 19);
      churnProbability = (0.02 + (i % 10) * 0.01).toFixed(2);
      riskTier = 'low';
      riskFactors = ['High weekly active user engagement', 'Consistent daily export volume'];
      action = 'Propose annual enterprise contract upgrade; invite to customer advisory board.';
    } else if (i < 35) {
      // Medium Risk
      score = 52 + ((i * 3) % 26);
      churnProbability = (0.18 + (i % 12) * 0.02).toFixed(2);
      riskTier = 'medium';
      riskFactors = [
        '15% drop in monthly session frequency',
        'Feature adoption below tier average',
      ];
      action = 'Dispatch automated workflow training email; request quick product feedback sync.';
    } else if (i < 45) {
      // High Risk
      score = 26 + ((i * 2) % 22);
      churnProbability = (0.42 + (i % 10) * 0.03).toFixed(2);
      riskTier = 'high';
      riskFactors = ['40% reduction in dashboard telemetry', '2 unresolved billing inquiries'];
      action = 'Assign dedicated Customer Success rep for high-touch intervention within 48h.';

      // Create Active Alert
      alertRows.push({
        org_id: orgId,
        customer_id: cust.id,
        score_at_trigger: score,
        delivery_channels: { slack: true, email: true },
        acknowledged: false,
        triggered_at: new Date(Date.now() - (i - 34) * 3600 * 1000 * 3).toISOString(),
      });
    } else {
      // Critical Risk
      score = 9 + ((i * 3) % 15);
      churnProbability = (0.78 + (i % 5) * 0.04).toFixed(2);
      riskTier = 'critical';
      riskFactors = [
        'Zero active sessions in the last 21 days',
        'Stripe payment failed (renewal invoice unpaid)',
        'Key executive sponsor departed account',
      ];
      action = 'URGENT: Executive sponsor rescue call & commercial contract restructuring.';

      // Create Critical Alert
      alertRows.push({
        org_id: orgId,
        customer_id: cust.id,
        score_at_trigger: score,
        delivery_channels: { slack: true, email: true },
        acknowledged: false,
        triggered_at: new Date(Date.now() - (i - 44) * 3600 * 1000 * 2).toISOString(),
      });
    }

    healthScoreRows.push({
      org_id: orgId,
      customer_id: cust.id,
      score,
      churn_probability: churnProbability,
      risk_tier: riskTier,
      top_risk_factors: riskFactors,
      recommended_action: action,
      confidence,
      scored_at: new Date(Date.now() - (i % 48) * 1800 * 1000).toISOString(),
    });

    // Add Telemetry Events for customer
    eventRows.push({
      org_id: orgId,
      customer_id: cust.id,
      event_type: 'login',
      source: 'web_app',
      payload: { platform: 'desktop', duration_seconds: 420 },
      occurred_at: new Date(Date.now() - (i * 2 + 1) * 3600 * 1000).toISOString(),
    });

    if (riskTier === 'high' || riskTier === 'critical') {
      eventRows.push({
        org_id: orgId,
        customer_id: cust.id,
        event_type: 'payment_failed',
        source: 'stripe',
        payload: { attempt: 2, error_code: 'card_declined' },
        occurred_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
      });
    } else {
      eventRows.push({
        org_id: orgId,
        customer_id: cust.id,
        event_type: 'export_generated',
        source: 'csv_exporter',
        payload: { records_count: 1420 },
        occurred_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
      });
    }
  }

  await adminSupabase.from('health_scores').insert(healthScoreRows);
  if (alertRows.length > 0) {
    await adminSupabase.from('alerts').insert(alertRows);
  }
  await adminSupabase.from('events').insert(eventRows);

  // 9. Seed ROI Aggregates (Past 6 months)
  const roiRows = [
    { org_id: orgId, month: '2026-03', revenue_saved: 124000.0, accounts_saved: 14 },
    { org_id: orgId, month: '2026-04', revenue_saved: 148500.0, accounts_saved: 18 },
    { org_id: orgId, month: '2026-05', revenue_saved: 162000.0, accounts_saved: 19 },
    { org_id: orgId, month: '2026-06', revenue_saved: 189000.0, accounts_saved: 22 },
    { org_id: orgId, month: '2026-07', revenue_saved: 215000.0, accounts_saved: 25 },
    { org_id: orgId, month: '2026-08', revenue_saved: 248000.0, accounts_saved: 28 },
  ];
  const { error: roiErr } = await adminSupabase.from('roi_aggregates').insert(roiRows);
  if (roiErr) {
    console.warn('[seedGuestWorkspace] Warning inserting roi_aggregates:', roiErr.message);
  }

  // 10. Seed Playbooks & Tasks
  const playbookRows = [
    {
      org_id: orgId,
      name: 'Executive Sponsor Churn Rescue',
      trigger_type: 'health_score_below',
      trigger_threshold: 25,
      steps: [
        {
          type: 'slack_alert',
          channel: '#churn-war-room',
          description: 'Alert CS leadership immediately',
        },
        { type: 'assign_csm_task', title: 'Schedule C-Level Retention Check-in' },
        { type: 'send_email_template', template_id: 'exec_outreach' },
      ],
      is_active: true,
    },
    {
      org_id: orgId,
      name: 'Failed Payment Grace Recovery',
      trigger_type: 'event_trigger',
      trigger_threshold: 0,
      steps: [
        { type: 'notify_finance', channel: '#billing-alerts' },
        { type: 'update_customer_status', status: 'billing_warning' },
      ],
      is_active: true,
    },
  ];
  const { error: playbookErr } = await adminSupabase.from('playbooks').insert(playbookRows);
  if (playbookErr) {
    console.warn('[seedGuestWorkspace] Warning inserting playbooks:', playbookErr.message);
  }

  const sampleCust = insertedCustomers[48]; // Critical customer
  if (sampleCust) {
    const { error: taskErr } = await adminSupabase.from('tasks').insert([
      {
        org_id: orgId,
        customer_id: sampleCust.id,
        title: `URGENT: Review failed invoice for ${sampleCust.company}`,
        description: 'Customer experienced 2 consecutive card declines. Coordinate renewal terms.',
        status: 'pending',
        due_date: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      },
      {
        org_id: orgId,
        customer_id: sampleCust.id,
        title: `Prepare executive retention briefing for ${sampleCust.company}`,
        description:
          'Compile usage analytics & historical ROI report for upcoming renewal negotiation.',
        status: 'in_progress',
        due_date: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
      },
    ]);
    if (taskErr) {
      console.warn('[seedGuestWorkspace] Warning inserting tasks:', taskErr.message);
    }
  }

  return { orgId, seeded: true, customerCount: insertedCustomers.length };
}
