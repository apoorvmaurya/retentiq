'use client';

import React, { useEffect, useState } from 'react';
import {
  Slack,
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
} from 'lucide-react';
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
];

export default function IntegrationsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [dbIntegrations, setDbIntegrations] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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
          config: {},
        }),
      });

      await loadIntegrations();
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
            },
          ];
        }
      });
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
            let healthStatus: 'healthy' | 'degraded' | 'disconnected' = 'disconnected';
            let healthLabel = 'Disconnected';
            let healthColor = 'text-slate-400 border-slate-700 bg-slate-950/40';

            if (isActive) {
              const lastSyncStr = dbRecord?.lastSyncedAt || dbRecord?.last_synced_at;
              if (lastSyncStr) {
                const lastSync = new Date(lastSyncStr);
                const diffHours = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);
                if (diffHours < 24) {
                  healthStatus = 'healthy';
                  healthLabel = 'Healthy';
                  healthColor = 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5';
                } else {
                  healthStatus = 'degraded';
                  healthLabel = 'Sync Degraded (>24h)';
                  healthColor = 'text-amber-400 border-amber-500/20 bg-amber-500/5';
                }
              } else {
                healthStatus = 'degraded';
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
                    {isActive && (
                      <button
                        onClick={() => handleSyncNow(prov.id)}
                        disabled={actionLoading === `sync-${prov.id}`}
                        className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white border border-slate-700 bg-slate-850 hover:bg-slate-800 text-[11px] font-bold tracking-wider transition-colors inline-flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw
                          className={`w-3 h-3 ${actionLoading === `sync-${prov.id}` ? 'animate-spin' : ''}`}
                        />
                        Sync Now
                      </button>
                    )}
                    <button
                      onClick={() => handleToggle(prov.id, isActive)}
                      disabled={actionLoading === prov.id}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wider transition-colors cursor-pointer ${
                        isActive
                          ? 'border border-rose-500/20 text-rose-400 bg-rose-500/5 hover:bg-rose-500/10'
                          : 'border border-cyan-500/20 text-cyan-400 bg-cyan-500/5 hover:bg-cyan-500/10'
                      }`}
                    >
                      {actionLoading === prov.id
                        ? 'Loading...'
                        : isActive
                          ? 'Disconnect'
                          : 'Connect API'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
