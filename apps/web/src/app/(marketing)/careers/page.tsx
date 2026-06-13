'use client';

import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { motion } from 'framer-motion';
import { Briefcase, ArrowUpRight, Globe, Code, Shield } from 'lucide-react';

export default function CareersPage() {
  const roles = [
    {
      title: 'Senior Full Stack Engineer',
      team: 'Product Engineering',
      location: 'Remote (US/EU/India)',
      type: 'Full-time',
      tech: 'React, Next.js, TypeScript, PostgreSQL',
    },
    {
      title: 'Machine Learning Engineer',
      team: 'Intelligence Engine',
      location: 'Remote (US/EU)',
      type: 'Full-time',
      tech: 'Python, LightGBM, SHAP, FastAPI, Postgres',
    },
    {
      title: 'Customer Success Operations Manager',
      team: 'CS Operations',
      location: 'Remote (US/EU)',
      type: 'Full-time',
      tech: 'CS Playbooks, HubSpot, Intercom integration',
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
            <Briefcase className="w-3.5 h-3.5 text-[#00D4FF]" />
            <span className="text-[10px] font-bold tracking-wider text-[#8B95AB] uppercase">
              Join RetentIQ
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-serif text-3xl sm:text-5xl md:text-6xl font-normal tracking-tight text-[#F8F6F0]"
          >
            Help Us Build the <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-cyan-400 via-[#00D4FF] to-indigo-400 bg-clip-text text-transparent">
              Future of Customer Success
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xs sm:text-sm md:text-base text-slate-400 leading-relaxed max-w-2xl mx-auto"
          >
            We are a fully remote, fast-moving team of product designers, telemetry engineers, and
            machine learning researchers building the core intelligence layers for
            subscription-scale SaaS.
          </motion.p>
        </div>

        {/* Perks Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-20">
          <div className="p-6 rounded-2xl border border-white/[0.06] bg-white/[0.01] flex flex-col gap-3">
            <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 w-11 h-11 flex items-center justify-center">
              <Globe className="w-5 h-5 text-cyan-400" />
            </div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Remote-First Culture
            </h3>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
              Work from anywhere in the world. We coordinate asynchronously, respecting time zones
              and focusing on deliverables.
            </p>
          </div>
          <div className="p-6 rounded-2xl border border-white/[0.06] bg-white/[0.01] flex flex-col gap-3">
            <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 w-11 h-11 flex items-center justify-center">
              <Code className="w-5 h-5 text-cyan-400" />
            </div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Premium Tooling
            </h3>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
              Top-tier hardware and software setups. We provide budget allocations for home offices,
              monitors, and learning books.
            </p>
          </div>
          <div className="p-6 rounded-2xl border border-white/[0.06] bg-white/[0.01] flex flex-col gap-3">
            <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 w-11 h-11 flex items-center justify-center">
              <Shield className="w-5 h-5 text-cyan-400" />
            </div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Healthy Benefits
            </h3>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
              Comprehensive health coverage, wellness stipends, and flexible paid vacation settings
              to support work-life sustainability.
            </p>
          </div>
        </div>

        {/* Roles List */}
        <div className="space-y-6">
          <h2 className="font-serif text-xl sm:text-3xl text-white font-normal mb-8">
            Open Positions
          </h2>

          <div className="space-y-4">
            {roles.map((role, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl border border-white/[0.06] bg-white/[0.015] hover:bg-white/[0.03] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group cursor-pointer"
              >
                <div className="space-y-1.5">
                  <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-cyan-400 transition-colors">
                    {role.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span className="font-semibold">{role.team}</span>
                    <span>&bull;</span>
                    <span>{role.location}</span>
                    <span>&bull;</span>
                    <span className="px-2 py-0.5 rounded bg-white/[0.05] border border-white/[0.08] text-[10px] font-bold uppercase">
                      {role.type}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-mono mt-1">Tech: {role.tech}</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-400 group-hover:translate-x-1 transition-transform self-start sm:self-auto">
                  <span>Apply Now</span>
                  <ArrowUpRight className="w-4 h-4" />
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
