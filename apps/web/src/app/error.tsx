'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to stdout/service reporting
    console.error('[ErrorBoundary] Captured rendering exception:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#020205] text-slate-200 px-6 relative overflow-hidden font-sans">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-950/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-amber-950/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Container */}
      <div className="z-10 text-center max-w-lg w-full">
        {/* Animated Warning Icon Container */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-slate-900/50 border border-slate-800/80 mb-8 shadow-inner backdrop-blur-md relative group">
          <div className="absolute inset-0 bg-gradient-to-tr from-red-500/20 to-amber-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <AlertTriangle className="w-10 h-10 text-red-400 group-hover:scale-110 transition-transform duration-300 relative z-10" />
        </div>

        {/* Heading */}
        <h1 className="text-4xl md:text-5xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white via-slate-200 to-slate-450 leading-none select-none">
          System Exception
        </h1>

        <h2 className="text-lg md:text-xl font-semibold mt-4 text-slate-200 font-serif tracking-wide italic">
          "Something went sideways"
        </h2>

        <p className="mt-4 text-slate-400 text-sm md:text-base max-w-md mx-auto leading-relaxed">
          The dashboard encountered a runtime rendering exception. This can occur due to missing network endpoints or corrupted session state.
        </p>

        {/* Technical details container */}
        <div className="mt-6 p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 text-left backdrop-blur-md max-h-40 overflow-y-auto font-mono text-xs text-red-350 select-text leading-relaxed">
          <div className="font-semibold text-slate-350 border-b border-slate-800/60 pb-1.5 mb-1.5 flex justify-between">
            <span>Exception Log</span>
            {error.digest && <span className="text-slate-500 text-[10px]">Digest: {error.digest}</span>}
          </div>
          <div>{error.message || 'Unknown render exception occurred.'}</div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-slate-950 font-semibold text-sm rounded-xl transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 shadow-lg shadow-cyan-900/20 hover:shadow-cyan-900/30"
          >
            <RefreshCw className="w-4 h-4" />
            Try Recovery
          </button>
          <Link
            href="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-900/85 hover:bg-slate-800/90 border border-slate-800 text-slate-300 hover:text-white font-medium text-sm rounded-xl transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 backdrop-blur-md"
          >
            <ArrowLeft className="w-4 h-4" />
            Go to Dashboard
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
