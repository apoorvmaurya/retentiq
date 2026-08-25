'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { fetchFromApi } from '@/lib/api';
import { useToast } from '@/components/Toast';

import { PROVIDERS } from './components/constants';
import { IntegrationConfig } from './components/types';
import { IntegrationCard } from './components/IntegrationCard';
import { CsvUploadModal } from './components/CsvUploadModal';
import { IntegrationConfigModal } from './components/IntegrationConfigModal';

export default function IntegrationsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [dbIntegrations, setDbIntegrations] = useState<IntegrationConfig[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Guide and Config state
  const [selectedGuideProvider, setSelectedGuideProvider] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'guide' | 'status'>('overview');
  const [configForm, setConfigForm] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Ingestion Jobs state
  const [providerJobs, setProviderJobs] = useState<any[]>([]);
  const [loadingProviderJobs, setLoadingProviderJobs] = useState(false);

  // CSV Modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const getWebhookUrl = (providerId: string) => {
    let baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
    if (!baseUrl.endsWith('/api') && !baseUrl.endsWith('/api/')) {
      baseUrl = baseUrl.replace(/\/$/, '') + '/api';
    }
    return `${baseUrl}/integrations/${providerId}/webhook`;
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success('Copied to clipboard!');
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

  const loadProviderJobs = async (providerId: string) => {
    setLoadingProviderJobs(true);
    try {
      const jobsData = await fetchFromApi(`/integrations/${providerId}/jobs`);
      setProviderJobs(jobsData || []);
    } catch (err) {
      console.error(`Error loading jobs for ${providerId}:`, err);
      setProviderJobs([]);
    } finally {
      setLoadingProviderJobs(false);
    }
  };

  useEffect(() => {
    if (selectedGuideProvider && activeTab === 'status') {
      loadProviderJobs(selectedGuideProvider);
    }
  }, [selectedGuideProvider, activeTab]);

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

  const activeProviderObj = selectedGuideProvider
    ? PROVIDERS.find((p) => p.id === selectedGuideProvider) || null
    : null;
  const activeDbRecord = selectedGuideProvider
    ? dbIntegrations.find((item) => item.provider.toLowerCase() === selectedGuideProvider)
    : undefined;

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
            return (
              <IntegrationCard
                key={prov.id}
                provider={prov}
                dbRecord={dbRecord}
                actionLoading={actionLoading}
                onUploadCsv={() => setIsUploadModalOpen(true)}
                onSyncNow={handleSyncNow}
                onConfigure={(providerId) => {
                  if (providerId === 'csv') {
                    setIsUploadModalOpen(true);
                  } else {
                    setSelectedGuideProvider(providerId);
                    const isActive = dbRecord ? dbRecord.status === 'active' : false;
                    setActiveTab(isActive ? 'status' : 'overview');
                  }
                }}
              />
            );
          })}
        </div>
      )}

      {/* CSV Upload Modal */}
      <CsvUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={loadIntegrations}
      />

      {/* Integration Guide / Config Modal */}
      <IntegrationConfigModal
        provider={activeProviderObj}
        dbRecord={activeDbRecord}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        configForm={configForm}
        setConfigForm={setConfigForm}
        actionLoading={actionLoading}
        providerJobs={providerJobs}
        loadingProviderJobs={loadingProviderJobs}
        copiedId={copiedId}
        onCopy={handleCopy}
        onClose={() => setSelectedGuideProvider(null)}
        onSaveSettings={handleSaveSettings}
        onToggle={handleToggle}
        getWebhookUrl={getWebhookUrl}
      />
    </div>
  );
}
