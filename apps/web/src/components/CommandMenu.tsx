'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  FileText,
  ArrowRight,
  ShieldCheck,
  HelpCircle,
  Calculator,
  Sparkles,
  LayoutDashboard,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface CommandItem {
  id: string;
  title: string;
  subtitle: string;
  category: 'Pages' | 'Actions' | 'Legal & Info';
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  shortcut?: string[];
}

export default function CommandMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const items: CommandItem[] = [
    {
      id: 'home',
      title: 'Home / About',
      subtitle: 'Back to the main landing page',
      category: 'Pages',
      icon: HelpCircle,
      action: () => {
        router.push('/');
        setIsOpen(false);
      },
    },
    {
      id: 'blog',
      title: 'Blog & Content Hub',
      subtitle: 'Articles and news on churn intelligence and B2B SaaS',
      category: 'Pages',
      icon: FileText,
      action: () => {
        router.push('/blog');
        setIsOpen(false);
      },
    },
    {
      id: 'dashboard',
      title: 'Customer Dashboard',
      subtitle: 'Open the analytics and user monitoring platform',
      category: 'Pages',
      icon: LayoutDashboard,
      action: () => {
        router.push('/dashboard');
        setIsOpen(false);
      },
    },
    {
      id: 'roi',
      title: 'SaaS Churn ROI Calculator',
      subtitle: 'Estimate annual revenue saved with RetentIQ',
      category: 'Actions',
      icon: Calculator,
      action: () => {
        setIsOpen(false);
        setTimeout(() => {
          const el = document.getElementById('roi-calculator');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
          } else {
            router.push('/#roi-calculator');
          }
        }, 100);
      },
      shortcut: ['R'],
    },
    {
      id: 'chatbot',
      title: 'Open AI Assistant',
      subtitle: 'Start a conversation with our simulated CS Chatbot',
      category: 'Actions',
      icon: Sparkles,
      action: () => {
        setIsOpen(false);
        setTimeout(() => {
          const btn = document.getElementById('chatbot-widget-trigger');
          if (btn) btn.click();
        }, 200);
      },
      shortcut: ['C'],
    },
    {
      id: 'privacy',
      title: 'Privacy Policy',
      subtitle: 'Understand how we protect and process customer records',
      category: 'Legal & Info',
      icon: ShieldCheck,
      action: () => {
        router.push('/privacy');
        setIsOpen(false);
      },
    },
    {
      id: 'terms',
      title: 'Terms of Service',
      subtitle: 'Read our commercial terms and service standards',
      category: 'Legal & Info',
      icon: ShieldCheck,
      action: () => {
        router.push('/terms');
        setIsOpen(false);
      },
    },
    {
      id: 'security',
      title: 'Security Audits',
      subtitle: 'Data cryptography, compliance, and HTTPS details',
      category: 'Legal & Info',
      icon: ShieldCheck,
      action: () => {
        router.push('/security');
        setIsOpen(false);
      },
    },
  ];

  // Filter items based on search query
  const filteredItems = items.filter(
    (item) =>
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.subtitle.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase()),
  );

  // Sync active index bounds
  useEffect(() => {
    setActiveIndex(0);
  }, [search]);

  // Bind keyboard triggers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle Command Menu via Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        return;
      }

      if (!isOpen) return;

      // Close via Escape
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
        return;
      }

      // Navigate down via ArrowDown
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % filteredItems.length);
        return;
      }

      // Navigate up via ArrowUp
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
        return;
      }

      // Select via Enter
      if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[activeIndex]) {
          filteredItems[activeIndex].action();
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeIndex, filteredItems]);

  // Handle outside clicks
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      // Auto-focus input when opened
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      document.removeEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  return (
    <>
      {/* Global trigger button for accessibility and discovery in navbar/layout */}
      <button
        id="global-search-trigger"
        onClick={() => setIsOpen(true)}
        className="hidden"
        aria-label="Search site documentation and actions"
      />

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-[#020205]/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              ref={containerRef}
              className="w-full max-w-xl rounded-2xl glass-panel overflow-hidden border border-white/[0.08] shadow-[0_32px_64px_rgba(0,0,0,0.8)]"
            >
              {/* Search Header */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.06] bg-white/[0.01]">
                <Search className="w-5 h-5 text-slate-400 shrink-0" />
                <input
                  ref={inputRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  type="text"
                  placeholder="Search pages, configurations, actions..."
                  className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
                  aria-label="Search command menu"
                />
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-[9px] font-bold text-slate-400">
                    ESC
                  </span>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/[0.04] transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Items Panel */}
              <div className="max-h-[360px] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-white/[0.06]">
                {filteredItems.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-500">
                    No matching results found. Try typing another term.
                  </div>
                ) : (
                  Object.entries(
                    filteredItems.reduce(
                      (acc, curr) => {
                        if (!acc[curr.category]) acc[curr.category] = [];
                        acc[curr.category].push(curr);
                        return acc;
                      },
                      {} as Record<string, CommandItem[]>,
                    ),
                  ).map(([category, itemsList]) => (
                    <div key={category} className="mb-3">
                      {/* Section Heading */}
                      <span className="px-3 py-1.5 text-[10px] font-bold tracking-widest text-[#00D4FF] uppercase block">
                        {category}
                      </span>

                      {/* Items */}
                      <div className="space-y-0.5 mt-1">
                        {itemsList.map((item) => {
                          const indexInFiltered = filteredItems.findIndex((x) => x.id === item.id);
                          const isSelected = indexInFiltered === activeIndex;

                          return (
                            <button
                              key={item.id}
                              onClick={() => item.action()}
                              onMouseEnter={() => setActiveIndex(indexInFiltered)}
                              className={`w-full text-left flex items-center justify-between px-3 py-2.5 rounded-xl transition-all relative overflow-hidden ${
                                isSelected
                                  ? 'bg-[#00D4FF]/10 text-white border-l-2 border-[#00D4FF]'
                                  : 'text-slate-300 hover:bg-white/[0.02]'
                              }`}
                            >
                              <div className="flex items-center gap-3 relative z-10">
                                <div
                                  className={`p-2 rounded-lg border ${
                                    isSelected
                                      ? 'bg-[#00D4FF]/10 border-[#00D4FF]/30 text-[#00D4FF]'
                                      : 'bg-white/[0.02] border-white/[0.06] text-slate-400'
                                  }`}
                                >
                                  <item.icon className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className="text-xs font-bold">{item.title}</p>
                                  <p className="text-[10px] text-slate-500 mt-0.5">
                                    {item.subtitle}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 relative z-10 shrink-0">
                                {item.shortcut && (
                                  <div className="flex gap-0.5">
                                    {item.shortcut.map((sc) => (
                                      <span
                                        key={sc}
                                        className="px-1 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-[8px] font-bold text-slate-500 uppercase"
                                      >
                                        {sc}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                <ArrowRight
                                  className={`w-3.5 h-3.5 transition-all ${
                                    isSelected
                                      ? 'opacity-100 translate-x-0 text-[#00D4FF]'
                                      : 'opacity-0 -translate-x-1'
                                  }`}
                                />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Status Footer */}
              <div className="px-4 py-2 bg-[#020205]/40 border-t border-white/[0.06] flex items-center justify-between text-[10px] text-slate-500 font-medium select-none">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <span className="px-1 py-0.5 rounded bg-white/[0.06] text-[9px]">↑↓</span>{' '}
                    navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="px-1 py-0.5 rounded bg-white/[0.06] text-[9px]">↵</span> select
                  </span>
                </div>
                <span>Command Center</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
