'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  AlertTriangle,
  Puzzle,
  Settings,
  ChevronDown,
  LogOut,
  Brain,
  X,
  Sparkles,
  CheckSquare,
  Zap,
  BarChart2,
} from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { fetchFromApi } from '@/lib/api';

const navItems = [
  { href: '/dashboard/overview', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart2 },
  { href: '/dashboard/customers', label: 'Customers', icon: Users },
  { href: '/dashboard/alerts', label: 'Alerts', icon: AlertTriangle },
  { href: '/dashboard/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/dashboard/playbooks', label: 'Playbooks', icon: Zap },
  { href: '/dashboard/integrations', label: 'Integrations', icon: Puzzle },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const [orgName, setOrgName] = useState('Loading Org...');
  const [userEmail, setUserEmail] = useState('user@retentiq.io');
  const [userInitials, setUserInitials] = useState('U');
  const [userName, setUserName] = useState('');
  const [userAvatar, setUserAvatar] = useState('');

  const [bannerOpen, setBannerOpen] = useState(false);

  const fetchUserData = async () => {
    try {
      const profile = await fetchFromApi('/users/profile');
      setUserEmail(profile.email || 'user@retentiq.io');
      setOrgName(profile.org_name || 'Sandbox Org');
      setUserName(profile.name || '');
      setUserAvatar(profile.avatar_url || '');

      const displayString = profile.name || profile.email || 'U';
      setUserInitials(displayString.slice(0, 2).toUpperCase());
    } catch (err) {
      console.error('Failed to load profile in layout:', err);
      // Fallback directly to Supabase Auth
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          setUserEmail(user.email || 'user@retentiq.io');
          setUserInitials(user.email ? user.email.slice(0, 2).toUpperCase() : 'U');
        }
      } catch {
        // Fallback silently if session isn't available
      }
    }
  };

  useEffect(() => {
    fetchUserData();

    // Check if banner was dismissed
    const isDismissed = sessionStorage.getItem('premium_banner_dismissed');
    if (!isDismissed) {
      setBannerOpen(true);
    }

    // Listen for profile update events
    window.addEventListener('profile_updated', fetchUserData);
    return () => window.removeEventListener('profile_updated', fetchUserData);
  }, []);

  const handleDismissBanner = () => {
    sessionStorage.setItem('premium_banner_dismissed', 'true');
    setBannerOpen(false);
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#0A0F1E] text-slate-100 font-sans antialiased">
      {/* Left Sidebar */}
      <aside className="w-16 md:w-[220px] bg-[#070B16] border-r border-[#152347] flex flex-col justify-between transition-all duration-300 shrink-0 select-none">
        {/* Top: Logo + Nav */}
        <div className="flex flex-col">
          {/* Logo area */}
          <div className="p-4 md:p-5 border-b border-[#152347] flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-400 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/25 shrink-0 mx-auto md:mx-0">
              <Brain className="w-4.5 h-4.5 text-white" />
            </div>
            <div className="hidden md:block">
              <h1 className="font-bold text-sm tracking-tight bg-gradient-to-r from-white to-cyan-300 bg-clip-text text-transparent">
                RetentIQ
              </h1>
              <span className="text-[9px] text-cyan-400 font-bold tracking-wider uppercase block leading-none">
                AI Churn
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-2 md:p-3 space-y-1.5 mt-4">
            {navItems.map((item, idx) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                    isActive
                      ? 'border-l-4 border-cyan-400 bg-cyan-950/20 text-cyan-400 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  } justify-center md:justify-start`}
                >
                  {/* Slide-in Hover Background */}
                  {hoveredIdx === idx && !isActive && (
                    <motion.div
                      layoutId="sidebar-hover-bg"
                      className="absolute inset-0 bg-[#141F3E] rounded-lg -z-10"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                    />
                  )}
                  <item.icon className="w-4.5 h-4.5 shrink-0" />
                  <span className="hidden md:inline truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom: Org Switcher + User Info */}
        <div className="border-t border-[#152347] bg-[#040812] p-2 md:p-3 space-y-3">
          {/* Org Switcher */}
          <div className="flex items-center justify-between p-1.5 rounded-lg hover:bg-[#141F3E]/40 transition-colors cursor-pointer justify-center md:justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-7 h-7 rounded-md bg-[#1D2E5C] flex items-center justify-center font-bold text-xs text-cyan-400 shrink-0">
                {orgName.slice(0, 1).toUpperCase()}
              </div>
              <div className="hidden md:block overflow-hidden">
                <p className="text-[11px] font-bold text-slate-200 truncate leading-tight">
                  {orgName}
                </p>
                <p className="text-[8px] text-slate-500 font-semibold tracking-wider uppercase">
                  Workspace
                </p>
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 hidden md:block shrink-0" />
          </div>

          {/* User Profile Info */}
          <div className="flex items-center justify-between gap-2 p-1 border-t border-[#152347]/50 pt-3 justify-center md:justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
              {userAvatar ? (
                <img
                  src={userAvatar}
                  alt="User Avatar"
                  className="w-7.5 h-7.5 rounded-full object-cover border border-cyan-400/30 shrink-0"
                />
              ) : (
                <div className="w-7.5 h-7.5 rounded-full bg-cyan-600 text-white flex items-center justify-center text-xs font-bold shrink-0 border border-cyan-400/30">
                  {userInitials}
                </div>
              )}
              <div className="hidden md:block overflow-hidden">
                <p className="text-[10px] font-bold text-slate-300 truncate max-w-[110px] leading-tight">
                  {userName || userEmail}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 hover:bg-rose-950/30 border border-transparent hover:border-rose-900/30 rounded-lg text-slate-500 hover:text-rose-400 transition-colors cursor-pointer shrink-0"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 bg-[#0A0F1E] overflow-hidden flex flex-col">
        {/* Dynamic Premium Banner */}
        <AnimatePresence>
          {bannerOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.35, ease: 'easeInOut' }}
              className="relative z-20 overflow-hidden border-b border-cyan-500/20 bg-[#070b16]/75 backdrop-blur-md px-4 py-2.5 shrink-0 shadow-lg shadow-cyan-500/5"
            >
              {/* Bottom glowing line */}
              <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400 via-indigo-500 via-purple-500 to-transparent opacity-85" />

              <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-200 mx-auto text-center justify-center font-medium">
                  {/* Glowing Preview Badge */}
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-400/35 text-[9px] font-bold text-cyan-400 uppercase tracking-widest animate-pulse">
                    <Sparkles className="w-2.5 h-2.5 animate-pulse" />
                    Pro Preview
                  </span>
                  <span>
                    RetentIQ's premium AI engines are temporarily unlocked for all workspaces. Soon,
                    advanced diagnoses will require a{' '}
                    <strong className="text-cyan-400 font-extrabold font-sans">Pro</strong> or{' '}
                    <strong className="text-indigo-400 font-extrabold font-sans">Ultra</strong>{' '}
                    membership.
                  </span>
                  <Link
                    href="/dashboard/settings"
                    className="ml-1 text-cyan-400 hover:text-cyan-300 font-bold transition-colors underline decoration-cyan-400/40 hover:decoration-cyan-300/80 underline-offset-2 flex items-center gap-0.5"
                  >
                    View Details
                    <span className="text-[10px]">&rarr;</span>
                  </Link>
                </div>

                <button
                  onClick={handleDismissBanner}
                  className="p-1 hover:bg-slate-800 border border-transparent hover:border-slate-700/50 rounded-lg text-slate-400 hover:text-slate-200 transition-all cursor-pointer shrink-0"
                  aria-label="Dismiss Banner"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="p-4 md:p-8 max-w-7xl mx-auto w-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
