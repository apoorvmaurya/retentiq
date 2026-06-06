'use client';

import React, { useEffect, useState } from 'react';
import { Slack, Mail, Settings, Clock, RefreshCw, Bell } from 'lucide-react';
import { fetchFromApi } from '@/lib/api';
import { timeAgo } from '@/lib/dateUtils';

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
          notify_email: emailEnabled,
        }),
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
      setAlerts((prev) =>
        prev.map((item) => {
          if (item.alert.id === alertId) {
            return {
              ...item,
              alert: {
                ...item.alert,
                acknowledged: true,
                resolvedAt: new Date().toISOString(),
              },
            };
          }
          return item;
        }),
      );
    } catch (err) {
      console.error('Error resolving alert:', err);
    }
  };

  return (
    <div className="space-y-8 text-slate-100">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-extrabold text-[#F8F6F0] tracking-tight">Alerts Workspace</h2>
        <p className="text-sm text-slate-400 font-medium mt-0.5">
          Configure rule triggers and review customer score alerts.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Configuration Form */}
        <div className="glass-panel rounded-xl p-6 flex flex-col justify-between h-[360px] lg:col-span-1">
          <div>
            <div className="flex items-center gap-2 text-[#00D4FF] font-bold text-xs uppercase tracking-wider mb-4">
              <Settings className="w-4.5 h-4.5" />
              Alert Rules config
            </div>

            {loading ? (
              <div className="space-y-4 animate-pulse">
                <div className="h-6 bg-white/[0.03] rounded w-full" />
                <div className="h-4 bg-white/[0.03] rounded w-5/6" />
                <div className="h-4 bg-white/[0.03] rounded w-3/4" />
              </div>
            ) : (
              <div className="space-y-5">
                {/* Threshold Slider */}
                <div>
                  <div className="flex justify-between items-center text-xs font-bold text-slate-300 mb-1.5">
                    <span>Score Alert Threshold</span>
                    <span className="text-rose-400">&lt; {threshold}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                    className="w-full h-1.5 bg-white/[0.08] rounded-lg appearance-none cursor-pointer accent-[#00D4FF] focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Triggers alert when client health index falls below this value.
                  </span>
                </div>

                {/* Slack switch */}
                <div className="flex items-center justify-between border-t border-white/[0.06] pt-3">
                  <div className="flex items-center gap-2">
                    <Slack className="w-4.5 h-4.5 text-emerald-400" />
                    <div>
                      <span className="text-xs font-bold text-slate-300 block">
                        Slack Notifications
                      </span>
                      <span className="text-[9px] text-slate-400 leading-none">
                        Deliver alerts to Slack channel
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSlackEnabled(!slackEnabled)}
                    className={`w-10 h-6 rounded-full p-0.5 transition-colors cursor-pointer ${
                      slackEnabled ? 'bg-[#00D4FF]' : 'bg-white/[0.08]'
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
                <div className="flex items-center justify-between border-t border-white/[0.06] pt-3">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4.5 h-4.5 text-indigo-400" />
                    <div>
                      <span className="text-xs font-bold text-slate-300 block">
                        Email Notifications
                      </span>
                      <span className="text-[9px] text-slate-400 leading-none">
                        Send updates to CS owner list
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setEmailEnabled(!emailEnabled)}
                    className={`w-10 h-6 rounded-full p-0.5 transition-colors cursor-pointer ${
                      emailEnabled ? 'bg-[#00D4FF]' : 'bg-white/[0.08]'
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

          <div className="border-t border-white/[0.06] pt-4 flex flex-col gap-2 mt-4">
            {configSaveStatus && (
              <span className="text-[10px] font-bold text-cyan-400 text-center animate-pulse">
                {configSaveStatus}
              </span>
            )}
            <button
              onClick={handleSaveConfig}
              disabled={configSaving || loading}
              className="btn-primary w-full py-2.5"
            >
              {configSaving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>

        {/* Right: History Table */}
        <div className="glass-panel rounded-xl lg:col-span-2 overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-[#F8F6F0] uppercase tracking-wider">
                  Triggers Alert Log
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Historical log records of organization alerts.
                </p>
              </div>
              <button
                onClick={loadAlertsHistory}
                disabled={historyLoading}
                className="btn-secondary p-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${historyLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="overflow-x-auto overflow-y-auto max-h-[360px] pr-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/[0.015] border-b border-white/[0.06] text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none">
                    <th className="p-3 pl-5">Client Account</th>
                    <th className="p-3 text-center">Score</th>
                    <th className="p-3 text-center">Channels</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-right pr-5">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04] text-xs">
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
                    alerts.map((item) => {
                      const alert = item.alert;
                      const customer = item.customer;
                      const isResolved = alert.acknowledged || alert.resolvedAt;

                      return (
                        <tr
                          key={alert.id}
                          className="hover:bg-white/[0.01] transition-colors border-b border-white/[0.04]"
                        >
                          <td className="p-3 pl-5">
                            <div className="font-bold text-[#F8F6F0]">{customer.company}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {timeAgo(alert.triggeredAt || alert.triggered_at)}
                            </div>
                          </td>
                          <td className="p-3 text-center font-bold text-rose-400">
                            {alert.scoreAtTrigger || alert.score_at_trigger}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {alert.deliveryChannels?.slack || alert.delivery_channels?.slack ? (
                                <span title="Slack dispatched">
                                  <Slack className="w-3.5 h-3.5 text-[#00D4FF]" />
                                </span>
                              ) : (
                                <Slack className="w-3.5 h-3.5 text-white/[0.08]" />
                              )}
                              {alert.deliveryChannels?.email || alert.delivery_channels?.email ? (
                                <span title="Email sent">
                                  <Mail className="w-3.5 h-3.5 text-indigo-450" />
                                </span>
                              ) : (
                                <Mail className="w-3.5 h-3.5 text-white/[0.08]" />
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            {isResolved ? (
                              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[9px] font-bold uppercase">
                                Resolved
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded text-[9px] font-bold uppercase animate-pulse">
                                Open
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right pr-5">
                            {!isResolved ? (
                              <button
                                onClick={() => handleResolveAlert(alert.id)}
                                className="px-2.5 py-1 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500 hover:text-white rounded text-[10px] font-bold text-rose-400 transition-colors cursor-pointer"
                              >
                                Resolve
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-semibold">
                                Saved
                              </span>
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

          <div className="p-4 border-t border-white/[0.06] text-[10px] text-slate-400 flex items-center gap-1.5 shrink-0">
            <Bell className="w-3.5 h-3.5 text-slate-400" />
            <span>Resolving alerts sets acknowledge flag true and stops active Slack alerts.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
