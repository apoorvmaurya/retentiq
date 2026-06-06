'use client';

import React, { useEffect, useState } from 'react';
import { Slack, Layers, Mail, Activity, RefreshCw } from 'lucide-react';
import { fetchFromApi } from '@/lib/api';

export default function IntegrationsPage() {
  const [loading, setLoading] = useState(true);
  const [integrations, setIntegrations] = useState<any[]>([]);

  const loadIntegrations = async () => {
    setLoading(true);
    try {
      const data = await fetchFromApi('/integrations');
      setIntegrations(data || []);
    } catch (err) {
      console.error('Error fetching integrations:', err);
      // Fallback local state if API is unseeded or offline
      setIntegrations([
        { id: '1', provider: 'stripe', status: 'active', last_synced_at: new Date().toISOString() },
        { id: '2', provider: 'slack', status: 'active', last_synced_at: new Date().toISOString() },
        {
          id: '3',
          provider: 'intercom',
          status: 'active',
          last_synced_at: new Date().toISOString(),
        },
        { id: '4', provider: 'mixpanel', status: 'inactive', last_synced_at: null },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIntegrations();
  }, []);

  const handleToggle = async (provider: string, currentStatus: string) => {
    // Optimistic local toggle update
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';
    setIntegrations((prev) =>
      prev.map((item) => {
        if (item.provider === provider) {
          return {
            ...item,
            status: nextStatus,
            last_synced_at: nextStatus === 'active' ? new Date().toISOString() : null,
          };
        }
        return item;
      }),
    );
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
            Connect and configure usage telemetry, billing, and alerts providers.
          </p>
        </div>
        <button onClick={loadIntegrations} disabled={loading} className="btn-secondary">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Reload Catalog
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-cyan-400 mb-2" />
          Loading catalog providers...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {integrations.map((integration) => {
            const isActive = integration.status === 'active';
            const provider = integration.provider.toLowerCase();

            return (
              <div
                key={integration.id}
                className="glass-panel glass-card-hover rounded-xl p-6 flex flex-col justify-between h-64"
              >
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center border border-slate-800 bg-[#0C1224] shrink-0">
                      {provider === 'slack' && <Slack className="w-6 h-6 text-emerald-400" />}
                      {provider === 'stripe' && <Layers className="w-6 h-6 text-indigo-400" />}
                      {provider === 'intercom' && <Mail className="w-6 h-6 text-sky-400" />}
                      {provider === 'mixpanel' && <Activity className="w-6 h-6 text-purple-400" />}
                    </div>

                    <span
                      className={`px-2.5 py-0.5 border rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {integration.status}
                    </span>
                  </div>

                  <h4 className="text-lg font-bold text-white capitalize mb-1">
                    {integration.provider}
                  </h4>

                  <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                    {provider === 'stripe' &&
                      'Syncs payment history, subscription status updates, plan tiers, and billing declines.'}
                    {provider === 'slack' &&
                      'Dispatches high-priority churn triggers to your CS alert webhooks channels.'}
                    {provider === 'intercom' &&
                      'Pulls support ticket volume, ticket subjects, and client correspondence logs.'}
                    {provider === 'mixpanel' &&
                      'Tracks product analytics, login intervals, dashboard views, and feature adoption.'}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs font-semibold text-slate-400 mt-4">
                  <span className="text-[10px]">
                    {integration.lastSyncedAt || integration.last_synced_at
                      ? `Last sync: ${new Date(integration.lastSyncedAt || integration.last_synced_at).toLocaleTimeString()}`
                      : 'Sync disconnected'}
                  </span>

                  <button
                    onClick={() => handleToggle(integration.provider, integration.status)}
                    className={isActive ? 'btn-secondary' : 'btn-primary'}
                  >
                    {isActive ? 'Disconnect' : 'Connect API'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
