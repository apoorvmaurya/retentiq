'use client';

import { useEffect, useState } from 'react';
import { Database, RefreshCw, ArrowLeft, Server, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [countdown, setCountdown] = useState(6);
  const [retrying, setRetrying] = useState(false);

  const errorLower = (error?.message || '').toLowerCase();
  const isConnectionOrColdStart =
    errorLower.includes('fetch') ||
    errorLower.includes('network') ||
    errorLower.includes('500') ||
    errorLower.includes('502') ||
    errorLower.includes('503') ||
    errorLower.includes('504') ||
    errorLower.includes('econnrefused') ||
    errorLower.includes('api error') ||
    errorLower.includes('timeout') ||
    errorLower.includes('failed to load') ||
    !error.message;

  useEffect(() => {
    console.error('[ErrorBoundary] Captured rendering exception:', error);

    // If connection/cold start, initiate a friendly auto-recovery countdown
    if (isConnectionOrColdStart) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleAutoReset();
            return 6;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [error, isConnectionOrColdStart]);

  const handleAutoReset = () => {
    setRetrying(true);
    reset();
    setTimeout(() => setRetrying(false), 1200);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#070B16] text-slate-200 px-6 relative overflow-hidden font-sans">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-137.5 h-137.5 bg-cyan-950/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-112.5 h-112.5 bg-indigo-950/20 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <div className="z-10 text-center max-w-lg w-full">
        {/* Animated Database / Cold-Start Icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 mb-8 shadow-inner backdrop-blur-md relative group">
          <div className="absolute inset-0 bg-linear-to-tr from-cyan-500/20 to-indigo-500/20 rounded-2xl animate-pulse opacity-70" />
          {isConnectionOrColdStart ? (
            <Database className="w-10 h-10 text-cyan-400 group-hover:scale-110 transition-transform duration-300 relative z-10" />
          ) : (
            <AlertCircle className="w-10 h-10 text-amber-400 group-hover:scale-110 transition-transform duration-300 relative z-10" />
          )}
        </div>

        {/* Heading */}
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-linear-to-r from-white via-slate-100 to-cyan-300 leading-tight">
          {isConnectionOrColdStart ? 'Database Service Waking Up' : 'Temporary Session Notice'}
        </h1>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-xs font-semibold text-cyan-300 mt-3">
          <Server className="w-3.5 h-3.5" />
          <span>
            {isConnectionOrColdStart
              ? 'Cloud Cold Start in Progress'
              : 'Client Exception Intercepted'}
          </span>
        </div>

        <p className="mt-4 text-slate-300 text-sm md:text-base max-w-md mx-auto leading-relaxed">
          {isConnectionOrColdStart
            ? 'Free-tier cloud database and backend services enter power-saving sleep during periods of inactivity. They typically take 3 to 6 seconds to resume full throughput.'
            : 'The dashboard intercepted a temporary render event. We are safely restoring your session.'}
        </p>

        {/* Countdown indicator */}
        {isConnectionOrColdStart && (
          <div className="mt-5 p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-center gap-3 text-xs text-slate-400">
            <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-400 rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${((6 - countdown) / 6) * 100}%` }}
              />
            </div>
            <span className="font-semibold text-slate-300">
              Auto-reconnecting in {countdown}s...
            </span>
          </div>
        )}

        {/* Technical details container */}
        <div className="mt-6 p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 text-left backdrop-blur-md max-h-32 overflow-y-auto font-mono text-xs text-slate-400 select-text leading-relaxed">
          <div className="font-semibold text-slate-300 border-b border-slate-800/60 pb-1 mb-1.5 flex justify-between text-[11px]">
            <span>Diagnostics</span>
            {error.digest && <span className="text-slate-500 text-[10px]">ID: {error.digest}</span>}
          </div>
          <div className="text-cyan-300/80 truncate">
            {error.message || 'Waiting for database handshake...'}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={handleAutoReset}
            disabled={retrying}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-linear-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-slate-950 font-bold text-xs tracking-wider uppercase rounded-xl transition-all duration-200 shadow-lg shadow-cyan-900/25 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} />
            {retrying ? 'Connecting...' : 'Wake Up & Retry Now'}
          </button>

          <Link
            href="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-semibold text-xs tracking-wider uppercase rounded-xl transition-all duration-200 backdrop-blur-md"
          >
            <ArrowLeft className="w-4 h-4" />
            Reload Workspace
          </Link>
        </div>
      </div>

      {/* Branded Footer */}
      <div className="absolute bottom-8 left-0 right-0 text-center select-none z-10 pointer-events-none">
        <span className="text-xs tracking-[0.2em] font-semibold text-slate-600 uppercase">
          RetentIQ Resilience Engine
        </span>
      </div>
    </div>
  );
}
