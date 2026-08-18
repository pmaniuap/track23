'use client';

import React from 'react';
import { FilterState, EventType, InstitutionName, InstitutionCategory } from '../types';
import { Search, RotateCcw } from 'lucide-react';

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (newFilters: Partial<FilterState>) => void;
  onReset: () => void;
}

const INSTITUTIONS_LIST: InstitutionName[] = [
  'Revolut',
  'Monzo',
  'Nubank',
  'Starling Bank',
  'DBS',
  'OCBC',
  'UOB',
  'Standard Chartered',
  'MAS',
  'JPMorgan Chase',
  'Citigroup',
  'HSBC',
  'MUFG',
  'BBVA',
  'BNP Paribas',
  'Nordea',
  'FCA',
  'Federal Reserve',
  'OCC',
  'SWIFT',
  'TCH',
  'Visa',
  'Mastercard',
  'American Express',
  'RBI',
  'IFSCA',
  'HDFC Bank',
  'State Bank of India',
  'IDFC FIRST Bank',
  'Axis Bank',
  'AU Small Finance Bank',
  'NPCI',
  'UPI',
  'Bharat Bill Payment System',
  'PhonePe',
  'Razorpay',
  'Paytm',
  'CRED',
];

const EVENT_TYPES_LIST: EventType[] = [
  'Product Launch',
  'Investment/M&A',
  'Strategic Pivot',
  'KMP Hire',
  'Regulatory Action',
  'Partnership',
  'Technology Adoption',
];

const CATEGORIES_LIST: InstitutionCategory[] = [
  'Regulator',
  'Bank',
  'Payment Rails',
  'Challenger',
];

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
  onReset,
}) => {
  const hasActiveFilters =
    Boolean(filters.searchQuery) ||
    Boolean(filters.selectedInstitution) ||
    Boolean(filters.selectedEventType) ||
    Boolean(filters.selectedCategory) ||
    Boolean(filters.selectedRegion !== 'All') ||
    Boolean((filters as any).selectedTier);

  return (
    <div className="bg-white border-b border-slate-200 py-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-4">
        {/* Search Bar Container with Fixed Relative Icon Placement */}
        <div style={{ position: 'relative', width: '100%' }}>
          <Search
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '16px',
              height: '16px',
              color: '#94a3b8',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => onFilterChange({ searchQuery: e.target.value })}
            placeholder="Search signals by keyword, technology, or title..."
            style={{
              width: '100%',
              paddingLeft: '38px',
              paddingRight: '12px',
              paddingTop: '8px',
              paddingBottom: '8px',
            }}
            className="hig-input text-sm text-slate-900 placeholder:text-slate-400"
          />
        </div>

        {/* Dropdown Filters and Region Chips */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Region Filter Chips */}
          <div className="flex items-center space-x-1">
            {(['All', 'Indian', 'International'] as const).map((region) => (
              <button
                key={region}
                onClick={() => onFilterChange({ selectedRegion: region })}
                className={`px-3 py-1.5 text-xs rounded-md font-medium transition-all ${
                  filters.selectedRegion === region
                    ? 'bg-white text-slate-900 border border-slate-300 shadow-sm'
                    : 'text-slate-400 hover:text-slate-600 border border-transparent bg-transparent'
                }`}
              >
                {region === 'All' ? 'All Regions' : region === 'Indian' ? '🇮🇳 Indian' : '🌐 International'}
              </button>
            ))}
          </div>

          {/* Category Filter */}
          <div className="flex items-center space-x-1">
            <select
              value={filters.selectedCategory || ''}
              onChange={(e) => onFilterChange({ selectedCategory: e.target.value })}
              className="hig-input py-2 px-3 text-xs bg-white text-slate-800 font-medium"
            >
              <option value="">All Categories</option>
              {CATEGORIES_LIST.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Institution Filter */}
          <div className="flex-none">
            <select
              value={filters.selectedInstitution}
              onChange={(e) => onFilterChange({ selectedInstitution: e.target.value })}
              className="hig-input py-2 px-3 text-xs bg-white text-slate-800"
            >
              <option value="">All Institutions (37)</option>
              {INSTITUTIONS_LIST.map((inst) => (
                <option key={inst} value={inst}>
                  {inst}
                </option>
              ))}
            </select>
          </div>

          {/* Event Type Filter */}
          <div className="flex-none">
            <select
              value={filters.selectedEventType}
              onChange={(e) => onFilterChange({ selectedEventType: e.target.value })}
              className="hig-input py-2 px-3 text-xs bg-white text-slate-800"
            >
              <option value="">All Event Types</option>
              {EVENT_TYPES_LIST.map((evt) => (
                <option key={evt} value={evt}>
                  {evt}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div className="flex-none">
            <select
              value={filters.sortBy}
              onChange={(e) =>
                onFilterChange({ sortBy: e.target.value as 'latest' | 'oldest' })
              }
              className="hig-input py-2 px-3 text-xs bg-white text-slate-800"
            >
              <option value="latest">Sort: Newest First</option>
              <option value="oldest">Sort: Oldest First</option>
            </select>
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <div className="flex-none">
              <button
                onClick={onReset}
                className="hig-button h-[34px] px-3 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 flex items-center justify-center gap-1.5"
                title="Reset all filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="font-medium leading-none">Reset</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
