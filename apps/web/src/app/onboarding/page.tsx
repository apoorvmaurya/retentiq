'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { FloatingInput } from '@/components/FloatingInput';
import { completeOnboarding } from './actions';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  ArrowRight,
  CreditCard,
  Activity,
  MessageSquare,
  FileSpreadsheet,
  X,
  Sparkles,
  AlertCircle,
} from 'lucide-react';

// Wrapper component to enable search params in Next.js 15+
export default function OnboardingPageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#020205] flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#00D4FF] border-r-transparent animate-spin" />
          <p className="text-xs text-[#8B95AB] uppercase tracking-wider font-semibold">Loading Wizard...</p>
        </div>
      </div>
    }>
      <OnboardingWizard />
    </Suspense>
  );
}

function OnboardingWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Active step derived from URL query params
  const stepParam = searchParams.get('step');
  const step = stepParam ? parseInt(stepParam) : 1;

  // State storage
  const [orgName, setOrgName] = useState('');
  const [teamSize, setTeamSize] = useState('');
  const [integration, setIntegration] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [teamEmails, setTeamEmails] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Synchronize router state
  const setStep = (newStep: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('step', newStep.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  // Step 3 Email chip management
  const addEmails = (text: string) => {
    const parts = text.split(/[\s,]+/);
    const newEmails: string[] = [];
    parts.forEach((p) => {
      const trimmed = p.trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (trimmed && emailRegex.test(trimmed) && !teamEmails.includes(trimmed)) {
        newEmails.push(trimmed);
      }
    });
    if (newEmails.length > 0) {
      setTeamEmails([...teamEmails, ...newEmails]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === ',' || e.key === 'Enter') {
      e.preventDefault();
      addEmails(emailInput);
      setEmailInput('');
    }
  };

  const handleBlur = () => {
    if (emailInput) {
      addEmails(emailInput);
      setEmailInput('');
    }
  };

  const removeEmail = (index: number) => {
    setTeamEmails(teamEmails.filter((_, i) => i !== index));
  };

  // Wizard Submissions
  const handleLaunch = async () => {
    setLoading(true);
    setErrorMsg('');

    const res = await completeOnboarding({
      orgName,
      teamSize,
      integration,
      teamEmails,
    });

    if (res.success) {
      router.refresh();
      window.location.href = '/dashboard';
    } else {
      setErrorMsg(res.error || 'Failed to complete onboarding');
      setLoading(false);
    }
  };

  const teamSizes = ['1–10', '11–50', '51–200', '200+'];

  const sources = [
    { id: 'Stripe', label: 'Stripe', desc: 'Billing events', icon: CreditCard, color: 'text-indigo-400' },
    { id: 'Mixpanel', label: 'Mixpanel', desc: 'Product usage', icon: Activity, color: 'text-purple-400' },
    { id: 'Intercom', label: 'Intercom', desc: 'Support tickets', icon: MessageSquare, color: 'text-blue-400' },
    { id: 'Manual CSV', label: 'Manual CSV', desc: 'Upload later', icon: FileSpreadsheet, color: 'text-slate-400' },
  ];

  return (
    <div className="min-h-screen bg-[#020205] text-[#F8F6F0] flex flex-col justify-between p-6 sm:p-12 md:p-16 relative overflow-hidden font-sans">
      {/* Glow meshes */}
      <div className="absolute top-[-20%] left-[-20%] w-[50%] h-[50%] rounded-full bg-[#00D4FF]/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[50%] h-[50%] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />

      {/* Top Header Logo */}
      <div className="flex items-center justify-between z-10 w-full max-w-xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#00D4FF] to-indigo-500 flex items-center justify-center shadow-lg">
            <Brain className="w-4.5 h-4.5 text-[#0A0F1E]" />
          </div>
          <span className="font-bold text-sm tracking-widest text-white uppercase">
            RetentIQ
          </span>
        </div>
        <div className="text-[10px] uppercase font-bold tracking-wider text-[#8B95AB]">
          Setup Wizard &bull; Step {step} of 3
        </div>
      </div>

      {/* Main Form container */}
      <div className="flex-1 flex items-center justify-center z-10 py-12">
        <div className="w-full max-w-xl space-y-8">
          {/* Progress bar container */}
          <div className="w-full h-1 bg-white/[0.04] rounded-full overflow-hidden relative">
            <motion.div
              animate={{ width: `${(step / 3) * 100}%` }}
              transition={{ type: 'spring', stiffness: 100, damping: 20 }}
              className="absolute h-full left-0 top-0 bg-gradient-to-r from-[#00D4FF] to-indigo-500 rounded-full"
            />
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="flex items-start gap-2.5 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">
              <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Wizard step screen transitions */}
          <div className="relative overflow-visible min-h-[360px]">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ x: 40, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -40, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="space-y-1.5">
                    <h2 className="text-xl font-bold tracking-tight text-white">
                      Set up your workspace
                    </h2>
                    <p className="text-xs text-[#8B95AB]">
                      Choose an organization name to index your customer data
                    </p>
                  </div>

                  <div className="space-y-4">
                    <FloatingInput
                      label="Organization name"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      required
                    />

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-400">
                        Estimate team size
                      </label>
                      <div className="grid grid-cols-2 gap-3.5">
                        {teamSizes.map((size) => (
                          <button
                            key={size}
                            type="button"
                            onClick={() => setTeamSize(size)}
                            className={`p-4 rounded-xl border text-center transition-all cursor-pointer ${
                              teamSize === size
                                ? 'border-[#00D4FF] bg-[#00D4FF]/5 text-white shadow-[0_0_15px_rgba(0,212,255,0.08)]'
                                : 'border-white/[0.08] hover:border-white/[0.12] bg-white/[0.01] text-[#8B95AB]'
                            }`}
                          >
                            <span className="text-xs font-bold">{size}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4">
                    <button
                      type="button"
                      disabled={!orgName || !teamSize}
                      onClick={() => setStep(2)}
                      className="w-full py-3 rounded-xl bg-[#00D4FF] hover:bg-[#00D4FF]/90 text-[#0A0F1E] font-bold text-xs tracking-wider uppercase transition-all shadow-[0_4px_20px_rgba(0,212,255,0.15)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      Continue <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ x: 40, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -40, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="space-y-1.5">
                    <h2 className="text-xl font-bold tracking-tight text-white">
                      Connect your first data source
                    </h2>
                    <p className="text-xs text-[#8B95AB]">
                      Select an integration to ingest early churn signals
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {sources.map((src) => {
                      const Icon = src.icon;
                      const isSelected = integration === src.id;
                      return (
                        <button
                          key={src.id}
                          type="button"
                          onClick={() => setIntegration(src.id)}
                          className={`p-4 rounded-xl border text-left flex flex-col justify-between h-28 transition-all cursor-pointer ${
                            isSelected
                              ? 'border-[#00D4FF] bg-[#00D4FF]/5 text-white shadow-[0_0_15px_rgba(0,212,255,0.08)]'
                              : 'border-white/[0.08] hover:border-white/[0.12] bg-white/[0.01] text-[#8B95AB]'
                          }`}
                        >
                          <div className={`p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] w-fit ${src.color}`}>
                            <Icon className="w-4.5 h-4.5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white mt-2">{src.label}</p>
                            <p className="text-[10px] text-[#8B95AB]">{src.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="w-1/2 py-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.08] text-white text-xs font-bold tracking-wider uppercase transition-all cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={!integration}
                      onClick={() => setStep(3)}
                      className="w-1/2 py-3 rounded-xl bg-[#00D4FF] hover:bg-[#00D4FF]/90 text-[#0A0F1E] font-bold text-xs tracking-wider uppercase transition-all shadow-[0_4px_20px_rgba(0,212,255,0.15)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      Continue <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ x: 40, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -40, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="space-y-1.5">
                    <h2 className="text-xl font-bold tracking-tight text-white">
                      Invite your team
                    </h2>
                    <p className="text-xs text-[#8B95AB]">
                      Share access with Customer Success Managers and analysts
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="relative rounded-xl border border-white/[0.08] bg-slate-950/60 p-4 min-h-[120px] flex flex-col gap-3 focus-within:border-[#00D4FF] focus-within:ring-2 focus-within:ring-[#00D4FF]/20">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#8B95AB]">
                        Comma-separated emails
                      </span>

                      {/* Displaying Removable Chips */}
                      {teamEmails.length > 0 && (
                        <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto pr-1">
                          {teamEmails.map((email, idx) => (
                            <div
                              key={email}
                              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[#00D4FF] text-[10px] font-bold"
                            >
                              <span>{email}</span>
                              <button
                                type="button"
                                onClick={() => removeEmail(idx)}
                                className="text-[#8B95AB] hover:text-[#00D4FF] transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <textarea
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={handleBlur}
                        placeholder="Enter email addresses..."
                        disabled={loading}
                        className="w-full bg-transparent text-white text-xs placeholder-slate-600 focus:outline-none resize-none flex-1 min-h-[60px]"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 pt-4">
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        disabled={loading}
                        className="w-1/2 py-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.08] text-white text-xs font-bold tracking-wider uppercase transition-all disabled:opacity-40 cursor-pointer"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={handleLaunch}
                        className="w-1/2 py-3 rounded-xl bg-[#00D4FF] hover:bg-[#00D4FF]/90 text-[#0A0F1E] font-bold text-xs tracking-wider uppercase transition-all shadow-[0_4px_20px_rgba(0,212,255,0.15)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        {loading ? 'Launching...' : 'Launch dashboard'}
                        {!loading && <Sparkles className="w-4 h-4 text-[#0a0f1e]" />}
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleLaunch}
                      className="text-center text-xs text-[#8B95AB] hover:text-[#00D4FF] hover:underline font-bold transition-colors pt-2 cursor-pointer"
                    >
                      Skip for now
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Bottom Footer Info */}
      <div className="z-10 text-center text-[10px] text-[#8B95AB] font-medium w-full max-w-xl mx-auto pt-6 border-t border-white/[0.04]">
        Once completed, you will be redirected to the Tenancy-Isolated Churn Dashboard.
      </div>
    </div>
  );
}
