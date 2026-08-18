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
  const latestRunId = latestRun.run_id;
  const latestRunBatch = runs.filter(r => r.run_id === latestRunId);

  const totalFetched = latestRunBatch.reduce((sum, r) => sum + r.articles_fetched, 0);
  const totalDeduplicated = latestRunBatch.reduce((sum, r) => sum + r.articles_deduplicated, 0);
  const totalWritten = latestRunBatch.reduce((sum, r) => sum + r.articles_written, 0);

  const formattedDate = new Date(latestRun.run_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="bg-white border-b border-slate-200 py-3">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-10 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {latestRun.status === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
          )}
          <span className="font-semibold text-slate-900">Pipeline Status:</span>
          <span className="capitalize text-slate-700">{latestRun.status}</span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-500 flex items-center gap-1" title="The last time the GitHub Action scraper executed">
            <Clock className="w-3 h-3 text-slate-400" />
            Last Execution: {formattedDate}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-slate-600 bg-slate-50 px-3 py-1.5 rounded border border-slate-100">
          <span className="font-semibold text-slate-800 mr-1 hidden lg:inline-block">Latest Run Stats:</span>
          <div className="flex items-center space-x-1.5" title="Total raw RSS items pulled">
            <Database className="w-3.5 h-3.5 text-blue-600" />
            <span>Raw Fetched:</span>
            <strong className="text-slate-900">{totalFetched}</strong>
          </div>
          <span className="text-slate-300">→</span>
          <div className="flex items-center space-x-1.5" title="Items ignored because their title hashes already existed">
            <Filter className="w-3.5 h-3.5 text-purple-600" />
            <span>Deduped:</span>
            <strong className="text-slate-900">{totalDeduplicated}</strong>
          </div>
          <span className="text-slate-300">→</span>
          <div className="flex items-center space-x-1.5" title="Items dropped locally because they don't mention any institution keywords">
            <Filter className="w-3.5 h-3.5 text-orange-500" />
            <span>Pre-Filtered:</span>
            <strong className="text-slate-900">{totalFetched - totalDeduplicated - totalWritten}</strong>
          </div>
          <span className="text-slate-300">→</span>
          <div className="flex items-center space-x-1.5" title="Final number of new, relevant signals extracted by AI">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Net New Signals:</span>
            <strong className="text-slate-900">{totalWritten}</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
