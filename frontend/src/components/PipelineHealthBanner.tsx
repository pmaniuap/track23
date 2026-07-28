'use client';

import React from 'react';
import { PipelineRun } from '../types';
import { CheckCircle2, AlertTriangle, Clock, Database, Filter } from 'lucide-react';

interface PipelineHealthBannerProps {
  runs: PipelineRun[];
}

export const PipelineHealthBanner: React.FC<PipelineHealthBannerProps> = ({ runs }) => {
  if (!runs || runs.length === 0) return null;

  const latestRun = runs[0];
  const formattedDate = new Date(latestRun.run_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="bg-white border-b border-slate-200 py-3 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center space-x-2">
          {latestRun.status === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
          )}
          <span className="font-semibold text-slate-900">Pipeline Status:</span>
          <span className="capitalize text-slate-700">{latestRun.status}</span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-500 flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" />
            Last Execution: {formattedDate}
          </span>
        </div>

        <div className="flex items-center space-x-6 text-slate-600">
          <div className="flex items-center space-x-1.5">
            <Database className="w-3.5 h-3.5 text-blue-600" />
            <span>Fetched:</span>
            <strong className="text-slate-900">{latestRun.articles_fetched}</strong>
          </div>
          <div className="flex items-center space-x-1.5">
            <Filter className="w-3.5 h-3.5 text-purple-600" />
            <span>Deduplicated:</span>
            <strong className="text-slate-900">{latestRun.articles_deduplicated}</strong>
          </div>
          <div className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Net Signals:</span>
            <strong className="text-slate-900">{latestRun.articles_written}</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
