'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { blogPosts } from '@/lib/blog-data';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { ArrowRight, Clock, ArrowLeft } from 'lucide-react';

export default function BlogIndex() {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', 'Predictive AI', 'CS Playbooks', 'Data Security', 'SaaS Strategy'];

  const filteredPosts =
    selectedCategory === 'All'
      ? blogPosts
      : blogPosts.filter((post) => post.category === selectedCategory);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  } as const;

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 24 } },
  } as const;

  return (
    <div className="bg-[#0A0F1E] text-[#F8F6F0] min-h-screen overflow-x-hidden font-sans selection:bg-[#00D4FF]/20 selection:text-[#00D4FF]">
      {/* Decorative gradient meshes */}
      <div className="absolute top-[-10%] left-[10%] w-[600px] h-[600px] rounded-full bg-indigo-950/10 blur-[120px] pointer-events-none" />
      <div className="absolute top-[30%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#00D4FF]/5 blur-[150px] pointer-events-none" />

      {/* Shared Navbar */}
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 md:px-8 pt-32 pb-24 relative z-10">
        {/* Back navigation */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-[#00D4FF] transition-colors group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            Back to Home
          </Link>
        </div>

        {/* Page Header */}
        <div className="max-w-2xl text-left space-y-4 mb-12">
          <span className="text-[10px] text-[#00D4FF] font-bold uppercase tracking-widest block">
            RetentIQ Knowledge Hub
          </span>
          <h1 className="font-serif text-4xl md:text-6xl font-normal leading-none tracking-[-1px] text-[#F8F6F0]">
            Insights & Guides on Customer Churn
          </h1>
          <p className="text-sm md:text-base text-[#8B95AB] leading-relaxed">
            Stay up to date with the latest methodologies, FastAPI pipelines, security
            architectures, and machine learning scoring strategies to optimize B2B SaaS retention.
          </p>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap items-center gap-2 mb-12 border-b border-white/[0.06] pb-6">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-xs font-bold tracking-wide transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#00D4FF] text-[#0A0F1E]'
                  : 'bg-white/[0.02] border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Posts Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {filteredPosts.map((post) => (
            <motion.article
              key={post.slug}
              variants={itemVariants}
              className="glass-card-hover flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-white/[0.015] p-6 shadow-xl relative overflow-hidden backdrop-blur-sm"
            >
              {/* Card top elements */}
              <div className="space-y-4">
                {/* Category & ReadTime */}
                <div className="flex items-center justify-between text-[10px] font-bold tracking-wider uppercase">
                  <span className="px-2 py-0.5 rounded bg-[#00D4FF]/10 border border-[#00D4FF]/20 text-[#00D4FF]">
                    {post.category}
                  </span>
                  <span className="text-slate-500 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {post.readTime}
                  </span>
                </div>

                {/* Title */}
                <h2 className="font-serif text-xl md:text-2xl text-[#F8F6F0] font-normal leading-snug group-hover:text-white transition-colors">
                  <Link href={`/blog/${post.slug}`} className="hover:underline">
                    {post.title}
                  </Link>
                </h2>

                {/* Excerpt */}
                <p className="text-xs text-[#8B95AB] leading-relaxed line-clamp-3">
                  {post.excerpt}
                </p>
              </div>

              {/* Card bottom elements */}
              <div className="mt-8 pt-4 border-t border-white/[0.06] flex items-center justify-between">
                {/* Author Info */}
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-[#00D4FF] text-[9px] font-bold">
                    {post.author.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[#F8F6F0]">{post.author.name}</p>
                    <p className="text-[8px] text-slate-500">{post.publishedAt}</p>
                  </div>
                </div>

                <Link
                  href={`/blog/${post.slug}`}
                  className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.08] hover:border-[#00D4FF]/30 text-slate-400 hover:text-[#00D4FF] hover:bg-white/[0.04] transition-all"
                  aria-label={`Read full article: ${post.title}`}
                >
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </main>

      {/* Shared Footer */}
      <Footer />
    </div>
  );
}
