/**
 * Static Sample / Offline Fallback Data for RetentIQ
 * Used when backend services are warming up (cold start) or during offline exploration.
 */

export const DEMO_OVERVIEW_METRICS = {
  total_customers: 50,
  avg_health_score: 74,
  at_risk_count: 15,
  critical_count: 5,
  revenue_at_risk: 42350.0,
};

export const DEMO_SCORE_DISTRIBUTION = [
  { name: 'Low Risk', value: 20, color: '#10B981' },
  { name: 'Medium Risk', value: 15, color: '#F59E0B' },
  { name: 'High Risk', value: 10, color: '#F97316' },
  { name: 'Critical Risk', value: 5, color: '#EF4444' },
];

export const DEMO_ALERTS = [
  {
    id: 'demo-alert-1',
    score_at_trigger: 14,
    triggered_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    customer_name: 'David Bishop',
    company: 'BlueHorizon Digital',
    customer_id: 'demo-cust-50',
  },
  {
    id: 'demo-alert-2',
    score_at_trigger: 18,
    triggered_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    customer_name: 'Penelope Cross',
    company: 'TrueNorth Systems',
    customer_id: 'demo-cust-49',
  },
  {
    id: 'demo-alert-3',
    score_at_trigger: 28,
    triggered_at: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    customer_name: 'Chloe Holt',
    company: 'Synthetix Data',
    customer_id: 'demo-cust-47',
  },
  {
    id: 'demo-alert-4',
    score_at_trigger: 34,
    triggered_at: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
    customer_name: 'Marcus Davenport',
    company: 'CoreSaaS Group',
    customer_id: 'demo-cust-46',
  },
];

export const DEMO_ROI_HISTORY = [
  { month: 'Mar 2026', accounts_saved: 14, arr_saved: 124000 },
  { month: 'Apr 2026', accounts_saved: 18, arr_saved: 148500 },
  { month: 'May 2026', accounts_saved: 19, arr_saved: 162000 },
  { month: 'Jun 2026', accounts_saved: 22, arr_saved: 189000 },
  { month: 'Jul 2026', accounts_saved: 25, arr_saved: 215000 },
  { month: 'Aug 2026', accounts_saved: 28, arr_saved: 248000 },
];

export const DEMO_CUSTOMERS_LIST = [
  {
    id: 'demo-cust-1',
    name: 'Emma Vance',
    email: 'emma.vance@apexsystems.io',
    company: 'ApexSystems',
    planTier: 'Enterprise',
    mrr: '2499.00',
    healthScore: {
      score: 94,
      churnProbability: '0.04',
      riskTier: 'low',
      top_risk_factors: ['Consistent high session depth', 'Weekly CSV exports'],
      recommendedAction: 'Engage for case study opportunities and expansion.',
      scoredAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    },
  },
  {
    id: 'demo-cust-2',
    name: 'Liam Sterling',
    email: 'liam.sterling@cloudscale.tech',
    company: 'CloudScale Technologies',
    planTier: 'Enterprise',
    mrr: '3200.00',
    healthScore: {
      score: 91,
      churnProbability: '0.05',
      riskTier: 'low',
      top_risk_factors: ['Healthy daily API usage', 'Active webhook listeners'],
      recommendedAction: 'Propose multi-year contract renewal lock-in.',
      scoredAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    },
  },
  {
    id: 'demo-cust-3',
    name: 'Olivia Chen',
    email: 'olivia.chen@devsymphony.com',
    company: 'DevSymphony Software',
    planTier: 'Pro',
    mrr: '799.00',
    healthScore: {
      score: 72,
      churnProbability: '0.21',
      riskTier: 'medium',
      top_risk_factors: ['Login cadence dropped 12%', 'No invites sent in 30 days'],
      recommendedAction: 'Trigger automated workflow training playbook.',
      scoredAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    },
  },
  {
    id: 'demo-cust-4',
    name: 'Noah Patel',
    email: 'noah.patel@innovateflow.io',
    company: 'InnovateFlow',
    planTier: 'Pro',
    mrr: '499.00',
    healthScore: {
      score: 64,
      churnProbability: '0.28',
      riskTier: 'medium',
      top_risk_factors: ['Slow ticket satisfaction survey', 'Declining query volume'],
      recommendedAction: 'Assign CSM for proactive checkpoint call.',
      scoredAt: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
    },
  },
  {
    id: 'demo-cust-5',
    name: 'Ava Hayes',
    email: 'ava.hayes@kryptonlabs.ai',
    company: 'KryptonLabs',
    planTier: 'Enterprise',
    mrr: '3900.00',
    healthScore: {
      score: 38,
      churnProbability: '0.52',
      riskTier: 'high',
      top_risk_factors: ['40% reduction in telemetry volume', '2 unresolved billing tickets'],
      recommendedAction: 'Assign executive sponsor for immediate intervention.',
      scoredAt: new Date(Date.now() - 1000 * 60 * 420).toISOString(),
    },
  },
  {
    id: 'demo-cust-6',
    name: 'Oliver Morrison',
    email: 'oliver.morrison@bluehorizon.io',
    company: 'BlueHorizon Digital',
    planTier: 'Enterprise',
    mrr: '2100.00',
    healthScore: {
      score: 14,
      churnProbability: '0.84',
      riskTier: 'critical',
      top_risk_factors: [
        'Zero logins in the last 21 days',
        'Stripe payment failed (2 attempts)',
        'Key executive sponsor left company',
      ],
      recommendedAction: 'URGENT: Initiate executive sponsor rescue protocol.',
      scoredAt: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
    },
  },
];
