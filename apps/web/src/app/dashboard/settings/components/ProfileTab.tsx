'use client';

import React from 'react';
import { User, Shield, Camera, Save, RefreshCw } from 'lucide-react';

export interface ProfileTabProps {
  email: string;
  role: string;
  name: string;
  setName: (val: string) => void;
  avatarUrl: string;
  orgName: string;
  saving: boolean;
  onSaveProfile: (e: React.FormEvent) => Promise<void>;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ProfileTab({
  email,
  role,
  name,
  setName,
  avatarUrl,
  orgName,
  saving,
  onSaveProfile,
  onImageUpload,
}: ProfileTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="glass-panel rounded-xl p-6 lg:col-span-2 space-y-6">
        <h4 className="font-bold text-white text-base border-b border-slate-800/80 pb-3 flex items-center gap-2">
          <User className="w-4.5 h-4.5 text-cyan-400" />
          User Profile Overview
        </h4>
        <form onSubmit={onSaveProfile} className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative group shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Profile avatar"
                  className="w-24 h-24 rounded-full object-cover border-2 border-cyan-500/20 shadow-inner"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-linear-to-tr from-[#0F172A] to-[#1E293B] border-2 border-cyan-500/20 text-cyan-400 font-extrabold text-2xl flex items-center justify-center">
                  {name ? name.slice(0, 2).toUpperCase() : email.slice(0, 2).toUpperCase()}
                </div>
              )}
              <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white text-[10px] font-bold">
                <Camera className="w-4 h-4 mb-0.5 mr-1" />
                Change
                <input type="file" accept="image/*" onChange={onImageUpload} className="hidden" />
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
                    className="dashboard-input opacity-60 cursor-not-allowed text-cyan-400! font-bold!"
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
            <span className="text-xs font-bold block text-slate-200">Organization Name</span>
            <span className="text-sm font-semibold text-slate-400 block mt-1">{orgName}</span>
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
  );
}

export default ProfileTab;
