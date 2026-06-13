'use client';

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { motion } from 'framer-motion';
import { Mail, MessageSquare, Send, Sparkles, CheckCircle } from 'lucide-react';

export default function ContactPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !message.trim()) return;

    // Simulate contact request saving to localStorage (similar to chatbot tool)
    const currentRequests = JSON.parse(localStorage.getItem('retentiq-demo-requests') || '[]');
    currentRequests.push({
      email,
      message,
      date: new Date().toISOString(),
      source: 'contact-page',
    });
    localStorage.setItem('retentiq-demo-requests', JSON.stringify(currentRequests));

    setSubmitted(true);
    setEmail('');
    setMessage('');
  };

  return (
    <div className="bg-[#0A0F1E] text-[#F8F6F0] min-h-screen overflow-x-hidden font-sans selection:bg-[#00D4FF]/20 selection:text-[#00D4FF]">
      {/* Decorative gradient meshes */}
      <div className="absolute top-[-10%] left-[10%] w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] rounded-full bg-indigo-950/20 blur-[80px] sm:blur-[120px] pointer-events-none" />
      <div className="absolute top-[20%] right-[-10%] w-[250px] sm:w-[500px] h-[250px] sm:h-[500px] rounded-full bg-[#00D4FF]/5 blur-[100px] sm:blur-[150px] pointer-events-none" />

      <Navbar />

      <main className="relative pt-32 pb-20 px-4 md:px-8 max-w-5xl mx-auto z-10">
        {/* Hero Section */}
        <div className="text-center space-y-6 max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] backdrop-blur-md"
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#00D4FF]" />
            <span className="text-[10px] font-bold tracking-wider text-[#8B95AB] uppercase">
              Get in Touch
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-serif text-3xl sm:text-5xl md:text-6xl font-normal tracking-tight text-[#F8F6F0]"
          >
            Let's Talk About <br />
            <span className="bg-gradient-to-r from-cyan-400 via-[#00D4FF] to-indigo-400 bg-clip-text text-transparent">
              Your Churn Strategy
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xs sm:text-sm md:text-base text-slate-400 leading-relaxed max-w-2xl mx-auto"
          >
            Have questions about our predictive algorithms, third-party integrations, or enterprise
            SLAs? Reach out and we'll reply within 24 hours.
          </motion.p>
        </div>

        {/* Content Layout Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-start max-w-4xl mx-auto">
          {/* Support Channels Sidebar */}
          <div className="md:col-span-5 space-y-6">
            <div className="p-6 rounded-2xl border border-white/[0.06] bg-white/[0.015] backdrop-blur-md space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-white/[0.06] pb-3">
                Contact Details
              </h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block font-bold uppercase">
                      General Support
                    </span>
                    <a
                      href="mailto:support@retentiq.com"
                      className="text-xs font-semibold text-slate-300 hover:text-white transition-colors"
                    >
                      support@retentiq.com
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block font-bold uppercase">
                      Slack Support
                    </span>
                    <span className="text-xs font-semibold text-slate-300">
                      Community channel for Growth tier customers
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="md:col-span-7">
            <div className="p-6 sm:p-8 rounded-2xl border border-white/[0.06] bg-white/[0.015] backdrop-blur-md">
              {submitted ? (
                <div className="text-center py-8 space-y-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto animate-bounce">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-white uppercase tracking-wider">
                    Request Received!
                  </h3>
                  <p className="text-slate-400 text-xs sm:text-sm">
                    Thank you. We have saved your request and a Customer Success representative will
                    review it soon.
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="text-xs font-semibold text-[#00D4FF] hover:underline cursor-pointer"
                  >
                    Send another inquiry
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Inquiry Form
                  </h3>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your.name@company.com"
                      className="w-full bg-white/[0.02] border border-white/[0.08] focus:border-cyan-500/40 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-600 focus:outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                      Message
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Tell us about your customer churn challenges..."
                      className="w-full bg-white/[0.02] border border-white/[0.08] focus:border-cyan-500/40 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-600 focus:outline-none transition-all resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-[#00D4FF] hover:opacity-95 text-[#0A0F1E] font-bold text-[11px] uppercase tracking-wider transition-all shadow-[0_4px_15px_rgba(0,212,255,0.2)] flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Submit Inquiry</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
