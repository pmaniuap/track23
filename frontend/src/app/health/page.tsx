'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { PipelineRun, MarketSignal, InstitutionName } from '../../types';
import { fetchMarketSignals, fetchPipelineRuns } from '../../lib/supabase';
import { getSourcesConfig, SourceDefinition } from '../actions';
import { Activity, ShieldAlert, Filter } from 'lucide-react';
import Link from 'next/link';

export default function HealthDashboardPage() {
  const [runs, setRuns] = useState<PipelineRun[]>([]);
  const [signals, setSignals] = useState<MarketSignal[]>([]);
  const [sources, setSources] = useState<SourceDefinition[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [signalsRes, runsRes, sourcesRes] = await Promise.all([
          fetchMarketSignals(),
          fetchPipelineRuns(),
          getSourcesConfig()
        ]);
        setSignals(signalsRes.data);
        setRuns(runsRes.data);
        setSources(sourcesRes);
      } catch (err) {
        console.error('Error loading health data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // 1. Noise Ratio per Source (Mapped to sources.yaml)
  const sourceStats = useMemo(() => {
    // Initialize stats from master YAML list
    const stats: Record<string, { fetched: number; written: number; count: number; tier: number }> = {};
    
    sources.forEach(source => {
      stats[source.name] = { fetched: 0, written: 0, count: 0, tier: source.tier };
    });

    // Populate with actual DB runs
    runs.forEach((r) => {
      if (!stats[r.source_name]) {
        stats[r.source_name] = { fetched: 0, written: 0, count: 0, tier: 3 }; // fallback if not in yaml
      }
      stats[r.source_name].fetched += r.articles_fetched;
      stats[r.source_name].written += r.articles_written;
      stats[r.source_name].count += 1;
    });

    // Group by tier
    const grouped = {
      1: [] as any[],
      2: [] as any[],
      3: [] as any[],
    };

    Object.entries(stats).forEach(([sourceName, data]) => {
      const noiseRatio = data.fetched > 0 ? ((data.fetched - data.written) / data.fetched) * 100 : 0;
      const statObj = {
        source: sourceName,
        fetched: data.fetched,
        written: data.written,
        noiseRatio: noiseRatio.toFixed(1),
        runs: data.count,
      };
      
      if (data.tier === 1) grouped[1].push(statObj);
      else if (data.tier === 2) grouped[2].push(statObj);
      else grouped[3].push(statObj);
    });

    // Sort each tier by noise ratio
    const sortFn = (a: any, b: any) => parseFloat(b.noiseRatio) - parseFloat(a.noiseRatio);
    grouped[1].sort(sortFn);
    grouped[2].sort(sortFn);
    grouped[3].sort(sortFn);

    return grouped;
  }, [runs, sources]);

  // 2. Coverage Gaps (Institutions with 0 signals in last 7 days)
  const coverageGaps = useMemo(() => {
    const ALL_INSTITUTIONS: InstitutionName[] = [
      'Revolut', 'Monzo', 'Nubank', 'Starling Bank', 'DBS', 'OCBC', 'UOB',
      'Standard Chartered', 'MAS', 'JPMorgan Chase', 'Citigroup', 'HSBC', 'MUFG',
      'BBVA', 'BNP Paribas', 'Nordea', 'FCA', 'Federal Reserve', 'OCC', 'SWIFT',
      'TCH', 'Visa', 'Mastercard', 'American Express', 'RBI', 'IFSCA', 'HDFC Bank',
      'State Bank of India', 'IDFC FIRST Bank', 'Axis Bank', 'AU Small Finance Bank',
      'NPCI', 'UPI', 'Bharat Bill Payment System', 'PhonePe', 'Razorpay', 'Paytm', 'CRED'
    ];

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentSignals = signals.filter(s => new Date(s.published_at) >= sevenDaysAgo);
    const coveredInstitutions = new Set(recentSignals.map(s => s.institution));

    return ALL_INSTITUTIONS.filter(inst => !coveredInstitutions.has(inst as InstitutionName));
  }, [signals]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const renderTierTable = (tier: number, stats: any[], title: string) => {
    return (
      <div className="mt-8 border border-slate-200 rounded-xl shadow-sm overflow-hidden bg-white">
        <div className="px-6 py-3 border-b border-slate-200 bg-slate-100 flex items-center">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">{title} (Tier {tier})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 w-16">#</th>
                <th className="px-6 py-3">Source Name</th>
                <th className="px-6 py-3">Runs (Historical)</th>
                <th className="px-6 py-3 text-right">Total Articles Fetched</th>
                <th className="px-6 py-3 text-right">Net Signals</th>
                <th className="px-6 py-3 text-right">Noise Ratio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.map((stat, index) => (
                <tr key={stat.source} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-400">{index + 1}</td>
                  <td className="px-6 py-4 font-medium text-slate-900">{stat.source}</td>
                  <td className="px-6 py-4 text-slate-500">{stat.runs}</td>
                  <td className="px-6 py-4 text-slate-700 text-right">{stat.fetched.toLocaleString()}</td>
                  <td className="px-6 py-4 text-slate-900 font-semibold text-right">{stat.written.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      parseFloat(stat.noiseRatio) > 85 ? 'bg-rose-100 text-rose-700' :
                      parseFloat(stat.noiseRatio) > 50 ? 'bg-amber-100 text-amber-700' :
                      'bg-emerald-100 text-emerald-700'
                    }`}>
                      {stat.noiseRatio}% Noise
                    </span>
                  </td>
                </tr>
              ))}
              {stats.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">No sources found for this tier.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-12">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center text-white shadow-sm">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900 leading-tight">Pipeline Health</h1>
              <p className="text-xs text-slate-500 font-medium">Source quality & coverage gaps</p>
            </div>
          </div>
          <Link href="/" className="text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 px-4 py-2 rounded-md">
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-6">
        
        {/* Coverage Gaps Widget */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-semibold text-slate-800">Coverage Gaps (Last 7 Days)</h2>
          </div>
          <div className="p-6">
            <p className="text-sm text-slate-600 mb-4">
              The following institutions have had <strong>0 signals</strong> detected in the past 7 days. Ensure your sources in <code>sources.yaml</code> actively cover these entities.
            </p>
            {coverageGaps.length === 0 ? (
              <div className="bg-emerald-50 text-emerald-700 px-4 py-3 rounded-md text-sm font-medium">
                Excellent! All {37} monitored institutions have recent signals.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {coverageGaps.map(inst => (
                  <span key={inst} className="bg-rose-50 text-rose-700 border border-rose-200 px-3 py-1.5 rounded-md text-xs font-medium">
                    {inst}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Source Noise Ratio Widget */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
            <Filter className="w-5 h-5 text-blue-500" />
            <h2 className="text-base font-semibold text-slate-800">Source Efficiency & Noise Ratio</h2>
          </div>
          
          <div className="p-4 bg-slate-50">
            {renderTierTable(1, sourceStats[1], "Tier 1 (Highest Quality)")}
            {renderTierTable(2, sourceStats[2], "Tier 2 (Medium Quality)")}
            {renderTierTable(3, sourceStats[3], "Tier 3 (Lower Quality/General)")}
          </div>
        </div>
      </main>
    </div>
  );
}
