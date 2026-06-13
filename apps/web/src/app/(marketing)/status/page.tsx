'use client';

import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { motion } from 'framer-motion';
import { Activity, ShieldAlert, CheckCircle, Database, Cpu, Globe } from 'lucide-react';

export default function StatusPage() {
  const services = [
    {
      name: 'Core Web Platform',
      status: 'Operational',
      uptime: '100%',
      icon: <Globe className="w-5 h-5 text-emerald-400" />,
    },
    {
      name: 'Express REST API',
      status: 'Operational',
      uptime: '99.98%',
      icon: <Cpu className="w-5 h-5 text-emerald-400" />,
    },
    {
      name: 'AI Microservice (FastAPI)',
      status: 'Operational',
      uptime: '99.95%',
      icon: <Cpu className="w-5 h-5 text-emerald-400" />,
    },
    {
      name: 'Supabase Database Layer',
      status: 'Operational',
      uptime: '100%',
      icon: <Database className="w-5 h-5 text-emerald-400" />,
    },
  ];

  const logs = [
    {
      date: 'June 12, 2026',
      time: '14:22 UTC',
      message:
        'Completed database indexing upgrades on health_scores table. Performance improved by 350ms.',
    },
    {
      date: 'June 08, 2026',
      time: '09:05 UTC',
      message:
        'Fully mitigated transient rate limits on Groq API completions by implementing backoff retries.',
    },
    {
      date: 'June 05, 2026',
      time: '11:40 UTC',
      message: 'All systems operational. Monorepo beta release is deployed.',
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
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/[0.05] border border-emerald-500/[0.15] backdrop-blur-md"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-bold tracking-wider text-emerald-400 uppercase">
              All Systems Operational
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-serif text-3xl sm:text-5xl font-normal tracking-tight text-[#F8F6F0]"
          >
            Status Logs
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto"
          >
            Real-time systems operational statuses, active services performance monitoring, and
            chronological maintenance logs.
          </motion.p>
        </div>

        {/* Services Status List */}
        <div className="p-6 sm:p-8 rounded-2xl border border-white/[0.06] bg-white/[0.015] backdrop-blur-md space-y-6 mb-12">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/[0.06] pb-3">
            Active Services Uptime
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {services.map((s, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-white/[0.04] bg-white/[0.01] flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                    {s.icon}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      {s.name}
                    </h3>
                    <span className="text-[10px] text-slate-400">Uptime: {s.uptime}</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded text-[9px] font-bold uppercase shrink-0 select-none">
                  {s.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Log History */}
        <div className="p-6 sm:p-8 rounded-2xl border border-white/[0.06] bg-white/[0.015] backdrop-blur-md space-y-6">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/[0.06] pb-3">
            System Incident Log History
          </h2>
          <div className="space-y-6">
            {logs.map((log, idx) => (
              <div key={idx} className="flex gap-4 items-start relative pl-4 sm:pl-6">
                <div className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-cyan-400" />
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 tracking-wider">
                    <span>{log.date}</span>
                    <span>&bull;</span>
                    <span className="font-mono text-cyan-400">{log.time}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">{log.message}</p>
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
