'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useHealthScoreRealtime } from '@/hooks/useHealthScoreRealtime';
import { fetchFromApi } from '@/lib/api';
import { timeAgo } from '@/lib/dateUtils';
import { ColdStartNotice } from '@/components/ColdStartNotice';
import { DEMO_CUSTOMERS_LIST } from '@/lib/demoData';
import { Database, Sparkles } from 'lucide-react';

export default function CustomersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSlowLoading, setIsSlowLoading] = useState(false);
  const [usingDemoFallback, setUsingDemoFallback] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  // Filter & Search states
  const [searchVal, setSearchVal] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState<'all' | 'low' | 'medium' | 'high' | 'critical'>(
    'all',
  );

  // Sort states: 'score' | 'name' | 'last_seen'
  const [sortField, setSortField] = useState<'score' | 'name' | 'last_seen'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  const [orgId, setOrgId] = useState<string | undefined>(undefined);

  // Debounce search val (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(searchVal);
      setCurrentPage(1); // Reset page on search
    }, 300);
    return () => clearTimeout(handler);
  }, [searchVal]);

  const loadSampleCustomers = () => {
    setCustomers(DEMO_CUSTOMERS_LIST);
    setTotalCount(DEMO_CUSTOMERS_LIST.length);
    setError(null);
    setUsingDemoFallback(true);
    setLoading(false);
    setIsSlowLoading(false);
  };

  const loadCustomers = async () => {
    setLoading(true);
    setError(null);
    setIsSlowLoading(false);

    const slowTimer = setTimeout(() => {
      setIsSlowLoading(true);
    }, 2500);

    try {
      // Build API query parameters
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        sort: sortField,
        order: sortOrder,
      });
      if (riskFilter !== 'all') {
        params.append('risk_tier', riskFilter);
      }

      const res = await fetchFromApi(`/customers?${params.toString()}`);

      // Filter by name/company on the client side if searched
      let data = res.data || [];
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        data = data.filter(
          (c: any) =>
            c.name.toLowerCase().includes(query) ||
            c.company.toLowerCase().includes(query) ||
            c.email.toLowerCase().includes(query),
        );
      }

      setCustomers(data);
      setTotalCount(res.total || 0);
      setUsingDemoFallback(false);
    } catch (err: any) {
      console.error('Error fetching customers:', err);
      setError(
        'Database query timed out or server is warming up. Cloud instances take ~5s on cold starts.',
      );
    } finally {
      clearTimeout(slowTimer);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [currentPage, riskFilter, sortField, sortOrder, searchQuery]);

  // Fetch Org ID on mount for realtime hook
  useEffect(() => {
    const getOrg = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('org_id')
          .eq('id', user.id)
          .maybeSingle();
        if (profile?.org_id) {
          setOrgId(profile.org_id);
        }
      }
    };
    getOrg();
  }, []);

  // Hook up realtime listener
  const { updatedRowId } = useHealthScoreRealtime(orgId, (updatedHS) => {
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === updatedHS.customer_id) {
          return {
            ...c,
            healthScore: {
              ...c.healthScore,
              score: updatedHS.score,
              riskTier: updatedHS.risk_tier,
              churnProbability: updatedHS.churn_probability,
              topRiskFactors: updatedHS.top_risk_factors,
              recommendedAction: updatedHS.recommended_action,
            },
          };
        }
        return c;
      }),
    );
  });

  const handleSort = (field: 'score' | 'name' | 'last_seen') => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage) || 1;

  const scoreArcColor = (tier: string) => {
    if (tier === 'low') return '#10B981';
    if (tier === 'medium') return '#F59E0B';
    if (tier === 'high') return '#F97316';
    if (tier === 'critical') return '#EF4444';
    return '#E2E8F0';
  };

  const getInitials = (company: string) => {
    return company.slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-6 text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-[#F8F6F0] tracking-tight">
            Customers Directory
          </h2>
          <p className="text-sm text-slate-400 font-medium mt-0.5">
            Search and inspect customer health scores, plans, and events.
          </p>
        </div>
        <button onClick={loadCustomers} disabled={loading} className="btn-secondary">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Reload List
        </button>
      </div>

      {/* Cold Start / Waking Up Notice */}
      {(error || (loading && isSlowLoading)) && (
        <ColdStartNotice
          compact
          isSlowLoading={loading && isSlowLoading}
          error={error}
          onRetry={loadCustomers}
          onLoadDemoData={loadSampleCustomers}
        />
      )}

      {/* Fallback Sample Data Indicator */}
      {usingDemoFallback && (
        <div className="p-3 bg-linear-to-r from-cyan-950/40 via-slate-900/60 to-indigo-950/40 border border-cyan-500/30 rounded-xl flex items-center justify-between gap-3 text-xs text-cyan-300 shadow-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Currently previewing interactive sample customers.</span>
          </div>
          <button
            onClick={loadCustomers}
            className="px-3 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer shrink-0"
          >
            Connect Live Database
          </button>
        </div>
      )}

      {/* Search and Filter panel */}
      <div className="glass-panel p-4 rounded-xl flex flex-col md:flex-row md:items-center gap-4 justify-between">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search company or name..."
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            className="dashboard-input pl-10 pr-4 py-2"
          />
        </div>

        {/* Risk chips */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">
            Risk Tiers:
          </span>
          {(['all', 'low', 'medium', 'high', 'critical'] as const).map((tier) => (
            <button
              key={tier}
              onClick={() => {
                setRiskFilter(tier);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer capitalize ${
                riskFilter === tier
                  ? 'bg-[#00D4FF] text-[#0A0F1E] border-[#00D4FF] shadow-sm shadow-[#00D4FF]/25'
                  : 'btn-secondary'
              }`}
            >
              {tier}
            </button>
          ))}
        </div>
      </div>

      {/* Main Customers Table */}
      <div className="glass-panel rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/1.5 border-b border-white/6 text-[11px] font-bold uppercase tracking-wider text-slate-400 select-none">
                <th className="p-4 pl-6">Company / Representative</th>
                <th className="p-4">Plan Level</th>
                <th
                  className="p-4 cursor-pointer hover:text-slate-300"
                  onClick={() => handleSort('score')}
                >
                  <div className="flex items-center gap-1.5">
                    Health Score Arc
                    {sortField === 'score' ? (
                      sortOrder === 'asc' ? (
                        <ArrowUp className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                    )}
                  </div>
                </th>
                <th className="p-4 text-center">Churn %</th>
                <th
                  className="p-4 cursor-pointer hover:text-slate-300 text-right pr-6"
                  onClick={() => handleSort('last_seen')}
                >
                  <div className="flex items-center justify-end gap-1.5">
                    Last Seen
                    {sortField === 'last_seen' ? (
                      sortOrder === 'asc' ? (
                        <ArrowUp className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/4 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-slate-500 mb-2" />
                    Fetching customer directory...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-slate-400">
                    {error ? (
                      <div className="flex flex-col items-center gap-2 py-4">
                        <Database className="w-6 h-6 text-cyan-400 animate-pulse" />
                        <p className="font-semibold text-slate-300">Database is warming up...</p>
                        <p className="text-xs text-slate-500 max-w-sm">
                          Cloud database connection is resuming from cold start.
                        </p>
                        <button
                          onClick={loadSampleCustomers}
                          className="mt-2 btn-secondary text-xs px-3 py-1.5 text-cyan-300 border-cyan-500/30 hover:border-cyan-400/50 flex items-center gap-1.5 cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                          View Sample Customers
                        </button>
                      </div>
                    ) : (
                      <span className="italic">
                        No customers found matching the search/filter parameters.
                      </span>
                    )}
                  </td>
                </tr>
              ) : (
                customers.map((cust) => {
                  const hs = cust.healthScore;
                  const score = hs?.score ?? 0;
                  const tier = hs?.riskTier || 'none';
                  const strokeColor = scoreArcColor(tier);

                  return (
                    <motion.tr
                      key={cust.id}
                      animate={
                        updatedRowId === cust.id
                          ? { backgroundColor: 'rgba(0, 212, 255, 0.25)' }
                          : { backgroundColor: 'rgba(0, 212, 255, 0)' }
                      }
                      transition={{ duration: 0.6 }}
                      onClick={() => router.push(`/dashboard/customers/${cust.id}`)}
                      className="hover:bg-white/1 transition-colors cursor-pointer border-b border-white/4"
                    >
                      {/* Avatar Initials & Company Info */}
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0">
                            {getInitials(cust.company)}
                          </div>
                          <div>
                            <div className="font-bold text-[#F8F6F0] text-sm">{cust.company}</div>
                            <div className="text-xs text-slate-400 mt-0.5">
                              {cust.name} • {cust.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Plan Level */}
                      <td className="p-4">
                        <span className="px-2 py-0.5 bg-white/3 border border-white/8 text-slate-300 rounded text-[10px] font-bold">
                          {cust.planTier || cust.plan_tier}
                        </span>
                        <div className="text-xs font-semibold text-slate-400 mt-1">
                          ${Number(cust.mrr).toLocaleString()}/mo
                        </div>
                      </td>

                      {/* Health Arc */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
                            <svg viewBox="0 0 40 40" className="w-10 h-10 transform -rotate-90">
                              <circle
                                cx="20"
                                cy="20"
                                r="16"
                                stroke="rgba(255, 255, 255, 0.05)"
                                strokeWidth="3"
                                fill="transparent"
                              />
                              {hs && (
                                <circle
                                  cx="20"
                                  cy="20"
                                  r="16"
                                  stroke={strokeColor}
                                  strokeWidth="3"
                                  fill="transparent"
                                  strokeDasharray="100.5"
                                  strokeDashoffset={100.5 - (100.5 * score) / 100}
                                  strokeLinecap="round"
                                />
                              )}
                            </svg>
                            <span className="absolute text-[10px] font-black text-[#F8F6F0]">
                              {hs ? score : '-'}
                            </span>
                          </div>
                          {hs ? (
                            <span className="text-xs font-bold text-slate-400 capitalize">
                              {tier} risk
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500 italic">
                              No score calculated
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Churn Prob */}
                      <td className="p-4 text-center font-bold text-[#F8F6F0]">
                        {hs ? `${Math.round(Number(hs.churnProbability) * 100)}%` : 'N/A'}
                      </td>

                      {/* Last seen */}
                      <td className="p-4 text-right pr-6">
                        <div className="flex items-center justify-end gap-1.5 text-slate-400">
                          <Clock className="w-3.5 h-3.5" />
                          <span className="text-xs font-semibold">
                            {hs?.scoredAt ? timeAgo(hs.scoredAt) : 'Never login'}
                          </span>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-white/6 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">
              Showing page {currentPage} of {totalPages} ({totalCount} total customers)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="btn-secondary p-2"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="btn-secondary p-2"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
