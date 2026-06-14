'use client';

import React, { useState, useEffect } from 'react';
import { animate } from 'framer-motion';
import { Calculator, ArrowRight, TrendingUp, DollarSign } from 'lucide-react';

export default function RoiCalculator() {
  const [mrr, setMrr] = useState(120000); // Default $120,000 Monthly Recurring Revenue
  const [churnRate, setChurnRate] = useState(6.5); // Default 6.5% monthly churn rate
  const [reduction, setReduction] = useState(35); // Default 35% target reduction

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      const {
        mrr: newMrr,
        churnRate: newChurnRate,
        reduction: newReduction,
      } = customEvent.detail || {};
      if (newMrr !== undefined) setMrr(Number(newMrr));
      if (newChurnRate !== undefined) setChurnRate(Number(newChurnRate));
      if (newReduction !== undefined) setReduction(Number(newReduction));
    };
    window.addEventListener('retentiq-update-roi', handleUpdate);
    return () => window.removeEventListener('retentiq-update-roi', handleUpdate);
  }, []);

  // Calculate values
  // Monthly Churn in $ = MRR * (churnRate / 100)
  const monthlyChurnVal = mrr * (churnRate / 100);
  const annualChurnVal = monthlyChurnVal * 12;
  const savedAnnualVal = annualChurnVal * (reduction / 100);

  // RetentIQ Cost Calculation
  // growth tier $149/mo ($1,788/yr) if mrr < 250k, else Enterprise tier $499/mo ($5,988/yr)
  const monthlyCost = mrr < 250000 ? 149 : 499;
  const annualCost = monthlyCost * 12;
  const roiMultiplier = annualCost > 0 ? savedAnnualVal / annualCost : 0;

  // Custom Animated Counter
  function AnimatedMoneyValue({ value }: { value: number }) {
    const [displayVal, setDisplayVal] = useState(0);

    useEffect(() => {
      const controls = animate(displayVal, value, {
        duration: 0.8,
        ease: 'easeOut',
        onUpdate: (latest) => setDisplayVal(Math.round(latest)),
      });
      return () => controls.stop();
    }, [value]);

    return <span>${displayVal.toLocaleString('en-US')}</span>;
  }

  return (
    <div
      id="roi-calculator"
      className="glass-panel rounded-3xl border border-white/[0.08] shadow-[0_24px_50px_rgba(0,0,0,0.5)] p-6 md:p-10 max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 text-left font-sans content-visibility-auto scroll-mt-28"
    >
      {/* Inputs (Left Column) */}
      <div className="lg:col-span-7 space-y-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-[#00D4FF]">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-[#00D4FF] font-bold uppercase tracking-widest block">
              Interactive Modeler
            </span>
            <h3 className="text-lg font-extrabold text-[#F8F6F0]">
              Estimate your Customer Retention ROI
            </h3>
          </div>
        </div>
        <p className="text-xs text-[#8B95AB] leading-relaxed">
          Input your revenue parameters and expected churn improvement to model the financial impact
          of deploying RetentIQ's predictive engine.
        </p>

        <div className="space-y-5 pt-2">
          {/* MRR Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="mrr-range" className="font-bold text-slate-300">
                Monthly Recurring Revenue (MRR)
              </label>
              <div className="flex items-center text-[#00D4FF] font-black">
                <DollarSign className="w-3.5 h-3.5" />
                <span>{mrr.toLocaleString('en-US')}</span>
              </div>
            </div>
            <input
              id="mrr-range"
              type="range"
              min="10000"
              max="1000000"
              step="5000"
              value={mrr}
              onChange={(e) => setMrr(Number(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none bg-white/[0.08] cursor-pointer accent-[#00D4FF] focus:outline-none"
            />
            <div className="flex justify-between text-[9px] text-slate-500 font-bold">
              <span>$10K</span>
              <span>$500K</span>
              <span>$1M</span>
            </div>
          </div>

          {/* Churn Rate Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="churn-range" className="font-bold text-slate-300">
                Current Monthly Gross Churn
              </label>
              <span className="text-[#00D4FF] font-black">{churnRate.toFixed(1)}%</span>
            </div>
            <input
              id="churn-range"
              type="range"
              min="0.5"
              max="15"
              step="0.1"
              value={churnRate}
              onChange={(e) => setChurnRate(Number(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none bg-white/[0.08] cursor-pointer accent-[#00D4FF] focus:outline-none"
            />
            <div className="flex justify-between text-[9px] text-slate-500 font-bold">
              <span>0.5%</span>
              <span>7.5%</span>
              <span>15.0%</span>
            </div>
          </div>

          {/* Reduction Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="reduction-range" className="font-bold text-slate-300">
                Target Churn Reduction (AI-Assisted)
              </label>
              <span className="text-[#00D4FF] font-black">{reduction}%</span>
            </div>
            <input
              id="reduction-range"
              type="range"
              min="10"
              max="50"
              step="1"
              value={reduction}
              onChange={(e) => setReduction(Number(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none bg-white/[0.08] cursor-pointer accent-[#00D4FF] focus:outline-none"
            />
            <div className="flex justify-between text-[9px] text-slate-500 font-bold">
              <span>10% (Conservative)</span>
              <span>30% (Standard)</span>
              <span>50% (High-Perform)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Outputs (Right Column / Glass Card) */}
      <div className="lg:col-span-5 flex flex-col justify-between bg-white/[0.015] border border-white/[0.06] rounded-2xl p-6 relative overflow-hidden">
        {/* Glow element */}
        <div
          aria-hidden="true"
          className="absolute top-0 right-0 w-32 h-32 bg-[#00D4FF]/5 blur-[40px] pointer-events-none rounded-full"
        />

        <div className="space-y-6">
          {/* Stat 1: Churn Cost */}
          <div className="space-y-1">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">
              Estimated Annual Revenue Leaking
            </span>
            <h4
              className="text-xl font-bold text-rose-400"
              aria-label={`Estimated Annual Revenue Leaking: $${Math.round(annualChurnVal).toLocaleString('en-US')}`}
            >
              <AnimatedMoneyValue value={annualChurnVal} />
            </h4>
          </div>

          {/* Stat 2: Savings */}
          <div className="space-y-1 border-t border-white/[0.04] pt-4">
            <span className="text-[9px] text-emerald-400 font-extrabold uppercase tracking-wider flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Recoverable ARR (Savings)
            </span>
            <h4
              className="text-3xl font-black text-emerald-400"
              aria-label={`Recoverable ARR Savings: $${Math.round(savedAnnualVal).toLocaleString('en-US')}`}
            >
              <AnimatedMoneyValue value={savedAnnualVal} />
            </h4>
            <p className="text-[10px] text-[#8B95AB] leading-tight">
              Equivalent to saving{' '}
              <span className="text-[#00D4FF] font-bold">
                ${Math.round(savedAnnualVal / 12).toLocaleString()}
              </span>{' '}
              monthly.
            </p>
          </div>

          {/* Stat 3: ROI Multiplier */}
          <div className="space-y-1 border-t border-white/[0.04] pt-4 flex items-center justify-between">
            <div>
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">
                Estimated System ROI
              </span>
              <h5 className="text-lg font-black text-white flex items-center gap-1">
                {roiMultiplier.toFixed(0)}x{' '}
                <span className="text-xs text-[#00D4FF] font-bold">Return</span>
              </h5>
            </div>
            <div className="px-2.5 py-1 rounded-lg bg-[#00D4FF]/5 border border-[#00D4FF]/20 text-right">
              <span className="text-[8px] text-[#8B95AB] uppercase tracking-wider block">
                RetentIQ Cost
              </span>
              <span className="text-xs font-bold text-white">${monthlyCost}/mo</span>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-white/[0.04]">
          <a
            href="/dashboard"
            className="w-full py-3 bg-[#00D4FF] hover:bg-[#00D4FF]/90 text-[#0A0F1E] font-bold text-xs tracking-wider uppercase text-center rounded-full transition-all shadow-[0_4px_15px_rgba(0,212,255,0.2)] flex items-center justify-center gap-1.5 cursor-pointer"
          >
            Claim Your Free Access <ArrowRight className="w-3.5 h-3.5" />
          </a>
          <span className="text-[9px] text-center text-slate-500 block mt-2">
            No credit card required. Syncs in under 5 minutes.
          </span>
        </div>
      </div>
    </div>
  );
}
