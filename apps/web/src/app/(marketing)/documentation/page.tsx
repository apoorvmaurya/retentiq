'use client';

import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { motion } from 'framer-motion';
import { FileText, Terminal, Layers, RefreshCw } from 'lucide-react';

export default function DocumentationPage() {
  return (
    <div className="bg-[#0A0F1E] text-[#F8F6F0] min-h-screen overflow-x-hidden font-sans selection:bg-[#00D4FF]/20 selection:text-[#00D4FF]">
      {/* Decorative gradient meshes */}
      <div className="absolute top-[-10%] left-[10%] w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] rounded-full bg-indigo-950/20 blur-[80px] sm:blur-[120px] pointer-events-none" />
      <div className="absolute top-[20%] right-[-10%] w-[250px] sm:w-[500px] h-[250px] sm:h-[500px] rounded-full bg-[#00D4FF]/5 blur-[100px] sm:blur-[150px] pointer-events-none" />

      <Navbar />

      <main className="relative pt-24 pb-16 sm:pt-32 sm:pb-20 px-4 md:px-8 max-w-5xl mx-auto z-10">
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
              RetentIQ Platform Documentation
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-serif text-3xl sm:text-5xl font-normal tracking-tight text-[#F8F6F0]"
          >
            Developer Guide & APIs
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xs sm:text-sm text-slate-400 font-semibold"
          >
            Last Updated: June 13, 2026 &bull; Version 1.0.0-Beta
          </motion.p>
        </div>

        {/* Content Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 items-start">
          {/* Documentation Sections */}
          <div className="lg:col-span-12 bg-white/[0.015] border border-white/[0.06] rounded-2xl p-4 sm:p-6 md:p-10 backdrop-blur-md shadow-2xl space-y-10 text-slate-400 leading-relaxed font-sans text-xs md:text-sm">
            {/* Section 1 */}
            <section id="getting-started" className="space-y-4">
              <div className="flex items-center gap-2.5">
                <Terminal className="w-5 h-5 text-cyan-400 shrink-0" />
                <h2 className="font-serif text-lg sm:text-2xl text-white font-normal">
                  1. Quick Start Ingestion
                </h2>
              </div>
              <p>
                To ingest customer actions and telemetry logs into RetentIQ, send a POST request
                containing telemetry data in JSON payload format to our events endpoint.
              </p>
              <div className="p-4 bg-white/[0.02] border border-white/[0.04] rounded-xl text-[10px] sm:text-xs font-mono text-cyan-400 overflow-x-auto">
                POST /api/events/ingest <br />
                Authorization: Bearer &lt;YOUR_API_KEY&gt; <br />
                Content-Type: application/json <br />
                <br />
                {JSON.stringify(
                  {
                    events: [
                      {
                        customer_id: 'customer-uuid-1234',
                        event_type: 'feature_use',
                        source: 'web',
                        occurred_at: new Date().toISOString(),
                        payload: { feature: 'dashboard_export' },
                      },
                    ],
                  },
                  null,
                  2,
                )}
              </div>
            </section>

            {/* Section 2 */}
            <section id="scoring-weights" className="space-y-4">
              <div className="flex items-center gap-2.5">
                <Layers className="w-5 h-5 text-cyan-400 shrink-0" />
                <h2 className="font-serif text-lg sm:text-2xl text-white font-normal">
                  2. Churn Risk Engine Calculations
                </h2>
              </div>
              <p>RetentIQ uses a dual scoring pipeline:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong className="text-white">LightGBM Machine Learning Classifier:</strong>{' '}
                  Trained on historical customer data to calculate a raw probability of churn (0.0
                  to 1.0).
                </li>
                <li>
                  <strong className="text-white">Rule-based weights alignment:</strong> The platform
                  blends this probability with tenant-configured weight percentages (defined in the
                  Score Weights setting) to compute the final 0–100 health index.
                </li>
              </ul>
            </section>

            {/* Section 3 */}
            <section id="webhooks" className="space-y-4">
              <div className="flex items-center gap-2.5">
                <RefreshCw className="w-5 h-5 text-cyan-400 shrink-0" />
                <h2 className="font-serif text-lg sm:text-2xl text-white font-normal">
                  3. Inbound Webhooks Sync
                </h2>
              </div>
              <p>
                Configure Segment, HubSpot, Salesforce, Stripe, and Intercom webhooks to route
                customer activity directly to RetentIQ. All endpoints are mapped to path format:
              </p>
              <div className="p-4 bg-white/[0.02] border border-white/[0.04] rounded-xl text-[10px] sm:text-xs font-mono text-cyan-400">
                https://api.retentiq.com/api/integrations/&lt;provider&gt;/webhook
              </div>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
