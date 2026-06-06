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

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [distribution, setDistribution] = useState<DistributionData | null>(null);
  const [roiHistory, setRoiHistory] = useState<RoiHistoryItem[]>([]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      const overviewData = await fetchFromApi('/analytics/overview');
      setOverview(overviewData);

      const distData = await fetchFromApi('/analytics/score-distribution');
      setDistribution(distData);

      const historyData = await fetchFromApi('/analytics/roi-history');
      setRoiHistory(historyData);
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

                <div className="grid grid-cols-5 gap-2 text-center items-center">
                  <div className="text-xs font-bold text-left text-emerald-400">Low Risk</div>
                  <div className="bg-emerald-500 text-slate-950 font-bold p-3 text-xs rounded">
                    94%
                  </div>
                  <div className="bg-emerald-600/80 text-emerald-100 font-bold p-3 text-xs rounded">
                    82%
                  </div>
                  <div className="bg-emerald-500 text-slate-950 font-bold p-3 text-xs rounded">
                    91%
                  </div>
                  <div className="bg-emerald-700/60 text-emerald-200 font-bold p-3 text-xs rounded">
                    68%
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-2 text-center items-center">
                  <div className="text-xs font-bold text-left text-amber-400">Medium Risk</div>
                  <div className="bg-amber-600/70 text-amber-100 font-bold p-3 text-xs rounded">
                    78%
                  </div>
                  <div className="bg-amber-600/50 text-amber-200 font-bold p-3 text-xs rounded">
                    54%
                  </div>
                  <div className="bg-amber-600/60 text-amber-100 font-bold p-3 text-xs rounded">
                    68%
                  </div>
                  <div className="bg-slate-900 text-slate-500 p-3 text-xs rounded">32%</div>
                </div>

                <div className="grid grid-cols-5 gap-2 text-center items-center">
                  <div className="text-xs font-bold text-left text-orange-400">High Risk</div>
                  <div className="bg-orange-800/40 text-orange-200 font-bold p-3 text-xs rounded">
                    46%
                  </div>
                  <div className="bg-slate-900 text-slate-500 p-3 text-xs rounded">25%</div>
                  <div className="bg-orange-800/30 text-orange-200 p-3 text-xs rounded">38%</div>
                  <div className="bg-slate-950 text-slate-700 p-3 text-xs rounded">14%</div>
                </div>

                <div className="grid grid-cols-5 gap-2 text-center items-center">
                  <div className="text-xs font-bold text-left text-rose-500">Critical</div>
                  <div className="bg-rose-950/20 text-rose-400 p-3 text-xs rounded">18%</div>
                  <div className="bg-slate-950 text-slate-700 p-3 text-xs rounded">8%</div>
                  <div className="bg-rose-950/10 text-rose-500 p-3 text-xs rounded">12%</div>
                  <div className="bg-slate-950 text-slate-700 p-3 text-xs rounded">2%</div>
                </div>
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
                    <tr className="border-b border-slate-900">
                      <td className="py-3.5 text-left font-bold text-white">January 2026</td>
                      <td className="py-3.5">24 accounts</td>
                      <td className="py-3.5 bg-emerald-500/10 text-emerald-400 font-bold">100%</td>
                      <td className="py-3.5 bg-emerald-600/10 text-emerald-400 font-bold">92%</td>
                      <td className="py-3.5 bg-cyan-600/10 text-cyan-400 font-bold">87%</td>
                      <td className="py-3.5 bg-cyan-700/10 text-cyan-300">79%</td>
                    </tr>
                    <tr className="border-b border-slate-900">
                      <td className="py-3.5 text-left font-bold text-white">February 2026</td>
                      <td className="py-3.5">32 accounts</td>
                      <td className="py-3.5 bg-emerald-500/10 text-emerald-400 font-bold">100%</td>
                      <td className="py-3.5 bg-emerald-600/10 text-emerald-400 font-bold">95%</td>
                      <td className="py-3.5 bg-cyan-600/10 text-cyan-400 font-bold">89%</td>
                      <td className="py-3.5 text-slate-600">-</td>
                    </tr>
                    <tr className="border-b border-slate-900">
                      <td className="py-3.5 text-left font-bold text-white">March 2026</td>
                      <td className="py-3.5">40 accounts</td>
                      <td className="py-3.5 bg-emerald-500/10 text-emerald-400 font-bold">100%</td>
                      <td className="py-3.5 bg-emerald-500/10 text-emerald-400 font-bold">91%</td>
                      <td className="py-3.5 text-slate-600">-</td>
                      <td className="py-3.5 text-slate-600">-</td>
                    </tr>
                    <tr className="border-b border-slate-900">
                      <td className="py-3.5 text-left font-bold text-white">April 2026</td>
                      <td className="py-3.5">18 accounts</td>
                      <td className="py-3.5 bg-emerald-500/10 text-emerald-400 font-bold">100%</td>
                      <td className="py-3.5 text-slate-600">-</td>
                      <td className="py-3.5 text-slate-600">-</td>
                      <td className="py-3.5 text-slate-600">-</td>
                    </tr>
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
