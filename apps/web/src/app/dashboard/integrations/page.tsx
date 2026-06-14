'use client';

import React, { useEffect, useState } from 'react';
import { Slack } from '@/components/icons/Slack';
import {
  CreditCard,
  Layers,
  Activity,
  MessageSquare,
  Database,
  Cloud,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  XCircle,
  FileText,
  CloudUpload,
  Check,
  Copy,
  Lock,
  Terminal,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchFromApi } from '@/lib/api';
import { useToast } from '@/components/Toast';

interface ProviderInfo {
  id: string;
  name: string;
  category: 'Billing' | 'Usage Analytics' | 'Support' | 'CRM' | 'Alerting';
  desc: string;
  icon: React.ComponentType<any>;
  color: string;
}

const PROVIDERS: ProviderInfo[] = [
  {
    id: 'stripe',
    name: 'Stripe',
    category: 'Billing',
    desc: 'Syncs subscription status, plan tier, MRR, billing history, failed payments, upgrades, and downgrades.',
    icon: CreditCard,
    color: 'text-indigo-400',
  },
  {
    id: 'segment',
    name: 'Segment',
    category: 'Usage Analytics',
    desc: 'Ingests product usage events, session lengths, feature clicks, and custom event taxonomy mapping.',
    icon: Layers,
    color: 'text-rose-400',
  },
  {
    id: 'mixpanel',
    name: 'Mixpanel',
    category: 'Usage Analytics',
    desc: 'Tracks customer event streams, dashboard interactions, and cohort feature usage breadths.',
    icon: Activity,
    color: 'text-purple-400',
  },
  {
    id: 'intercom',
    name: 'Intercom',
    category: 'Support',
    desc: 'Pulls customer support ticket volume, response times, and conversation sentiment.',
    icon: MessageSquare,
    color: 'text-sky-400',
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    category: 'CRM',
    desc: 'Syncs customer deal stages, contract value, account owner, and NPS/CSAT survey scores.',
    icon: Database,
    color: 'text-orange-400',
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    category: 'CRM',
    desc: 'Syncs Enterprise client accounts, contract dates, ARR, and sales-recorded NPS/CSAT scores.',
    icon: Cloud,
    color: 'text-[#00A1E0]',
  },
  {
    id: 'slack',
    name: 'Slack',
    category: 'Alerting',
    desc: 'Dispatches critical health drops, alert priorities, and playbook triggers directly to channels.',
    icon: Slack,
    color: 'text-emerald-400',
  },
  {
    id: 'csv',
    name: 'Manual CSV',
    category: 'Usage Analytics',
    desc: 'Upload custom CSV files containing customer usage events to queue them for background ingestion.',
    icon: FileText,
    color: 'text-cyan-400',
  },
];

interface GuideStep {
  title: string;
  text: string;
}

interface ProviderGuide {
  overview: string;
  webhookRequired: boolean;
  events?: string[];
  steps: GuideStep[];
  testCommand?: string;
  testSamplePayload?: string;
}

const PROVIDER_GUIDES: Record<string, ProviderGuide> = {
  stripe: {
    overview:
      'RetentIQ listens to billing events from Stripe to update customer subscription tiers (Pro, Basic, Churned) and calculate MRR metrics automatically.',
    webhookRequired: true,
    events: [
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'invoice.payment_failed',
    ],
    steps: [
      {
        title: 'Go to Stripe Developer settings',
        text: 'Log in to your Stripe Dashboard and navigate to Developers > Webhooks.',
      },
      {
        title: 'Add a Webhook Endpoint',
        text: "Click 'Add Endpoint' and paste your unique RetentIQ Stripe webhook URL.",
      },
      {
        title: 'Subscribe to Stripe Events',
        text: "Select customer.subscription.updated, customer.subscription.deleted, and invoice.payment_failed. Click 'Add Endpoint' to save.",
      },
      {
        title: 'Enter API Credentials Below',
        text: 'Enter your Stripe Secret Key and Webhook Signing Secret in the configuration form below to activate secure synchronization.',
      },
    ],
    testCommand: 'python test_stripe.py',
    testSamplePayload:
      '{\n  "type": "customer.subscription.updated",\n  "data": {\n    "object": {\n      "customer_email": "customer@example.com",\n      "items": {\n        "data": [{"price": {"unit_amount": 19900, "nickname": "Enterprise"}}]\n      }\n    }\n  }\n}',
  },
  intercom: {
    overview:
      'Pulls conversation count and CSAT ratings to monitor support ticket density. If customer tickets exceed the threshold (>3 tickets in 7 days), a high-touch alert is triggered.',
    webhookRequired: true,
    events: ['conversation.created', 'conversation.rated'],
    steps: [
      {
        title: 'Go to Intercom Developer Hub',
        text: 'Log in to your Intercom Developer Hub, select your app (or create a new one).',
      },
      {
        title: 'Add a Webhook URL',
        text: 'Navigate to Webhooks in the left sidebar and paste the RetentIQ Intercom Webhook URL.',
      },
      {
        title: 'Choose Webhook Topics',
        text: 'Add subscriptions for conversation.created and conversation.rated, then save.',
      },
      {
        title: 'Save Client Credentials Below',
        text: 'Enter your Intercom Client Secret in the configuration form below to verify signatures of incoming payloads.',
      },
    ],
    testCommand: 'python test_intercom.py',
    testSamplePayload:
      '{\n  "topic": "conversation.created",\n  "data": {\n    "item": {\n      "id": "conv_1",\n      "title": "Billing question",\n      "user": {"email": "user@example.com"}\n    }\n  }\n}',
  },
  segment: {
    overview:
      'Streams real-time customer event activity, identify calls, page views, and click telemetry directly into RetentIQ.',
    webhookRequired: true,
    steps: [
      {
        title: 'Go to Segment Destinations',
        text: "Log in to your Segment workspace, select your Source, and click 'Add Destination'.",
      },
      {
        title: 'Select Webhooks Destination',
        text: "Search for 'Webhooks' in the destination catalog and select it.",
      },
      {
        title: 'Configure Webhook URL',
        text: 'Paste the Segment webhook URL below into the Webhook URL field in your Segment settings.',
      },
      {
        title: 'Enable & Secure Destination',
        text: 'Toggle the destination status to Active and input your Webhook Signing Secret below to verify requests.',
      },
    ],
    testSamplePayload:
      '{\n  "type": "track",\n  "event": "login",\n  "userId": "user-id-123",\n  "properties": {\n    "email": "user@example.com"\n  }\n}',
  },
  mixpanel: {
    overview:
      "Pulls quantitative event logs by fetching event data directly from Mixpanel's Export API using a service account.",
    webhookRequired: false,
    steps: [
      {
        title: 'Create a Service Account',
        text: 'Go to Mixpanel Project Settings > Service Accounts and create an account with Analyst or Admin role.',
      },
      {
        title: 'Save Service Account Credentials Below',
        text: 'Retrieve the Username and Secret of the Service Account and input them in the form below.',
      },
      {
        title: 'Activate & Run Sync',
        text: "Toggle the integration to Active, then click 'Sync Now' in the catalog to fetch and backfill the last 30 days of user events.",
      },
    ],
  },
  hubspot: {
    overview:
      'Syncs customer CRM metadata, NPS scores, contract values, and renewal dates into RetentIQ.',
    webhookRequired: true,
    steps: [
      {
        title: 'Create a Private App',
        text: 'In HubSpot Settings, go to Integrations > Private Apps. Create a new Private App with crm.objects.contacts.read and crm.objects.companies.read scopes.',
      },
      {
        title: 'Configure Webhooks in HubSpot',
        text: "Set up Webhook subscriptions in HubSpot's developer app panel targeting the RetentIQ HubSpot Webhook URL.",
      },
      {
        title: 'Choose Webhook Topics',
        text: 'Subscribe to contact and company creation/property change events (like NPS updates).',
      },
      {
        title: 'Save Private App Access Token Below',
        text: 'Input your HubSpot Access Token in the configuration form below.',
      },
    ],
    testSamplePayload:
      '{\n  "email": "customer@example.com",\n  "nps_score": 9,\n  "deal_stage": "Closed Won"\n}',
  },
  salesforce: {
    overview:
      'Syncs Enterprise account owners, ARR values, deal stages, and account health notes into RetentIQ.',
    webhookRequired: true,
    steps: [
      {
        title: 'Configure Connected App',
        text: 'In Salesforce Setup, go to App Manager and create a Connected App with OAuth Scopes.',
      },
      {
        title: 'Create Outbound Message Webhook',
        text: 'Navigate to Workflow Actions > Outbound Messages. Create a new outbound message targeting the Salesforce webhook URL below.',
      },
      {
        title: 'Map Fields & Save Credentials Below',
        text: 'Select the fields to include (email, NPS/score, ARR, renewal date) and input your Connected App Client ID/Secret in the form below.',
      },
    ],
    testSamplePayload:
      '{\n  "email": "customer@example.com",\n  "nps_score": 8,\n  "deal_stage": "Closed Won"\n}',
  },
  slack: {
    overview:
      'Sends critical customer health drops and automated CS playbook alerts directly to your Slack channels.',
    webhookRequired: false,
    steps: [
      {
        title: 'Create an Incoming Webhook',
        text: "Go to your Slack Workspace App settings, enable Incoming Webhooks, and click 'Add New Webhook to Workspace'.",
      },
      {
        title: 'Select Alert Channel',
        text: 'Choose the channel where customer health alerts should be posted, and copy the Webhook URL.',
      },
      {
        title: 'Save Slack Webhook URL Below',
        text: 'Input the webhook URL in the configuration form below to enable playbook notifications.',
      },
    ],
  },
};

const PROVIDER_FIELDS: Record<
  string,
  { label: string; key: string; placeholder: string; type: string }[]
> = {
  stripe: [
    {
      label: 'Stripe Secret Key',
      key: 'stripeSecretKey',
      placeholder: 'sk_live_...',
      type: 'password',
    },
    {
      label: 'Stripe Webhook Secret',
      key: 'stripeWebhookSecret',
      placeholder: 'whsec_...',
      type: 'password',
    },
  ],
  mixpanel: [
    {
      label: 'Service Account Username',
      key: 'mixpanelServiceAccountUsername',
      placeholder: 'service-account-username',
      type: 'text',
    },
    {
      label: 'Service Account Secret',
      key: 'mixpanelServiceAccountSecret',
      placeholder: 'mixpanel-service-account-secret',
      type: 'password',
    },
  ],
  intercom: [
    {
      label: 'Intercom Client Secret',
      key: 'intercomClientSecret',
      placeholder: 'intercom-client-secret',
      type: 'password',
    },
    {
      label: 'Intercom Access Token (Optional)',
      key: 'intercomAccessToken',
      placeholder: 'intercom-access-token',
      type: 'password',
    },
  ],
  segment: [
    {
      label: 'Webhook Signing Secret',
      key: 'segmentWebhookSecret',
      placeholder: 'segment-signing-secret',
      type: 'password',
    },
  ],
  hubspot: [
    {
      label: 'Private App Access Token',
      key: 'hubspotAccessToken',
      placeholder: 'pat-na1-...',
      type: 'password',
    },
  ],
  salesforce: [
    {
      label: 'Connected App Client ID',
      key: 'salesforceClientId',
      placeholder: 'salesforce-client-id',
      type: 'text',
    },
    {
      label: 'Connected App Client Secret',
      key: 'salesforceClientSecret',
      placeholder: 'salesforce-client-secret',
      type: 'password',
    },
  ],
  slack: [
    {
      label: 'Slack Webhook URL',
      key: 'slackWebhookUrl',
      placeholder: 'https://hooks.slack.com/services/...',
      type: 'password',
    },
  ],
};

export default function IntegrationsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [dbIntegrations, setDbIntegrations] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Integration Guide / Connection Wizard State
  const [selectedGuideProvider, setSelectedGuideProvider] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'guide' | 'status'>('overview');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);

  // Credentials Form State
  const [configForm, setConfigForm] = useState<Record<string, string>>({});

  // CSV Manual Ingestion State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadWarnings, setUploadWarnings] = useState<string[] | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<any | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Load existing credentials when modal is opened
  useEffect(() => {
    if (selectedGuideProvider) {
      const dbRecord = dbIntegrations.find(
        (item) => item.provider.toLowerCase() === selectedGuideProvider.toLowerCase(),
      );
      setConfigForm(dbRecord?.config || {});
    } else {
      setConfigForm({});
    }
  }, [selectedGuideProvider, dbIntegrations]);

  // Fetch Org ID on mount
  useEffect(() => {
    const getOrg = async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('users')
            .select('org_id')
            .eq('id', user.id)
            .maybeSingle();
          if (profile?.org_id) {
            setOrgId(profile.org_id);
          }
        }
      } catch (err) {
        console.error('Error fetching org ID:', err);
      }
    };
    getOrg();
  }, []);

  const getWebhookUrl = (providerId: string) => {
    let baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
    if (!baseUrl.endsWith('/api') && !baseUrl.endsWith('/api/')) {
      baseUrl = baseUrl.replace(/\/$/, '') + '/api';
    }
    const currentOrgId = orgId || 'your-org-id';
    return `${baseUrl}/integrations/${providerId}/webhook/${currentOrgId}`;
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success('Copied to clipboard!');
  };

  const handleFileValidation = (file: File) => {
    setUploadError(null);
    setUploadWarnings(null);
    setUploadSuccess(null);

    if (!file.name.endsWith('.csv')) {
      setUploadError('Only CSV files are allowed');
      setUploadFile(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('CSV file size exceeds 5MB limit');
      setUploadFile(null);
      return;
    }

    setUploadFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const firstLine = text.split('\n')[0] || '';
      const headers = firstLine.split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));

      const required = ['customer_id', 'event_type', 'occurred_at'];
      const missing = required.filter((h) => !headers.includes(h));

      if (missing.length > 0) {
        setUploadWarnings([
          `Missing recommended standard columns: ${missing.join(', ')}. Ingestion might fail or map improperly if fields are missing.`,
        ]);
      }
    };
    reader.readAsText(file);
  };

  const handleUploadSubmit = async () => {
    if (!uploadFile) return;
    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      const formData = new FormData();
      formData.append('file', uploadFile);

      let baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
      if (!baseUrl.endsWith('/api') && !baseUrl.endsWith('/api/')) {
        baseUrl = baseUrl.replace(/\/$/, '') + '/api';
      }

      const response = await fetch(`${baseUrl}/integrations/csv/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Server returned ${response.status}`);
      }

      const result = await response.json();
      setUploadSuccess(result);
      toast.success('CSV queued successfully!');
      await loadIntegrations();
    } catch (err: any) {
      console.error('CSV upload failed:', err);
      setUploadError(err.message || 'An unexpected error occurred during upload.');
    } finally {
      setUploading(false);
    }
  };

  const loadIntegrations = async () => {
    setLoading(true);
    try {
      const data = await fetchFromApi('/integrations');
      setDbIntegrations(data || []);
    } catch (err) {
      console.error('Error fetching integrations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIntegrations();
  }, []);

  const handleToggle = async (providerId: string, isCurrentlyActive: boolean) => {
    setActionLoading(providerId);
    try {
      const nextStatus = isCurrentlyActive ? 'inactive' : 'active';

      await fetchFromApi('/integrations', {
        method: 'POST',
        body: JSON.stringify({
          provider: providerId,
          status: nextStatus,
          config: configForm,
        }),
      });

      await loadIntegrations();
      toast.success(`${providerId} integration status updated to ${nextStatus}!`);
    } catch (err) {
      console.error('Error toggling integration:', err);
      // Fallback local toggle in case of network issue
      setDbIntegrations((prev) => {
        const existing = prev.find((x) => x.provider === providerId);
        if (existing) {
          return prev.map((x) =>
            x.provider === providerId
              ? {
                  ...x,
                  status: isCurrentlyActive ? 'inactive' : 'active',
                  lastSyncedAt: new Date().toISOString(),
                }
              : x,
          );
        } else {
          return [
            ...prev,
            {
              id: Math.random().toString(),
              provider: providerId,
              status: 'active',
              lastSyncedAt: new Date().toISOString(),
              config: configForm,
            },
          ];
        }
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveSettings = async () => {
    if (!selectedGuideProvider) return;
    setActionLoading(selectedGuideProvider);
    try {
      await fetchFromApi('/integrations', {
        method: 'POST',
        body: JSON.stringify({
          provider: selectedGuideProvider,
          status: 'active',
          config: configForm,
        }),
      });
      await loadIntegrations();
      toast.success('Configuration saved successfully!');
    } catch (err: any) {
      console.error('Save config failed:', err);
      toast.error(`Failed to save configuration: ${err.message || 'Unknown error'}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSyncNow = async (providerId: string) => {
    setActionLoading(`sync-${providerId}`);
    try {
      await fetchFromApi(`/integrations/sync/${providerId}`);
      toast.success(`Sync triggered for ${providerId}!`);
      await loadIntegrations();
    } catch (err) {
      console.error('Sync failed:', err);
      toast.error(
        `Failed to trigger sync: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-8 text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight font-sans">
            Integrations Catalog
          </h2>
          <p className="text-sm text-slate-400 font-medium mt-0.5">
            Connect your existing data sources to compute real-time health intelligence.
          </p>
        </div>
        <button onClick={loadIntegrations} disabled={loading} className="btn-secondary">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Status
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-cyan-400 mb-2" />
          Loading catalog providers...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {PROVIDERS.map((prov) => {
            const dbRecord = dbIntegrations.find((item) => item.provider.toLowerCase() === prov.id);
            const isActive = dbRecord ? dbRecord.status === 'active' : false;

            // Calculate health based on last sync time
            let healthLabel = 'Disconnected';
            let healthColor = 'text-slate-400 border-slate-700 bg-slate-950/40';

            if (isActive) {
              const lastSyncStr = dbRecord?.lastSyncedAt || dbRecord?.last_synced_at;
              if (lastSyncStr) {
                const lastSync = new Date(lastSyncStr);
                const diffHours = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);
                if (diffHours < 24) {
                  healthLabel = 'Healthy';
                  healthColor = 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5';
                } else {
                  healthLabel = 'Sync Degraded (>24h)';
                  healthColor = 'text-amber-400 border-amber-500/20 bg-amber-500/5';
                }
              } else {
                healthLabel = 'Pending Sync';
                healthColor = 'text-amber-400 border-amber-500/20 bg-amber-500/5';
              }
            }

            const Icon = prov.icon;

            return (
              <div
                key={prov.id}
                className="glass-panel glass-card-hover rounded-xl p-6 flex flex-col justify-between h-72 border border-white/[0.04] bg-slate-900/30 relative overflow-hidden"
              >
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center border border-slate-800 bg-[#0C1224] shrink-0 shadow-lg">
                        <Icon className={`w-6 h-6 ${prov.color}`} />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-white font-sans">{prov.name}</h4>
                        <span className="text-[10px] uppercase font-bold text-[#8B95AB] tracking-wider">
                          {prov.category}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 border rounded-full text-[9px] font-bold uppercase tracking-wider ${healthColor}`}
                      >
                        {healthLabel}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed font-medium mt-2">
                    {prov.desc}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs font-semibold text-slate-400 mt-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500">
                      {isActive && (dbRecord?.lastSyncedAt || dbRecord?.last_synced_at)
                        ? `Last synced: ${new Date(dbRecord.lastSyncedAt || dbRecord.last_synced_at).toLocaleTimeString()}`
                        : 'No active connection'}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    {isActive && prov.id === 'csv' && (
                      <button
                        onClick={() => setIsUploadModalOpen(true)}
                        className="px-3 py-1.5 rounded-lg text-cyan-400 hover:text-cyan-300 border border-cyan-500/20 bg-cyan-500/5 hover:bg-cyan-500/10 text-[11px] font-bold tracking-wider transition-colors inline-flex items-center gap-1 cursor-pointer"
                      >
                        <FileText className="w-3 h-3" />
                        Upload CSV
                      </button>
                    )}
                    {isActive && prov.id !== 'csv' && (
                      <button
                        onClick={() => handleSyncNow(prov.id)}
                        disabled={actionLoading === `sync-${prov.id}`}
                        className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white border border-slate-700 bg-slate-800 hover:bg-slate-700 text-[11px] font-bold tracking-wider transition-colors inline-flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw
                          className={`w-3 h-3 ${actionLoading === `sync-${prov.id}` ? 'animate-spin' : ''}`}
                        />
                        Sync Now
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (prov.id === 'csv') {
                          setIsUploadModalOpen(true);
                        } else {
                          setSelectedGuideProvider(prov.id);
                          setActiveTab(isActive ? 'status' : 'overview');
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wider transition-colors cursor-pointer ${
                        isActive
                          ? 'border border-slate-700 text-slate-300 bg-slate-800 hover:bg-slate-700'
                          : 'border border-cyan-500/20 text-cyan-400 bg-cyan-500/5 hover:bg-cyan-500/10'
                      }`}
                    >
                      {isActive ? 'Configure' : 'Connect API'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CSV Upload Modal */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!uploading) {
                  setIsUploadModalOpen(false);
                  setUploadFile(null);
                  setUploadWarnings(null);
                  setUploadSuccess(null);
                  setUploadError(null);
                }
              }}
              className="fixed inset-0 bg-[#000]/70 z-40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] max-w-[90vw] bg-[#070B16] border border-[#152347] shadow-2xl z-50 p-6 sm:p-8 rounded-xl flex flex-col justify-between backdrop-blur-md text-slate-100"
            >
              <div>
                <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#152347]">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-white text-base">
                        Upload Custom Usage Events
                      </h4>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none">
                        Manual Event Ingestion
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (!uploading) {
                        setIsUploadModalOpen(false);
                        setUploadFile(null);
                        setUploadWarnings(null);
                        setUploadSuccess(null);
                        setUploadError(null);
                      }
                    }}
                    className="p-1.5 hover:bg-[#152347]/45 border border-transparent hover:border-[#152347] rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                {!uploadSuccess ? (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-400 leading-relaxed font-medium">
                      Upload a CSV containing customer event stream records. The system will
                      validate and queue the rows for background rescoring.
                    </p>

                    {/* Drag & Drop Zone */}
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragActive(true);
                      }}
                      onDragLeave={() => setDragActive(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragActive(false);
                        if (e.dataTransfer.files?.[0]) {
                          handleFileValidation(e.dataTransfer.files[0]);
                        }
                      }}
                      className={`border-2 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center transition-all cursor-pointer ${
                        dragActive
                          ? 'border-cyan-400 bg-cyan-500/5'
                          : 'border-slate-800 bg-[#0C1224]/50 hover:border-slate-700 hover:bg-[#0C1224]/80'
                      }`}
                      onClick={() => document.getElementById('csv-file-input')?.click()}
                    >
                      <input
                        type="file"
                        id="csv-file-input"
                        className="hidden"
                        accept=".csv"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            handleFileValidation(e.target.files[0]);
                          }
                        }}
                      />
                      <CloudUpload className="w-8 h-8 text-slate-500 mb-2" />
                      <span className="text-xs text-slate-300 font-semibold">
                        {uploadFile ? uploadFile.name : 'Click to select or drag & drop CSV'}
                      </span>
                      <span className="text-[10px] text-slate-500 mt-1 font-bold">
                        {uploadFile
                          ? `${(uploadFile.size / 1024).toFixed(1)} KB`
                          : 'Maximum size 5MB'}
                      </span>
                    </div>

                    {/* Warnings and Errors */}
                    {uploadError && (
                      <div className="p-3 border border-rose-500/20 bg-rose-500/5 text-rose-400 text-xs font-semibold rounded-lg flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>{uploadError}</div>
                      </div>
                    )}

                    {uploadWarnings &&
                      uploadWarnings.map((warning, idx) => (
                        <div
                          key={idx}
                          className="p-3 border border-amber-500/20 bg-amber-500/5 text-amber-400 text-xs font-semibold rounded-lg flex items-start gap-2"
                        >
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          <div>{warning}</div>
                        </div>
                      ))}

                    <div className="border-t border-[#152347] pt-4 mt-6 flex gap-3">
                      <button
                        onClick={() => {
                          setIsUploadModalOpen(false);
                          setUploadFile(null);
                          setUploadWarnings(null);
                          setUploadError(null);
                        }}
                        disabled={uploading}
                        className="btn-secondary flex-1"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleUploadSubmit}
                        disabled={uploading || !uploadFile}
                        className="btn-primary flex-1 inline-flex items-center justify-center gap-2"
                      >
                        {uploading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                        {uploading ? 'Processing File...' : 'Upload & Ingest'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 space-y-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h5 className="font-extrabold text-white text-base">Ingestion Queued</h5>
                      <p className="text-xs text-slate-400 mt-1">
                        We have successfully parsed {uploadSuccess.rowsQueued} event rows and
                        registered them in our data processing queues.
                      </p>
                    </div>
                    <div className="bg-[#0C1224] border border-slate-800 rounded-lg p-3 text-left space-y-1 text-xs">
                      <div className="flex justify-between text-slate-500 font-bold">
                        <span>Job ID:</span>
                        <span className="text-slate-300 font-mono select-all">
                          {uploadSuccess.jobId}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-500 font-bold">
                        <span>Status:</span>
                        <span className="text-emerald-400 capitalize">{uploadSuccess.status}</span>
                      </div>
                      <div className="flex justify-between text-slate-500 font-bold">
                        <span>Rows Count:</span>
                        <span className="text-white">{uploadSuccess.rowsQueued} lines</span>
                      </div>
                    </div>
                    <div className="border-t border-[#152347] pt-4 mt-6">
                      <button
                        onClick={() => {
                          setIsUploadModalOpen(false);
                          setUploadFile(null);
                          setUploadWarnings(null);
                          setUploadSuccess(null);
                          setUploadError(null);
                        }}
                        className="btn-primary w-full"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Integration Guide / Connection Wizard Modal */}
      <AnimatePresence>
        {selectedGuideProvider &&
          (() => {
            const prov = PROVIDERS.find((p) => p.id === selectedGuideProvider);
            const guide = PROVIDER_GUIDES[selectedGuideProvider];
            const dbRecord = dbIntegrations.find(
              (item) => item.provider.toLowerCase() === selectedGuideProvider,
            );
            const isActive = dbRecord ? dbRecord.status === 'active' : false;

            if (!prov || !guide) return null;

            const Icon = prov.icon;

            // Determine health settings
            let healthLabel = 'Disconnected';
            let healthColor = 'text-slate-400 border-slate-700 bg-slate-950/40';
            if (isActive) {
              const lastSyncStr = dbRecord?.lastSyncedAt || dbRecord?.last_synced_at;
              if (lastSyncStr) {
                const lastSync = new Date(lastSyncStr);
                const diffHours = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);
                if (diffHours < 24) {
                  healthLabel = 'Healthy';
                  healthColor = 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5';
                } else {
                  healthLabel = 'Sync Degraded (>24h)';
                  healthColor = 'text-amber-400 border-amber-500/20 bg-amber-500/5';
                }
              } else {
                healthLabel = 'Pending Sync';
                healthColor = 'text-amber-400 border-amber-500/20 bg-amber-500/5';
              }
            }

            return (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.5 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSelectedGuideProvider(null)}
                  className="fixed inset-0 bg-[#000]/70 z-40"
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] max-w-[95vw] h-[600px] max-h-[90vh] bg-[#070B16] border border-[#152347] shadow-2xl z-50 p-6 sm:p-8 rounded-xl flex flex-col justify-between backdrop-blur-md text-slate-100"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#152347]">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
                          <Icon className={`w-5 h-5 ${prov.color}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-extrabold text-white text-base">
                              {prov.name} Integration Setup
                            </h4>
                            <span
                              className={`px-2 py-0.5 border rounded-full text-[8px] font-bold uppercase tracking-wider ${healthColor}`}
                            >
                              {healthLabel}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none mt-0.5">
                            {prov.category} Telemetry
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedGuideProvider(null)}
                        className="p-1.5 hover:bg-[#152347]/45 border border-transparent hover:border-[#152347] rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-slate-800/80 mb-4 text-xs font-bold">
                      <button
                        onClick={() => setActiveTab('overview')}
                        className={`pb-2.5 px-4 relative transition-colors cursor-pointer ${
                          activeTab === 'overview'
                            ? 'text-[#00D4FF]'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Overview
                        {activeTab === 'overview' && (
                          <motion.div
                            layoutId="activeGuideTab"
                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00D4FF]"
                          />
                        )}
                      </button>
                      <button
                        onClick={() => setActiveTab('guide')}
                        className={`pb-2.5 px-4 relative transition-colors cursor-pointer ${
                          activeTab === 'guide'
                            ? 'text-[#00D4FF]'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Setup Instructions
                        {activeTab === 'guide' && (
                          <motion.div
                            layoutId="activeGuideTab"
                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00D4FF]"
                          />
                        )}
                      </button>
                      <button
                        onClick={() => setActiveTab('status')}
                        className={`pb-2.5 px-4 relative transition-colors cursor-pointer ${
                          activeTab === 'status'
                            ? 'text-[#00D4FF]'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Status & Logs
                        {activeTab === 'status' && (
                          <motion.div
                            layoutId="activeGuideTab"
                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00D4FF]"
                          />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Scrollable Content Body */}
                  <div className="flex-1 overflow-y-auto pr-1 space-y-4 mb-4 text-slate-300">
                    {activeTab === 'overview' && (
                      <div className="space-y-4">
                        <div className="p-4 border border-[#152347] bg-[#0C1224]/50 rounded-xl space-y-2">
                          <h5 className="text-white font-bold text-xs uppercase tracking-wider text-slate-500">
                            About the Integration
                          </h5>
                          <p className="text-xs text-slate-300 leading-relaxed font-medium">
                            {guide.overview}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <h5 className="text-white font-bold text-xs">Telemetry Events Synced</h5>
                          <p className="text-xs text-slate-400 font-medium">
                            Connecting this integration routes the following events into our
                            processing engines:
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {(guide.events || ['user_activity_event']).map((ev) => (
                              <div
                                key={ev}
                                className="flex items-center gap-2 px-3 py-2 bg-slate-900/40 border border-slate-800/60 rounded-lg text-xs font-mono text-cyan-400"
                              >
                                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                                {ev}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="p-4 border border-white/[0.04] bg-slate-950/20 rounded-xl flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 text-slate-400 font-medium">
                            <Lock className="w-4 h-4 text-slate-500" />
                            <span>All data transfer is encrypted using TLS/SSL protocols.</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === 'guide' && (
                      <div className="space-y-4">
                        {guide.webhookRequired && (
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                              Your Organization Webhook Endpoint
                            </label>
                            <p className="text-[11px] text-slate-500 font-medium">
                              Copy this URL and paste it into the webhook configurations page on the
                              provider's platform.
                            </p>
                            <div className="bg-[#0C1224] border border-[#152347] rounded-xl p-3 flex items-center justify-between font-mono text-xs text-slate-300">
                              <span className="truncate mr-3 select-all">
                                {getWebhookUrl(selectedGuideProvider)}
                              </span>
                              <button
                                onClick={() =>
                                  handleCopy(getWebhookUrl(selectedGuideProvider), 'webhook-url')
                                }
                                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0 border border-transparent hover:border-slate-700"
                                title="Copy Webhook URL"
                              >
                                {copiedId === 'webhook-url' ? (
                                  <Check className="w-4 h-4 text-emerald-400" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="space-y-3">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            Setup Roadmap
                          </label>
                          <div className="space-y-4">
                            {guide.steps.map((step, idx) => (
                              <div key={idx} className="flex gap-3 items-start">
                                <div className="w-6 h-6 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 shadow-md">
                                  {idx + 1}
                                </div>
                                <div className="space-y-0.5">
                                  <h5 className="font-extrabold text-white text-xs leading-tight">
                                    {step.title}
                                  </h5>
                                  <p className="text-slate-400 text-xs leading-relaxed font-medium">
                                    {step.text}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Secure API Credentials Form */}
                        {selectedGuideProvider &&
                          PROVIDER_FIELDS[selectedGuideProvider]?.length > 0 && (
                            <div className="border-t border-[#152347] pt-4 mt-6 space-y-4">
                              <div>
                                <h5 className="font-extrabold text-white text-xs uppercase tracking-wider text-slate-400">
                                  Secure API Credentials
                                </h5>
                                <p className="text-[10px] text-slate-500 font-medium leading-normal mt-0.5">
                                  Credentials are symmetrically encrypted at rest. We never expose
                                  plaintext secrets back to the browser.
                                </p>
                              </div>
                              <div className="space-y-3">
                                {PROVIDER_FIELDS[selectedGuideProvider].map((field) => (
                                  <div key={field.key} className="space-y-1">
                                    <label className="text-[10px] uppercase font-bold text-slate-400">
                                      {field.label}
                                    </label>
                                    <input
                                      type={field.type}
                                      placeholder={field.placeholder}
                                      value={configForm[field.key] || ''}
                                      onChange={(e) =>
                                        setConfigForm({
                                          ...configForm,
                                          [field.key]: e.target.value,
                                        })
                                      }
                                      className="w-full bg-[#05070f] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                      </div>
                    )}

                    {activeTab === 'status' && (
                      <div className="space-y-4">
                        {/* Connection Details */}
                        <div className="p-4 border border-[#152347] bg-[#0C1224]/50 rounded-xl space-y-3">
                          <h5 className="text-white font-bold text-xs uppercase tracking-wider text-slate-400">
                            Connection Details
                          </h5>
                          <div className="grid grid-cols-2 gap-4 text-xs font-medium">
                            <div>
                              <span className="text-slate-500">Connection Status:</span>
                              <span
                                className={`block font-bold mt-0.5 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`}
                              >
                                {isActive ? 'Active & Listening' : 'Inactive / Paused'}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500">Last Sync Trigger:</span>
                              <span className="block text-white font-bold mt-0.5">
                                {isActive && (dbRecord?.lastSyncedAt || dbRecord?.last_synced_at)
                                  ? new Date(
                                      dbRecord.lastSyncedAt || dbRecord.last_synced_at,
                                    ).toLocaleString()
                                  : 'No synced logs found'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Developer Testing / Scripting Info */}
                        {typeof window !== 'undefined' &&
                          (window.location.hostname === 'localhost' ||
                            window.location.hostname === '127.0.0.1' ||
                            process.env.NODE_ENV === 'development') && (
                            <div className="space-y-2">
                              <h5 className="text-white font-bold text-xs">
                                Ingestion Verification & Developer Sandbox
                              </h5>
                              <p className="text-xs text-slate-400 font-medium leading-relaxed">
                                Want to test the webhook processing flow end-to-end? You can send
                                mock payloads using the pre-configured scripts or payloads.
                              </p>

                              {guide.testCommand && (
                                <div className="space-y-1">
                                  <span className="text-[10px] uppercase font-bold text-slate-500">
                                    Sandbox Test Script Command
                                  </span>
                                  <div className="bg-[#05070f] border border-slate-900 rounded-xl p-3 flex items-center justify-between font-mono text-xs text-cyan-400">
                                    <div className="flex items-center gap-1.5 truncate">
                                      <Terminal className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                      <span className="truncate select-all">
                                        {guide.testCommand}
                                      </span>
                                    </div>
                                    <button
                                      onClick={() => handleCopy(guide.testCommand!, 'test-cmd')}
                                      className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0 border border-transparent hover:border-slate-700"
                                    >
                                      {copiedId === 'test-cmd' ? (
                                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                                      ) : (
                                        <Copy className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                  </div>
                                </div>
                              )}

                              {guide.testSamplePayload && (
                                <div className="space-y-1">
                                  <span className="text-[10px] uppercase font-bold text-slate-500">
                                    Sample Webhook Payload JSON
                                  </span>
                                  <div className="bg-[#05070f] border border-slate-900 rounded-xl p-3 relative font-mono text-[10px] text-slate-400 leading-normal max-h-32 overflow-y-auto">
                                    <pre className="whitespace-pre-wrap select-all">
                                      {guide.testSamplePayload}
                                    </pre>
                                    <button
                                      onClick={() =>
                                        handleCopy(guide.testSamplePayload!, 'test-payload')
                                      }
                                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-[#070B16] border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                                    >
                                      {copiedId === 'test-payload' ? (
                                        <Check className="w-3 h-3 text-emerald-400" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                      </div>
                    )}
                  </div>

                  {/* Footer Action Buttons */}
                  <div className="border-t border-[#152347] pt-4 flex gap-3">
                    <button
                      onClick={() => setSelectedGuideProvider(null)}
                      className="btn-secondary flex-1 border border-slate-800 bg-slate-950/20 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      Close Guide
                    </button>

                    {isActive && (
                      <button
                        onClick={handleSaveSettings}
                        disabled={actionLoading === selectedGuideProvider}
                        className="flex-1 btn-primary bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300 inline-flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        {actionLoading === selectedGuideProvider && (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        )}
                        Save Settings
                      </button>
                    )}

                    <button
                      onClick={() => {
                        handleToggle(selectedGuideProvider, isActive);
                        if (!isActive) {
                          setActiveTab('status');
                        }
                      }}
                      disabled={actionLoading === selectedGuideProvider}
                      className={`flex-1 btn-primary inline-flex items-center justify-center gap-1.5 cursor-pointer ${
                        isActive
                          ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300'
                          : 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300'
                      }`}
                    >
                      {actionLoading === selectedGuideProvider && (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      )}
                      {isActive ? 'Deactivate Connection' : 'Activate Connection'}
                    </button>
                  </div>
                </motion.div>
              </>
            );
          })()}
      </AnimatePresence>
    </div>
  );
}
