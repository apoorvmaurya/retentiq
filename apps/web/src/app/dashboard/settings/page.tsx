'use client';

import React, { useEffect, useState } from 'react';
import {
  Shield,
  User,
  Globe,
  Mail,
  Camera,
  Save,
  RefreshCw,
  Users,
  Sliders,
  FileText,
  UserPlus,
  Trash2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { fetchFromApi } from '@/lib/api';
import { useToast } from '@/components/Toast';
import ConfirmModal from '@/components/ConfirmModal';

type TabId = 'profile' | 'team' | 'weights' | 'templates';

interface Member {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  avatarUrl?: string;
}

interface Invite {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt?: string;
}

interface Weights {
  loginFrequency30dWeight: number;
  loginFrequency14dWeight: number;
  loginFrequency7dWeight: number;
  featureAdoptionWeight: number;
  usageTrendWeight: number;
  supportVolumeWeight: number;
  supportSentimentWeight: number;
  billingEventsWeight: number;
  onboardingTimeWeight: number;
}

interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
}

export default function SettingsPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<TabId>('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(
    null,
  );

  // Confirm remove member modal states
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);

  // Profile state
  const [email, setEmail] = useState<string>('Loading...');
  const [role, setRole] = useState<string>('Workspace Owner');
  const [name, setName] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [orgName, setOrgName] = useState<string>('Sandbox Org');

  // Team state
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'viewer'>('member');

  // Weights state
  const [weights, setWeights] = useState<Weights>({
    loginFrequency30dWeight: 15,
    loginFrequency14dWeight: 10,
    loginFrequency7dWeight: 10,
    featureAdoptionWeight: 20,
    usageTrendWeight: 15,
    supportVolumeWeight: 10,
    supportSentimentWeight: 5,
    billingEventsWeight: 10,
    onboardingTimeWeight: 5,
  });

  // Templates state
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState<number>(0);
  const [templateSubject, setTemplateSubject] = useState('');
  const [templateBody, setTemplateBody] = useState('');

  const showStatus = (text: string, isError = false) => {
    setStatusMessage({ text, isError });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  useEffect(() => {
    async function loadAllSettings() {
      try {
        setLoading(true);
        // Load profile
        const profile = await fetchFromApi('/users/profile');
        setEmail(profile.email);
        setRole(profile.role);
        setName(profile.name || '');
        setAvatarUrl(profile.avatar_url || '');
        setOrgName(profile.org_name || 'Sandbox Org');

        // Load members
        const membersData = await fetchFromApi('/users/members');
        setMembers(membersData);

        // Load invites
        const invitesData = await fetchFromApi('/users/invites');
        setInvites(invitesData);

        // Load weights
        const weightsData = await fetchFromApi('/settings/score-weights');
        if (weightsData) {
          setWeights(weightsData);
        }

        // Load templates
        const templatesData = await fetchFromApi('/settings/email-templates');
        if (templatesData && templatesData.length > 0) {
          setTemplates(templatesData);
          setTemplateSubject(templatesData[0].subject);
          setTemplateBody(templatesData[0].body);
        }
      } catch (err) {
        console.error('Error loading settings:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAllSettings();
  }, []);

  // Profile Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetchFromApi('/users/profile', {
        method: 'PUT',
        body: JSON.stringify({ name, avatar_url: avatarUrl }),
      });
      showStatus('Profile updated successfully! ✓');
      window.dispatchEvent(new Event('profile_updated'));
    } catch (err) {
      console.error(err);
      showStatus('Failed to update profile.', true);
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 800 * 1024) {
      toast.warning('Avatar image size must be less than 800KB.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setAvatarUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Team Actions
  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setSaving(true);
    try {
      const result = await fetchFromApi('/users/invites', {
        method: 'POST',
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      setInvites([...invites, result]);
      setInviteEmail('');
      showStatus('Invitation sent successfully! ✓');
    } catch (err) {
      console.error(err);
      showStatus('Failed to send invitation.', true);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = (memberId: string) => {
    setMemberToRemove(memberId);
    setIsConfirmOpen(true);
  };

  const confirmRemoveMember = async () => {
    if (!memberToRemove) return;
    const id = memberToRemove;
    try {
      await fetchFromApi(`/users/members?id=${id}`, {
        method: 'DELETE',
      });
      setMembers(members.filter((m) => m.id !== id));
      showStatus('Member removed successfully.');
    } catch (err) {
      console.error(err);
      showStatus('Failed to remove member.', true);
    } finally {
      setIsConfirmOpen(false);
      setMemberToRemove(null);
    }
  };

  // Weights Actions
  const handleWeightChange = (key: keyof Weights, val: number) => {
    setWeights((prev) => ({ ...prev, [key]: val }));
  };

  const handleSaveWeights = async () => {
    setSaving(true);
    try {
      await fetchFromApi('/settings/score-weights', {
        method: 'POST',
        body: JSON.stringify(weights),
      });
      showStatus('Score weights updated successfully! Recalculating scores... ✓');
    } catch (err) {
      console.error(err);
      showStatus('Failed to save score weights.', true);
    } finally {
      setSaving(false);
    }
  };

  // Template Actions
  const handleSelectTemplate = (idx: number) => {
    setSelectedTemplateIndex(idx);
    setTemplateSubject(templates[idx].subject);
    setTemplateBody(templates[idx].body);
  };

  const handleSaveTemplate = async () => {
    if (templates.length === 0) return;
    setSaving(true);
    try {
      const template = templates[selectedTemplateIndex];
      const result = await fetchFromApi('/settings/email-templates', {
        method: 'POST',
        body: JSON.stringify({
          name: template.name,
          subject: templateSubject,
          body: templateBody,
        }),
      });
      const updated = [...templates];
      updated[selectedTemplateIndex] = result.template || result;
      setTemplates(updated);
      showStatus('Email template saved successfully! ✓');
    } catch (err) {
      console.error(err);
      showStatus('Failed to save email template.', true);
    } finally {
      setSaving(false);
    }
  };

  const totalWeight =
    weights.loginFrequency30dWeight +
    weights.loginFrequency14dWeight +
    weights.loginFrequency7dWeight +
    weights.featureAdoptionWeight +
    weights.usageTrendWeight +
    weights.supportVolumeWeight +
    weights.supportSentimentWeight +
    weights.billingEventsWeight +
    weights.onboardingTimeWeight;

  return (
    <div className="space-y-8 text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight font-sans">
            Workspace Settings
          </h2>
          <p className="text-sm text-slate-400 font-medium mt-0.5">
            Configure user profiles, manage team membership, adjust health score weights, and
            customize playbook email templates.
          </p>
        </div>
        {statusMessage && (
          <div
            className={`px-4 py-2 rounded-lg text-xs font-bold shadow-lg animate-pulse shrink-0 ${statusMessage.isError ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'}`}
          >
            {statusMessage.text}
          </div>
        )}
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-slate-800 gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'profile' ? 'border-cyan-500 text-cyan-400 bg-cyan-950/20' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          <User className="w-4 h-4" />
          My Profile
        </button>
        <button
          onClick={() => setActiveTab('team')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'team' ? 'border-cyan-500 text-cyan-400 bg-cyan-950/20' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          <Users className="w-4 h-4" />
          Team Management
        </button>
        <button
          onClick={() => setActiveTab('weights')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'weights' ? 'border-cyan-500 text-cyan-400 bg-cyan-950/20' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          <Sliders className="w-4 h-4" />
          Health Weights
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'templates' ? 'border-cyan-500 text-cyan-400 bg-cyan-950/20' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          <FileText className="w-4 h-4" />
          Email Templates
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-cyan-400 mb-2" />
          Loading settings and workspace configurations...
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8">
          {/* Active Tab: PROFILE */}
          {activeTab === 'profile' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="glass-panel rounded-xl p-6 lg:col-span-2 space-y-6">
                <h4 className="font-bold text-white text-base border-b border-slate-800/80 pb-3 flex items-center gap-2">
                  <User className="w-4.5 h-4.5 text-cyan-400" />
                  User Profile Overview
                </h4>
                <form onSubmit={handleSaveProfile} className="space-y-6">
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="relative group shrink-0">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt="Profile avatar"
                          className="w-24 h-24 rounded-full object-cover border-2 border-cyan-500/20 shadow-inner"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-[#0F172A] to-[#1E293B] border-2 border-cyan-500/20 text-cyan-400 font-extrabold text-2xl flex items-center justify-center">
                          {name ? name.slice(0, 2).toUpperCase() : email.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white text-[10px] font-bold">
                        <Camera className="w-4 h-4 mb-0.5 mr-1" />
                        Change
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <div className="flex-1 w-full space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] text-slate-400 block uppercase font-bold mb-1">
                            Email Address
                          </label>
                          <input
                            type="text"
                            value={email}
                            disabled
                            className="dashboard-input opacity-60 cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block uppercase font-bold mb-1">
                            Account Role
                          </label>
                          <input
                            type="text"
                            value={role.toUpperCase()}
                            disabled
                            className="dashboard-input opacity-60 cursor-not-allowed !text-cyan-400 !font-bold"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] text-slate-400 block uppercase font-bold mb-1">
                            Display Name
                          </label>
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="dashboard-input"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block uppercase font-bold mb-1">
                            Active Workspace
                          </label>
                          <input
                            type="text"
                            value={orgName}
                            disabled
                            className="dashboard-input opacity-60 cursor-not-allowed"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-800 pt-4">
                    <p className="text-[10px] text-slate-400 font-semibold max-w-md">
                      Display details are synced across workspace alerts, task timelines, and CS
                      notifications.
                    </p>
                    <button type="submit" disabled={saving} className="btn-primary">
                      {saving ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      Save Profile
                    </button>
                  </div>
                </form>
              </div>

              <div className="glass-panel rounded-xl p-6 space-y-6">
                <h4 className="font-bold text-white text-base border-b border-slate-800/80 pb-3 flex items-center gap-2">
                  <Shield className="w-4.5 h-4.5 text-cyan-400" />
                  Workspace Details
                </h4>
                <div className="space-y-4">
                  <div>
                    <span className="text-xs font-bold block text-slate-200">
                      Organization Name
                    </span>
                    <span className="text-sm font-semibold text-slate-400 block mt-1">
                      {orgName}
                    </span>
                  </div>
                  <div className="border-t border-slate-800/60 pt-4">
                    <span className="text-xs font-bold block text-slate-200">Plan Tier</span>
                    <span className="text-xs font-bold text-cyan-400 bg-cyan-950/40 px-2.5 py-1 rounded border border-cyan-800/30 inline-block mt-1 uppercase">
                      Enterprise
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Active Tab: TEAM */}
          {activeTab === 'team' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Invite Form */}
              <div className="glass-panel rounded-xl p-6 h-fit space-y-6">
                <h4 className="font-bold text-white text-base border-b border-slate-800/80 pb-3 flex items-center gap-2">
                  <UserPlus className="w-4.5 h-4.5 text-cyan-400" />
                  Invite Team Member
                </h4>
                <form onSubmit={handleInviteMember} className="space-y-4">
                  <div>
                    <label className="text-[10px] text-slate-400 block uppercase font-bold mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="colleague@company.com"
                      required
                      className="dashboard-input"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block uppercase font-bold mb-1">
                      Workspace Role
                    </label>
                    <select
                      value={inviteRole}
                      onChange={(e: any) => setInviteRole(e.target.value)}
                      className="dashboard-input bg-slate-900 border-slate-800 text-slate-300"
                    >
                      <option value="admin">Administrator (Full Access)</option>
                      <option value="member">CSM (Customer Success Manager)</option>
                      <option value="viewer">Viewer (Read-Only)</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary w-full justify-center"
                  >
                    {saving ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <UserPlus className="w-3.5 h-3.5" />
                    )}
                    Send Invitation
                  </button>
                </form>
              </div>

              {/* Members List */}
              <div className="glass-panel rounded-xl p-6 lg:col-span-2 space-y-6">
                <h4 className="font-bold text-white text-base border-b border-slate-800/80 pb-3 flex items-center gap-2">
                  <Users className="w-4.5 h-4.5 text-cyan-400" />
                  Workspace Members ({members.length})
                </h4>

                <div className="space-y-4">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3.5 rounded-lg bg-slate-950/40 border border-slate-800/40"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700/50 flex items-center justify-center font-bold text-sm text-cyan-300 uppercase">
                          {member.name ? member.name.slice(0, 2) : member.email.slice(0, 2)}
                        </div>
                        <div>
                          <span className="font-bold text-sm text-white block">
                            {member.name || 'Anonymous User'}
                          </span>
                          <span className="text-xs text-slate-400 block">{member.email}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${member.role === 'owner' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : member.role === 'admin' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : member.role === 'member' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-slate-500/20 text-slate-300'}`}
                        >
                          {member.role}
                        </span>
                        {member.role !== 'owner' && role === 'owner' && (
                          <button
                            onClick={() => handleRemoveMember(member.id)}
                            className="p-1.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 hover:border-rose-500/30 transition-all"
                            title="Remove member access"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pending Invites Section */}
                {invites.length > 0 && (
                  <div className="pt-6 border-t border-slate-800/80 space-y-4">
                    <h5 className="font-bold text-white text-sm">Pending Workspace Invites</h5>
                    <div className="space-y-3">
                      {invites.map((inv) => (
                        <div
                          key={inv.id}
                          className="flex items-center justify-between p-3.5 rounded-lg bg-slate-900/20 border border-dashed border-slate-800"
                        >
                          <div>
                            <span className="text-sm font-semibold text-slate-300 block">
                              {inv.email}
                            </span>
                            <span className="text-[10px] text-slate-500 block uppercase font-bold">
                              Expires:{' '}
                              {inv.expiresAt ? new Date(inv.expiresAt).toLocaleDateString() : 'N/A'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-amber-500/15 text-amber-300 border border-amber-500/25">
                              {inv.role}
                            </span>
                            <span className="text-[10px] text-slate-400 font-semibold">
                              {inv.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Active Tab: WEIGHTS */}
          {activeTab === 'weights' && (
            <div className="glass-panel rounded-xl p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <h4 className="font-bold text-white text-base flex items-center gap-2">
                  <Sliders className="w-4.5 h-4.5 text-cyan-400" />
                  Health Score Weight Tuning
                </h4>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${totalWeight === 100 ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' : 'bg-rose-500/10 text-rose-300 border-rose-500/30'}`}
                  >
                    Total Allocated: {totalWeight} / 100%
                  </span>
                  <button
                    onClick={handleSaveWeights}
                    disabled={saving || totalWeight !== 100}
                    className="btn-primary"
                  >
                    {saving ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    Save Config
                  </button>
                </div>
              </div>

              {totalWeight !== 100 && (
                <div className="p-3.5 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/25 text-xs font-bold">
                  ⚠️ The weights must sum up to exactly 100% for the custom scoring engine to be
                  balanced. Currently, it is {totalWeight}%.
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                {/* Section A: Engagement */}
                <div className="space-y-6">
                  <h5 className="font-bold text-cyan-400 text-sm border-b border-slate-800/40 pb-2">
                    Engagement Signals
                  </h5>

                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span>Login Frequency (30 Days)</span>
                        <span className="text-cyan-400">{weights.loginFrequency30dWeight}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="50"
                        value={weights.loginFrequency30dWeight}
                        onChange={(e) =>
                          handleWeightChange(
                            'loginFrequency30dWeight',
                            parseInt(e.target.value, 10),
                          )
                        }
                        className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span>Login Frequency (14 Days)</span>
                        <span className="text-cyan-400">{weights.loginFrequency14dWeight}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="50"
                        value={weights.loginFrequency14dWeight}
                        onChange={(e) =>
                          handleWeightChange(
                            'loginFrequency14dWeight',
                            parseInt(e.target.value, 10),
                          )
                        }
                        className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span>Login Frequency (7 Days)</span>
                        <span className="text-cyan-400">{weights.loginFrequency7dWeight}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="50"
                        value={weights.loginFrequency7dWeight}
                        onChange={(e) =>
                          handleWeightChange('loginFrequency7dWeight', parseInt(e.target.value, 10))
                        }
                        className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span>Feature Adoption Score (Breadth)</span>
                        <span className="text-cyan-400">{weights.featureAdoptionWeight}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="50"
                        value={weights.featureAdoptionWeight}
                        onChange={(e) =>
                          handleWeightChange('featureAdoptionWeight', parseInt(e.target.value, 10))
                        }
                        className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span>Usage trend (WoW Activity Change)</span>
                        <span className="text-cyan-400">{weights.usageTrendWeight}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="50"
                        value={weights.usageTrendWeight}
                        onChange={(e) =>
                          handleWeightChange('usageTrendWeight', parseInt(e.target.value, 10))
                        }
                        className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Section B: Operations & Financial */}
                <div className="space-y-6">
                  <h5 className="font-bold text-cyan-400 text-sm border-b border-slate-800/40 pb-2">
                    Support & Financial Signals
                  </h5>

                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span>Support Ticket Volume</span>
                        <span className="text-cyan-400">{weights.supportVolumeWeight}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="50"
                        value={weights.supportVolumeWeight}
                        onChange={(e) =>
                          handleWeightChange('supportVolumeWeight', parseInt(e.target.value, 10))
                        }
                        className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span>Conversation Sentiment Score</span>
                        <span className="text-cyan-400">{weights.supportSentimentWeight}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="50"
                        value={weights.supportSentimentWeight}
                        onChange={(e) =>
                          handleWeightChange('supportSentimentWeight', parseInt(e.target.value, 10))
                        }
                        className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span>Billing Events (Payment Failures)</span>
                        <span className="text-cyan-400">{weights.billingEventsWeight}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="50"
                        value={weights.billingEventsWeight}
                        onChange={(e) =>
                          handleWeightChange('billingEventsWeight', parseInt(e.target.value, 10))
                        }
                        className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span>Onboarding Duration / Speed</span>
                        <span className="text-cyan-400">{weights.onboardingTimeWeight}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="50"
                        value={weights.onboardingTimeWeight}
                        onChange={(e) =>
                          handleWeightChange('onboardingTimeWeight', parseInt(e.target.value, 10))
                        }
                        className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Active Tab: TEMPLATES */}
          {activeTab === 'templates' && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Templates Selector Left Sidebar */}
              <div className="glass-panel rounded-xl p-4 h-fit space-y-3">
                <h5 className="font-bold text-white text-xs px-2 uppercase tracking-wider block mb-2">
                  Templates
                </h5>
                {templates.map((tpl, i) => (
                  <button
                    key={tpl.id}
                    onClick={() => handleSelectTemplate(i)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold border transition-all ${selectedTemplateIndex === i ? 'bg-cyan-950/40 border-cyan-800/40 text-cyan-400' : 'bg-slate-950/20 border-slate-900 text-slate-400 hover:text-slate-200'}`}
                  >
                    {tpl.name}
                  </button>
                ))}
              </div>

              {/* Template Editor */}
              <div className="glass-panel rounded-xl p-6 lg:col-span-3 space-y-6">
                {templates.length > 0 ? (
                  <>
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div>
                        <h4 className="font-bold text-white text-base">
                          Edit: {templates[selectedTemplateIndex].name}
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Customize automated playbook emails sent during health scoring
                          transitions.
                        </p>
                      </div>
                      <button
                        onClick={handleSaveTemplate}
                        disabled={saving}
                        className="btn-primary"
                      >
                        {saving ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Save className="w-3.5 h-3.5" />
                        )}
                        Save Template
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] text-slate-400 block uppercase font-bold mb-1">
                          Email Subject Line
                        </label>
                        <input
                          type="text"
                          value={templateSubject}
                          onChange={(e) => setTemplateSubject(e.target.value)}
                          className="dashboard-input"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block uppercase font-bold mb-1">
                          Email Body Content
                        </label>
                        <textarea
                          rows={8}
                          value={templateBody}
                          onChange={(e) => setTemplateBody(e.target.value)}
                          className="dashboard-input font-sans text-sm leading-relaxed"
                        />
                      </div>
                      <div className="p-4 rounded-lg bg-slate-950/40 border border-slate-800/50 space-y-2 text-xs">
                        <span className="font-bold text-slate-300 block uppercase tracking-wider text-[10px]">
                          Supported Merge Tags:
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px] text-slate-400">
                          <div>
                            <code className="text-cyan-400 font-mono font-bold">
                              {'{{account_name}}'}
                            </code>{' '}
                            - Customer company
                          </div>
                          <div>
                            <code className="text-cyan-400 font-mono font-bold">
                              {'{{health_score}}'}
                            </code>{' '}
                            - Health score
                          </div>
                          <div>
                            <code className="text-cyan-400 font-mono font-bold">
                              {'{{csm_name}}'}
                            </code>{' '}
                            - CSM name
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-20 text-center text-slate-400">No template selected.</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      {/* Confirm Remove Member Modal */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        title="Remove Team Member"
        description="Are you sure you want to remove this team member from the workspace? They will lose all access immediately."
        confirmLabel="Remove"
        cancelLabel="Cancel"
        onConfirm={confirmRemoveMember}
        onCancel={() => {
          setIsConfirmOpen(false);
          setMemberToRemove(null);
        }}
        isDanger={true}
      />
    </div>
  );
}
