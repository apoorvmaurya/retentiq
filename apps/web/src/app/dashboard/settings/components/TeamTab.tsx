'use client';

import React from 'react';
import { UserPlus, Users, Trash2, RefreshCw } from 'lucide-react';

export interface Member {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  avatarUrl?: string;
}

export interface Invite {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt?: string;
}

export interface TeamTabProps {
  members: Member[];
  invites: Invite[];
  inviteEmail: string;
  setInviteEmail: (val: string) => void;
  inviteRole: 'admin' | 'member' | 'viewer';
  setInviteRole: (val: 'admin' | 'member' | 'viewer') => void;
  saving: boolean;
  currentUserRole: string;
  onInviteMember: (e: React.FormEvent) => Promise<void>;
  onRemoveMember: (id: string) => void;
}

export function TeamTab({
  members,
  invites,
  inviteEmail,
  setInviteEmail,
  inviteRole,
  setInviteRole,
  saving,
  currentUserRole,
  onInviteMember,
  onRemoveMember,
}: TeamTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Invite Form */}
      <div className="glass-panel rounded-xl p-6 h-fit space-y-6">
        <h4 className="font-bold text-white text-base border-b border-slate-800/80 pb-3 flex items-center gap-2">
          <UserPlus className="w-4.5 h-4.5 text-cyan-400" />
          Invite Team Member
        </h4>
        <form onSubmit={onInviteMember} className="space-y-4">
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
          <button type="submit" disabled={saving} className="btn-primary w-full justify-center">
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
                  className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                    member.role === 'owner'
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      : member.role === 'admin'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : member.role === 'member'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : 'bg-slate-500/20 text-slate-300'
                  }`}
                >
                  {member.role}
                </span>
                {member.role !== 'owner' && currentUserRole === 'owner' && (
                  <button
                    onClick={() => onRemoveMember(member.id)}
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
                    <span className="text-sm font-semibold text-slate-300 block">{inv.email}</span>
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">
                      Expires:{' '}
                      {inv.expiresAt ? new Date(inv.expiresAt).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-amber-500/15 text-amber-300 border border-amber-500/25">
                      {inv.role}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">{inv.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TeamTab;
