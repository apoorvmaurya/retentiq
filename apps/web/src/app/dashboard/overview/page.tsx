'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Users,
  Activity,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { fetchFromApi } from '@/lib/api';
import { timeAgo } from '@/lib/dateUtils';

export default function OverviewPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Overview states
  const [metrics, setMetrics] = useState({
    total_customers: 0,
    avg_health_score: 0,
    at_risk_count: 0,
    revenue_at_risk: 0,
  });

  const [distribution, setDistribution] = useState<
    { name: string; value: number; color: string }[]
  >([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [atRiskCustomers, setAtRiskCustomers] = useState<any[]>([]);
  const [rawCustomers, setRawCustomers] = useState<any[]>([]);
  const [selectedPlanFilter, setSelectedPlanFilter] = useState<string>('all');
  const [roiHistory, setRoiHistory] = useState<any[]>([]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch overview metrics
      const ov = await fetchFromApi('/analytics/overview');
      setMetrics(ov);

      // 2. Fetch score distribution
      const dist = await fetchFromApi('/analytics/score-distribution');
      setDistribution([
        { name: 'Low Risk', value: dist.low || 0, color: '#10B981' },
        { name: 'Medium Risk', value: dist.medium || 0, color: '#F59E0B' },
        { name: 'High Risk', value: dist.high || 0, color: '#F97316' },
        { name: 'Critical Risk', value: dist.critical || 0, color: '#EF4444' },
      ]);

      // 3. Fetch recent open alerts
      const openAlerts = await fetchFromApi('/alerts?status=open&limit=5');
      const formattedAlerts = openAlerts.map((item: any) => ({
        id: item.alert.id,
        score_at_trigger: item.alert.scoreAtTrigger ?? item.alert.score_at_trigger,
        triggered_at: item.alert.triggeredAt ?? item.alert.triggered_at,
        customer_name: item.customer.name,
        company: item.customer.company,
        customer_id: item.alert.customerId ?? item.alert.customer_id,
      }));
      setAlerts(formattedAlerts);

      // 4. Fetch customers (fetch larger set for slicing filter)
      const custResp = await fetchFromApi('/customers?sort=score&order=asc&limit=100');
      const customersList = custResp.data || [];
      setRawCustomers(customersList);
      setAtRiskCustomers(customersList);

      // 5. Fetch ROI aggregates history
      const history = await fetchFromApi('/analytics/roi-history');
      setRoiHistory(history);
    } catch (err: any) {
      console.error('Error fetching overview dashboard:', err);
      setError(
        'Failed to load dashboard data from API. Please verify the backend service is running.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    loadDashboardData();
  }, []);

  // Handle Client-Side Cohort Slicing & Metrics Re-indexing
  useEffect(() => {
    let list = rawCustomers;
    if (selectedPlanFilter !== 'all') {
      list = rawCustomers.filter(
        (c) => (c.planTier || c.plan_tier || '').toLowerCase() === selectedPlanFilter.toLowerCase(),
      );
    }
    setAtRiskCustomers(list);

    // Recompute metrics based on selected slice
    const totalCount = list.length;
    let totalScore = 0;
    let scoredCount = 0;
    let atRisk = 0;
    let revAtRisk = 0;
    let low = 0,
      medium = 0,
      high = 0,
      critical = 0;

    for (const c of list) {
      const hs = c.healthScore;
      if (hs) {
        const score = hs.score;
        totalScore += score;
        scoredCount++;

        if (score < 40) {
          atRisk++;
          revAtRisk += parseFloat(c.mrr || '0');
        }

        const tier = hs.risk_tier || hs.riskTier || 'none';
        if (tier === 'low') low++;
        else if (tier === 'medium') medium++;
        else if (tier === 'high') high++;
        else if (tier === 'critical') critical++;
      }
    }

    setMetrics({
      total_customers: totalCount,
      avg_health_score: scoredCount > 0 ? Math.round(totalScore / scoredCount) : 0,
      at_risk_count: atRisk,
      revenue_at_risk: Math.round(revAtRisk * 100) / 100,
    });

    setDistribution([
      { name: 'Low Risk', value: low, color: '#10B981' },
      { name: 'Medium Risk', value: medium, color: '#F59E0B' },
      { name: 'High Risk', value: high, color: '#F97316' },
      { name: 'Critical Risk', value: critical, color: '#EF4444' },
    ]);
  }, [selectedPlanFilter, rawCustomers]);

  const handleResolveAlert = async (alertId: string) => {
    try {
      await fetchFromApi(`/alerts/${alertId}/resolve`, { method: 'PUT' });
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
      const ov = await fetchFromApi('/analytics/overview');
      setMetrics(ov);
    } catch (err) {
      console.error(err);
    }
  };

  if (!mounted) return null;

  // Sparkline data generators based on current metrics
  const getSparklineData = (val: number, isCurrency = false) => {
    const factor = isCurrency ? 500 : 2;
    return [
      { pv: Math.max(0, val - factor * 3) },
      { pv: Math.max(0, val - factor) },
      { pv: Math.max(0, val + factor * 2) },
      { pv: Math.max(0, val - factor * 2) },
      { pv: Math.max(0, val + factor) },
      { pv: Math.max(0, val - factor) },
      { pv: val },
    ];
  };

  const scoreColorClass = (score: number) => {
    if (score >= 80) return 'text-emerald-500';
    if (score >= 50) return 'text-amber-500';
    if (score >= 25) return 'text-orange-500';
    return 'text-rose-500';
  };

  return (
    <div className="space-y-8 text-slate-100">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-[#F8F6F0] tracking-tight">
            Overview Workspace
          </h2>
          <p className="text-sm text-slate-400 font-medium mt-0.5">
            Aggregated churn statistics and active metrics at a glance.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Cohort Slicing Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
              Cohort Slice:
            </span>
            <select
              value={selectedPlanFilter}
              onChange={(e) => setSelectedPlanFilter(e.target.value)}
              className="dashboard-input bg-slate-900 border-slate-800 text-slate-300 text-xs py-1.5 px-3 h-fit cursor-pointer"
            >
              <option value="all">All Cohorts & Plans</option>
              <option value="basic">Basic Plan</option>
              <option value="pro">Pro Plan</option>
              <option value="enterprise">Enterprise Plan</option>
            </select>
          </div>
          <button onClick={loadDashboardData} disabled={loading} className="btn-secondary">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Sync Analytics
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3 text-amber-400 text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500" />
          <div>
            <p className="font-bold">Backend API Offline</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Grid of 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* KPI 1: Total Customers */}
        <div className="glass-panel glass-card-hover rounded-xl p-5 flex flex-col justify-between h-36">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Total Customers
              </span>
              <h3 className="text-3xl font-black text-white mt-1">
                {loading ? '...' : metrics.total_customers}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-end justify-between mt-2">
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-extrabold">
              <TrendingUp className="w-3.5 h-3.5" />
              +4.2% <span className="text-slate-500 font-normal">vs last week</span>
            </span>
            <div className="w-24 h-10">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={getSparklineData(metrics.total_customers)}>
                  <defs>
                    <linearGradient id="colorCustomers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="pv"
                    stroke="#6366F1"
                    strokeWidth={1.5}
                    fillOpacity={1}
                    fill="url(#colorCustomers)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* KPI 2: Avg Health Score */}
        <div className="glass-panel glass-card-hover rounded-xl p-5 flex flex-col justify-between h-36">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Avg Health Score
              </span>
              <h3
                className={`text-3xl font-black mt-1 ${scoreColorClass(metrics.avg_health_score)}`}
              >
                {loading ? '...' : metrics.avg_health_score}{' '}
                <span className="text-xs font-normal text-slate-500">/ 100</span>
              </h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-end justify-between mt-2">
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-extrabold">
              <TrendingUp className="w-3.5 h-3.5" />
              +1.5% <span className="text-slate-500 font-normal">vs last week</span>
            </span>
            <div className="w-24 h-10">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={getSparklineData(metrics.avg_health_score)}>
                  <defs>
                    <linearGradient id="colorHealth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="pv"
                    stroke="#10B981"
                    strokeWidth={1.5}
                    fillOpacity={1}
                    fill="url(#colorHealth)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* KPI 3: At-Risk Count */}
        <div className="glass-panel glass-card-hover rounded-xl p-5 flex flex-col justify-between h-36">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                At-Risk Count
              </span>
              <h3 className="text-3xl font-black text-amber-500 mt-1">
                {loading ? '...' : metrics.at_risk_count}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-end justify-between mt-2">
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-extrabold">
              <TrendingDown className="w-3.5 h-3.5" />
              -12.0% <span className="text-slate-500 font-normal">vs last week</span>
            </span>
            <div className="w-24 h-10">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={getSparklineData(metrics.at_risk_count)}>
                  <defs>
                    <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="pv"
                    stroke="#F59E0B"
                    strokeWidth={1.5}
                    fillOpacity={1}
                    fill="url(#colorRisk)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* KPI 4: Revenue at Risk */}
        <div className="glass-panel glass-card-hover rounded-xl p-5 flex flex-col justify-between h-36">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Revenue at Risk
              </span>
              <h3 className="text-3xl font-black text-rose-500 mt-1">
                {loading ? '...' : `$${metrics.revenue_at_risk.toLocaleString()}`}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400 border border-rose-500/20">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-end justify-between mt-2">
            <span className="flex items-center gap-1 text-[10px] text-[#EF4444] font-extrabold">
              <TrendingUp className="w-3.5 h-3.5" />
              +8.5% <span className="text-slate-500 font-normal">vs last week</span>
            </span>
            <div className="w-24 h-10">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={getSparklineData(metrics.revenue_at_risk, true)}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="pv"
                    stroke="#EF4444"
                    strokeWidth={1.5}
                    fillOpacity={1}
                    fill="url(#colorRev)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* ROI / Saved Revenue AreaChart Section */}
      <div className="glass-panel rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-[#F8F6F0] uppercase tracking-wider">
              Retention ROI / Saved Revenue
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Monthly cumulative MRR saved via proactive customer success intervention playbooks.
            </p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-bold rounded-lg uppercase tracking-wider">
            <TrendingUp className="w-3.5 h-3.5" /> Premium ROI Tracker
          </div>
        </div>
        <div className="h-72 mt-6">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={roiHistory} margin={{ top: 10, right: 35, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRoi" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#06B6D4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="month"
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `$${Number(val) / 1000}k`}
              />
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255, 255, 255, 0.05)"
                vertical={false}
              />
              <Tooltip
                contentStyle={{
                  background: '#0C1224',
                  color: '#FFF',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  fontSize: '12px',
                }}
                itemStyle={{ color: '#00D4FF' }}
                formatter={(value: any) => [`$${Number(value).toLocaleString()}`, 'Revenue Saved']}
              />
              <Area
                type="monotone"
                dataKey="revenueSaved"
                stroke="#06B6D4"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorRoi)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Middle Section: Donut + Recent Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Score Distribution Donut */}
        <div className="glass-panel rounded-xl p-6 flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold text-[#F8F6F0] uppercase tracking-wider">
              Health Score Distribution
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Ratio of active clients grouped by risk levels.
            </p>
          </div>

          <div className="h-56 relative flex items-center justify-center mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {distribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: '#0C1224',
                    color: '#FFF',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    fontSize: '12px',
                  }}
                  itemStyle={{ color: '#00D4FF' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col justify-center items-center pointer-events-none">
              <span className="text-3xl font-black text-white">{metrics.total_customers}</span>
              <span className="text-[9px] text-slate-400 font-bold tracking-wider uppercase">
                Active Clients
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4">
            {distribution.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                ></span>
                <span className="text-slate-400 font-semibold truncate">{item.name}</span>
                <span className="font-bold text-[#F8F6F0] ml-auto">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Recent Alerts feed (last 5) */}
        <div className="glass-panel rounded-xl p-6 lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-[#F8F6F0] uppercase tracking-wider">
                  Recent Churn Alerts
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  High-priority indicators triggering automated CSM flows.
                </p>
              </div>
              <Link
                href="/dashboard/alerts"
                className="text-xs text-cyan-400 font-bold hover:text-cyan-300 flex items-center gap-0.5"
              >
                Manage Config <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="divide-y divide-white/[0.06] overflow-y-auto max-h-72 mt-4 pr-1">
              {alerts.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm flex flex-col items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-emerald-500 mb-2" />
                  <p className="font-bold text-slate-300">All Client Scores Healthy</p>
                  <p className="text-xs text-slate-500 mt-0.5">No open churn triggers reported.</p>
                </div>
              ) : (
                alerts.map((alert) => (
                  <div key={alert.id} className="py-3 flex items-center justify-between group">
                    <div>
                      <h5 className="text-sm font-bold text-[#F8F6F0]">{alert.company}</h5>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Trigger score:{' '}
                        <span className="font-bold text-rose-400">
                          {alert.score_at_trigger}/100
                        </span>{' '}
                        • {timeAgo(alert.triggered_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/dashboard/customers/${alert.customer_id}`}
                        className="btn-secondary px-2.5 py-1.5"
                      >
                        Inspect
                      </Link>
                      <button
                        onClick={() => handleResolveAlert(alert.id)}
                        className="px-2.5 py-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:text-white hover:bg-rose-500 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        Resolve
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="text-[10px] text-slate-400 border-t border-white/[0.06] pt-4 flex items-center gap-2.5 mt-4">
            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/50 animate-ping"></span>
            <span>Realtime subscription active for Slack and Email webhooks channels.</span>
          </div>
        </div>
      </div>

      {/* Bottom Section: At-Risk Table (Top 10 by churn_probability desc) */}
      <div className="glass-panel rounded-xl overflow-hidden">
        <div className="p-6 border-b border-white/[0.06] flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-[#F8F6F0] uppercase tracking-wider">
              High Churn Probability Clients
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Top 10 at-risk client accounts sorted by risk assessment.
            </p>
          </div>
          <Link
            href="/dashboard/customers"
            className="text-xs text-cyan-400 font-bold hover:text-cyan-300 flex items-center gap-0.5"
          >
            Full Directory <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.015] border-b border-white/[0.06] text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="p-4">Customer Name</th>
                <th className="p-4">Plan Level</th>
                <th className="p-4">Health Badge</th>
                <th className="p-4 text-center">Churn %</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] text-sm">
              {atRiskCustomers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 italic">
                    {loading ? 'Fetching records...' : 'No customer scores calculated.'}
                  </td>
                </tr>
              ) : (
                atRiskCustomers.slice(0, 10).map((cust) => {
                  const hs = cust.healthScore;
                  const score = hs?.score ?? 0;
                  const riskTier = hs?.riskTier || hs?.risk_tier || '';

                  let badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                  if (riskTier === 'medium') {
                    badgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                  } else if (riskTier === 'high') {
                    badgeColor = 'bg-orange-500/10 text-orange-400 border-orange-500/20';
                  } else if (riskTier === 'critical') {
                    badgeColor = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
                  }

                  return (
                    <tr
                      key={cust.id}
                      className="hover:bg-white/[0.01] transition-colors border-b border-white/[0.04]"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[#F8F6F0]">{cust.company}</span>
                          {score < 45 ? (
                            <span
                              className="text-rose-500 font-extrabold text-sm"
                              title="Declining trend"
                            >
                              ↓
                            </span>
                          ) : score >= 75 ? (
                            <span
                              className="text-emerald-500 font-extrabold text-sm"
                              title="Improving trend"
                            >
                              ↑
                            </span>
                          ) : (
                            <span
                              className="text-slate-500 font-extrabold text-sm"
                              title="Stable trend"
                            >
                              →
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {cust.name} • {cust.email}
                        </div>
                      </td>

                      <td className="p-4">
                        <span className="px-2 py-0.5 bg-white/[0.03] border border-white/[0.08] text-slate-300 rounded text-[10px] font-bold">
                          {cust.planTier || cust.plan_tier}
                        </span>
                        <span className="text-xs font-semibold text-slate-400 block mt-1">
                          ${Number(cust.mrr).toLocaleString()}/mo
                        </span>
                      </td>
                      <td className="p-4">
                        {hs ? (
                          <span
                            className={`px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase ${badgeColor}`}
                          >
                            {riskTier} ({score}/100)
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No score</span>
                        )}
                      </td>
                      <td className="p-4 text-center font-bold text-[#F8F6F0]">
                        {hs
                          ? `${Math.round(Number(hs.churnProbability || hs.churn_probability) * 100)}%`
                          : 'N/A'}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => router.push(`/dashboard/customers/${cust.id}`)}
                          className="btn-secondary px-3 py-1.5 ml-auto flex items-center gap-1.5"
                        >
                          View Profile <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
