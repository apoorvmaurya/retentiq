'use client';

import React, { useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FloatingInput } from '@/components/FloatingInput';
import { createClient } from '@/lib/supabase/client';
import { Chrome } from '@/components/icons/Chrome';
import { Brain, AlertCircle, Sparkles, Zap, ArrowRight, RefreshCw, KeyRound } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/Toast';
import { fetchFromApi } from '@/lib/api';

const GUEST_CREDENTIALS = {
  email: 'guest.recruiter@retentiq.io',
  password: 'RetentIQ2026!GuestDemo',
};

export default function SignupPage() {
  return (
    <Suspense fallback={<SignupFormSkeleton />}>
      <SignupForm />
    </Suspense>
  );
}

function SignupFormSkeleton() {
  return (
    <div className="space-y-6 w-full max-w-sm animate-pulse">
      <div className="space-y-2 text-center lg:text-left">
        <div className="h-7 w-44 bg-white/10 rounded-lg mx-auto lg:mx-0" />
        <div className="h-4 w-64 bg-white/5 rounded-md mx-auto lg:mx-0" />
      </div>
      <div className="rounded-2xl border border-cyan-500/20 bg-slate-900/40 p-4 space-y-3">
        <div className="flex justify-between items-center">
          <div className="h-4 w-28 bg-cyan-400/20 rounded-full" />
          <div className="h-3 w-24 bg-white/5 rounded" />
        </div>
        <div className="h-8 w-full bg-white/5 rounded" />
        <div className="h-10 w-full bg-cyan-400/20 rounded-xl" />
      </div>
      <div className="h-px bg-white/6 w-full" />
      <div className="space-y-3">
        <div className="h-12 w-full bg-white/5 rounded-xl" />
        <div className="h-12 w-full bg-white/5 rounded-xl" />
        <div className="h-12 w-full bg-white/5 rounded-xl" />
        <div className="h-11 w-full bg-cyan-400/30 rounded-xl" />
      </div>
    </div>
  );
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMsg: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(errorMsg)), timeoutMs)),
  ]);
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

  // Guest flow states
  const [guestLoading, setGuestLoading] = useState(false);
  const [guestStatusText, setGuestStatusText] = useState('Initializing live workspace...');
  const [guestError, setGuestError] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const statusTimerRef = useRef<NodeJS.Timeout[]>([]);

  const clearStatusTimers = () => {
    statusTimerRef.current.forEach(clearTimeout);
    statusTimerRef.current = [];
  };

  const scheduleStatusMessages = () => {
    clearStatusTimers();
    setGuestStatusText('Connecting to sample workspace...');

    const t1 = setTimeout(() => {
      setGuestStatusText('Waking up database & serverless API (up to 30s)...');
    }, 3500);

    const t2 = setTimeout(() => {
      setGuestStatusText('Verifying 50 sample customer accounts & health metrics...');
    }, 9000);

    const t3 = setTimeout(() => {
      setGuestStatusText('Finalizing live recruiter session...');
    }, 16000);

    statusTimerRef.current = [t1, t2, t3];
  };

  const handleGuestLogin = async (forceReset = false) => {
    setGuestLoading(true);
    setGuestError(null);
    setErrorMsg('');
    scheduleStatusMessages();

    const MAX_ATTEMPTS = 3;
    const REQUEST_TIMEOUT_MS = 20000;

    let lastError: Error | null = null;
    let successData: any = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        if (attempt > 1) {
          setGuestStatusText(
            `Database is waking up... retrying connection (${attempt}/${MAX_ATTEMPTS})...`,
          );
        }

        const res = await fetch(`/api/auth/guest${forceReset ? '?reset=true' : ''}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data.success) {
          throw new Error(
            data.error || `Server returned ${res.status}: ${res.statusText || 'Unknown error'}`,
          );
        }

        successData = data;
        break;
      } catch (err: any) {
        clearTimeout(timeoutId);
        lastError =
          err.name === 'AbortError'
            ? new Error('Request timed out while server was waking up (20s limit).')
            : err;

        console.warn(`[GuestLogin] Attempt ${attempt} failed:`, lastError?.message);

        if (attempt < MAX_ATTEMPTS) {
          const delay = attempt * 2000;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    clearStatusTimers();

    if (!successData) {
      setGuestLoading(false);
      setGuestError(
        lastError?.message ||
          'Unable to initialize guest session. The cloud database may be paused or waking up.',
      );
      return;
    }

    setGuestStatusText('Authenticating session...');
    try {
      const supabase = createClient();
      const { error: signInErr } = await withTimeout(
        supabase.auth.signInWithPassword({
          email: successData.email || GUEST_CREDENTIALS.email,
          password: successData.password || GUEST_CREDENTIALS.password,
        }),
        15000,
        'Authentication timed out after 15s contacting Supabase Auth.',
      );

      if (signInErr) {
        throw signInErr;
      }

      await withTimeout(
        supabase.auth.getSession(),
        10000,
        'Session verification timed out after 10s.',
      );

      toast.success('Welcome! Loaded live sample retention workspace (50 accounts).');
      router.refresh();
      window.location.href = '/dashboard';
    } catch (authErr: any) {
      console.error('[GuestLogin] Auth sign-in failed:', authErr);
      setGuestLoading(false);
      setGuestError(`Workspace initialized, but sign-in failed: ${authErr.message}.`);
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
            <span className="text-[10px] text-slate-400 font-semibold">No signup required</span>
          </div>

          <p className="text-xs text-slate-300 mb-3 leading-relaxed">
            Instantly explore RetentIQ with a pre-populated B2B SaaS workspace seeded with 50 sample
            customer accounts across all risk tiers.
          </p>

          {/* Active Guest Loading State */}
          {guestLoading && (
            <div className="mb-3 p-3 rounded-xl bg-cyan-950/50 border border-cyan-500/30 text-xs text-cyan-200 flex items-center gap-3">
              <div className="w-4 h-4 shrink-0 rounded-full border-2 border-cyan-400 border-r-transparent animate-spin" />
              <div className="flex-1 text-[11px] font-medium leading-snug">{guestStatusText}</div>
            </div>
          )}

          {/* Guest Error & Retry Card */}
          {guestError && (
            <div className="mb-3 p-3.5 rounded-xl bg-rose-950/50 border border-rose-500/30 text-rose-200 space-y-2.5">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">{guestError}</div>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleGuestLogin(true)}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-xs font-semibold text-rose-100 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  Retry Live Sandbox
                </button>
                <Link
                  href="/login"
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-300 flex items-center gap-1.5 transition-colors"
                >
                  <KeyRound className="w-3 h-3" />
                  Go to Login
                </Link>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => handleGuestLogin(false)}
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
            Or register with email
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
          disabled={loading || guestLoading}
        />
        <FloatingInput
          label="Email address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          disabled={loading || guestLoading}
        />
        <FloatingInput
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
          disabled={loading || guestLoading}
        />

        {/* Terms Checkbox */}
        <div className="flex items-start gap-2.5 pt-1">
          <input
            id="terms"
            name="terms"
            type="checkbox"
            checked={agreeTerms}
            onChange={(e) => setAgreeTerms(e.target.checked)}
            className="w-4 h-4 mt-0.5 rounded border border-white/20 bg-white/5 text-[#00D4FF] focus:ring-[#00D4FF] focus:ring-offset-0 focus:ring-1 cursor-pointer accent-[#00D4FF]"
          />
          <label htmlFor="terms" className="text-xs text-[#8B95AB] leading-relaxed cursor-pointer">
            I agree to the{' '}
            <Link href="/terms" className="text-[#00D4FF] hover:underline font-semibold">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-[#00D4FF] hover:underline font-semibold">
              Privacy Policy
            </Link>
          </label>
        </div>

        <button
          type="submit"
          disabled={loading || guestLoading}
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
        disabled={loading || guestLoading}
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
