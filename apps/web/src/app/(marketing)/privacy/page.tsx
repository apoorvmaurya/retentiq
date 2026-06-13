'use client';

import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { motion } from 'framer-motion';
import { Eye, ChevronRight } from 'lucide-react';

export default function PrivacyPolicyPage() {
  const sections = [
    { id: 'introduction', title: '1. Introduction' },
    { id: 'data-collected', title: '2. Data We Collect' },
    { id: 'data-processing', title: '3. ML & AI Processing' },
    { id: 'data-sharing', title: '4. Third-Party Services' },
    { id: 'security', title: '5. Multi-Tenant Isolation' },
    { id: 'rights', title: '6. Your GDPR & CCPA Rights' },
    { id: 'retention', title: '7. Data Retention' },
    { id: 'contact', title: '8. Contact Information' },
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
            <Eye className="w-3.5 h-3.5 text-[#00D4FF]" />
            <span className="text-[10px] font-bold tracking-wider text-[#8B95AB] uppercase">
              RetentIQ Legal Framework
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-serif text-4xl md:text-6xl font-normal tracking-tight text-[#F8F6F0]"
          >
            Privacy Policy
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
            <section id="introduction" className="space-y-4 scroll-mt-32">
              <h2 className="font-serif text-xl md:text-2xl text-white font-normal">
                1. Introduction
              </h2>
              <p>
                At RetentIQ (hereafter "RetentIQ", "we", "us", or "our"), safeguarding your
                organizational telemetry and customer relationship data is one of our core
                architectural pillars. RetentIQ operates a state-of-the-art enterprise Customer
                Success (CS) and churn-intelligence monorepo platform.
              </p>
              <p>
                This Privacy Policy explains how RetentIQ collects, processes, encrypts, and retains
                organizational profile data, active customer events, and transactional information.
                When you register a tenant account or connect integrations (such as Stripe,
                Intercom, Mixpanel) to our platform, you consent to the operations described herein.
              </p>
            </section>

            {/* Section 2 */}
            <section id="data-collected" className="space-y-4 scroll-mt-32">
              <h2 className="font-serif text-xl md:text-2xl text-white font-normal">
                2. Data We Collect
              </h2>
              <p>
                To predict qualitative customer churn indexes and construct health scores, our
                platform ingests data through direct API links, webhook dispatches, and manual
                imports:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong className="text-white">Customer Profile Metrics:</strong> Company names,
                  contact emails, signup records, and monthly recurring revenue (MRR) figures
                  associated with your customers.
                </li>
                <li>
                  <strong className="text-white">Behavioral Telemetry Events:</strong> User login
                  counts, application feature adoption logs, and usage trends synced via tools like
                  Mixpanel.
                </li>
                <li>
                  <strong className="text-white">Billing Information:</strong> Payment success
                  histories, invoice failures, and contract renewal deadlines derived from your
                  Stripe integration.
                </li>
                <li>
                  <strong className="text-white">Support Interactions:</strong> Ticket volume
                  tallies, conversation timestamps, and qualitative sentiments synchronized via
                  Intercom or other CRM platforms.
                </li>
                <li>
                  <strong className="text-white">Account Management Info:</strong> Workspace user
                  details, email addresses, password hashes (handled securely via Supabase Auth),
                  and workspace configuration variables.
                </li>
              </ul>
            </section>

            {/* Section 3 */}
            <section id="data-processing" className="space-y-4 scroll-mt-32">
              <h2 className="font-serif text-xl md:text-2xl text-white font-normal">
                3. Machine Learning & AI Processing
              </h2>
              <p>
                RetentIQ uses a hybrid intelligence engine consisting of an analytical machine
                learning module and a qualitative large language model (LLM):
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong className="text-white">Local ML Classifier:</strong> We train a local
                  LightGBM `LGBMClassifier` and compute SHAP (Shapley Additive exPlanations) values
                  on the mathematical distribution of your telemetry properties (e.g. usage trends,
                  support volumes, renewal proximity) to predict numerical churn probabilities. This
                  training runs entirely within isolated compute boundaries.
                </li>
                <li>
                  <strong className="text-white">Groq AI Enrichment:</strong> To enrich numerical
                  data with qualitative summaries, we send temporary, anonymized customer support
                  ticket summaries and telemetry factors to the GROQ API (powered by Llama-3.3
                  models) to generate qualitative risk explanations and suggested playbooks. We
                  enforce strict data policies with Groq to prevent your data from being retained or
                  used to train public LLM models.
                </li>
              </ul>
            </section>

            {/* Section 4 */}
            <section id="data-sharing" className="space-y-4 scroll-mt-32">
              <h2 className="font-serif text-xl md:text-2xl text-white font-normal">
                4. Third-Party Services & Integrations
              </h2>
              <p>
                RetentIQ does not sell or lease your customer success details to third parties. We
                transfer data to integrations only when authorized by you:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong className="text-white">Stripe, Mixpanel, and Intercom:</strong> We
                  retrieve telemetry and payment histories under credentials you securely upload to
                  your dashboard. This data remains strictly scoped within your workspace.
                </li>
                <li>
                  <strong className="text-white">Slack and SMTP Channels:</strong> Alerts and CS
                  notification playbooks are dispatched to your Slack workspace or email channels
                  (via SMTP configuration) based on thresholds you manage.
                </li>
              </ul>
            </section>

            {/* Section 5 */}
            <section id="security" className="space-y-4 scroll-mt-32">
              <h2 className="font-serif text-xl md:text-2xl text-white font-normal">
                5. Multi-Tenant Data Isolation
              </h2>
              <p>
                RetentIQ is engineered on a secure multi-tenant architecture. We utilize{' '}
                <strong className="text-white">Supabase PostgreSQL Row-Level Security (RLS)</strong>{' '}
                policies. Every table containing customer data, health scores, and playbooks is
                protected by strict policies that prevent users from other organizations from
                accessing or querying your data.
              </p>
              <p>
                All data transfers are encrypted in transit via TLS 1.3, and database volumes are
                encrypted at rest using AES-256 standard encryption keys.
              </p>
            </section>

            {/* Section 6 */}
            <section id="rights" className="space-y-4 scroll-mt-32">
              <h2 className="font-serif text-xl md:text-2xl text-white font-normal">
                6. Your GDPR & CCPA Rights
              </h2>
              <p>
                If your organization is operating within the European Economic Area (EEA) or
                California, you are entitled to specific regulatory rights regarding your data:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong className="text-white">Right to Access:</strong> You can download or
                  request reports of all telemetry records and metrics we store on behalf of your
                  workspace.
                </li>
                <li>
                  <strong className="text-white">Right to Rectification:</strong> You can correct
                  incomplete profiles or request database overrides.
                </li>
                <li>
                  <strong className="text-white">Right to Erasure (Right to be Forgotten):</strong>{' '}
                  You can trigger a full deletion of your workspace database tenancy, which
                  immediately wipes all customer events, health records, and AI summaries.
                </li>
                <li>
                  <strong className="text-white">Opt-out of Profiling:</strong> You can turn off
                  automatic LLM-based playbooks and scoring parameters in your settings panel.
                </li>
              </ul>
            </section>

            {/* Section 7 */}
            <section id="retention" className="space-y-4 scroll-mt-32">
              <h2 className="font-serif text-xl md:text-2xl text-white font-normal">
                7. Data Retention & Deletion
              </h2>
              <p>
                We retain client telemetry and customer logs only as long as your workspace account
                is active. If a workspace remains inactive for more than 180 consecutive days or is
                explicitly closed, all associated tables, health histories, and configuration values
                are purged permanently from our production databases.
              </p>
            </section>

            {/* Section 8 */}
            <section id="contact" className="space-y-4 scroll-mt-32">
              <h2 className="font-serif text-xl md:text-2xl text-white font-normal">
                8. Contact Information
              </h2>
              <p>
                For questions regarding this Privacy Policy, compliance inquiries, or to execute a
                data deletion request, please reach out to our legal compliance group:
              </p>
              <div className="p-4 bg-white/[0.02] border border-white/[0.04] rounded-xl text-xs space-y-1 font-semibold text-slate-400">
                <p className="text-white font-bold">RetentIQ Inc. Legal Operations</p>
                <p>Email: privacy@retentiq.io</p>
                <p>Address: 100 Pine Street, San Francisco, CA 94111</p>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Shared Footer */}
      <Footer />
    </div>
  );
}
