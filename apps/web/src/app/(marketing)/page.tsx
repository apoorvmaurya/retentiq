'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  motion,
  useScroll,
  useTransform,
  useInView,
  AnimatePresence,
  animate,
  useMotionValueEvent,
} from 'framer-motion';
import {
  ArrowRight,
  Check,
  Activity,
  Brain,
  MessageSquare,
  Slack,
  Mail,
  Layers,
  ArrowUpRight,
  Play,
  TrendingDown,
  Sparkles,
} from 'lucide-react';
import Navbar from '@/components/Navbar';

// --- CUSTOM COUNTER COMPONENT ---
function Counter({
  value,
  suffix = '',
  duration = 1.5,
}: {
  value: number;
  suffix?: string;
  duration?: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (isInView) {
      const controls = animate(0, value, {
        duration,
        ease: 'easeOut',
        onUpdate: (latest) => setCount(Math.round(latest)),
      });
      return () => controls.stop();
    }
  }, [isInView, value, duration]);

  return (
    <span ref={ref}>
      {count}
      {suffix}
    </span>
  );
}

// --- SPOTLIGHT CARD COMPONENT ---
function SpotlightCard({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setCoords({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative overflow-hidden rounded-2xl border border-white/[0.08] transition-colors duration-300 ${className}`}
      style={{
        background: isHovered
          ? `radial-gradient(circle 220px at ${coords.x}px ${coords.y}px, rgba(0, 212, 255, 0.08), transparent 70%), rgba(255,255,255,0.015)`
          : 'rgba(255,255,255,0.015)',
      }}
    >
      {children}
    </div>
  );
}

// --- TIMELINE PROGRESS NODE COMPONENT ---
function TimelineNode({ index, progress }: { index: number; progress: any }) {
  const threshold = index === 0 ? 0.05 : index === 1 ? 0.33 : index === 2 ? 0.66 : 0.9;
  const [active, setActive] = useState(false);

  useMotionValueEvent(progress, 'change', (latest: number) => {
    setActive(latest >= threshold);
  });

  return (
    <div className="relative flex items-center justify-center">
      <motion.div
        animate={{
          scale: active ? 1.25 : 1,
          backgroundColor: active ? 'rgba(0, 212, 255, 1)' : 'rgba(10, 15, 30, 1)',
          borderColor: active ? 'rgba(0, 212, 255, 1)' : 'rgba(255, 255, 255, 0.12)',
          boxShadow: active ? '0 0 12px rgba(0, 212, 255, 0.6)' : 'none',
        }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="w-3.5 h-3.5 rounded-full border-2 bg-[#0A0F1E] z-10 cursor-pointer"
      />
      {active && (
        <span className="absolute w-6 h-6 rounded-full bg-[#00D4FF]/20 animate-ping pointer-events-none z-0" />
      )}
    </div>
  );
}

export default function MarketingPage() {
  const [tickerIndex, setTickerIndex] = useState(0);
  const tickerItems = [
    '~8% avg monthly B2B churn',
    '$1.6B lost annually in SaaS',
    '68% of teams miss the warning signals',
  ];

  // Stat ticker timing
  useEffect(() => {
    const timer = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % tickerItems.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  // Parallax scroll targets
  const heroRef = useRef(null);
  const { scrollYProgress: heroScrollProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const parallaxY = useTransform(heroScrollProgress, [0, 1], [-20, 20]);

  // How it works scroll drawing path
  const stepsRef = useRef(null);
  const { scrollYProgress: stepsScrollProgress } = useScroll({
    target: stepsRef,
    offset: ['start end', 'end center'],
  });

  // Pricing settings
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');

  return (
    <div className="bg-[#0A0F1E] text-[#F8F6F0] min-h-screen overflow-x-hidden font-sans selection:bg-[#00D4FF]/20 selection:text-[#00D4FF]">
      {/* Decorative gradient meshes */}
      <div className="absolute top-[-10%] left-[10%] w-[600px] h-[600px] rounded-full bg-indigo-950/20 blur-[120px] pointer-events-none" />
      <div className="absolute top-[20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#00D4FF]/5 blur-[150px] pointer-events-none" />

      {/* Shared Navbar */}
      <Navbar />

      {/* 1. HERO SECTION */}
      <section
        id="about"
        ref={heroRef}
        className="relative pt-32 pb-20 md:pt-40 md:pb-32 px-4 md:px-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center scroll-mt-24"
      >
        <div className="lg:col-span-7 space-y-8 text-left z-10">
          {/* Tag */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] backdrop-blur-md"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#00D4FF] animate-pulse" />
            <span className="text-[11px] font-bold tracking-wider text-[#8B95AB] uppercase">
              Next-Gen Customer Intelligence
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="font-serif text-5xl md:text-7xl font-normal leading-[1.05] tracking-[-1.5px] text-[#F8F6F0]"
          >
            Stop losing customers you <br className="hidden md:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00D4FF] via-cyan-400 to-[#F8F6F0] italic">
              haven't met yet.
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-base md:text-lg text-[#8B95AB] leading-relaxed max-w-xl"
          >
            RetentIQ spots churn risk 30–60 days before it happens by aggregating usage metrics,
            payment patterns, and tickets. Keep the revenue you've already earned.
          </motion.p>

          {/* Ticker */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="h-8 flex items-center"
          >
            <AnimatePresence mode="wait">
              <motion.span
                key={tickerIndex}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.4 }}
                className="text-xs font-bold uppercase tracking-wider text-[#00D4FF] flex items-center gap-2"
              >
                <TrendingDown className="w-4 h-4" />
                {tickerItems[tickerIndex]}
              </motion.span>
            </AnimatePresence>
          </motion.div>

          {/* Action buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="flex flex-wrap gap-4 pt-4"
          >
            <a
              href="/dashboard"
              className="px-6 py-3 rounded-full bg-[#00D4FF] hover:bg-[#00D4FF]/90 text-[#0A0F1E] font-bold text-xs tracking-wider uppercase transition-all shadow-[0_4px_20px_rgba(0,212,255,0.25)] flex items-center gap-2 group relative overflow-hidden"
            >
              Start Free{' '}
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </a>
            <button
              onClick={() => {
                const element = document.getElementById('how-it-works');
                if (element) element.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-6 py-3 rounded-full bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.08] text-[#F8F6F0] font-bold text-xs tracking-wider uppercase transition-all flex items-center gap-2"
            >
              See a demo <Play className="w-3 h-3 text-[#8B95AB]" />
            </button>
          </motion.div>
        </div>

        {/* Dashboard Mockup card (Right side) */}
        <motion.div
          style={{ y: parallaxY }}
          className="lg:col-span-5 relative z-10 hidden lg:block"
        >
          <div className="rounded-2xl border border-white/[0.08] bg-[#0c1224] p-6 shadow-[0_24px_50px_rgba(0,0,0,0.6)] flex flex-col gap-6 relative overflow-hidden">
            {/* Gloss reflection overlay */}
            <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-gradient-to-tr from-transparent via-white/[0.015] to-transparent rotate-45 pointer-events-none" />

            {/* Mock Header */}
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500/80" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8B95AB]">
                Health Score Engine
              </span>
            </div>

            {/* Gauge */}
            <div className="flex items-center gap-6 p-4 rounded-xl bg-white/[0.01] border border-white/[0.03]">
              <div className="w-16 h-16 rounded-full border-4 border-white/[0.05] flex items-center justify-center relative">
                {/* Simulated circle border color */}
                <div className="absolute inset-0 rounded-full border-4 border-[#00D4FF] border-r-transparent animate-spin-slow" />
                <span className="text-lg font-black text-[#F8F6F0]">78</span>
              </div>
              <div>
                <p className="text-xs font-bold text-[#F8F6F0]">System health warning</p>
                <p className="text-[10px] text-[#8B95AB] mt-0.5">
                  3 accounts at critical risk index
                </p>
              </div>
            </div>

            {/* Rows */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <div>
                  <p className="text-xs font-bold text-[#F8F6F0]">CloudForge Inc.</p>
                  <p className="text-[9px] text-[#8B95AB]">Basic Plan • $99/mo</p>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-[9px] font-bold text-rose-400 uppercase">
                  Critical
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <div>
                  <p className="text-xs font-bold text-[#F8F6F0]">NexaPlatform</p>
                  <p className="text-[9px] text-[#8B95AB]">Pro Plan • $499/mo</p>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[9px] font-bold text-amber-400 uppercase">
                  Medium
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <div>
                  <p className="text-xs font-bold text-[#F8F6F0]">DeltaLogic</p>
                  <p className="text-[9px] text-[#8B95AB]">Enterprise • $2,499/mo</p>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-bold text-emerald-400 uppercase">
                  Low
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* 2. HOW IT WORKS SECTION */}
      <section
        id="how-it-works"
        ref={stepsRef}
        className="py-20 md:py-32 relative max-w-7xl mx-auto px-4 md:px-8 border-t border-white/[0.04] scroll-mt-24"
      >
        <div className="text-center max-w-xl mx-auto mb-16 md:mb-24 space-y-4">
          <span className="text-[10px] text-[#00D4FF] font-bold uppercase tracking-widest block">
            Operation Playbook
          </span>
          <h2 className="font-serif text-4xl md:text-5xl font-normal leading-none tracking-[-1px] text-[#F8F6F0]">
            Four steps from signal to saved.
          </h2>
        </div>

        {/* Step cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-6 relative pl-10 md:pl-0">
          {/* Desktop Horizontal Timeline Track */}
          <div className="absolute top-[39px] left-[12.5%] right-[12.5%] h-[2px] bg-white/[0.04] hidden md:block z-0">
            <motion.div
              style={{ scaleX: stepsScrollProgress, originX: 0 }}
              className="w-full h-full bg-gradient-to-r from-[#00D4FF] via-cyan-400 to-indigo-500 shadow-[0_0_8px_rgba(0,212,255,0.6)]"
            />
          </div>

          {/* Desktop Timeline Nodes */}
          <div className="absolute top-[39px] left-[12.5%] right-[12.5%] hidden md:flex justify-between items-center -translate-y-1/2 pointer-events-none z-10">
            {[0, 1, 2, 3].map((idx) => (
              <div key={idx} className="relative flex items-center justify-center -translate-x-1/2">
                <TimelineNode index={idx} progress={stepsScrollProgress} />
              </div>
            ))}
          </div>

          {/* Mobile Vertical Timeline Track */}
          <div className="absolute left-[18px] top-[40px] bottom-[40px] w-[2px] bg-white/[0.04] md:hidden z-0">
            <motion.div
              style={{ scaleY: stepsScrollProgress, originY: 0 }}
              className="w-full h-full bg-gradient-to-b from-[#00D4FF] via-cyan-400 to-indigo-500 shadow-[0_0_8px_rgba(0,212,255,0.6)]"
            />
          </div>

          {/* Cards */}
          {[
            {
              step: '01',
              title: 'Ingest Signals',
              desc: 'Sync billing alerts, support ticket activity, and application logs.',
            },
            {
              step: '02',
              title: 'ML Health Score',
              desc: 'Our FastAPI predictive engine constructs an organic health index.',
            },
            {
              step: '03',
              title: 'Early Alert',
              desc: 'Slack notifications trigger immediately when scores drop below bounds.',
            },
            {
              step: '04',
              title: 'Playbook',
              desc: 'Run targeted CSM outreaches with custom recommendations.',
            },
          ].map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: idx * 0.15 }}
              className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 flex flex-col gap-4 relative z-10 backdrop-blur-sm shadow-xl"
            >
              {/* Mobile Timeline Node */}
              <div className="absolute left-[-22px] top-[39px] -translate-x-1/2 -translate-y-1/2 md:hidden z-20">
                <TimelineNode index={idx} progress={stepsScrollProgress} />
              </div>

              <span className="font-serif text-3xl italic text-[#00D4FF]/40">{item.step}</span>
              <h3 className="text-base font-bold text-[#F8F6F0]">{item.title}</h3>
              <p className="text-xs text-[#8B95AB] leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 3. FEATURES SECTION (Alternating side entries) */}
      <section
        id="features"
        className="py-20 md:py-32 max-w-7xl mx-auto px-4 md:px-8 border-t border-white/[0.04] space-y-24 md:space-y-36 scroll-mt-24"
      >
        {/* Title */}
        <div className="text-center max-w-xl mx-auto space-y-4">
          <span className="text-[10px] text-[#00D4FF] font-bold uppercase tracking-widest block">
            Platform Capabilities
          </span>
          <h2 className="font-serif text-4xl md:text-5xl font-normal leading-none tracking-[-1px] text-[#F8F6F0]">
            Everything needed to eliminate churn.
          </h2>
        </div>

        {/* Feature Cards List */}

        {/* Card 1: Data Integrations */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.7 }}
            className="md:col-span-6 space-y-4"
          >
            <h3 className="font-serif text-3xl md:text-4xl text-[#F8F6F0]">
              Unified behavioral signals.
            </h3>
            <p className="text-sm text-[#8B95AB] leading-relaxed">
              RetentIQ syncs directly with billing, usage telemetry, and support systems to
              construct a single source of customer health truth. Connect Stripe, Mixpanel, and
              Intercom seamlessly.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.7 }}
            className="md:col-span-6"
          >
            <SpotlightCard className="p-8 flex items-center justify-around bg-white/[0.01]">
              <div className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-2xl flex items-center justify-center hover:scale-105 transition-transform duration-300">
                <Layers className="w-8 h-8 text-indigo-400" />
              </div>
              <div className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-2xl flex items-center justify-center hover:scale-105 transition-transform duration-300">
                <Activity className="w-8 h-8 text-cyan-400" />
              </div>
              <div className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-2xl flex items-center justify-center hover:scale-105 transition-transform duration-300">
                <MessageSquare className="w-8 h-8 text-purple-400" />
              </div>
            </SpotlightCard>
          </motion.div>
        </div>

        {/* Card 2: AI Health Score */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.7 }}
            className="md:col-span-6 md:order-2 space-y-4"
          >
            <h3 className="font-serif text-3xl md:text-4xl text-[#F8F6F0]">
              FastAPI AI Health Scoring.
            </h3>
            <p className="text-sm text-[#8B95AB] leading-relaxed">
              We leverage GROQ's Llama-3.3 layer to evaluate customer signals on the fly, outputting
              a precise health index (0–100) and mapping top churn variables directly into your
              dashboard.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.7 }}
            className="md:col-span-6 md:order-1"
          >
            <SpotlightCard className="p-8 flex flex-col items-center justify-center bg-white/[0.01] gap-4">
              <div className="w-24 h-24 rounded-full border-4 border-white/[0.05] flex items-center justify-center relative">
                {/* Glow ring */}
                <div className="absolute inset-0 rounded-full border-4 border-[#00D4FF] border-r-transparent animate-spin-slow" />
                <Brain className="w-8 h-8 text-[#00D4FF]" />
              </div>
              <span className="text-xs font-bold text-[#F8F6F0] tracking-wider uppercase">
                Llama-3.3 Scoring Active
              </span>
            </SpotlightCard>
          </motion.div>
        </div>

        {/* Card 3: Real-time Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.7 }}
            className="md:col-span-6 space-y-4"
          >
            <h3 className="font-serif text-3xl md:text-4xl text-[#F8F6F0]">
              Interactive visual trends.
            </h3>
            <p className="text-sm text-[#8B95AB] leading-relaxed">
              Inspect historical health charts and metrics over time. Watch risk segments decrease
              as your retention playbooks resolve accounts before subscription periods end.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.7 }}
            className="md:col-span-6"
          >
            <SpotlightCard className="p-8 bg-white/[0.01]">
              {/* SVG Sparkline Spark */}
              <svg className="w-full h-24 overflow-visible" fill="none">
                <path
                  d="M 0 80 Q 50 60 100 70 T 200 30 T 300 50 T 400 10 T 500 20"
                  stroke="#00D4FF"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <circle cx="500" cy="20" r="5" fill="#00D4FF" className="animate-pulse" />
              </svg>
            </SpotlightCard>
          </motion.div>
        </div>

        {/* Card 4: Smart Alerts */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.7 }}
            className="md:col-span-6 md:order-2 space-y-4"
          >
            <h3 className="font-serif text-3xl md:text-4xl text-[#F8F6F0]">
              Slack & email notifications.
            </h3>
            <p className="text-sm text-[#8B95AB] leading-relaxed">
              Set customized thresholds. RetentIQ fires automated Slack webhooks and emails
              immediately to your Customer Success Managers, including detailed playbooks to start
              resolving concerns right away.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.7 }}
            className="md:col-span-6 md:order-1"
          >
            <SpotlightCard className="p-8 flex justify-center items-center gap-10 bg-white/[0.01]">
              <div className="flex flex-col items-center gap-2">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center">
                  <Slack className="w-8 h-8 text-emerald-400" />
                </div>
                <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                  Slack Webhook
                </span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl flex items-center justify-center">
                  <Mail className="w-8 h-8 text-cyan-400" />
                </div>
                <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                  CS Email Dispatch
                </span>
              </div>
            </SpotlightCard>
          </motion.div>
        </div>

        {/* Card 5: Retention ROI Tracker */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.7 }}
            className="md:col-span-6 space-y-4"
          >
            <h3 className="font-serif text-3xl md:text-4xl text-[#F8F6F0]">
              Retention ROI tracker.
            </h3>
            <p className="text-sm text-[#8B95AB] leading-relaxed">
              Track how much revenue your teams have successfully saved. Monitor overall save rate
              and calculate real-time ROI values directly on your executive dashboard.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.7 }}
            className="md:col-span-6"
          >
            <SpotlightCard className="p-8 bg-white/[0.01] flex flex-col items-center justify-center gap-2">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                Total Revenue Recovered
              </span>
              <h4 className="font-serif text-5xl font-black text-[#00D4FF]">
                $<Counter value={438900} duration={2} />
              </h4>
              <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1 font-semibold">
                <ArrowUpRight className="w-3.5 h-3.5" /> +$42,800 saved this week
              </span>
            </SpotlightCard>
          </motion.div>
        </div>
      </section>

      {/* 4. STATS BAR SECTION */}
      <section className="py-16 md:py-24 bg-white/[0.01] border-y border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-1 md:grid-cols-3 gap-12 text-center md:text-left">
          <div className="space-y-2">
            <h3 className="font-serif text-5xl md:text-6xl text-[#00D4FF] font-normal tracking-tight">
              <Counter value={8} suffix="%" />
            </h3>
            <p className="text-xs text-[#8B95AB] uppercase tracking-wider font-semibold">
              Average Monthly B2B Churn Rate
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-serif text-5xl md:text-6xl text-[#00D4FF] font-normal tracking-tight">
              <Counter value={25} suffix="x" />
            </h3>
            <p className="text-xs text-[#8B95AB] uppercase tracking-wider font-semibold">
              Cost to Acquire vs Retain Customers
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-serif text-5xl md:text-6xl text-[#00D4FF] font-normal tracking-tight">
              <Counter value={68} suffix="%" />
            </h3>
            <p className="text-xs text-[#8B95AB] uppercase tracking-wider font-semibold">
              SaaS Teams Missing Churn Signals
            </p>
          </div>
        </div>
      </section>

      {/* 5. PRICING SECTION */}
      <section id="pricing" className="py-20 md:py-32 max-w-7xl mx-auto px-4 md:px-8 scroll-mt-24">
        {/* Header */}
        <div className="text-center max-w-xl mx-auto mb-16 md:mb-20 space-y-6">
          <span className="text-[10px] text-[#00D4FF] font-bold uppercase tracking-widest block">
            RetentIQ Billing Tiers
          </span>
          <h2 className="font-serif text-4xl md:text-5xl font-normal leading-none tracking-[-1px] text-[#F8F6F0]">
            Transparent pricing for scaling platforms.
          </h2>

          {/* Toggle */}
          <div className="inline-flex items-center gap-1.5 p-1 rounded-full bg-white/[0.03] border border-white/[0.08] backdrop-blur-md">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                billingPeriod === 'monthly'
                  ? 'bg-[#00D4FF] text-[#0A0F1E]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('annual')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all flex items-center gap-1.5 cursor-pointer ${
                billingPeriod === 'annual'
                  ? 'bg-[#00D4FF] text-[#0A0F1E]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Annual
              <span
                className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                  billingPeriod === 'annual'
                    ? 'bg-[#0A0F1E] text-[#00D4FF]'
                    : 'bg-[#00D4FF]/20 text-[#00D4FF]'
                }`}
              >
                -20%
              </span>
            </button>
          </div>

          {/* Beta Access Callout */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="mt-6 p-4 rounded-2xl border border-cyan-500/30 bg-[#00D4FF]/5 shadow-[0_0_24px_rgba(0,212,255,0.06)] backdrop-blur-md max-w-lg mx-auto flex items-start gap-3 text-left"
          >
            <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center text-[#00D4FF] shrink-0 border border-cyan-500/25 mt-0.5 animate-pulse">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-wider">
                Beta Release Promo
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
                RetentIQ is currently in public beta. During this release phase, everyone gets{' '}
                <span className="text-[#00D4FF] font-black">100% free access</span> to the most
                premium features of RetentIQ (Growth tier). Start predicting churn risk immediately!
              </p>
            </div>
          </motion.div>
        </div>

        {/* Tiers list */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto items-stretch">
          {/* Card 1: Starter */}
          <motion.div
            whileHover={{ y: -4 }}
            transition={{ duration: 0.3 }}
            className="rounded-2xl border border-white/[0.08] bg-white/[0.015] p-8 flex flex-col justify-between shadow-xl relative overflow-hidden backdrop-blur-sm"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold tracking-widest text-[#8B95AB] uppercase">
                  Starter Pack
                </span>
              </div>
              <h3 className="font-serif text-5xl text-[#F8F6F0] mb-2 font-normal">
                {billingPeriod === 'monthly' ? '$49' : '$39'}
                <span className="text-sm font-sans font-medium text-[#8B95AB] ml-2">/mo</span>
              </h3>
              <p className="text-xs text-[#8B95AB] mb-6">
                Best for small SaaS applications looking to build early indicators.
              </p>

              <ul className="space-y-3 border-t border-white/[0.06] pt-6 mb-8 text-xs text-[#F8F6F0]">
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-[#00D4FF]" />
                  <span>Up to 500 customers</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-[#00D4FF]" />
                  <span>Email alert triggers</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-[#00D4FF]" />
                  <span>2 integrations configured</span>
                </li>
                <li className="flex items-center gap-2.5 text-slate-500">
                  <span>No Slack triggers</span>
                </li>
                <li className="flex items-center gap-2.5 text-slate-500">
                  <span>No AI CS playbooks</span>
                </li>
              </ul>
            </div>

            <a
              href="/dashboard"
              className="w-full py-3 bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] text-white font-bold text-xs tracking-wider uppercase text-center rounded-xl transition-all cursor-pointer block"
            >
              Start Free Trial
            </a>
          </motion.div>

          {/* Card 2: Growth (Highlighted) */}
          <motion.div
            whileHover={{ y: -4 }}
            transition={{ duration: 0.3 }}
            className="rounded-2xl border border-[#00D4FF]/30 bg-gradient-to-b from-[#0c162e] to-[#0A0F1E] p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden backdrop-blur-sm"
          >
            {/* Pop tag */}
            <div className="absolute top-4 right-4 px-2 py-0.5 rounded-full bg-[#00D4FF]/10 border border-[#00D4FF]/20 text-[9px] font-bold text-[#00D4FF] uppercase tracking-wider">
              Most Popular
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold tracking-widest text-[#00D4FF] uppercase">
                  Growth Scale
                </span>
              </div>
              <h3 className="font-serif text-5xl text-[#F8F6F0] mb-2 font-normal">
                {billingPeriod === 'monthly' ? '$149' : '$119'}
                <span className="text-sm font-sans font-medium text-[#8B95AB] ml-2">/mo</span>
              </h3>
              <p className="text-xs text-[#8B95AB] mb-6">
                For scaling applications looking to automate retention outreaches.
              </p>

              <ul className="space-y-3 border-t border-white/[0.06] pt-6 mb-8 text-xs text-[#F8F6F0]">
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-[#00D4FF]" />
                  <span>Unlimited customer index</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-[#00D4FF]" />
                  <span>Slack + email alert triggers</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-[#00D4FF]" />
                  <span>Configure all integrations</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-[#00D4FF]" />
                  <span>GROQ AI outreach playbooks</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-[#00D4FF]" />
                  <span>Tenancy Row-level security (RLS)</span>
                </li>
              </ul>
            </div>

            <a
              href="/dashboard"
              className="w-full py-3 bg-[#00D4FF] hover:bg-[#00D4FF]/90 text-[#0A0F1E] font-bold text-xs tracking-wider uppercase text-center rounded-xl transition-all shadow-[0_4px_20px_rgba(0,212,255,0.2)] cursor-pointer block"
            >
              Get Started Now
            </a>
          </motion.div>
        </div>
      </section>

      {/* 6. FOOTER SECTION */}
      <footer className="py-12 md:py-20 border-t border-white/[0.04] bg-[#070b16]">
        <div className="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-8 mb-12">
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-400 to-indigo-500 flex items-center justify-center">
                <Brain className="w-4 h-4 text-[#0A0F1E]" />
              </div>
              <span className="font-bold text-xs tracking-wider text-[#F8F6F0] uppercase">
                RetentIQ
              </span>
            </div>
            <p className="text-xs text-[#8B95AB] leading-relaxed max-w-sm">
              AI-powered customer churn-intelligence platform built on Supabase, FastAPI, and Llama
              3.3.
            </p>
          </div>

          <div className="md:col-span-7 grid grid-cols-3 gap-6">
            <div className="space-y-4">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Product
              </h4>
              <ul className="space-y-2 text-xs text-[#8B95AB]">
                <li>
                  <a href="#about" className="hover:text-white transition-colors">
                    About
                  </a>
                </li>
                <li>
                  <a href="#how-it-works" className="hover:text-white transition-colors">
                    Workflow
                  </a>
                </li>
                <li>
                  <a href="#features" className="hover:text-white transition-colors">
                    Capabilities
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="hover:text-white transition-colors">
                    Pricing
                  </a>
                </li>
              </ul>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Company
              </h4>
              <ul className="space-y-2 text-xs text-[#8B95AB]">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    About Us
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Careers
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Contact
                  </a>
                </li>
              </ul>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Legal
              </h4>
              <ul className="space-y-2 text-xs text-[#8B95AB]">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Security
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 md:px-8 border-t border-white/[0.04] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#8B95AB]">
          <p>© {new Date().getFullYear()} RetentIQ Inc. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-white transition-colors">
              Documentation
            </a>
            <span>•</span>
            <a href="#" className="hover:text-white transition-colors">
              Status Logs
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
