'use client';

import React from 'react';
import { SearchX, RotateCcw } from 'lucide-react';

interface EmptyStateProps {
  onReset: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onReset }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-12 text-center max-w-md mx-auto my-12 shadow-sm">
      <div className="flex items-center justify-center text-slate-400 mx-auto mb-4">
        <SearchX className="w-10 h-10" strokeWidth={1.5} />
      </div>
      <h3 className="text-base font-semibold text-slate-900 mb-1">
        No Market Signals Found
      </h3>
      <p className="text-xs text-slate-500 mb-6 leading-relaxed">
        No intelligence reports match your current filter parameters or search term. Try adjusting your selections.
      </p>
      <button
        onClick={onReset}
        className="hig-button-primary flex items-center justify-center gap-1.5 mx-auto"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        <span className="text-xs font-medium translate-y-[1px]">Reset Filters</span>
      </button>
    </div>
  );
};
