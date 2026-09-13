'use client';

import React from 'react';
import { MarketSignal, getInstitutionCategory } from '../types';
import { ExternalLink, Cpu, Building2, Calendar, Star } from 'lucide-react';

interface SignalCardProps {
  signal: MarketSignal;
  onToggleStar?: (id: string, currentStatus: boolean) => void;
}

export const SignalCard: React.FC<SignalCardProps> = ({ signal, onToggleStar }) => {
  const formattedDate = new Date(signal.published_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const category = getInstitutionCategory(signal.institution);

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'Regulator':
        return <span className="bg-slate-100 text-slate-700 border border-slate-300 text-[11px] font-medium px-2 py-0.5 rounded-md">Regulator</span>;
      case 'Bank':
        return <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-medium px-2 py-0.5 rounded-md">Bank</span>;
      case 'Payment Rails':
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium px-2 py-0.5 rounded-md">Payment Rails</span>;
      case 'Challenger':
        return <span className="bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-medium px-2 py-0.5 rounded-md">Challenger</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 text-[11px] font-medium px-2 py-0.5 rounded-md">{cat}</span>;
    }
  };

  const getEventBadge = (eventType: string) => {
    switch (eventType) {
      case 'Product Launch':
        return <span className="badge-event-product text-[11px] font-medium px-2 py-0.5 rounded-md">Product Launch</span>;
      case 'Investment/M&A':
        return <span className="badge-event-ma text-[11px] font-medium px-2 py-0.5 rounded-md">Investment / M&A</span>;
      case 'Regulatory Action':
        return <span className="badge-event-regulatory text-[11px] font-medium px-2 py-0.5 rounded-md">Regulatory Action</span>;
      case 'Technology Adoption':
        return <span className="badge-event-tech text-[11px] font-medium px-2 py-0.5 rounded-md">Tech Adoption</span>;
      default:
        return <span className="badge-event-default text-[11px] font-medium px-2 py-0.5 rounded-md">{eventType}</span>;
    }
  };

  return (
    <article className="hig-card p-5 flex flex-col justify-between h-full bg-white">
      <div>
        {/* Top Badges Row */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
            <Building2 className="w-3.5 h-3.5 text-blue-600" />
            <span>{signal.institution}</span>
          </span>
          <button
            onClick={() => onToggleStar && onToggleStar(signal.id, !!signal.is_starred)}
            className="text-slate-400 hover:text-yellow-500 transition-colors cursor-pointer"
            title={signal.is_starred ? 'Remove Star' : 'Star this item'}
          >
            <Star
              className={`w-5 h-5 hover:fill-yellow-100 ${
                signal.is_starred ? 'fill-current text-yellow-500' : ''
              }`}
            />
          </button>
        </div>

        {/* Article Raw Title */}
        <h3 className="text-base font-semibold text-slate-900 leading-snug mb-2 hover:text-blue-600 transition-colors">
          <a href={signal.source_url} target="_blank" rel="noopener noreferrer">
            {signal.raw_title}
          </a>
        </h3>

        {/* The "So What" Analytical Summary */}
        <div className="so-what-box">
          <span className="text-[11px] font-bold tracking-wider text-blue-700 uppercase block mb-1">
            The Core Impact ("So What")
          </span>
          <p className="text-xs text-slate-700 leading-relaxed font-normal">
            {signal.so_what}
          </p>
        </div>

        {/* Tags Row */}
        <div className="flex items-center flex-wrap gap-1.5 mt-3 mb-2">
          {getEventBadge(signal.event_type)}
          {getCategoryBadge(category)}
          {signal.technologies && signal.technologies.length > 0 && (
            <>
              <span className="text-slate-300 mx-1 text-xs">•</span>
              <Cpu className="w-3 h-3 text-slate-400 ml-0.5" />
              {signal.technologies.map((tech, idx) => (
                <span
                  key={idx}
                  className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-mono"
                >
                  {tech}
                </span>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Card Footer */}
      <div className="pt-3 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center space-x-2">
          <span className="font-medium text-slate-700">{signal.source_name}</span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3 text-slate-400" />
            {formattedDate}
          </span>
        </div>

        <a
          href={signal.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1 hover:underline"
        >
          <span>View Source</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </article>
  );
};
