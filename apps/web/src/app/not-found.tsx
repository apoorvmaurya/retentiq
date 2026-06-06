'use client';

import Link from 'next/link';
import { ArrowLeft, HelpCircle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#020205] text-slate-200 px-6 relative overflow-hidden font-sans">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-900/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-indigo-950/15 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Container */}
      <div className="z-10 text-center max-w-lg w-full">
        {/* Animated Icon Container */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-slate-900/50 border border-slate-800/80 mb-8 shadow-inner backdrop-blur-md relative group">
          <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <HelpCircle className="w-10 h-10 text-cyan-400 group-hover:scale-110 transition-transform duration-300 relative z-10" />
        </div>

        {/* 404 text with gradient */}
        <h1 className="text-8xl md:text-9xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white via-slate-200 to-slate-500 leading-none select-none">
          404
        </h1>

        <h2 className="text-xl md:text-2xl font-semibold mt-4 text-slate-100 font-serif tracking-wide italic">
          "Lost in the Churn-space"
        </h2>

        <p className="mt-4 text-slate-400 text-sm md:text-base max-w-md mx-auto leading-relaxed">
          The customer intelligence path you are looking for does not exist or has been archived.
          Check your metrics link or return to dashboard.
        </p>

        {/* Action Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-slate-950 font-semibold text-sm rounded-xl transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 shadow-lg shadow-cyan-900/20 hover:shadow-cyan-900/30"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-900/85 hover:bg-slate-800/90 border border-slate-800 text-slate-300 hover:text-white font-medium text-sm rounded-xl transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 backdrop-blur-md"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </div>

      {/* Branded Footer */}
      <div className="absolute bottom-8 left-0 right-0 text-center select-none z-10 pointer-events-none">
        <span className="text-xs tracking-[0.2em] font-semibold text-slate-600/80 uppercase">
          RetentIQ Churn Intelligence
        </span>
      </div>
    </div>
  );
}
