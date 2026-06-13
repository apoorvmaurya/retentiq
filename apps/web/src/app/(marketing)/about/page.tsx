'use client';

import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { motion } from 'framer-motion';
import { Brain, Target, Users, Landmark } from 'lucide-react';

export default function AboutPage() {
  const values = [
    {
      icon: <Target className="w-6 h-6 text-cyan-400" />,
      title: 'Actionable Intelligence',
      description:
        'We turn complex telemetry streams into concrete Customer Success playbooks, not just dashboards.',
    },
    {
      icon: <Brain className="w-6 h-6 text-cyan-400" />,
      title: 'Predictive Proactivity',
      description:
        'Identifying account risk 30–60 days before contract renewals to prevent emergency customer firefighting.',
    },
    {
      icon: <Users className="w-6 h-6 text-cyan-400" />,
      title: 'Customer-Centricity',
      description:
        'Empowering customer success operations with mathematics and generative language assistance.',
    },
    {
      icon: <Landmark className="w-6 h-6 text-cyan-400" />,
      title: 'Security & Trust',
      description:
        'Enforcing strict PostgreSQL row-level security boundaries to protect enterprise data.',
    },
  ];

  return (
    <div className="bg-[#0A0F1E] text-[#F8F6F0] min-h-screen overflow-x-hidden font-sans selection:bg-[#00D4FF]/20 selection:text-[#00D4FF]">
      {/* Decorative gradient meshes */}
      <div className="absolute top-[-10%] left-[10%] w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] rounded-full bg-indigo-950/20 blur-[80px] sm:blur-[120px] pointer-events-none" />
      <div className="absolute top-[20%] right-[-10%] w-[250px] sm:w-[500px] h-[250px] sm:h-[500px] rounded-full bg-[#00D4FF]/5 blur-[100px] sm:blur-[150px] pointer-events-none" />

      <Navbar />

      <main className="relative pt-32 pb-20 px-4 md:px-8 max-w-5xl mx-auto z-10">
        {/* Hero Section */}
        <div className="text-center space-y-6 max-w-3xl mx-auto mb-20">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] backdrop-blur-md"
          >
            <Brain className="w-3.5 h-3.5 text-[#00D4FF]" />
            <span className="text-[10px] font-bold tracking-wider text-[#8B95AB] uppercase">
              Meet RetentIQ
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-serif text-3xl sm:text-5xl md:text-6xl font-normal tracking-tight text-[#F8F6F0]"
          >
            Our Mission is to <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-cyan-400 via-[#00D4FF] to-indigo-400 bg-clip-text text-transparent">
              Prevent Churn Intelligently
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xs sm:text-sm md:text-base text-slate-400 leading-relaxed max-w-2xl mx-auto"
          >
            Founded in 2026, RetentIQ empowers enterprise B2B SaaS Customer Success teams with
            ML-driven telemetry analysis and generative AI account playbooks to spot risk before it
            turns into contract terminations.
          </motion.p>
        </div>

        {/* Story Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center mb-20">
          <div className="space-y-4">
            <h2 className="font-serif text-xl sm:text-3xl text-white font-normal">
              The RetentIQ Story
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
              We started with a simple observation: SaaS customer success managers spent all day
              firefighting accounts that had already decided to churn. Standard CRM analytics and
              simple telemetry averages didn't give warning signals early enough.
            </p>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
              By engineering a platform that combines real-time event ingestion (Stripe, Intercom,
              Mixpanel, Segment) with mathematical LightGBM classifiers and SHAP local
              explainability, we help teams act 30–60 days before contract expirations.
            </p>
          </div>
          <div className="relative p-6 sm:p-8 rounded-2xl border border-white/[0.06] bg-white/[0.015] backdrop-blur-md">
            <div className="space-y-4 text-center">
              <span className="text-3xl sm:text-4xl md:text-5xl font-serif text-cyan-400 block font-normal">
                30-60 Days
              </span>
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Early Risk Warning Window
              </span>
              <div className="h-px bg-white/[0.06] my-4" />
              <p className="text-slate-500 text-[10px] sm:text-xs">
                Driven by LightGBM machine learning models and GROQ LLM pipeline explanations.
              </p>
            </div>
          </div>
        </div>

        {/* Values Grid */}
        <div className="space-y-12">
          <div className="text-center space-y-2">
            <h3 className="font-serif text-xl sm:text-3xl text-white font-normal">
              Our Core Pillars
            </h3>
            <p className="text-xs sm:text-sm text-slate-400">
              The foundational ideas directing our development cycles and software designs.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {values.map((v, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl border border-white/[0.06] bg-white/[0.01] hover:bg-white/[0.02] transition-colors flex gap-4"
              >
                <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 shrink-0 h-11 w-11 flex items-center justify-center">
                  {v.icon}
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                    {v.title}
                  </h4>
                  <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                    {v.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
