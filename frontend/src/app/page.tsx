'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { FilterState, MarketSignal, PipelineRun, getInstitutionCategory } from '../types';
import { fetchMarketSignals, fetchPipelineRuns } from '../lib/supabase';
import { Header } from '../components/Header';
import { PipelineHealthBanner } from '../components/PipelineHealthBanner';
import { FilterBar } from '../components/FilterBar';
import { SignalCard } from '../components/SignalCard';
import { EmptyState } from '../components/EmptyState';

const initialFilters: FilterState = {
  searchQuery: '',
  selectedInstitution: '',
  selectedEventType: '',
  selectedCategory: '',
  sortBy: 'latest',
};

export default function DashboardPage() {
  const [signals, setSignals] = useState<MarketSignal[]>([]);
  const [runs, setRuns] = useState<PipelineRun[]>([]);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [filters, setFilters] = useState<FilterState>(initialFilters);

  const loadData = async () => {
    setIsRefreshing(true);
    try {
      const [signalsRes, runsRes] = await Promise.all([
        fetchMarketSignals(),
        fetchPipelineRuns(),
      ]);
      setSignals(signalsRes.data);
      setIsLive(signalsRes.isLive);
      setRuns(runsRes.data);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const handleResetFilters = () => {
    setFilters(initialFilters);
  };

  const filteredSignals = useMemo(() => {
    return signals
      .filter((sig) => {
        // Keyword Search Filter
        if (filters.searchQuery.trim()) {
          const q = filters.searchQuery.toLowerCase();
          const matchTitle = sig.raw_title.toLowerCase().includes(q);
          const matchSoWhat = sig.so_what.toLowerCase().includes(q);
          const matchInst = sig.institution.toLowerCase().includes(q);
          const matchTech = sig.technologies.some((t) => t.toLowerCase().includes(q));
          if (!matchTitle && !matchSoWhat && !matchInst && !matchTech) {
            return false;
          }
        }

        // Category Filter (Regulator / Bank / Payment Rails / Challenger)
        if (filters.selectedCategory) {
          const cat = getInstitutionCategory(sig.institution);
          if (cat.toLowerCase() !== filters.selectedCategory.toLowerCase()) {
            return false;
          }
        }

        // Institution Filter
        if (
          filters.selectedInstitution &&
          sig.institution.toLowerCase() !== filters.selectedInstitution.toLowerCase()
        ) {
          return false;
        }

        // Event Type Filter
        if (
          filters.selectedEventType &&
          sig.event_type.toLowerCase() !== filters.selectedEventType.toLowerCase()
        ) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        const dateA = new Date(a.published_at).getTime();
        const dateB = new Date(b.published_at).getTime();
        return filters.sortBy === 'latest' ? dateB - dateA : dateA - dateB;
      });
  }, [signals, filters]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Bar Header */}
      <Header
        totalSignals={filteredSignals.length}
        isLive={isLive}
        isRefreshing={isRefreshing}
        onRefresh={loadData}
      />

      {/* Pipeline Health Banner */}
      <PipelineHealthBanner runs={runs} />

      {/* Filter Toolbar */}
      <FilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="py-24 text-center">
            <div className="inline-block w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs text-slate-500 font-medium">Loading Market Intelligence Signals...</p>
          </div>
        ) : filteredSignals.length > 0 ? (
          <div className="grid-signals">
            {filteredSignals.map((signal) => (
              <SignalCard key={signal.id} signal={signal} />
            ))}
          </div>
        ) : (
          <EmptyState onReset={handleResetFilters} />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4">
          <p className="font-medium text-slate-700">
            Financial Market Intelligence Tracker — Early Warning Radar for Global Finance
          </p>
          <p className="mt-1 text-slate-400">
            Monitoring 23 Global Institutions across Regulators, Mega-Banks, Payment Rails, and Challengers. Built on Apple HIG Light Design Principles.
          </p>
        </div>
      </footer>
    </div>
  );
}
