'use client';

import React, { useEffect, useState } from 'react';
import { 
  Slack, 
  Layers, 
  Mail, 
  Activity, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw, 
  Puzzle,
  ExternalLink
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// Fetch helper with auth header
async function fetchFromApi(endpoint: string, options: RequestInit = {}) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as any)
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers
  });
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return response.json();
}

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
        { id: '3', provider: 'intercom', status: 'active', last_synced_at: new Date().toISOString() },
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
    setIntegrations(prev => prev.map(item => {
      if (item.provider === provider) {
        return {
          ...item,
          status: nextStatus,
          last_synced_at: nextStatus === 'active' ? new Date().toISOString() : null
        };
      }
      return item;
    }));
  };

  return (
    <div className="space-y-8 text-slate-800">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight font-sans">Integrations Catalog</h2>
          <p className="text-sm text-slate-500 font-medium mt-0.5">Connect and configure usage telemetry, billing, and alerts providers.</p>
        </div>
        <button 
          onClick={loadIntegrations} 
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 text-xs font-bold rounded-xl shadow-sm hover:shadow transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Reload Catalog
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-slate-300 mb-2" />
          Loading catalog providers...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {integrations.map((integration) => {
            const isActive = integration.status === 'active';
            const provider = integration.provider.toLowerCase();

            return (
              <div key={integration.id} className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between h-64 hover:border-indigo-200 transition-colors">
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center border border-slate-100 bg-slate-50 shrink-0">
                      {provider === 'slack' && <Slack className="w-6 h-6 text-emerald-500" />}
                      {provider === 'stripe' && <Layers className="w-6 h-6 text-indigo-500" />}
                      {provider === 'intercom' && <Mail className="w-6 h-6 text-sky-500" />}
                      {provider === 'mixpanel' && <Activity className="w-6 h-6 text-purple-500" />}
                    </div>

                    <span className={`px-2.5 py-0.5 border rounded-full text-[9px] font-bold uppercase tracking-wider ${
                      isActive 
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                        : 'bg-slate-50 text-slate-400 border-slate-200'
                    }`}>
                      {integration.status}
                    </span>
                  </div>

                  <h4 className="text-lg font-bold text-slate-900 capitalize mb-1">
                    {integration.provider}
                  </h4>
                  
                  <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                    {provider === 'stripe' && 'Syncs payment history, subscription status updates, plan tiers, and billing declines.'}
                    {provider === 'slack' && 'Dispatches high-priority churn triggers to your CS alert webhooks channels.'}
                    {provider === 'intercom' && 'Pulls support ticket volume, ticket subjects, and client correspondence logs.'}
                    {provider === 'mixpanel' && 'Tracks product analytics, login intervals, dashboard views, and feature adoption.'}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-400 mt-4">
                  <span className="text-[10px]">
                    {integration.lastSyncedAt || integration.last_synced_at 
                      ? `Last sync: ${new Date(integration.lastSyncedAt || integration.last_synced_at).toLocaleTimeString()}`
                      : 'Sync disconnected'
                    }
                  </span>
                  
                  <button
                    onClick={() => handleToggle(integration.provider, integration.status)}
                    className={`px-4 py-2 rounded-lg font-bold text-xs cursor-pointer border shadow-sm transition-all ${
                      isActive 
                        ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50' 
                        : 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-500'
                    }`}
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
