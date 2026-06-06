'use client';

import React, { useEffect, useState } from 'react';
import { 
  AlertTriangle, 
  Slack, 
  Mail, 
  CheckCircle, 
  Settings, 
  Clock, 
  RefreshCw,
  Bell
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

export default function AlertsPage() {
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  
  // Config states
  const [threshold, setThreshold] = useState(40);
  const [slackEnabled, setSlackEnabled] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);
  const [configSaveStatus, setConfigSaveStatus] = useState<string | null>(null);

  // Alerts history state
  const [alerts, setAlerts] = useState<any[]>([]);

  // Load alert config
  const loadAlertConfig = async () => {
    setLoading(true);
    try {
      const config = await fetchFromApi('/alerts/config');
      setThreshold(config.threshold ?? 40);
      setSlackEnabled(config.notify_slack ?? config.notifySlack ?? false);
      setEmailEnabled(config.notify_email ?? config.notifyEmail ?? false);
    } catch (err) {
      console.error('Error fetching alert config:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load alerts history
  const loadAlertsHistory = async () => {
    setHistoryLoading(true);
    try {
      const data = await fetchFromApi('/alerts');
      setAlerts(data || []);
    } catch (err) {
      console.error('Error fetching alert history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadAlertConfig();
    loadAlertsHistory();
  }, []);

  const handleSaveConfig = async () => {
    setConfigSaving(true);
    setConfigSaveStatus(null);
    try {
      await fetchFromApi('/alerts/config', {
        method: 'POST',
        body: JSON.stringify({
          threshold: Number(threshold),
          notify_slack: slackEnabled,
          notify_email: emailEnabled
        })
      });
      setConfigSaveStatus('Configuration saved successfully ✓');
      setTimeout(() => setConfigSaveStatus(null), 3500);
    } catch (err) {
      console.error('Error saving alert config:', err);
      setConfigSaveStatus('Failed to save config');
    } finally {
      setConfigSaving(false);
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      await fetchFromApi(`/alerts/${alertId}/resolve`, { method: 'PUT' });
      // Update local state to mark resolved
      setAlerts(prev => prev.map(item => {
        if (item.alert.id === alertId) {
          return {
            ...item,
            alert: {
              ...item.alert,
              acknowledged: true,
              resolvedAt: new Date().toISOString()
            }
          };
        }
        return item;
      }));
    } catch (err) {
      console.error('Error resolving alert:', err);
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="space-y-8 text-slate-800">
      
      {/* Header */}
      <div>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Alerts Workspace</h2>
        <p className="text-sm text-slate-500 font-medium mt-0.5">Configure rule triggers and review customer score alerts.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Configuration Form */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between h-[360px] lg:col-span-1">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider mb-4">
              <Settings className="w-4.5 h-4.5" />
              Alert Rules config
            </div>

            {loading ? (
              <div className="space-y-4 animate-pulse">
                <div className="h-6 bg-slate-100 rounded w-full" />
                <div className="h-4 bg-slate-100 rounded w-5/6" />
                <div className="h-4 bg-slate-100 rounded w-3/4" />
              </div>
            ) : (
              <div className="space-y-5">
                {/* Threshold Slider */}
                <div>
                  <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-1.5">
                    <span>Score Alert Threshold</span>
                    <span className="text-rose-600">&lt; {threshold}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-cyan-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Triggers alert when client health index falls below this value.
                  </span>
                </div>

                {/* Slack switch */}
                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-2">
                    <Slack className="w-4.5 h-4.5 text-emerald-500" />
                    <div>
                      <span className="text-xs font-bold text-slate-700 block">Slack Notifications</span>
                      <span className="text-[9px] text-slate-400 leading-none">Deliver alerts to Slack channel</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSlackEnabled(!slackEnabled)}
                    className={`w-10 h-6 rounded-full p-0.5 transition-colors cursor-pointer ${
                      slackEnabled ? 'bg-cyan-500' : 'bg-slate-200'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        slackEnabled ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Email switch */}
                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4.5 h-4.5 text-indigo-500" />
                    <div>
                      <span className="text-xs font-bold text-slate-700 block">Email Notifications</span>
                      <span className="text-[9px] text-slate-400 leading-none">Send updates to CS owner list</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setEmailEnabled(!emailEnabled)}
                    className={`w-10 h-6 rounded-full p-0.5 transition-colors cursor-pointer ${
                      emailEnabled ? 'bg-cyan-500' : 'bg-slate-200'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        emailEnabled ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 pt-4 flex flex-col gap-2 mt-4">
            {configSaveStatus && (
              <span className="text-[10px] font-bold text-cyan-600 text-center animate-pulse">
                {configSaveStatus}
              </span>
            )}
            <button
              onClick={handleSaveConfig}
              disabled={configSaving || loading}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow transition-all cursor-pointer disabled:opacity-50"
            >
              {configSaving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>

        {/* Right: History Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm lg:col-span-2 overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Triggers Alert Log</h4>
                <p className="text-xs text-slate-400 mt-0.5">Historical log records of organization alerts.</p>
              </div>
              <button 
                onClick={loadAlertsHistory}
                disabled={historyLoading}
                className="p-1.5 hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-500 hover:text-slate-700 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${historyLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="overflow-x-auto overflow-y-auto max-h-[360px] pr-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none">
                    <th className="p-3 pl-5">Client Account</th>
                    <th className="p-3 text-center">Score</th>
                    <th className="p-3 text-center">Channels</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-right pr-5">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {historyLoading ? (
                    <tr>
                      <td colSpan={5} className="p-10 text-center text-slate-400">
                        Retrieving logs history...
                      </td>
                    </tr>
                  ) : alerts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-10 text-center text-slate-400 italic">
                        No alert log triggers recorded.
                      </td>
                    </tr>
                  ) : (
                    alerts.map(item => {
                      const alert = item.alert;
                      const customer = item.customer;
                      const isResolved = alert.acknowledged || alert.resolvedAt;

                      return (
                        <tr key={alert.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-3 pl-5">
                            <div className="font-bold text-slate-800">{customer.company}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-300" />
                              {timeAgo(alert.triggeredAt || alert.triggered_at)}
                            </div>
                          </td>
                          <td className="p-3 text-center font-bold text-rose-500">
                            {alert.scoreAtTrigger || alert.score_at_trigger}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {alert.deliveryChannels?.slack || alert.delivery_channels?.slack ? (
                                <span title="Slack dispatched">
                                  <Slack className="w-3.5 h-3.5 text-emerald-500" />
                                </span>
                              ) : (
                                <Slack className="w-3.5 h-3.5 text-slate-200" />
                              )}
                              {alert.deliveryChannels?.email || alert.delivery_channels?.email ? (
                                <span title="Email sent">
                                  <Mail className="w-3.5 h-3.5 text-indigo-500" />
                                </span>
                              ) : (
                                <Mail className="w-3.5 h-3.5 text-slate-200" />
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            {isResolved ? (
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded text-[9px] font-bold uppercase">
                                Resolved
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-rose-50 text-rose-600 border border-rose-100 rounded text-[9px] font-bold uppercase animate-pulse">
                                Open
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right pr-5">
                            {!isResolved ? (
                              <button
                                onClick={() => handleResolveAlert(alert.id)}
                                className="px-2.5 py-1 bg-rose-50 border border-rose-100 hover:bg-rose-500 hover:text-white rounded text-[10px] font-bold text-rose-600 transition-colors cursor-pointer"
                              >
                                Resolve
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-semibold">Saved</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="p-4 border-t border-slate-100 text-[10px] text-slate-400 flex items-center gap-1.5 shrink-0">
            <Bell className="w-3.5 h-3.5 text-slate-400" />
            <span>Resolving alerts sets acknowledge flag true and stops active Slack alerts.</span>
          </div>
        </div>

      </div>

    </div>
  );
}
