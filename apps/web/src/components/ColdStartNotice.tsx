'use client';

import React, { useState, useEffect } from 'react';
import { Database, RefreshCw, Sparkles, CheckCircle2, Server, ArrowRight } from 'lucide-react';

interface ColdStartNoticeProps {
  isSlowLoading?: boolean;
  error?: string | null;
  onRetry: () => void;
  onLoadDemoData?: () => void;
  compact?: boolean;
}

export function ColdStartNotice({
  isSlowLoading = false,
  error = null,
  onRetry,
  onLoadDemoData,
  compact = false,
}: ColdStartNoticeProps) {
  const [retrying, setRetrying] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [autoRetryEnabled, setAutoRetryEnabled] = useState(true);

  // Auto-retry countdown timer when an error or slow state occurs
  useEffect(() => {
    if (!autoRetryEnabled || (!error && !isSlowLoading)) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          triggerRetry();
          return 5;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [error, isSlowLoading, autoRetryEnabled]);

  const triggerRetry = async () => {
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setTimeout(() => setRetrying(false), 800);
    }
  };

  if (compact) {
    return (
      <div className="p-4 rounded-xl border border-cyan-500/25 bg-linear-to-r from-cyan-950/40 via-slate-900/60 to-indigo-950/40 backdrop-blur-md flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0">
            <Database
              className={`w-4 h-4 text-cyan-400 ${retrying || isSlowLoading ? 'animate-pulse' : ''}`}
            />
          </div>
          <div>
            <p className="font-bold text-slate-200">
              {error ? 'Database warming up (cold start)' : 'Waking up database instances...'}
            </p>
            <p className="text-[11px] text-slate-400">
              Cloud services spin down after inactivity. Resuming typically takes ~5s.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onLoadDemoData && (
            <button
              onClick={onLoadDemoData}
              className="px-2.5 py-1.5 rounded-lg bg-white/4 hover:bg-white/8 border border-white/10 text-slate-300 hover:text-white font-semibold text-[11px] transition-all cursor-pointer flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3 text-cyan-400" />
              Sample Data
            </button>
          )}
          <button
            onClick={triggerRetry}
            disabled={retrying}
            className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[11px] transition-all shadow-sm shadow-cyan-500/20 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${retrying ? 'animate-spin' : ''}`} />
            {retrying ? 'Pinging...' : `Retry (${countdown}s)`}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-linear-to-b from-cyan-950/30 via-slate-900/80 to-[#0A0F1E] p-6 md:p-8 shadow-[0_8px_32px_rgba(0,212,255,0.08)] backdrop-blur-md">
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        {/* Left info */}
        <div className="flex items-start gap-4 max-w-2xl">
          <div className="relative w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0 shadow-inner">
            <div className="absolute inset-0 rounded-2xl border border-cyan-400/40 animate-ping opacity-25 pointer-events-none" />
            <Database className="w-6 h-6 text-cyan-400" />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[10px] font-bold text-cyan-300 uppercase tracking-widest">
                <Server className="w-2.5 h-2.5 text-cyan-400" />
                Cloud Service Notice
              </span>
              <span className="text-xs text-slate-400 font-medium">Free-Tier Sleep Mode</span>
            </div>

            <h3 className="text-lg md:text-xl font-bold text-slate-100 tracking-tight">
              {error ? 'Database is Warming Up' : 'Waking Up Cloud Database Instances'}
            </h3>

            <p className="text-xs md:text-sm text-slate-400 leading-relaxed">
              To conserve resources, cloud instances pause after periods of inactivity. A cold start
              typically takes <strong>3 to 6 seconds</strong> to wake up. We are actively pinging
              the connection.
            </p>

            {/* Countdown progress bar */}
            <div className="pt-2 flex items-center gap-3 text-xs text-slate-400">
              <div className="w-32 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-cyan-400 transition-all duration-1000 ease-linear rounded-full"
                  style={{ width: `${((5 - countdown) / 5) * 100}%` }}
                />
              </div>
              <span className="text-[11px] font-semibold text-slate-300">
                Auto-retrying in {countdown}s...
              </span>
            </div>
          </div>
        </div>

        {/* Right CTA Actions */}
        <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 w-full md:w-auto shrink-0">
          <button
            onClick={triggerRetry}
            disabled={retrying}
            className="w-full md:w-48 py-2.5 px-4 rounded-xl bg-linear-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-slate-950 font-bold text-xs tracking-wider uppercase transition-all shadow-[0_4px_16px_rgba(0,212,255,0.25)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${retrying ? 'animate-spin' : ''}`} />
            {retrying ? 'Reconnecting...' : 'Wake Up & Retry'}
          </button>

          {onLoadDemoData && (
            <button
              onClick={onLoadDemoData}
              className="w-full md:w-48 py-2.5 px-4 rounded-xl bg-white/4 hover:bg-white/8 border border-white/12 text-slate-200 hover:text-white font-semibold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              View Sample Data
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
