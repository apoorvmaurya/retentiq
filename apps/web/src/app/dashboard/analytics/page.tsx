'use client';

import React, { useEffect, useState } from 'react';
import {
  RefreshCw,
  Download,
  BarChart2,
  TrendingUp,
  DollarSign,
  Users,
  Grid,
  Layers,
  ShieldAlert,
} from 'lucide-react';
import { fetchFromApi } from '@/lib/api';

interface OverviewData {
  total_customers: number;
  avg_health_score: number;
  at_risk_count: number;
  critical_count: number;
  revenue_at_risk: number;
}

interface DistributionData {
  low: number;
  medium: number;
  high: number;
  critical: number;
}

interface RoiHistoryItem {
  id?: string;
  month: string;
  accountsSaved: number;
  revenueSaved: string;
}

interface FeatureAdoptionItem {
  tier: 'low' | 'medium' | 'high' | 'critical';
  dashboard: number;
  alerts: number;
  integrations: number;
  playbooks: number;
}

interface CohortRetentionItem {
  cohortMonth: string;
  newAccounts: number;
  m1: number | null;
  m3: number | null;
  m6: number | null;
  m12: number | null;
}

const getSegmentTitle = (tier: string) => {
  switch (tier) {
    case 'low':
      return 'Low Risk';
    case 'medium':
      return 'Medium Risk';
    case 'high':
      return 'High Risk';
    case 'critical':
      return 'Critical';
    default:
      return tier.charAt(0).toUpperCase() + tier.slice(1);
  }
};

const getSegmentColorClass = (tier: string) => {
  switch (tier) {
    case 'low':
      return 'text-emerald-400';
    case 'medium':
      return 'text-amber-400';
    case 'high':
      return 'text-orange-400';
    case 'critical':
      return 'text-rose-500';
    default:
      return 'text-slate-300';
  }
};

const getHeatmapColor = (tier: string, percentage: number) => {
  if (percentage < 15) return 'bg-slate-950 text-slate-700';
  if (percentage < 35) return 'bg-slate-900 text-slate-500';

  switch (tier) {
    case 'low':
      if (percentage >= 80) return 'bg-emerald-500 text-slate-950';
      if (percentage >= 60) return 'bg-emerald-600/80 text-emerald-100';
      return 'bg-emerald-700/60 text-emerald-200';
    case 'medium':
      if (percentage >= 80) return 'bg-amber-500 text-slate-950';
      if (percentage >= 60) return 'bg-amber-600/70 text-amber-100';
      return 'bg-amber-600/50 text-amber-200';
    case 'high':
      if (percentage >= 80) return 'bg-orange-500 text-slate-950';
      if (percentage >= 60) return 'bg-orange-600/70 text-orange-100';
      return 'bg-orange-800/40 text-orange-200';
    case 'critical':
      if (percentage >= 80) return 'bg-rose-500 text-slate-950';
      if (percentage >= 60) return 'bg-rose-600/70 text-rose-100';
      return 'bg-rose-950/20 text-rose-400';
    default:
      return 'bg-slate-900 text-slate-500';
  }
};

const getCohortCellClass = (percentage: number | null) => {
  if (percentage === null) return 'text-slate-600';
  if (percentage >= 90) return 'bg-emerald-500/10 text-emerald-400 font-bold';
  if (percentage >= 80) return 'bg-cyan-600/10 text-cyan-400 font-bold';
  if (percentage >= 60) return 'bg-cyan-700/10 text-cyan-300';
  return 'bg-slate-900/50 text-slate-400';
};

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [distribution, setDistribution] = useState<DistributionData | null>(null);
  const [roiHistory, setRoiHistory] = useState<RoiHistoryItem[]>([]);
  const [featureAdoption, setFeatureAdoption] = useState<FeatureAdoptionItem[]>([]);
  const [cohorts, setCohorts] = useState<CohortRetentionItem[]>([]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      const overviewData = await fetchFromApi('/analytics/overview');
      setOverview(overviewData);

      const distData = await fetchFromApi('/analytics/score-distribution');
      setDistribution(distData);

      const historyData = await fetchFromApi('/analytics/roi-history');
      setRoiHistory(historyData);

      const adoptionData = await fetchFromApi('/analytics/feature-adoption');
      setFeatureAdoption(adoptionData);

      const cohortsData = await fetchFromApi('/analytics/cohort-retention');
      setCohorts(cohortsData);
    } catch (err) {
      console.error('Error loading analytics data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const handleExportCSV = () => {
    if (!overview || !distribution) return;

    const csvRows = [
      ['ChurnRadar Customer Health Analytics Report'],
      ['Generated At', new Date().toLocaleString()],
      [],
      ['Metric', 'Value'],
      ['Total Active Customers', overview.total_customers],
      ['Average Portfolio Health Score', overview.avg_health_score],
      ['At Risk Count (Score < 40)', overview.at_risk_count],
      ['Critical Risk Count (Score < 20)', overview.critical_count],
      ['Monthly Recurring Revenue (MRR) At Risk ($)', overview.revenue_at_risk],
      [],
      ['Risk Segment Distribution', 'Count'],
      ['Critical Risk (0-39)', distribution.critical || 0],
      ['High Risk (40-69)', distribution.high || 0],
      ['Medium Risk (70-79)', distribution.medium || 0],
      ['Low Risk (80-100)', distribution.low || 0],
      [],
      ['Month', 'Accounts Saved', 'Revenue Recovered ($)'],
      ...roiHistory.map((item) => [item.month, item.accountsSaved, item.revenueSaved]),
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      csvRows.map((e) => e.map((val) => `"${val}"`).join(',')).join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `churnradar_analytics_export_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight font-sans">
            Strategic Analytics
          </h2>
          <p className="text-sm text-slate-400 font-medium mt-0.5">
            Deeper metrics, customer cohorts, usage heatmaps, and financial ROI recovery validation
            tracking.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadAnalyticsData}
            className="btn-secondary !p-2.5"
            title="Refresh analytics metrics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={handleExportCSV} disabled={loading || !overview} className="btn-primary">
            <Download className="w-4 h-4" />
            Export CSV Report
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center text-slate-400">
          <RefreshCw className="w-10 h-10 animate-spin mx-auto text-cyan-400 mb-3" />
          Compiling business intelligence reports...
        </div>
      ) : (
        <>
          {/* KPI Dashboard Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="glass-panel rounded-xl p-6 relative overflow-hidden group hover:border-slate-700 transition-all">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <Users className="w-16 h-16 text-cyan-400" />
              </div>
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                Active Customers
              </span>
              <span className="text-3xl font-black text-white mt-1 block">
                {overview?.total_customers}
              </span>
              <span className="text-[10px] text-slate-500 font-semibold block mt-1">
                Unified resolved identities
              </span>
            </div>

            <div className="glass-panel rounded-xl p-6 relative overflow-hidden group hover:border-slate-700 transition-all">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <BarChart2 className="w-16 h-16 text-cyan-400" />
              </div>
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                Avg Health Score
              </span>
              <span className="text-3xl font-black text-cyan-400 mt-1 block">
                {overview?.avg_health_score} / 100
              </span>
              <span className="text-[10px] text-slate-500 font-semibold block mt-1">
                Weighted portfolio index
              </span>
            </div>

            <div className="glass-panel rounded-xl p-6 relative overflow-hidden group hover:border-slate-700 transition-all">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <DollarSign className="w-16 h-16 text-cyan-400" />
              </div>
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                MRR At Risk
              </span>
              <span className="text-3xl font-black text-rose-400 mt-1 block">
                ${overview?.revenue_at_risk?.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-500 font-semibold block mt-1">
                From accounts scored &lt; 40
              </span>
            </div>

            <div className="glass-panel rounded-xl p-6 relative overflow-hidden group hover:border-slate-700 transition-all">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <TrendingUp className="w-16 h-16 text-cyan-400" />
              </div>
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                Accounts Saved (YTD)
              </span>
              <span className="text-3xl font-black text-emerald-400 mt-1 block">
                {roiHistory.reduce((sum, item) => sum + item.accountsSaved, 0)}
              </span>
              <span className="text-[10px] text-slate-500 font-semibold block mt-1">
                Recovered above 60 health score
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Heatmap Section */}
            <div className="glass-panel rounded-xl p-6 lg:col-span-2 space-y-6">
              <h4 className="font-bold text-white text-base border-b border-slate-800 pb-3 flex items-center gap-2">
                <Grid className="w-4.5 h-4.5 text-cyan-400" />
                Feature Adoption Heatmap
              </h4>
              <p className="text-[10px] text-slate-400 font-medium">
                Analysis of feature usage density by user risk segment over the last 30 days. High
                adoption signals strong integration.
              </p>

              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-5 gap-2 text-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  <div>Segment</div>
                  <div>Dashboard</div>
                  <div>Alerts</div>
                  <div>Integrations</div>
                  <div>Playbooks</div>
                </div>

                {featureAdoption.length === 0 ? (
                  <div className="col-span-5 text-center py-6 text-xs text-slate-500 font-semibold">
                    No adoption data available.
                  </div>
                ) : (
                  featureAdoption.map((row) => (
                    <div key={row.tier} className="grid grid-cols-5 gap-2 text-center items-center">
                      <div
                        className={`text-xs font-bold text-left ${getSegmentColorClass(row.tier)}`}
                      >
                        {getSegmentTitle(row.tier)}
                      </div>
                      <div
                        className={`${getHeatmapColor(row.tier, row.dashboard)} p-3 text-xs rounded font-bold`}
                      >
                        {row.dashboard}%
                      </div>
                      <div
                        className={`${getHeatmapColor(row.tier, row.alerts)} p-3 text-xs rounded font-bold`}
                      >
                        {row.alerts}%
                      </div>
                      <div
                        className={`${getHeatmapColor(row.tier, row.integrations)} p-3 text-xs rounded font-bold`}
                      >
                        {row.integrations}%
                      </div>
                      <div
                        className={`${getHeatmapColor(row.tier, row.playbooks)} p-3 text-xs rounded font-bold`}
                      >
                        {row.playbooks}%
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Score Histogram */}
            <div className="glass-panel rounded-xl p-6 space-y-6">
              <h4 className="font-bold text-white text-base border-b border-slate-800 pb-3 flex items-center gap-2">
                <ShieldAlert className="w-4.5 h-4.5 text-cyan-400" />
                Risk Tier Distribution
              </h4>
              <p className="text-[10px] text-slate-400 font-medium">
                Histogram showing account concentration across the four system risk segments.
              </p>

              <div className="space-y-4 pt-2">
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-slate-300">Low Risk (80-100)</span>
                    <span className="text-slate-400">{distribution?.low || 0} accounts</span>
                  </div>
                  <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full"
                      style={{
                        width: `${Math.min(100, ((distribution?.low || 0) / (overview?.total_customers || 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-slate-300">Medium Risk (70-79)</span>
                    <span className="text-slate-400">{distribution?.medium || 0} accounts</span>
                  </div>
                  <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-cyan-500 h-full rounded-full"
                      style={{
                        width: `${Math.min(100, ((distribution?.medium || 0) / (overview?.total_customers || 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-slate-300">High Risk (40-69)</span>
                    <span className="text-slate-400">{distribution?.high || 0} accounts</span>
                  </div>
                  <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-500 h-full rounded-full"
                      style={{
                        width: `${Math.min(100, ((distribution?.high || 0) / (overview?.total_customers || 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-slate-300">Critical Risk (0-39)</span>
                    <span className="text-slate-400">{distribution?.critical || 0} accounts</span>
                  </div>
                  <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-rose-500 h-full rounded-full"
                      style={{
                        width: `${Math.min(100, ((distribution?.critical || 0) / (overview?.total_customers || 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Cohort Matrix */}
          <div className="grid grid-cols-1 gap-8">
            <div className="glass-panel rounded-xl p-6 space-y-6">
              <h4 className="font-bold text-white text-base border-b border-slate-800 pb-3 flex items-center gap-2">
                <Layers className="w-4.5 h-4.5 text-cyan-400" />
                Cohort Retention Analysis
              </h4>
              <p className="text-[10px] text-slate-400 font-medium">
                Analysis of customer cohorts grouped by signup month and their corresponding active
                retention rate across 3, 6, and 12 months.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-center border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                      <th className="py-3 text-left">Cohort Month</th>
                      <th className="py-3">New Accounts</th>
                      <th className="py-3">Month 1</th>
                      <th className="py-3">Month 3</th>
                      <th className="py-3">Month 6</th>
                      <th className="py-3">Month 12</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs text-slate-300 font-semibold">
                    {cohorts.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-slate-500 text-center">
                          No cohort retention data available.
                        </td>
                      </tr>
                    ) : (
                      cohorts.map((row) => (
                        <tr key={row.cohortMonth} className="border-b border-slate-900">
                          <td className="py-3.5 text-left font-bold text-white">
                            {row.cohortMonth}
                          </td>
                          <td className="py-3.5">
                            {row.newAccounts} {row.newAccounts === 1 ? 'account' : 'accounts'}
                          </td>
                          <td className={`py-3.5 ${getCohortCellClass(row.m1)}`}>
                            {row.m1 !== null ? `${row.m1}%` : '-'}
                          </td>
                          <td className={`py-3.5 ${getCohortCellClass(row.m3)}`}>
                            {row.m3 !== null ? `${row.m3}%` : '-'}
                          </td>
                          <td className={`py-3.5 ${getCohortCellClass(row.m6)}`}>
                            {row.m6 !== null ? `${row.m6}%` : '-'}
                          </td>
                          <td className={`py-3.5 ${getCohortCellClass(row.m12)}`}>
                            {row.m12 !== null ? `${row.m12}%` : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
