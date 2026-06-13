'use client';

import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { motion } from 'framer-motion';
import { Shield, ChevronRight } from 'lucide-react';

export default function SecurityPage() {
  const sections = [
    { id: 'architecture', title: '1. Security Architecture' },
    { id: 'multitenancy', title: '2. Multi-Tenancy & RLS' },
    { id: 'encryption', title: '3. Data Encryption Standards' },
    { id: 'secrets', title: '4. Secrets & API Keys' },
    { id: 'ai-privacy', title: '5. Groq LLM Safeguards' },
    { id: 'hosting', title: '6. Hosting Infrastructure' },
    { id: 'incident', title: '7. Incident Management' },
    { id: 'compliance', title: '8. Audits & Compliance' },
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
            <Shield className="w-3.5 h-3.5 text-[#00D4FF]" />
            <span className="text-[10px] font-bold tracking-wider text-[#8B95AB] uppercase">
              RetentIQ Trust & Security
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-serif text-4xl md:text-6xl font-normal tracking-tight text-[#F8F6F0]"
          >
            Security Operations
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
            <section id="architecture" className="space-y-4 scroll-mt-32">
              <h2 className="font-serif text-xl md:text-2xl text-white font-normal">
                1. Security Architecture
              </h2>
              <p>
                RetentIQ is built from the ground up to ensure data protection, compliance, and
                isolation. Our platform aggregates customer success indicators to predict churn
                metrics, meaning we process critical business records.
              </p>
              <p>
                Our system uses a defense-in-depth model, enforcing access controls, network
                segregation, background checks, and encryption keys across all full-stack
                operations.
              </p>
            </section>

            {/* Section 2 */}
            <section id="multitenancy" className="space-y-4 scroll-mt-32">
              <h2 className="font-serif text-xl md:text-2xl text-white font-normal">
                2. Multi-Tenancy & RLS Isolation
              </h2>
              <p>
                Database isolation is the foundation of our multi-tenant SaaS. RetentIQ utilizes{' '}
                <strong className="text-white">Supabase PostgreSQL Row-Level Security (RLS)</strong>
                .
              </p>
              <p>
                Every table in our database containing sensitive parameters (including workspace
                definitions, customer health scores, playbooks, and events) is bound to strict RLS
                policies:
              </p>
              <div className="p-4 bg-white/[0.02] border border-white/[0.04] rounded-xl text-xs font-mono text-cyan-400">
                CREATE POLICY tenant_isolation_policy ON customers <br />
                &nbsp;&nbsp;FOR ALL <br />
                &nbsp;&nbsp;TO authenticated <br />
                &nbsp;&nbsp;USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));
              </div>
              <p>
                This ensures that database queries from any tenant account are strictly scoped to
                that tenant's organization, preventing cross-tenant data leaks.
              </p>
            </section>

            {/* Section 3 */}
            <section id="encryption" className="space-y-4 scroll-mt-32">
              <h2 className="font-serif text-xl md:text-2xl text-white font-normal">
                3. Data Encryption Standards
              </h2>
              <p>We protect data during both transit and storage phases:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong className="text-white">Data in Transit:</strong> All web requests to our
                  Next.js standalone portal, Express backend, or FastAPI microservice are protected
                  using TLS 1.3 encryption. Unencrypted connections (HTTP) are blocked and
                  redirected to secure sockets.
                </li>
                <li>
                  <strong className="text-white">Data at Rest:</strong> Database backups and block
                  storage volumes are encrypted using military-grade AES-256 standards. Database
                  passwords and user logins are processed securely using bcrypt hashes.
                </li>
              </ul>
            </section>

            {/* Section 4 */}
            <section id="secrets" className="space-y-4 scroll-mt-32">
              <h2 className="font-serif text-xl md:text-2xl text-white font-normal">
                4. Secrets & API Keys Protection
              </h2>
              <p>
                To aggregate usage indicators, RetentIQ requires API credentials for Mixpanel,
                Intercom, and Stripe.
              </p>
              <p>
                All workspace credentials and third-party secrets are encrypted before database
                storage using database-level secret keys. These keys are held in environment
                variables, and the database only exposes raw credentials through stored routines
                that are tightly restricted.
              </p>
            </section>

            {/* Section 5 */}
            <section id="ai-privacy" className="space-y-4 scroll-mt-32">
              <h2 className="font-serif text-xl md:text-2xl text-white font-normal">
                5. Groq LLM Safeguards
              </h2>
              <p>
                To generate qualitative risk playbooks, RetentIQ leverages the GROQ API (powered by
                Llama-3.3).
              </p>
              <p>To protect privacy during this processing:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  We do not transmit personal customer details (such as names, addresses, or phone
                  numbers) to the LLM. We only send structured numerical metrics and anonymized
                  ticket texts.
                </li>
                <li>
                  Our enterprise service level agreement enforces zero-data-retention on Groq's
                  APIs, meaning they do not store, cache, or use our prompts for training public
                  models.
                </li>
              </ul>
            </section>

            {/* Section 6 */}
            <section id="hosting" className="space-y-4 scroll-mt-32">
              <h2 className="font-serif text-xl md:text-2xl text-white font-normal">
                6. Hosting Infrastructure
              </h2>
              <p>
                Our production instances are hosted in AWS data centers through Supabase, Vercel,
                and modern container cloud platforms:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  Data centers feature 24/7 security staff, biometric access controls, and video
                  surveillance.
                </li>
                <li>
                  Compute boundaries are separated into private virtual clouds (VPCs) with strict
                  security groups and firewalls.
                </li>
              </ul>
            </section>

            {/* Section 7 */}
            <section id="incident" className="space-y-4 scroll-mt-32">
              <h2 className="font-serif text-xl md:text-2xl text-white font-normal">
                7. Incident Response Protocol
              </h2>
              <p>In the event of a security breach or data incident:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  Our incident response group will isolate affected resources, verify log integrity,
                  and start forensic analysis within 2 hours of a trigger.
                </li>
                <li>
                  Affected workspaces and tenant admins will be notified via email within 72 hours
                  of incident confirmation, in compliance with GDPR regulations.
                </li>
              </ul>
            </section>

            {/* Section 8 */}
            <section id="compliance" className="space-y-4 scroll-mt-32">
              <h2 className="font-serif text-xl md:text-2xl text-white font-normal">
                8. Security Audits & Compliance
              </h2>
              <p>
                We are actively pursuing SOC 2 Type II certification. Our repository code is
                regularly scanned for dependency vulnerabilities, and we conduct biannual external
                penetration tests.
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
