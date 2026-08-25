import React from 'react';
import { RefreshCw, FileText } from 'lucide-react';
import { ProviderInfo, IntegrationConfig } from './types';

interface IntegrationCardProps {
  provider: ProviderInfo;
  dbRecord?: IntegrationConfig;
  actionLoading: string | null;
  onUploadCsv: () => void;
  onSyncNow: (providerId: string) => void;
  onConfigure: (providerId: string) => void;
}

export function IntegrationCard({
  provider,
  dbRecord,
  actionLoading,
  onUploadCsv,
  onSyncNow,
  onConfigure,
}: IntegrationCardProps) {
  const isActive = dbRecord ? dbRecord.status === 'active' : false;
  const lastSyncStr = dbRecord?.lastSyncedAt || (dbRecord as any)?.last_synced_at;

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

  const Icon = provider.icon;

  return (
    <div className="glass-panel glass-card-hover rounded-xl p-6 flex flex-col justify-between h-72 border border-white/4 bg-slate-900/30 relative overflow-hidden">
      <div>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center border border-slate-800 bg-[#0C1224] shrink-0 shadow-lg">
              <Icon className={`w-6 h-6 ${provider.color}`} />
            </div>
            <div>
              <h4 className="text-lg font-bold text-white font-sans">{provider.name}</h4>
              <span className="text-[10px] uppercase font-bold text-[#8B95AB] tracking-wider">
                {provider.category}
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

        <p className="text-xs text-slate-400 leading-relaxed font-medium mt-2">{provider.desc}</p>
      </div>

      <div className="pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs font-semibold text-slate-400 mt-4">
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-500">
            {isActive && lastSyncStr
              ? `Last synced: ${new Date(lastSyncStr).toLocaleTimeString()}`
              : 'No active connection'}
          </span>
        </div>

        <div className="flex gap-2">
          {isActive && provider.id === 'csv' && (
            <button
              onClick={onUploadCsv}
              className="px-3 py-1.5 rounded-lg text-cyan-400 hover:text-cyan-300 border border-cyan-500/20 bg-cyan-500/5 hover:bg-cyan-500/10 text-[11px] font-bold tracking-wider transition-colors inline-flex items-center gap-1 cursor-pointer"
            >
              <FileText className="w-3 h-3" />
              Upload CSV
            </button>
          )}
          {isActive && provider.id !== 'csv' && (
            <button
              onClick={() => onSyncNow(provider.id)}
              disabled={actionLoading === `sync-${provider.id}`}
              className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white border border-slate-700 bg-slate-800 hover:bg-slate-700 text-[11px] font-bold tracking-wider transition-colors inline-flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw
                className={`w-3 h-3 ${actionLoading === `sync-${provider.id}` ? 'animate-spin' : ''}`}
              />
              Sync Now
            </button>
          )}
          <button
            onClick={() => onConfigure(provider.id)}
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
}
