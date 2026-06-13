'use client';

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, ChevronDown, ChevronUp, Bot, Settings, Key } from 'lucide-react';

export default function HelpCenterPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      icon: <Bot className="w-5 h-5 text-cyan-400" />,
      question: 'How does the predictive health scoring work?',
      answer:
        'Our service pulls customer engagement indicators (WAU ratios, inactivity, invoice statuses, support sentiment) and runs them through a custom LightGBM model. This predicts churn probability (0 to 1), which is then normalized against your organization weights config to yield the final 0-100 Customer Health Index.',
    },
    {
      icon: <Settings className="w-5 h-5 text-cyan-400" />,
      question: 'Which integrations does RetentIQ support?',
      answer:
        'RetentIQ natively integrates with Stripe (billing telemetry, contraction events, invoices), Intercom (support logs, conversation sentiment), and Segment/Mixpanel (engagement actions, page views, click telemetry). Integrations can be connected via oauth or public webhooks.',
    },
    {
      icon: <Key className="w-5 h-5 text-cyan-400" />,
      question: 'How do row-level security boundaries work?',
      answer:
        'We use PostgreSQL Row-Level Security (RLS) on all data tables containing organization metadata. Backend transactions use authenticated user JWT claims to resolve queries. This guarantees that your customer data is mathematically isolated and can never leak to other organizations.',
    },
    {
      icon: <HelpCircle className="w-5 h-5 text-cyan-400" />,
      question: 'Do you offer a free plan or trial?',
      answer:
        'Yes! RetentIQ is currently in public beta. All registered organizations get full, complimentary access to the premium Growth tier features, including GROQ-powered account playbooks, Slack integrations, and webhook streams.',
    },
  ];

  return (
    <div className="bg-[#0A0F1E] text-[#F8F6F0] min-h-screen overflow-x-hidden font-sans selection:bg-[#00D4FF]/20 selection:text-[#00D4FF]">
      {/* Decorative gradient meshes */}
      <div className="absolute top-[-10%] left-[10%] w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] rounded-full bg-indigo-950/20 blur-[80px] sm:blur-[120px] pointer-events-none" />
      <div className="absolute top-[20%] right-[-10%] w-[250px] sm:w-[500px] h-[250px] sm:h-[500px] rounded-full bg-[#00D4FF]/5 blur-[100px] sm:blur-[150px] pointer-events-none" />

      <Navbar />

      <main className="relative pt-32 pb-20 px-4 md:px-8 max-w-4xl mx-auto z-10">
        {/* Header */}
        <div className="text-center space-y-6 max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] backdrop-blur-md"
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#00D4FF]" />
            <span className="text-[10px] font-bold tracking-wider text-[#8B95AB] uppercase">
              Help Center & FAQ
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-serif text-3xl sm:text-5xl font-normal tracking-tight text-[#F8F6F0]"
          >
            How Can We Help?
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto"
          >
            Find quick answers to common telemetry onboarding questions, database configurations,
            and account pricing questions.
          </motion.p>
        </div>

        {/* FAQ Accordion */}
        <div className="space-y-4 max-w-3xl mx-auto">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.015] backdrop-blur-md overflow-hidden transition-colors"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full p-5 flex items-center justify-between gap-4 text-left hover:bg-white/[0.01] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 shrink-0">
                      {faq.icon}
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                      {faq.question}
                    </span>
                  </div>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-[#00D4FF] shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                    >
                      <div className="px-5 pb-5 pt-1 text-slate-400 text-xs sm:text-sm border-t border-white/[0.03] leading-relaxed">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </main>

      <Footer />
    </div>
  );
}
