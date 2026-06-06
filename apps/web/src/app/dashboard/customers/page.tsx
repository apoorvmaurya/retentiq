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
  Filter, 
  Activity, 
  RefreshCw,
  Clock
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useHealthScoreRealtime } from '@/hooks/useHealthScoreRealtime';

// Fetch helper with auth header
async function fetchFromApi(endpoint: string) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
  const response = await fetch(`${baseUrl}${endpoint}`, { headers });
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return response.json();
}

export default function CustomersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  // Filter & Search states
  const [searchVal, setSearchVal] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState<'all' | 'low' | 'medium' | 'high' | 'critical'>('all');
  
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

  const loadCustomers = async () => {
    setLoading(true);
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
      
      // Filter by name/company on the client side if searched (since search is not built into query params on Express side)
      let data = res.data || [];
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        data = data.filter((c: any) => 
          c.name.toLowerCase().includes(query) || 
          c.company.toLowerCase().includes(query) || 
          c.email.toLowerCase().includes(query)
        );
      }
      
      setCustomers(data);
      setTotalCount(res.total || 0);
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
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
      const { data: { user } } = await supabase.auth.getUser();
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
    setCustomers(prev => prev.map(c => {
      if (c.id === updatedHS.customer_id) {
        return {
          ...c,
          healthScore: {
            ...c.healthScore,
            score: updatedHS.score,
            riskTier: updatedHS.risk_tier,
            churnProbability: updatedHS.churn_probability,
            topRiskFactors: updatedHS.top_risk_factors,
            recommendedAction: updatedHS.recommended_action
          }
        };
      }
      return c;
    }));
  });

  const handleSort = (field: 'score' | 'name' | 'last_seen') => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
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

  const getRelativeTime = (dateStr: string | undefined) => {
    if (!dateStr) return 'Never login';
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) {
      const hours = Math.floor(diff / 3600000);
      if (hours === 0) return 'Just now';
      return `${hours}h ago`;
    }
    if (days === 1) return 'Yesterday';
    return `${days}d ago`;
  };

  return (
    <div className="space-y-6 text-slate-800">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Customers Directory</h2>
          <p className="text-sm text-slate-500 font-medium mt-0.5">Search and inspect customer health scores, plans, and events.</p>
        </div>
        <button 
          onClick={loadCustomers} 
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 text-xs font-bold rounded-xl shadow-sm hover:shadow transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Reload List
        </button>
      </div>

      {/* Search and Filter panel */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center gap-4 justify-between">
        
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search company or name..."
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:bg-white transition-colors"
          />
        </div>

        {/* Risk chips */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Risk Tiers:</span>
          {(['all', 'low', 'medium', 'high', 'critical'] as const).map(tier => (
            <button
              key={tier}
              onClick={() => {
                setRiskFilter(tier);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer capitalize ${
                riskFilter === tier 
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tier}
            </button>
          ))}
        </div>
      </div>

      {/* Main Customers Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400 select-none">
                <th className="p-4 pl-6">Company / Representative</th>
                <th className="p-4">Plan Level</th>
                <th className="p-4 cursor-pointer hover:text-slate-600" onClick={() => handleSort('score')}>
                  <div className="flex items-center gap-1.5">
                    Health Score Arc
                    {sortField === 'score' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />
                    )}
                  </div>
                </th>
                <th className="p-4 text-center">Churn %</th>
                <th className="p-4 cursor-pointer hover:text-slate-600 text-right pr-6" onClick={() => handleSort('last_seen')}>
                  <div className="flex items-center justify-end gap-1.5">
                    Last Seen
                    {sortField === 'last_seen' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-slate-300 mb-2" />
                    Fetching customer directory...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-slate-400 italic">
                    No customers found matching the search/filter parameters.
                  </td>
                </tr>
              ) : (
                customers.map(cust => {
                  const hs = cust.healthScore;
                  const score = hs?.score ?? 0;
                  const tier = hs?.riskTier || 'none';
                  const strokeColor = scoreArcColor(tier);

                  return (
                    <motion.tr
                      key={cust.id}
                      animate={
                        updatedRowId === cust.id
                          ? { backgroundColor: 'rgba(255, 215, 0, 0.4)' }
                          : { backgroundColor: 'rgba(255, 215, 0, 0)' }
                      }
                      transition={{ duration: 0.6 }}
                      onClick={() => router.push(`/dashboard/customers/${cust.id}`)}
                      className="hover:bg-slate-50 transition-colors cursor-pointer border-b border-slate-100"
                    >
                      {/* Avatar Initials & Company Info */}
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                            {getInitials(cust.company)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 text-sm">{cust.company}</div>
                            <div className="text-xs text-slate-400 mt-0.5">{cust.name} • {cust.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Plan Level */}
                      <td className="p-4">
                        <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-600 rounded text-[10px] font-bold">
                          {cust.plan_tier}
                        </span>
                        <div className="text-xs font-semibold text-slate-500 mt-1">${Number(cust.mrr).toLocaleString()}/mo</div>
                      </td>

                      {/* Health Arc */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
                            <svg className="w-10 h-10 transform -rotate-90">
                              <circle
                                cx="20"
                                cy="20"
                                r="16"
                                stroke="#E2E8F0"
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
                            <span className="absolute text-[10px] font-black text-slate-700">
                              {hs ? score : '-'}
                            </span>
                          </div>
                          {hs ? (
                            <span className="text-xs font-bold text-slate-500 capitalize">{tier} risk</span>
                          ) : (
                            <span className="text-xs text-slate-400 italic">No score calculated</span>
                          )}
                        </div>
                      </td>

                      {/* Churn Prob */}
                      <td className="p-4 text-center font-bold text-slate-700">
                        {hs ? `${Math.round(Number(hs.churnProbability) * 100)}%` : 'N/A'}
                      </td>

                      {/* Last seen */}
                      <td className="p-4 text-right pr-6">
                        <div className="flex items-center justify-end gap-1.5 text-slate-500">
                          <Clock className="w-3.5 h-3.5" />
                          <span className="text-xs font-semibold">{getRelativeTime(hs?.scoredAt)}</span>
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
          <div className="p-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">
              Showing page {currentPage} of {totalPages} ({totalCount} total customers)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
                className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
                className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600 transition-colors disabled:opacity-50 cursor-pointer"
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
