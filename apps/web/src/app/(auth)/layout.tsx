'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain } from 'lucide-react';

const quotes = [
  {
    text: "RetentIQ allowed us to identify at-risk customers 2 months before renewal. Our expansion revenue grew by 22%.",
    author: "Sarah Jenkins",
    role: "VP of Customer Success",
    company: "CloudScale",
  },
  {
    text: "The Groq AI integration analyzes support tickets and payment trends organically. It's like having a data scientist for customer health.",
    author: "David Chen",
    role: "CEO",
    company: "InnovateFlow",
  },
  {
    text: "Since deploying RetentIQ, our logo churn dropped to under 1.2% monthly. The Slack notifications keep our CS team incredibly fast.",
    author: "Elena Rostova",
    role: "Head of CS",
    company: "ApexSystems",
  },
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % quotes.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen flex bg-[#020205] text-[#F8F6F0] font-sans">
      {/* Left Panel: Glowing gradient background, centered branding, rotating quote block */}
      <div className="hidden lg:flex w-1/2 relative flex-col justify-between p-12 overflow-hidden border-r border-white/[0.04] bg-gradient-to-br from-[#050B18] via-[#03060F] to-[#010204]">
        {/* Glow meshes */}
        <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] rounded-full bg-[#00D4FF]/5 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />

        {/* Top Header Logo */}
        <div className="flex items-center gap-2.5 z-10">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#00D4FF] to-indigo-500 flex items-center justify-center shadow-lg shadow-[#00D4FF]/10">
            <Brain className="w-4.5 h-4.5 text-[#0A0F1E]" />
          </div>
          <span className="font-bold text-sm tracking-widest text-white uppercase">
            RetentIQ
          </span>
        </div>

        {/* Quote Block Centered */}
        <div className="flex-1 flex items-center justify-center z-10">
          <div className="w-full max-w-md bg-white/[0.01] border border-white/[0.04] rounded-2xl p-8 backdrop-blur-md shadow-2xl relative">
            <div className="absolute top-4 left-6 text-6xl font-serif text-[#00D4FF]/10 select-none pointer-events-none">
              “
            </div>
            <div className="relative min-h-[140px] flex items-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeIndex}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.4, ease: 'easeInOut' }}
                  className="space-y-4 w-full"
                >
                  <p className="text-base md:text-lg font-serif italic text-slate-300 leading-relaxed font-normal">
                    {quotes[activeIndex].text}
                  </p>
                  <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-white">
                        {quotes[activeIndex].author}
                      </p>
                      <p className="text-[11px] text-[#8B95AB] font-medium">
                        {quotes[activeIndex].role} &bull; {quotes[activeIndex].company}
                      </p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00D4FF]/10 border border-[#00D4FF]/20 text-[#00D4FF] font-bold uppercase tracking-wider">
                      Success Case
                    </span>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Bottom Footer Info */}
        <div className="z-10 flex items-center justify-between text-[11px] text-[#8B95AB] font-medium">
          <p>© {new Date().getFullYear()} RetentIQ Inc.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-white transition-colors">Security</a>
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
          </div>
        </div>
      </div>

      {/* Right Panel: Form Area */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 md:p-16 relative">
        {/* Glow behind forms */}
        <div className="absolute inset-0 bg-radial-gradient from-indigo-950/20 via-transparent to-transparent opacity-60 pointer-events-none" />
        <div className="w-full max-w-sm z-10">{children}</div>
      </div>
    </div>
  );
}
