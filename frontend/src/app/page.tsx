'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { FilterState, MarketSignal, PipelineRun, getInstitutionCategory, getInstitutionRegion } from '../types';
import { fetchMarketSignals, fetchPipelineRuns } from '../lib/supabase';
import { downloadCSV, openPDFPreview } from '../lib/exportUtils';
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
  selectedRegion: 'All',
  sortBy: 'latest',
  showStarredOnly: false,
};

export default function DashboardPage() {
  const [signals, setSignals] = useState<MarketSignal[]>([]);
  const [runs, setRuns] = useState<PipelineRun[]>([]);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
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

  const handleToggleStar = async (id: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    
    setSignals((prev) =>
      prev.map((sig) =>
        sig.id === id ? { ...sig, is_starred: newStatus } : sig
      )
    );

    if (isLive) {
      const { toggleSignalStar } = await import('../lib/supabase');
      const success = await toggleSignalStar(id, newStatus);
      if (!success) {
        setSignals((prev) =>
          prev.map((sig) =>
            sig.id === id ? { ...sig, is_starred: currentStatus } : sig
          )
        );
      }
    }
  };

  const filteredSignals = useMemo(() => {
    return signals
      .filter((sig) => {
        // Starred Only Filter
        if (filters.showStarredOnly && !sig.is_starred) {
          return false;
        }

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

        // Region Filter
        if (filters.selectedRegion && filters.selectedRegion !== 'All') {
          const region = getInstitutionRegion(sig.institution);
          if (region !== filters.selectedRegion) {
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

  const handleExport = useCallback(async (format: 'csv' | 'pdf') => {
    if (isExporting || filteredSignals.length === 0) return;
    setIsExporting(true);
    try {
      if (format === 'csv') {
        await downloadCSV(filteredSignals, filters);
      } else {
        await openPDFPreview(filteredSignals, filters);
      }
    } finally {
      setIsExporting(false);
    }
  }, [filteredSignals, filters, isExporting]);


  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Bar Header */}
      <Header
        totalSignals={filteredSignals.length}
        isLive={isLive}
        isRefreshing={isRefreshing}
        isExporting={isExporting}
        onRefresh={loadData}
        onExport={handleExport}
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
              <SignalCard 
                key={signal.id} 
                signal={signal} 
                onToggleStar={handleToggleStar}
              />
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
            Monitoring 37 Global Institutions across Regulators, Mega-Banks, Payment Rails, and Challengers. Built on Apple HIG Light Design Principles.
          </p>
        </div>
      </footer>
    </div>
  );
}
