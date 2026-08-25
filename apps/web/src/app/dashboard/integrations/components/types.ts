import React from 'react';

export interface ProviderInfo {
  id: string;
  name: string;
  category: 'Billing' | 'Usage Analytics' | 'Support' | 'CRM' | 'Alerting';
  desc: string;
  icon: React.ComponentType<any>;
  color: string;
}

export interface GuideStep {
  title: string;
  text: string;
}

export interface ProviderGuide {
  overview: string;
  webhookRequired: boolean;
  events?: string[];
  steps: GuideStep[];
  testCommand?: string;
  testSamplePayload?: string;
}

export interface IntegrationConfig {
  id?: string;
  provider: string;
  status: 'active' | 'inactive' | 'error';
  config: Record<string, any>;
  lastSyncedAt?: string | null;
  errorMessage?: string | null;
}

export interface IntegrationField {
  label: string;
  key: string;
  placeholder: string;
  type: string;
}
