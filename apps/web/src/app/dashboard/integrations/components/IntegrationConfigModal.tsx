'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XCircle, Lock, Check, Copy, Terminal, RefreshCw } from 'lucide-react';
import { ProviderInfo, IntegrationConfig } from './types';
import { PROVIDER_GUIDES, PROVIDER_FIELDS } from './constants';

interface IntegrationConfigModalProps {
  provider: ProviderInfo | null;
  dbRecord?: IntegrationConfig;
  activeTab: 'overview' | 'guide' | 'status';
  setActiveTab: (tab: 'overview' | 'guide' | 'status') => void;
  configForm: Record<string, string>;
  setConfigForm: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  actionLoading: string | null;
  providerJobs: any[];
  loadingProviderJobs: boolean;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
  onClose: () => void;
  onSaveSettings: () => Promise<void>;
  onToggle: (providerId: string, isCurrentlyActive: boolean) => Promise<void>;
  getWebhookUrl: (providerId: string) => string;
}

export function IntegrationConfigModal({
  provider,
  dbRecord,
  activeTab,
  setActiveTab,
  configForm,
  setConfigForm,
  actionLoading,
  providerJobs,
  loadingProviderJobs,
  copiedId,
  onCopy,
  onClose,
  onSaveSettings,
  onToggle,
  getWebhookUrl,
}: IntegrationConfigModalProps) {
  if (!provider) return null;

  const guide = PROVIDER_GUIDES[provider.id];
  if (!guide) return null;

  const isActive = dbRecord ? dbRecord.status === 'active' : false;
  const lastSyncStr = dbRecord?.lastSyncedAt || (dbRecord as any)?.last_synced_at;
  const Icon = provider.icon;

  let healthLabel = 'Disconnected';
  let healthColor = 'text-slate-400 border-slate-700 bg-slate-950/40';
  if (isActive) {
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
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/70 z-40"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-162.5 max-w-[95vw] h-150 max-h-[90vh] bg-[#070B16] border border-[#152347] shadow-2xl z-50 p-6 sm:p-8 rounded-xl flex flex-col justify-between backdrop-blur-md text-slate-100"
      >
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#152347]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
                <Icon className={`w-5 h-5 ${provider.color}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-extrabold text-white text-base">
                    {provider.name} Integration Setup
                  </h4>
                  <span
                    className={`px-2 py-0.5 border rounded-full text-[8px] font-bold uppercase tracking-wider ${healthColor}`}
                  >
                    {healthLabel}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none mt-0.5">
                  {provider.category} Telemetry
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
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
                activeTab === 'overview' ? 'text-[#00D4FF]' : 'text-slate-400 hover:text-slate-200'
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
                activeTab === 'guide' ? 'text-[#00D4FF]' : 'text-slate-400 hover:text-slate-200'
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
                activeTab === 'status' ? 'text-[#00D4FF]' : 'text-slate-400 hover:text-slate-200'
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
                <h5 className="text-slate-500 font-bold text-xs uppercase tracking-wider">
                  About the Integration
                </h5>
                <p className="text-xs text-slate-300 leading-relaxed font-medium">
                  {guide.overview}
                </p>
              </div>

              <div className="space-y-2">
                <h5 className="text-white font-bold text-xs">Telemetry Events Synced</h5>
                <p className="text-xs text-slate-400 font-medium">
                  Connecting this integration routes the following events into our processing
                  engines:
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

              <div className="p-4 border border-white/4 bg-slate-950/20 rounded-xl flex items-center justify-between text-xs">
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
                    <span className="truncate mr-3 select-all">{getWebhookUrl(provider.id)}</span>
                    <button
                      onClick={() => onCopy(getWebhookUrl(provider.id), 'webhook-url')}
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

              {PROVIDER_FIELDS[provider.id]?.length > 0 && (
                <div className="border-t border-[#152347] pt-4 mt-6 space-y-4">
                  <div>
                    <h5 className="font-extrabold text-slate-400 text-xs uppercase tracking-wider">
                      Secure API Credentials
                    </h5>
                    <p className="text-[10px] text-slate-500 font-medium leading-normal mt-0.5">
                      Credentials are symmetrically encrypted at rest. We never expose plaintext
                      secrets back to the browser.
                    </p>
                  </div>
                  <div className="space-y-3">
                    {PROVIDER_FIELDS[provider.id].map((field) => (
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
                          className="dashboard-input placeholder:text-slate-600"
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
              <div className="p-4 border border-[#152347] bg-[#0C1224]/50 rounded-xl space-y-3">
                <h5 className="text-slate-400 font-bold text-xs uppercase tracking-wider">
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
                      {isActive && lastSyncStr
                        ? new Date(lastSyncStr).toLocaleString()
                        : 'No synced logs found'}
                    </span>
                  </div>
                </div>
              </div>

              {guide.testCommand && (
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500">
                    Sandbox Test Script Command
                  </span>
                  <div className="bg-[#05070f] border border-slate-900 rounded-xl p-3 flex items-center justify-between font-mono text-xs text-cyan-400">
                    <div className="flex items-center gap-1.5 truncate">
                      <Terminal className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate select-all">{guide.testCommand}</span>
                    </div>
                    <button
                      onClick={() => onCopy(guide.testCommand!, 'test-cmd')}
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
                    <pre className="whitespace-pre-wrap select-all">{guide.testSamplePayload}</pre>
                    <button
                      onClick={() => onCopy(guide.testSamplePayload!, 'test-payload')}
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

              <div className="space-y-3 pt-4 border-t border-[#152347] mt-4">
                <h5 className="text-slate-400 font-bold text-xs uppercase tracking-wider">
                  Recent Ingestion Jobs
                </h5>
                {loadingProviderJobs ? (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    <RefreshCw className="w-4 h-4 animate-spin inline-block mr-2 text-cyan-400" />
                    Loading job history...
                  </div>
                ) : providerJobs.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-xs italic">
                    No ingestion jobs recorded for this integration.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-55 overflow-y-auto pr-1">
                    {providerJobs.map((job) => (
                      <div
                        key={job.id}
                        className="bg-[#0C1224] border border-slate-800/80 rounded-xl p-3 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-500 font-mono">
                            ID: {job.id.substring(0, 8)}...
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                              job.status === 'completed'
                                ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5'
                                : job.status === 'failed'
                                  ? 'text-rose-400 border-rose-500/20 bg-rose-500/5'
                                  : job.status === 'processing'
                                    ? 'text-cyan-400 border-cyan-500/20 bg-cyan-500/5'
                                    : 'text-slate-400 border-slate-700 bg-slate-800'
                            }`}
                          >
                            {job.status}
                          </span>
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-400">
                          <span>
                            Triggered: {new Date(job.createdAt || job.created_at).toLocaleString()}
                          </span>
                        </div>
                        {job.error && (
                          <div className="mt-1.5 p-2 border border-rose-500/20 bg-rose-500/5 text-rose-400 rounded-lg text-[10px] font-mono whitespace-pre-wrap max-h-24 overflow-y-auto">
                            {job.error}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Action Buttons */}
        <div className="border-t border-[#152347] pt-4 flex gap-3">
          <button
            onClick={onClose}
            className="btn-secondary flex-1 border border-slate-800 bg-slate-950/20 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            Close Guide
          </button>

          {isActive && (
            <button
              onClick={onSaveSettings}
              disabled={actionLoading === provider.id}
              className="flex-1 btn-primary bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300 inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {actionLoading === provider.id && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              Save Settings
            </button>
          )}

          <button
            onClick={() => onToggle(provider.id, isActive)}
            disabled={actionLoading === provider.id}
            className={`flex-1 btn-primary inline-flex items-center justify-center gap-1.5 cursor-pointer ${
              isActive
                ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300'
                : 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300'
            }`}
          >
            {actionLoading === provider.id && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            {isActive ? 'Deactivate Connection' : 'Activate Connection'}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
