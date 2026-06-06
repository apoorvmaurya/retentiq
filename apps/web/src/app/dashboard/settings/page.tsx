'use client';

import React, { useEffect, useState } from 'react';
import { Shield, User, Globe, Mail, Camera, Save, RefreshCw } from 'lucide-react';
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

export default function SettingsPage() {
  const [email, setEmail] = useState<string>('Loading...');
  const [role, setRole] = useState<string>('Workspace Owner');
  const [name, setName] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [orgName, setOrgName] = useState<string>('Sandbox Org');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const profile = await fetchFromApi('/users/profile');
        setEmail(profile.email);
        setRole(profile.role === 'owner' ? 'Workspace Owner' : profile.role === 'admin' ? 'Workspace Administrator' : 'Workspace Member');
        setName(profile.name || '');
        setAvatarUrl(profile.avatar_url || '');
        setOrgName(profile.org_name || 'Sandbox Org');
      } catch (err) {
        console.error('Error loading user profile:', err);
        try {
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.email) {
            setEmail(user.email);
          }
        } catch (_) {}
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 800 * 1024) {
      alert('Avatar image size must be less than 800KB.');
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

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveStatus(null);
    try {
      await fetchFromApi('/users/profile', {
        method: 'PUT',
        body: JSON.stringify({
          name,
          avatar_url: avatarUrl,
        }),
      });
      setSaveStatus('Profile updated successfully! ✓');
      setTimeout(() => setSaveStatus(null), 3000);
      
      // Dispatch a custom event to notify layout sidebar to reload
      window.dispatchEvent(new Event('profile_updated'));
    } catch (err) {
      console.error('Error saving profile settings:', err);
      setSaveStatus('Failed to save profile settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 text-slate-800">
      
      {/* Header */}
      <div>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight font-sans">Settings Workspace</h2>
        <p className="text-sm text-slate-500 font-medium mt-0.5">Manage user profile configurations, domains, and security credentials.</p>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-slate-300 mb-2" />
          Loading workspace configurations...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Profile Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 lg:col-span-2 space-y-6 h-fit">
            <h4 className="font-bold text-slate-800 text-base border-b border-slate-100 pb-3 flex items-center gap-2">
              <User className="w-4.5 h-4.5 text-indigo-500" />
              User Profile Overview
            </h4>
            
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                
                {/* Avatar upload/display */}
                <div className="relative group shrink-0">
                  {avatarUrl ? (
                    <img 
                      src={avatarUrl} 
                      alt="Profile avatar" 
                      className="w-24 h-24 rounded-full object-cover border-2 border-indigo-100 shadow-inner" 
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-50 to-indigo-100 border-2 border-indigo-100 text-indigo-700 font-extrabold text-2xl flex items-center justify-center shadow-inner">
                      {name ? name.slice(0, 2).toUpperCase() : email.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <label className="absolute inset-0 flex items-center justify-center bg-black/45 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white text-[10px] font-bold">
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
                      <label className="text-[10px] text-slate-400 block uppercase font-bold mb-1">Email Address</label>
                      <input 
                        type="text" 
                        value={email} 
                        disabled 
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 text-xs font-semibold focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block uppercase font-bold mb-1">Account Role</label>
                      <input 
                        type="text" 
                        value={role} 
                        disabled 
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-indigo-600 text-xs font-bold focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] text-slate-400 block uppercase font-bold mb-1">Display Name</label>
                      <input 
                        type="text" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)} 
                        placeholder="John Doe"
                        required
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 placeholder-slate-400 text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block uppercase font-bold mb-1">Active Workspace</label>
                      <input 
                        type="text" 
                        value={orgName} 
                        disabled 
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs font-semibold focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <p className="text-[10px] text-slate-400 font-semibold max-w-md">
                  Personal profile details are synced directly across CS notification channels and active workspaces.
                </p>
                
                <div className="flex items-center gap-3">
                  {saveStatus && (
                    <span className={`text-xs font-bold ${saveStatus.includes('successfully') ? 'text-emerald-600' : 'text-rose-600'} animate-pulse`}>
                      {saveStatus}
                    </span>
                  )}
                  <button 
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
                  >
                    {saving ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    Save Profile
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Right Column: Settings configuration */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6 h-fit">
            <h4 className="font-bold text-slate-800 text-base border-b border-slate-100 pb-3 flex items-center gap-2">
              <Shield className="w-4.5 h-4.5 text-indigo-500" />
              Security & Credentials
            </h4>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-slate-700">
                <Shield className="w-5 h-5 text-slate-400 shrink-0" />
                <div>
                  <span className="text-xs font-bold block">Two-Factor Authentication</span>
                  <span className="text-[10px] text-slate-400">Increase account protection with secondary verifications.</span>
                </div>
                <button className="ml-auto px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-all cursor-pointer">
                  Enable
                </button>
              </div>

              <div className="flex items-center gap-3 text-slate-700 border-t border-slate-100 pt-4">
                <Globe className="w-5 h-5 text-slate-400 shrink-0" />
                <div>
                  <span className="text-xs font-bold block">Webhook Event Triggers</span>
                  <span className="text-[10px] text-slate-400">Dispatch health updates and score transitions directly to API endpoints.</span>
                </div>
                <button className="ml-auto px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-all cursor-pointer">
                  Configure
                </button>
              </div>

              <div className="flex items-center gap-3 text-slate-700 border-t border-slate-100 pt-4">
                <Mail className="w-5 h-5 text-slate-400 shrink-0" />
                <div>
                  <span className="text-xs font-bold block">Mailing Preferences</span>
                  <span className="text-[10px] text-slate-400">Customize frequency and severity rules for CS notifications.</span>
                </div>
                <button className="ml-auto px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-all cursor-pointer">
                  Manage
                </button>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
