'use client';

import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { motion } from 'framer-motion';
import { FileText, ChevronRight } from 'lucide-react';

export default function TermsOfServicePage() {
  const sections = [
    { id: 'acceptance', title: '1. Acceptance of Terms' },
    { id: 'service', title: '2. Service Description' },
    { id: 'billing', title: '3. Subscription & Billing' },
    { id: 'disclaimer', title: '4. AI & ML Disclaimers' },
    { id: 'license', title: '5. Integration License' },
    { id: 'prohibited', title: '6. Prohibited Activities' },
    { id: 'liability', title: '7. Limitation of Liability' },
    { id: 'termination', title: '8. Termination' },
    { id: 'governing', title: '9. Governing Law' },
  ];

  const handleScroll = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const offset = el.getBoundingClientRect().top + window.scrollY - 120;
      window.scrollTo({ top: offset, behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-[#0A0F1E] text-[#F8F6F0] min-h-screen overflow-x-hidden font-sans selection:bg-[#00D4FF]/20 selection:text-[#00D4FF]">
      {/* Decorative gradient meshes */}
      <div className="absolute top-[-10%] left-[10%] w-[600px] h-[600px] rounded-full bg-indigo-950/20 blur-[120px] pointer-events-none" />
      <div className="absolute top-[20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#00D4FF]/5 blur-[150px] pointer-events-none" />

      {/* Shared Navbar */}
      <Navbar />

      <main className="relative pt-24 pb-16 sm:pt-32 sm:pb-20 px-4 md:px-8 max-w-6xl mx-auto z-10">
        {/* Header */}
        <div className="space-y-4 mb-8 sm:mb-12 md:mb-16 text-center md:text-left">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] backdrop-blur-md"
          >
            <FileText className="w-3.5 h-3.5 text-[#00D4FF]" />
            <span className="text-[10px] font-bold tracking-wider text-[#8B95AB] uppercase">
              RetentIQ Legal Agreement
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-serif text-4xl md:text-6xl font-normal tracking-tight text-[#F8F6F0]"
          >
            Terms of Service
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xs md:text-sm text-slate-400 font-semibold"
          >
            Last Updated: June 8, 2026 &bull; Version 1.0.0-Beta
          </motion.p>
        </div>

        {/* Content Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 items-start">
          {/* Left Sticky Sidebar (Table of Contents) */}
          <aside className="hidden lg:block lg:col-span-3 sticky top-32 space-y-4 bg-white/[0.01] border border-white/[0.04] p-6 rounded-2xl backdrop-blur-md">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-white/[0.06] pb-3 mb-4">
              Table of Contents
            </h3>
            <nav className="flex flex-col gap-2">
              {sections.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleScroll(s.id)}
                  className="text-xs font-semibold text-slate-400 hover:text-[#00D4FF] transition-all text-left flex items-center justify-between group py-1.5 cursor-pointer"
                >
                  <span>{s.title}</span>
                  <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-[#00D4FF]" />
                </button>
              ))}
            </nav>
          </aside>

          {/* Right Document Text Container */}
          <div className="lg:col-span-9 bg-white/[0.015] border border-white/[0.06] rounded-2xl p-4 sm:p-6 md:p-10 backdrop-blur-md shadow-2xl space-y-10 text-slate-400 leading-relaxed font-sans text-xs md:text-sm">
            {/* Section 1 */}
            <section id="acceptance" className="space-y-4 scroll-mt-32">
              <h2 className="font-serif text-xl md:text-2xl text-white font-normal">
                1. Acceptance of Terms
              </h2>
              <p>
                Welcome to RetentIQ. By accessing our website, platform, APIs, or database schemas
                (collectively, the "Services"), you agree to be bound by these Terms of Service (the
                "Terms"). These Terms govern all interactions with the RetentIQ monorepo platform.
              </p>
              <p>
                If you are signing up on behalf of an organization or business entity, you warrant
                that you have the complete legal authority to bind that entity to these Terms. If
                you do not agree, you must immediately cease accessing our portal.
              </p>
            </section>

            {/* Section 2 */}
            <section id="service" className="space-y-4 scroll-mt-32">
              <h2 className="font-serif text-xl md:text-2xl text-white font-normal">
                2. Service Description
              </h2>
              <p>
                RetentIQ provides an enterprise-level B2B SaaS platform that performs customer
                health scoring, telemetry analytics, automatic Slack/email alert triggers, and
                AI-driven retention playbooks.
              </p>
              <p>
                You may connect your workspace to third-party data integrations (e.g. Stripe,
                Intercom, Mixpanel). It is your responsibility to maintain active accounts with
                those services, and RetentIQ is not liable for data delivery interruptions caused by
                external API failures.
              </p>
            </section>

            {/* Section 3 */}
            <section id="billing" className="space-y-4 scroll-mt-32">
              <h2 className="font-serif text-xl md:text-2xl text-white font-normal">
                3. Subscription & Billing
              </h2>
              <p>
                RetentIQ charges for its Services based on tiered pricing options (Starter Pack,
                Growth Scale). Fees are billed in advance on a recurring monthly or annual schedule
                based on your subscription settings:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong className="text-white">Beta Releases:</strong> During our public beta
                  release phase, we may waive standard fees and grant you complimentary access to
                  the Growth Scale plan. We reserve the right to reinstate standard subscription
                  charges upon 30 days' email notice.
                </li>
                <li>
                  <strong className="text-white">Billing Failures:</strong> If recurring credit card
                  charges fail, we reserve the right to suspend API sync processes and dashboard
                  access within 14 days of the initial failure.
                </li>
              </ul>
            </section>

            {/* Section 4 */}
            <section id="disclaimer" className="space-y-4 scroll-mt-32">
              <h2 className="font-serif text-xl md:text-2xl text-white font-normal">
                4. AI & Machine Learning Disclaimers
              </h2>
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs space-y-2 text-amber-400 font-semibold mb-4">
                <p className="font-bold uppercase tracking-wider text-white">Advisory Use Notice</p>
                <p>
                  All metrics, health index figures (0–100), churn probability distributions, and
                  qualitative action playbooks generated by RetentIQ's LightGBM classifiers and GROQ
                  LLM API are mathematical risk projections.
                </p>
                <p>
                  RetentIQ does not guarantee that these predictions are complete, accurate, or free
                  from error. They are provided solely as advisory factors to assist your Customer
                  Success teams. RetentIQ is not liable for customer churn, cancellation of
                  contracts, loss of revenue, or business disruptions that occur regardless of
                  dashboard scores.
                </p>
              </div>
            </section>

            {/* Section 5 */}
            <section id="license" className="space-y-4 scroll-mt-32">
              <h2 className="font-serif text-xl md:text-2xl text-white font-normal">
                5. Integration License
              </h2>
              <p>
                By connecting integrations, you grant RetentIQ a worldwide, non-exclusive,
                royalty-free license to query, ingest, analyze, and store telemetry logs, billing
                items, and ticket communications.
              </p>
              <p>
                You warrant that you own or have the explicit license to sync this data from your
                customers, and that our automatic API queries comply with the terms of service of
                Mixpanel, Intercom, Stripe, and other third parties.
              </p>
            </section>

            {/* Section 6 */}
            <section id="prohibited" className="space-y-4 scroll-mt-32">
              <h2 className="font-serif text-xl md:text-2xl text-white font-normal">
                6. Prohibited Activities
              </h2>
              <p>You agree not to commit, attempt, or facilitate the following actions:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  Attempt to bypass PostgreSQL row-level security policies or access another
                  organization's database tables.
                </li>
                <li>
                  Reverse-engineer, decompile, or copy the structure of our LightGBM churn risk
                  models or FastAPI prediction pipelines.
                </li>
                <li>Spam our Express backend API endpoints or exceed reasonable rate limits.</li>
              </ul>
            </section>

            {/* Section 7 */}
            <section id="liability" className="space-y-4 scroll-mt-32">
              <h2 className="font-serif text-xl md:text-2xl text-white font-normal">
                7. Limitation of Liability
              </h2>
              <p>
                To the maximum extent permitted by applicable law, RetentIQ and its affiliates,
                directors, employees, or developers shall not be liable for any indirect,
                incidental, special, exemplary, or punitive damages, including but not limited to
                loss of profits, loss of customer accounts, loss of MRR, data breaches, or costs of
                substitute services.
              </p>
              <p>
                Our total cumulative liability under these Terms shall not exceed the total amount
                paid by your organization to RetentIQ in the three (3) months preceding the event
                giving rise to the claim.
              </p>
            </section>

            {/* Section 8 */}
            <section id="termination" className="space-y-4 scroll-mt-32">
              <h2 className="font-serif text-xl md:text-2xl text-white font-normal">
                8. Termination
              </h2>
              <p>
                You can terminate your subscription and delete your account at any time through the
                dashboard settings panel. RetentIQ reserves the right to suspend or terminate
                workspaces that violate these Terms, engage in suspicious API activity, or fail to
                pay subscription dues.
              </p>
              <p>
                Upon termination, all database records, activity streams, and playbooks are marked
                for deletion and deleted within 30 days.
              </p>
            </section>

            {/* Section 9 */}
            <section id="governing" className="space-y-4 scroll-mt-32">
              <h2 className="font-serif text-xl md:text-2xl text-white font-normal">
                9. Governing Law
              </h2>
              <p>
                These Terms and any dispute arising out of or relating to them shall be governed by
                and construed in accordance with the laws of the State of California, without giving
                effect to any choice of law rules.
              </p>
            </section>
          </div>
        </div>
      </main>

      {/* Shared Footer */}
      <Footer />
    </div>
  );
}
