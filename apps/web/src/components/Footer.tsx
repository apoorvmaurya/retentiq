'use client';

import React from 'react';
import { Brain } from 'lucide-react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="relative py-16 md:py-24 bg-[#070b16] overflow-hidden">
      {/* Radial Gradient Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-r from-cyan-500/5 to-indigo-500/5 blur-[100px] pointer-events-none rounded-full" />

      {/* Modern Fading Gradient Top Border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

      <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 mb-16">
          {/* Branding & Newsletter Column */}
          <div className="lg:col-span-5 flex flex-col items-center lg:items-start text-center lg:text-left space-y-6">
            <div className="flex items-center justify-center lg:justify-start gap-2 w-full">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-cyan-500/10">
                <Brain className="w-4 h-4 text-[#0A0F1E]" />
              </div>
              <span className="font-bold text-xs tracking-wider text-[#F8F6F0] uppercase">
                RetentIQ
              </span>
            </div>
            <p className="text-xs text-[#8B95AB] leading-relaxed max-w-sm mx-auto lg:mx-0">
              AI-powered customer churn-intelligence platform built on Supabase, FastAPI, and Llama
              3.3. Spot churn risk 30–60 days before it happens.
            </p>

            {/* Social Icons */}
            <div className="flex items-center justify-center lg:justify-start gap-3 w-full">
              <a
                href="#"
                aria-label="Twitter"
                className="w-8 h-8 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:border-cyan-500/30 hover:bg-white/[0.05] flex items-center justify-center text-slate-400 hover:text-white transition-all duration-200"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href="#"
                aria-label="GitHub"
                className="w-8 h-8 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:border-cyan-500/30 hover:bg-white/[0.05] flex items-center justify-center text-slate-400 hover:text-white transition-all duration-200"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z"
                  />
                </svg>
              </a>
              <a
                href="#"
                aria-label="LinkedIn"
                className="w-8 h-8 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:border-cyan-500/30 hover:bg-white/[0.05] flex items-center justify-center text-slate-400 hover:text-white transition-all duration-200"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
              </a>
            </div>

            {/* Newsletter Subscription */}
            <form
              className="pt-2 w-full max-w-sm mx-auto lg:mx-0 flex flex-col items-center lg:items-start"
              onSubmit={(e) => e.preventDefault()}
            >
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2 w-full text-center lg:text-left">
                Subscribe to updates
              </label>
              <div className="relative flex items-center w-full">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="w-full h-10 px-4 rounded-lg bg-white/[0.02] border border-white/[0.06] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:bg-white/[0.04] transition-all duration-200 pr-12 text-center lg:text-left"
                />
                <button
                  type="submit"
                  className="absolute right-1 w-8 h-8 rounded-md bg-gradient-to-tr from-cyan-400 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 text-slate-950 flex items-center justify-center transition-all duration-200 shadow-md shadow-cyan-500/10"
                >
                  <span className="sr-only">Subscribe</span>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                  </svg>
                </button>
              </div>
            </form>
          </div>

          {/* Link Columns */}
          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-8 md:gap-10">
            {/* Column 1: Product */}
            <div className="flex flex-col items-center lg:items-start text-center lg:text-left space-y-4">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Product
              </h4>
              <ul className="space-y-2.5 text-xs text-[#8B95AB] flex flex-col items-center lg:items-start">
                <li>
                  <Link
                    href="/#about"
                    className="hover:text-white hover:translate-x-1.5 transition-all duration-300 ease-out inline-block"
                  >
                    About
                  </Link>
                </li>
                <li>
                  <Link
                    href="/#how-it-works"
                    className="hover:text-white hover:translate-x-1.5 transition-all duration-300 ease-out inline-block"
                  >
                    Workflow
                  </Link>
                </li>
                <li>
                  <Link
                    href="/#features"
                    className="hover:text-white hover:translate-x-1.5 transition-all duration-300 ease-out inline-block"
                  >
                    Capabilities
                  </Link>
                </li>
                <li>
                  <Link
                    href="/#pricing"
                    className="hover:text-white hover:translate-x-1.5 transition-all duration-300 ease-out inline-block"
                  >
                    Pricing
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 2: Company */}
            <div className="flex flex-col items-center lg:items-start text-center lg:text-left space-y-4">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Company
              </h4>
              <ul className="space-y-2.5 text-xs text-[#8B95AB] flex flex-col items-center lg:items-start">
                <li>
                  <a
                    href="#"
                    className="hover:text-white hover:translate-x-1.5 transition-all duration-300 ease-out inline-block"
                  >
                    About Us
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-white hover:translate-x-1.5 transition-all duration-300 ease-out inline-block"
                  >
                    Careers
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-white hover:translate-x-1.5 transition-all duration-300 ease-out inline-block"
                  >
                    Contact
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 3: Resources */}
            <div className="flex flex-col items-center lg:items-start text-center lg:text-left space-y-4">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Resources
              </h4>
              <ul className="space-y-2.5 text-xs text-[#8B95AB] flex flex-col items-center lg:items-start">
                <li>
                  <a
                    href="#"
                    className="hover:text-white hover:translate-x-1.5 transition-all duration-300 ease-out inline-block"
                  >
                    Documentation
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-white hover:translate-x-1.5 transition-all duration-300 ease-out inline-block"
                  >
                    Status Logs
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-white hover:translate-x-1.5 transition-all duration-300 ease-out inline-block"
                  >
                    Help Center
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 4: Legal */}
            <div className="flex flex-col items-center lg:items-start text-center lg:text-left space-y-4">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Legal
              </h4>
              <ul className="space-y-2.5 text-xs text-[#8B95AB] flex flex-col items-center lg:items-start">
                <li>
                  <Link
                    href="/privacy"
                    className="hover:text-white hover:translate-x-1.5 transition-all duration-300 ease-out inline-block"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms"
                    className="hover:text-white hover:translate-x-1.5 transition-all duration-300 ease-out inline-block"
                  >
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link
                    href="/security"
                    className="hover:text-white hover:translate-x-1.5 transition-all duration-300 ease-out inline-block"
                  >
                    Security
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom copyright & status bar */}
        <div className="border-t border-white/[0.04] pt-8 flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-[#8B95AB]">
          <p>© {new Date().getFullYear()} RetentIQ Inc. All rights reserved.</p>

          <div className="flex items-center gap-2 text-[11px] font-medium text-emerald-400 bg-emerald-500/[0.05] border border-emerald-500/[0.12] px-3 py-1 rounded-full select-none">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            All systems operational
          </div>
        </div>
      </div>
    </footer>
  );
}
