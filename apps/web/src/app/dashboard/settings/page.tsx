'use client';

import React, { useEffect, useState } from 'react';
import { User, Users, Sliders, FileText, RefreshCw } from 'lucide-react';
import { fetchFromApi } from '@/lib/api';
import { useToast } from '@/components/Toast';
import ConfirmModal from '@/components/ConfirmModal';
import ProfileTab from './components/ProfileTab';
import TeamTab, { Member, Invite } from './components/TeamTab';
import WeightsTab, { Weights } from './components/WeightsTab';
import TemplatesTab, { Template } from './components/TemplatesTab';

type TabId = 'profile' | 'team' | 'weights' | 'templates';

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
        const profile = await fetchFromApi('/users/profile');
        setEmail(profile.email);
        setRole(profile.role);
        setName(profile.name || '');
        setAvatarUrl(profile.avatar_url || '');
        setOrgName(profile.org_name || 'Sandbox Org');

        const membersData = await fetchFromApi('/users/members');
        setMembers(membersData);

        const invitesData = await fetchFromApi('/users/invites');
        setInvites(invitesData);

        const weightsData = await fetchFromApi('/settings/score-weights');
        if (weightsData) {
          setWeights(weightsData);
        }

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
      await fetchFromApi(`/users/members/${id}`, { method: 'DELETE' });
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
            className={`px-4 py-2 rounded-lg text-xs font-bold shadow-lg animate-pulse shrink-0 ${
              statusMessage.isError
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}
          >
            {statusMessage.text}
          </div>
        )}
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-slate-800 gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'profile'
              ? 'border-cyan-500 text-cyan-400 bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <User className="w-4 h-4" />
          My Profile
        </button>
        <button
          onClick={() => setActiveTab('team')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'team'
              ? 'border-cyan-500 text-cyan-400 bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          Team Management
        </button>
        <button
          onClick={() => setActiveTab('weights')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'weights'
              ? 'border-cyan-500 text-cyan-400 bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Health Weights
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'templates'
              ? 'border-cyan-500 text-cyan-400 bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
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
          {activeTab === 'profile' && (
            <ProfileTab
              email={email}
              role={role}
              name={name}
              setName={setName}
              avatarUrl={avatarUrl}
              orgName={orgName}
              saving={saving}
              onSaveProfile={handleSaveProfile}
              onImageUpload={handleImageUpload}
            />
          )}

          {activeTab === 'team' && (
            <TeamTab
              members={members}
              invites={invites}
              inviteEmail={inviteEmail}
              setInviteEmail={setInviteEmail}
              inviteRole={inviteRole}
              setInviteRole={setInviteRole}
              saving={saving}
              currentUserRole={role}
              onInviteMember={handleInviteMember}
              onRemoveMember={handleRemoveMember}
            />
          )}

          {activeTab === 'weights' && (
            <WeightsTab
              weights={weights}
              totalWeight={totalWeight}
              saving={saving}
              onWeightChange={handleWeightChange}
              onSaveWeights={handleSaveWeights}
            />
          )}

          {activeTab === 'templates' && (
            <TemplatesTab
              templates={templates}
              selectedTemplateIndex={selectedTemplateIndex}
              templateSubject={templateSubject}
              setTemplateSubject={setTemplateSubject}
              templateBody={templateBody}
              setTemplateBody={setTemplateBody}
              saving={saving}
              onSelectTemplate={handleSelectTemplate}
              onSaveTemplate={handleSaveTemplate}
            />
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
