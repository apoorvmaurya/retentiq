'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { blogPosts, BlogPost } from '@/lib/blog-data';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { ArrowLeft, Calendar, Clock, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { motion, useScroll, useSpring } from 'framer-motion';

export default function BlogDetail() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const post = blogPosts.find((p) => p.slug === slug);

  // Hook scroll progress for reading bar
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  if (!post) {
    return (
      <div className="bg-[#0A0F1E] text-[#F8F6F0] min-h-screen flex flex-col justify-between font-sans">
        <Navbar />
        <div className="max-w-md mx-auto text-center py-40 px-4 space-y-4">
          <h1 className="font-serif text-3xl">Article Not Found</h1>
          <p className="text-slate-400 text-xs">The article slug might be invalid or deleted.</p>
          <Link href="/blog" className="btn-primary inline-flex mt-4">
            Back to Blog Hub
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="bg-[#0A0F1E] text-[#F8F6F0] min-h-screen overflow-x-hidden font-sans selection:bg-[#00D4FF]/20 selection:text-[#00D4FF]">
      {/* Dynamic Reading Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#00D4FF] via-cyan-400 to-indigo-500 origin-left z-50 shadow-[0_0_8px_rgba(0,212,255,0.6)]"
        style={{ scaleX }}
      />

      {/* Decorative gradient meshes */}
      <div className="absolute top-[-10%] left-[10%] w-[600px] h-[600px] rounded-full bg-indigo-950/10 blur-[120px] pointer-events-none" />
      <div className="absolute top-[40%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#00D4FF]/5 blur-[150px] pointer-events-none" />

      {/* Shared Navbar */}
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 md:px-8 pt-32 pb-24 relative z-10">
        {/* Back navigation */}
        <div className="mb-8">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-[#00D4FF] transition-colors group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            Back to Blog Hub
          </Link>
        </div>

        {/* Article Header */}
        <header className="space-y-6 border-b border-white/[0.08] pb-8 mb-10 text-left">
          <div className="flex flex-wrap items-center gap-4 text-xs font-bold tracking-wider uppercase text-slate-400">
            <span className="px-2 py-0.5 rounded bg-[#00D4FF]/10 border border-[#00D4FF]/20 text-[#00D4FF]">
              {post.category}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> {post.publishedAt}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> {post.readTime}
            </span>
          </div>

          <h1 className="font-serif text-3xl md:text-5xl font-normal leading-[1.1] tracking-[-1px] text-[#F8F6F0]">
            {post.title}
          </h1>

          {/* Author Details */}
          <div className="flex items-center gap-3 pt-2">
            <div className="w-9 h-9 rounded-full bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-[#00D4FF] text-xs font-bold">
              {post.author.name.charAt(0)}
            </div>
            <div>
              <p className="text-xs font-bold text-[#F8F6F0]">{post.author.name}</p>
              <p className="text-[10px] text-slate-500">{post.author.role}</p>
            </div>
          </div>
        </header>

        {/* Article Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Main Body */}
          <article className="lg:col-span-8 text-left space-y-6 text-slate-300 leading-relaxed text-sm md:text-base prose prose-invert max-w-none prose-headings:font-serif prose-headings:font-normal prose-h2:text-2xl prose-h2:text-white prose-blockquote:border-l-4 prose-blockquote:border-[#00D4FF] prose-blockquote:bg-white/[0.01] prose-blockquote:p-4 prose-blockquote:rounded-r-xl">
            <div
              dangerouslySetInnerHTML={{ __html: post.content }}
              className="space-y-6 blog-body-content"
            />
          </article>

          {/* Sidebar CTA (Right Column) */}
          <aside className="lg:col-span-4 sticky top-28 space-y-6">
            <div className="glass-panel border border-white/[0.08] rounded-2xl p-5 text-left space-y-4">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-[#00D4FF]">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Predict Churn Early
              </h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Connect your Stripe, Mixpanel, and Intercom data to configure Llama-3.3 predictive
                models and automated CSM outreach alerts.
              </p>
              <Link
                href="/dashboard"
                className="w-full py-2 bg-[#00D4FF] hover:bg-[#00D4FF]/90 text-[#0A0F1E] font-bold text-[10px] tracking-wider uppercase text-center rounded-xl transition-all shadow-[0_4px_12px_rgba(0,212,255,0.15)] flex items-center justify-center gap-1 cursor-pointer"
              >
                Get Started <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Tags card */}
            <div className="glass-panel border border-white/[0.08] rounded-2xl p-5 text-left space-y-3">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Article Tags
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 rounded bg-white/[0.03] border border-white/[0.06] text-[9px] font-bold text-slate-400 select-none"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Shared Footer */}
      <Footer />
    </div>
  );
}
