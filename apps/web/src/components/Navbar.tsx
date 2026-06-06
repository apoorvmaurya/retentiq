'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Menu, X, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function Navbar() {
  const [visible, setVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY < 50) {
        setVisible(true);
      } else if (currentScrollY > lastScrollY) {
        // Scrolling down -> hide navbar & close mobile menu
        setVisible(false);
        setMobileMenuOpen(false);
      } else {
        // Scrolling up -> show navbar
        setVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const navLinks = [
    { id: 'features', label: 'Features' },
    { id: 'how-it-works', label: 'How It Works' },
    { id: 'pricing', label: 'Pricing' },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: visible ? 0 : -100, opacity: visible ? 1 : 0 }}
        exit={{ y: -100, opacity: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6"
      >
        {/* Navbar Container */}
        <motion.nav
          animate={{ height: mobileMenuOpen ? 'auto' : 'auto' }}
          className="max-w-4xl mx-auto mt-4 sm:mt-5 px-6 py-3 rounded-2xl sm:rounded-full backdrop-blur-xl bg-[#070C1E]/75 border border-white/[0.08] shadow-[0_16px_40px_rgba(0,0,0,0.6)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 overflow-hidden relative"
        >
          {/* Custom border glow effect */}
          <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-[#00D4FF]/30 to-transparent pointer-events-none" />

          {/* Top Row (Mobile Navigation Header) */}
          <div className="flex items-center justify-between w-full sm:w-auto relative z-10">
            {/* Logo */}
            <div
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                setMobileMenuOpen(false);
              }}
              className="flex items-center gap-2 cursor-pointer group"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-400 via-[#00D4FF] to-indigo-500 flex items-center justify-center shadow-lg shadow-cyan-500/10 group-hover:scale-105 transition-transform duration-200">
                <Brain className="w-4 h-4 text-[#0A0F1E]" />
              </div>
              <span className="font-bold text-xs tracking-widest text-[#F8F6F0] uppercase group-hover:text-white transition-colors">
                RetentIQ
              </span>
            </div>

            {/* Mobile Actions Right */}
            <div className="flex items-center gap-3 sm:hidden">
              <Link
                href="/dashboard"
                className="px-3 py-1.5 rounded-xl border border-[#00D4FF]/30 text-[#00D4FF] hover:bg-[#00D4FF]/10 font-bold text-[10px] tracking-wide transition-all"
              >
                Dashboard
              </Link>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="w-8 h-8 rounded-lg bg-white/[0.02] border border-white/[0.08] text-slate-300 hover:text-white hover:bg-white/[0.04] transition-all flex items-center justify-center relative focus:outline-none"
              >
                <motion.div
                  animate={{ rotate: mobileMenuOpen ? 90 : 0 }}
                  transition={{ type: 'spring', stiffness: 220, damping: 18 }}
                  className="absolute flex items-center justify-center"
                >
                  {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                </motion.div>
              </button>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden sm:flex items-center gap-1.5 text-[12px] font-bold tracking-wider uppercase text-[#8B95AB]">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => scrollToSection(link.id)}
                onMouseEnter={() => setHoveredLink(link.id)}
                onMouseLeave={() => setHoveredLink(null)}
                className="relative px-4 py-2 rounded-full hover:text-white transition-colors duration-250 cursor-pointer"
              >
                {hoveredLink === link.id && (
                  <motion.span
                    layoutId="navHover"
                    className="absolute inset-0 bg-white/[0.04] border border-[#00D4FF]/10 rounded-full z-0"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{link.label}</span>
              </button>
            ))}
          </div>

          {/* Desktop Actions */}
          <div className="hidden sm:flex items-center gap-3">
            <Link
              href="/login"
              className="text-[12px] font-bold tracking-wider uppercase text-[#8B95AB] hover:text-white transition-colors px-3 py-1.5"
            >
              Login
            </Link>

            <Link
              href="/dashboard"
              className="px-5 py-2 rounded-full bg-gradient-to-r from-[#00D4FF] to-cyan-500 hover:opacity-95 text-[#0A0F1E] font-bold text-[11px] tracking-wider uppercase transition-all shadow-[0_4px_15px_rgba(0,212,255,0.25)] flex items-center gap-1 group relative overflow-hidden"
            >
              Start Free{' '}
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {/* Mobile Accordion Panel */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="sm:hidden w-full flex flex-col gap-3 pt-3 pb-2 border-t border-white/[0.06] z-10"
              >
                {navLinks.map((link) => (
                  <button
                    key={link.id}
                    onClick={() => scrollToSection(link.id)}
                    className="w-full py-2.5 px-3 text-left text-sm font-semibold text-slate-300 hover:text-[#00D4FF] hover:bg-white/[0.02] rounded-xl transition-all flex items-center justify-between group"
                  >
                    <span>{link.label}</span>
                    <ArrowRight className="w-4 h-4 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-[#00D4FF]" />
                  </button>
                ))}

                <div className="flex flex-col gap-2 pt-2 border-t border-white/[0.04]">
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full py-2.5 text-center text-xs font-bold bg-white/[0.02] border border-white/[0.08] hover:border-white/[0.15] rounded-xl hover:bg-white/[0.04] transition-all text-slate-200 hover:text-white"
                  >
                    Login
                  </Link>
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full py-2.5 text-center text-xs font-bold bg-gradient-to-r from-[#00D4FF] to-cyan-500 text-[#0A0F1E] rounded-xl shadow-[0_4px_15px_rgba(0,212,255,0.2)] flex items-center justify-center gap-1 hover:opacity-95 transition-all"
                  >
                    Start Free <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.nav>
      </motion.div>
    </AnimatePresence>
  );
}
