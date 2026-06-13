'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FloatingInput } from '@/components/FloatingInput';
import { createClient } from '@/lib/supabase/client';
import { Chrome } from '@/components/icons/Chrome';
import { Brain, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/Toast';

import { Suspense } from 'react';

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center p-8 text-center text-xs text-[#8B95AB] uppercase tracking-wider font-semibold">
          <div className="w-5 h-5 rounded-full border border-[#00D4FF] border-r-transparent animate-spin mb-2" />
          Loading login form...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setErrorMsg(errorParam);
    }
  }, [searchParams]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
    } else {
      router.refresh();
      window.location.href = '/dashboard';
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMsg('');
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
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
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#00D4FF] to-indigo-500 flex items-center justify-center shadow-lg">
            <Brain className="w-4.5 h-4.5 text-[#0A0F1E]" />
          </div>
          <span className="font-bold text-sm tracking-widest text-white uppercase">RetentIQ</span>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-white">Welcome back</h1>
        <p className="text-sm text-[#8B95AB]">
          Enter your credentials to access your churn dashboard
        </p>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="flex items-start gap-2 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleEmailLogin} className="space-y-4">
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
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          disabled={loading}
        />

        <div className="flex items-center justify-end text-xs">
          <Link
            href="#"
            className="text-[#00D4FF] hover:underline font-semibold"
            onClick={(e) => {
              e.preventDefault();
              toast.warning('Password recovery is currently disabled. Please contact support.');
            }}
          >
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-[#00D4FF] hover:bg-[#00D4FF]/90 text-[#0A0F1E] font-bold text-xs tracking-wider uppercase transition-all shadow-[0_4px_20px_rgba(0,212,255,0.15)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      {/* Divider */}
      <div className="relative flex py-2 items-center">
        <div className="flex-grow border-t border-white/[0.06]"></div>
        <span className="flex-shrink mx-4 text-[10px] text-[#8B95AB] font-bold uppercase tracking-wider">
          Or continue with
        </span>
        <div className="flex-grow border-t border-white/[0.06]"></div>
      </div>

      {/* Google Sign In */}
      <button
        onClick={handleGoogleLogin}
        disabled={loading}
        className="w-full py-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.08] text-white text-xs font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        <Chrome className="w-4 h-4 text-rose-400" />
        Sign in with Google
      </button>

      {/* Signup Link */}
      <div className="text-center text-xs text-[#8B95AB] mt-6">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-[#00D4FF] hover:underline font-semibold">
          Sign up
        </Link>
      </div>
    </div>
  );
}
