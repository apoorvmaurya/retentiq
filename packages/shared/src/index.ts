export interface Organization {
  id: string;
  name: string;
  slug: string;
  team_size: number;
  created_at: Date | string;
}

export type UserRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface User {
  id: string;
  org_id: string;
  email: string;
  role: UserRole;
  onboarding_complete: boolean;
  created_at: Date | string;
}

export interface Customer {
  id: string;
  org_id: string;
  name: string;
  email: string;
  company: string;
  plan_tier: string;
  mrr: number;
  created_at: Date | string;
}

export type RiskTier = 'low' | 'medium' | 'high' | 'critical';

export interface HealthScore {
  id: string;
  customer_id: string;
  org_id: string;
  score: number; // 0-100
  churn_probability: number; // 0-1.0
  risk_tier: RiskTier;
  top_risk_factors: string[] | Record<string, any>;
  recommended_action: string;
  confidence: number;
  scored_at: Date | string;
}

export interface CustomerEvent {
  id: string;
  customer_id: string;
  org_id: string;
  event_type: string;
  source: string;
  payload: Record<string, any>;
  occurred_at: Date | string;
}

export interface Alert {
  id: string;
  org_id: string;
  customer_id: string;
  triggered_at: Date | string;
  resolved_at: (Date | string) | null;
  score_at_trigger: number;
  delivery_channels: {
    slack?: boolean;
    email?: boolean;
  };
  acknowledged: boolean;
}

export interface Integration {
  id: string;
  org_id: string;
  provider: 'slack' | 'stripe' | 'intercom' | 'mixpanel' | string;
  status: 'active' | 'inactive' | 'error';
  config: Record<string, any>;
  last_synced_at: (Date | string) | null;
  created_at: Date | string;
}

export interface RetentionAction {
  id: string;
  org_id: string;
  customer_id: string;
  action_type: string;
  outcome: string;
  revenue_saved: number;
  actioned_at: Date | string;
}

export interface AlertConfig {
  id: string;
  org_id: string;
  threshold: number; // default 40
  notify_slack: boolean;
  notify_email: boolean;
  updated_at: Date | string;
}

export interface GroqUsage {
  id: string;
  org_id: string;
  endpoint: string;
  tokens_used: number;
  model: string;
  cost_usd: number;
  created_at: Date | string;
}

// API payload contracts
export interface PredictChurnRequest {
  customerId: string;
  metrics: {
    ticketCount: number;
    loginFrequency: number; // days per week
    featureUsageDropPercent: number;
    mrr: number;
  };
}

export interface PredictChurnResponse {
  customerId: string;
  score: number;
  churnProbability: number;
  riskTier: RiskTier;
  topRiskFactors: string[];
  recommendedAction: string;
  confidence: number;
}
