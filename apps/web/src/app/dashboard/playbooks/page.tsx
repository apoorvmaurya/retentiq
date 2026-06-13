'use client';

import React, { useEffect, useState } from 'react';
import { Customer } from '@retentiq/shared';
import {
  Zap,
  Plus,
  Play,
  Trash2,
  ToggleLeft,
  ToggleRight,
  PlusCircle,
  X,
  Loader2,
  AlertCircle,
  FileText,
  UserCheck,
} from 'lucide-react';
import { fetchFromApi } from '@/lib/api';
import { useToast } from '@/components/Toast';

interface PlaybookStep {
  step: number;
  headline: string;
  detail: string;
}

interface Playbook {
  id: string;
  name: string;
  triggerType: 'health_drop' | 'manual';
  triggerThreshold: number;
  steps: PlaybookStep[];
  isActive: boolean;
  createdAt: string;
}

export default function PlaybooksPage() {
  const toast = useToast();
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDispatchModal, setShowDispatchModal] = useState(false);

  // Create form states
  const [newName, setNewName] = useState('');
  const [newTriggerType, setNewTriggerType] = useState<'health_drop' | 'manual'>('manual');
  const [newThreshold, setNewThreshold] = useState(40);
  const [newSteps, setNewSteps] = useState<PlaybookStep[]>([
    {
      step: 1,
      headline: 'Audit account activity',
      detail: 'Check recent logins and ticket volume.',
    },
  ]);

  // Dispatch form states
  const [selectedPlaybook, setSelectedPlaybook] = useState<Playbook | null>(null);
  const [dispatchCustomerId, setDispatchCustomerId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [playbooksData, customersData] = await Promise.all([
        fetchFromApi('/playbooks'),
        fetchFromApi('/customers'),
      ]);
      setPlaybooks(playbooksData);
      setCustomers(customersData.data || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load playbook configurations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleActive = async (playbook: Playbook) => {
    const nextActive = !playbook.isActive;
    try {
      setPlaybooks((prev) =>
        prev.map((p) => (p.id === playbook.id ? { ...p, isActive: nextActive } : p)),
      );
      await fetchFromApi(`/playbooks/${playbook.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: nextActive }),
      });
      toast.success(`Playbook is now ${nextActive ? 'active' : 'inactive'}`);
    } catch (err: any) {
      setPlaybooks((prev) =>
        prev.map((p) => (p.id === playbook.id ? { ...p, isActive: playbook.isActive } : p)),
      );
      toast.error(`Failed to toggle playbook state: ${err.message}`);
    }
  };

  const handleAddStepField = () => {
    setNewSteps((prev) => [...prev, { step: prev.length + 1, headline: '', detail: '' }]);
  };

  const handleRemoveStepField = (index: number) => {
    setNewSteps((prev) =>
      prev.filter((_, idx) => idx !== index).map((s, idx) => ({ ...s, step: idx + 1 })),
    );
  };

  const handleStepChange = (index: number, field: 'headline' | 'detail', value: string) => {
    setNewSteps((prev) => prev.map((s, idx) => (idx === index ? { ...s, [field]: value } : s)));
  };

  const handleCreatePlaybook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      toast.warning('Please enter a playbook name');
      return;
    }
    const cleanSteps = newSteps.filter((s) => s.headline.trim());
    if (cleanSteps.length === 0) {
      toast.warning('Please define at least one playbook step');
      return;
    }

    setSubmitting(true);
    try {
      await fetchFromApi('/playbooks', {
        method: 'POST',
        body: JSON.stringify({
          name: newName,
          triggerType: newTriggerType,
          triggerThreshold: newThreshold,
          steps: cleanSteps,
          isActive: true,
        }),
      });

      setShowCreateModal(false);
      setNewName('');
      setNewTriggerType('manual');
      setNewThreshold(40);
      setNewSteps([
        {
          step: 1,
          headline: 'Audit account activity',
          detail: 'Check recent logins and ticket volume.',
        },
      ]);
      toast.success('Playbook created successfully');
      loadData();
    } catch (err: any) {
      toast.error(`Failed to save playbook: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDispatch = (playbook: Playbook) => {
    setSelectedPlaybook(playbook);
    setShowDispatchModal(true);
  };

  const handleDispatchPlaybook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlaybook || !dispatchCustomerId) {
      toast.warning('Please select a customer');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetchFromApi(`/playbooks/${selectedPlaybook.id}/dispatch`, {
        method: 'POST',
        body: JSON.stringify({ customerId: dispatchCustomerId }),
      });
      toast.success(res.message || 'Playbook executed successfully! Tasks spawned.');
      setShowDispatchModal(false);
      setDispatchCustomerId('');
      setSelectedPlaybook(null);
    } catch (err: any) {
      toast.error(`Failed to dispatch playbook: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 text-slate-100">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Zap className="w-6 h-6 text-cyan-400" /> Retention Playbook Catalog
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure automated actions and manual safeguard playbooks triggered by health drops.
          </p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Create Playbook
        </button>
      </div>

      {/* Main Grid Catalog */}
      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3 rounded-xl glass-panel">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          <p className="text-xs text-slate-400">Loading playbook catalog...</p>
        </div>
      ) : error ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3 rounded-xl glass-panel">
          <AlertCircle className="w-8 h-8 text-rose-500" />
          <p className="text-xs text-slate-400">{error}</p>
          <button onClick={loadData} className="btn-secondary">
            Retry
          </button>
        </div>
      ) : playbooks.length === 0 ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3 rounded-xl glass-panel">
          <FileText className="w-8 h-8 text-slate-600" />
          <p className="text-xs text-slate-500">
            No playbooks configured yet. Click 'Create Playbook' to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {playbooks.map((playbook) => (
            <div
              key={playbook.id}
              className={`rounded-xl glass-panel glass-card-hover p-5 flex flex-col justify-between gap-5 relative ${
                !playbook.isActive ? 'opacity-60' : ''
              }`}
            >
              {/* Card Top Block */}
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Zap
                        className={`w-4 h-4 ${playbook.isActive ? 'text-cyan-400' : 'text-slate-500'}`}
                      />{' '}
                      {playbook.name}
                    </h2>

                    {/* Badges / Triggers */}
                    <div className="flex items-center gap-2 mt-2">
                      {playbook.triggerType === 'health_drop' ? (
                        <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold px-2 py-0.5 rounded uppercase tracking-wider">
                          Auto Trigger (Health &lt; {playbook.triggerThreshold})
                        </span>
                      ) : (
                        <span className="text-[9px] bg-slate-800 text-slate-400 border border-slate-700 font-semibold px-2 py-0.5 rounded uppercase tracking-wider">
                          Manual Dispatch
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Active Toggle Button */}
                  <button
                    onClick={() => handleToggleActive(playbook)}
                    className="p-1 hover:bg-[#152347]/50 rounded-lg transition-all"
                    title={playbook.isActive ? 'Deactivate Playbook' : 'Activate Playbook'}
                  >
                    {playbook.isActive ? (
                      <ToggleRight className="w-7 h-7 text-cyan-400" />
                    ) : (
                      <ToggleLeft className="w-7 h-7 text-slate-600" />
                    )}
                  </button>
                </div>

                {/* Steps Details */}
                <div className="mt-4 space-y-3.5 pl-1.5 border-l border-slate-800">
                  {playbook.steps.map((step) => (
                    <div key={step.step} className="text-xs relative">
                      <div className="absolute -left-[10.5px] top-1 w-2 h-2 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/50" />
                      <h4 className="font-bold text-slate-200 pl-3 leading-none">
                        {step.step}. {step.headline}
                      </h4>
                      <p className="text-[11px] text-slate-400 pl-3 mt-1 leading-relaxed">
                        {step.detail}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="flex gap-3 border-t border-slate-800/60 pt-4">
                <button
                  onClick={() => handleOpenDispatch(playbook)}
                  disabled={!playbook.isActive}
                  className="btn-primary flex-1"
                >
                  <Play className="w-3.5 h-3.5" /> Execute Playbook
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Playbook Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-lg glass-panel rounded-2xl shadow-2xl p-6 relative my-8">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-200 hover:bg-[#152347]/40 rounded-lg"
            >
              <X className="w-4.5 h-4.5" />
            </button>

            <h2 className="text-base font-bold text-white mb-1.5 flex items-center gap-1.5">
              <Plus className="w-5 h-5 text-cyan-400" /> Create Retention Playbook
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Design a sequenced set of safeguards for your CSM team to execute.
            </p>

            <form onSubmit={handleCreatePlaybook} className="space-y-4">
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                  Playbook Name *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Low Usage Outreach"
                  className="dashboard-input"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                    Trigger Type
                  </label>
                  <select
                    value={newTriggerType}
                    onChange={(e) => setNewTriggerType(e.target.value as any)}
                    className="dashboard-select"
                  >
                    <option value="manual">Manual Execution Only</option>
                    <option value="health_drop">Automatic Health Drop</option>
                  </select>
                </div>

                {newTriggerType === 'health_drop' && (
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                      Health Score Threshold
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={newThreshold}
                      onChange={(e) => setNewThreshold(parseInt(e.target.value) || 0)}
                      className="dashboard-input"
                    />
                  </div>
                )}
              </div>

              {/* Steps builder */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Playbook Steps
                  </label>
                  <button
                    type="button"
                    onClick={handleAddStepField}
                    className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold"
                  >
                    <PlusCircle className="w-3.5 h-3.5" /> Add Step
                  </button>
                </div>

                <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                  {newSteps.map((step, idx) => (
                    <div
                      key={idx}
                      className="flex gap-2 items-start bg-slate-900/60 p-3 rounded-lg border border-slate-800"
                    >
                      <span className="text-xs font-bold text-cyan-400 mt-2">#{step.step}</span>
                      <div className="flex-1 space-y-2">
                        <input
                          type="text"
                          required
                          value={step.headline}
                          onChange={(e) => handleStepChange(idx, 'headline', e.target.value)}
                          placeholder="Action headline (e.g. Send checklist)"
                          className="dashboard-input bg-opacity-40"
                        />
                        <input
                          type="text"
                          value={step.detail}
                          onChange={(e) => handleStepChange(idx, 'detail', e.target.value)}
                          placeholder="Action detail sentence"
                          className="dashboard-input bg-opacity-40 !text-[11px] !text-slate-400"
                        />
                      </div>
                      {newSteps.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveStepField(idx)}
                          className="p-1 text-slate-400 hover:text-rose-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting && <Loader2 className="w-3 h-3 animate-spin" />} Save Playbook
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dispatch Playbook Modal */}
      {showDispatchModal && selectedPlaybook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md glass-panel rounded-2xl shadow-2xl p-6 relative">
            <button
              onClick={() => {
                setShowDispatchModal(false);
                setSelectedPlaybook(null);
              }}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-200 hover:bg-[#152347]/40 rounded-lg"
            >
              <X className="w-4.5 h-4.5" />
            </button>

            <h2 className="text-base font-bold text-white mb-1.5 flex items-center gap-1.5">
              <UserCheck className="w-5 h-5 text-cyan-400" /> Execute Playbook
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Select a customer account to trigger <strong>{selectedPlaybook.name}</strong> play.
            </p>

            <form onSubmit={handleDispatchPlaybook} className="space-y-4">
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                  Customer Account
                </label>
                <select
                  required
                  value={dispatchCustomerId}
                  onChange={(e) => setDispatchCustomerId(e.target.value)}
                  className="dashboard-select"
                >
                  <option value="">Select Account</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.company})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowDispatchModal(false);
                    setSelectedPlaybook(null);
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting && <Loader2 className="w-3 h-3 animate-spin" />} Dispatch Playbook
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
