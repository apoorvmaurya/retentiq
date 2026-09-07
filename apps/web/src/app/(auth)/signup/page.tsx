'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FloatingInput } from '@/components/FloatingInput';
import { createClient } from '@/lib/supabase/client';
import { Chrome } from '@/components/icons/Chrome';
import { Brain, AlertCircle, Sparkles, Zap, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/Toast';
import { fetchFromApi } from '@/lib/api';

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center p-8 text-center text-xs text-[#8B95AB] uppercase tracking-wider font-semibold">
          <div className="w-5 h-5 rounded-full border border-[#00D4FF] border-r-transparent animate-spin mb-2" />
          Loading sign up form...
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleGuestLogin = async () => {
    setGuestLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/auth/guest', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to initialize guest session');
      }

      const supabase = createClient();
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (signInErr) {
        throw signInErr;
      }

      toast.success('Welcome! Loaded live sample retention workspace.');
      router.refresh();
      window.location.href = '/dashboard';
    } catch (err: any) {
      console.error('Guest login failed:', err);
      setErrorMsg(err.message || 'Unable to start guest session. Please try again.');
      setGuestLoading(false);
    }
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!agreeTerms) {
      setErrorMsg('You must agree to the Terms of Service and Privacy Policy');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
    } else {
      if (token) {
        try {
          await fetchFromApi('/users/invites/accept/' + token, { method: 'POST' });
        } catch (err) {
          console.error('Failed to accept invite on signup:', err);
        }
      }
      router.refresh();
      // If invitation token exists, redirect to dashboard, otherwise onboarding
      window.location.href = token ? '/dashboard' : '/onboarding?step=1';
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMsg('');
    const supabase = createClient();
    const redirectTo = token
      ? `${window.location.origin}/auth/callback?next=/dashboard&token=${token}`
      : `${window.location.origin}/auth/callback`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
      },
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-sm">
      {/* Header */}
      <div className="space-y-2 text-center lg:text-left">
        {/* Brand logo visible on mobile */}
        <div className="flex lg:hidden items-center justify-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-linear-to-tr from-[#00D4FF] to-indigo-500 flex items-center justify-center shadow-lg">
            <Brain className="w-4.5 h-4.5 text-[#0A0F1E]" />
          </div>
          <span className="font-bold text-sm tracking-widest text-white uppercase">RetentIQ</span>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-white">
          {token ? 'Join your workspace' : 'Create your account'}
        </h1>
        <p className="text-sm text-[#8B95AB]">
          {token
            ? 'Sign up to accept your invitation and join the workspace'
            : 'Sign up to build your custom customer health dashboard'}
        </p>
      </div>

      {/* Recruiter / Guest Demo Shortcut Card */}
      {!token && (
        <div className="relative group overflow-hidden rounded-2xl border border-cyan-500/30 bg-linear-to-b from-cyan-950/40 to-slate-900/60 p-4 shadow-[0_4px_25px_rgba(0,212,255,0.12)] backdrop-blur-sm">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-400/10 border border-cyan-400/20 text-[10px] font-bold text-cyan-300 uppercase tracking-wider">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              Recruiter & Guest Access
            </div>
            <span className="text-[10px] text-slate-400 font-semibold">Skip sign up</span>
          </div>

          <p className="text-xs text-slate-300 mb-3 leading-relaxed">
            Test the live platform with pre-populated customer retention data without creating
            credentials or verifying email.
          </p>

          <button
            type="button"
            onClick={handleGuestLogin}
            disabled={loading || guestLoading}
            className="w-full py-2.5 px-4 rounded-xl bg-linear-to-r from-[#00D4FF] to-indigo-500 hover:from-[#00D4FF]/90 hover:to-indigo-500/90 text-[#0A0F1E] font-extrabold text-xs tracking-wider uppercase transition-all shadow-[0_2px_15px_rgba(0,212,255,0.25)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {guestLoading ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-[#0A0F1E] border-r-transparent animate-spin" />
                <span>Initializing Live Workspace...</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>Try as Guest / Recruiter</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      )}

      {/* Divider */}
      {!token && (
        <div className="relative flex py-1 items-center">
          <div className="grow border-t border-white/6"></div>
          <span className="shrink mx-3 text-[10px] text-[#8B95AB] font-bold uppercase tracking-wider">
            Or register new credentials
          </span>
          <div className="grow border-t border-white/6"></div>
        </div>
      )}

      {/* Error Alert */}
      {errorMsg && (
        <div className="flex items-start gap-2 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleEmailSignup} className="space-y-4">
        <FloatingInput
          label="Full name"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          autoComplete="name"
          disabled={loading}
        />
        <FloatingInput
          label="Email address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          disabled={loading}
        />
        <FloatingInput
          label="Password (min 6 chars)"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
          disabled={loading}
        />

        {/* Terms Agreement Checkbox */}
        <div className="flex items-start gap-2.5 pt-1">
          <input
            id="agreeTerms"
            type="checkbox"
            checked={agreeTerms}
            onChange={(e) => setAgreeTerms(e.target.checked)}
            disabled={loading}
            className="w-4 h-4 rounded border-white/8 bg-slate-950 text-[#00D4FF] focus:ring-[#00D4FF] focus:ring-offset-slate-950 mt-0.5 cursor-pointer accent-[#00D4FF]"
          />
          <label
            htmlFor="agreeTerms"
            className="text-xs text-[#8B95AB] leading-relaxed cursor-pointer select-none"
          >
            I agree to the{' '}
            <Link
              href="#"
              className="text-[#00D4FF] hover:underline font-semibold"
              onClick={(e) => {
                e.preventDefault();
                toast.info('Terms of Service is coming soon.');
              }}
            >
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link
              href="#"
              className="text-[#00D4FF] hover:underline font-semibold"
              onClick={(e) => {
                e.preventDefault();
                toast.info('Privacy Policy is coming soon.');
              }}
            >
              Privacy Policy
            </Link>
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-[#00D4FF] hover:bg-[#00D4FF]/90 text-[#0A0F1E] font-bold text-xs tracking-wider uppercase transition-all shadow-[0_4px_20px_rgba(0,212,255,0.15)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {loading ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      {/* Divider */}
      <div className="relative flex py-2 items-center">
        <div className="grow border-t border-white/6"></div>
        <span className="shrink mx-4 text-[10px] text-[#8B95AB] font-bold uppercase tracking-wider">
          Or continue with
        </span>
        <div className="grow border-t border-white/6"></div>
      </div>

      {/* Google Sign In */}
      <button
        onClick={handleGoogleLogin}
        disabled={loading}
        className="w-full py-3 rounded-xl bg-white/2 hover:bg-white/6 border border-white/8 text-white text-xs font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        <Chrome className="w-4 h-4 text-rose-400" />
        Sign up with Google
      </button>

      {/* Login Link */}
      <div className="text-center text-xs text-[#8B95AB] mt-6">
        Already have an account?{' '}
        <Link
          href={token ? `/login?token=${token}` : '/login'}
          className="text-[#00D4FF] hover:underline font-semibold"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
