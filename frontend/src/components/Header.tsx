'use client';

import React from 'react';
import { Activity, RefreshCw, Layers } from 'lucide-react';

interface HeaderProps {
  totalSignals: number;
  isLive: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  totalSignals,
  isLive,
  isRefreshing,
  onRefresh,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Title */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900 leading-tight">
              Financial Market Intelligence Radar
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Global Strategic Moves & Tech Ingestion Pipeline
            </p>
          </div>
        </div>

        {/* Status Indicators & Refresh */}
        <div className="flex items-center space-x-4">
          {/* Signal Counter */}
          <div className="hidden sm:flex items-center space-x-1.5 text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-md border border-slate-200">
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-semibold text-slate-900">{totalSignals}</span>
            <span>Signals</span>
          </div>

          {/* Mode Pill */}
          <div className="flex items-center space-x-1.5 text-xs px-2.5 py-1 rounded-full font-medium border border-slate-200">
            <span
              className={`w-2 h-2 rounded-full ${
                isLive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="text-slate-700">
              {isLive ? 'Live Supabase DB' : 'Demo / Sample Mode'}
            </span>
          </div>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="hig-button flex items-center space-x-2 text-xs"
            title="Refresh signals from pipeline"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-slate-600 ${
                isRefreshing ? 'animate-spin' : ''
              }`}
            />
            <span className="hidden md:inline">Refresh Data</span>
          </button>
        </div>
      </div>
    </header>
  );
};
