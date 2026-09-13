'use client';

import React, { useRef, useState } from 'react';
import { Activity, RefreshCw, Download, ChevronDown, FileText, TableIcon } from 'lucide-react';
import { Toast } from './Toast';

interface HeaderProps {
  totalSignals: number;
  isLive: boolean;
  isRefreshing: boolean;
  isExporting: boolean;
  onRefresh: () => void;
  onExport: (format: 'csv' | 'pdf') => void | Promise<void>;
}

export const Header: React.FC<HeaderProps> = ({
  totalSignals,
  isLive,
  isRefreshing,
  isExporting,
  onRefresh,
  onExport,
}) => {
  const [exportOpen, setExportOpen] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [toastOpen, setToastOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleExportOption = async (format: 'csv' | 'pdf') => {
    setExportError(null);

    if (totalSignals > 100) {
      setExportOpen(false);
      setToastOpen(true);
      return;
    }

    try {
      await onExport(format);
      setExportOpen(false);
    } catch (err: any) {
      const msg: string = err?.message ?? '';
      if (msg.startsWith('TOO_MANY_SIGNALS')) {
        setExportOpen(false);
        setToastOpen(true);
      } else {
        setExportError(msg || 'Export failed. Please try again.');
      }
    }
  };

  return (
    <>
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="header-inner">
          {/* Brand & Title */}
          <div className="header-title-container">
            <div className="w-9 h-9 shrink-0 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <Activity className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-semibold text-slate-900 leading-snug truncate">
                Signal Tracker
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">
                Tracking 38 institutes
              </p>
            </div>
          </div>

          {/* Status Indicators & Fetch */}
          <div className="header-actions">
            {/* Export Button (Option A Badge - Matching Prototype) */}
            <div className="export-wrap shrink-0" ref={exportRef}>
              <button
                id="export-button"
                onClick={() => {
                  setExportOpen((prev) => !prev);
                  setExportError(null);
                }}
                disabled={isExporting || totalSignals === 0}
                className="hig-button flex items-center gap-1.5 text-xs whitespace-nowrap"
                title="Export visible signals"
              >
                {isExporting ? (
                  <span className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin inline-block" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-slate-600" />
                )}
                <span>Export</span>
                
                {/* Option A Badge — 1:1 match with Prototype */}
                <span className={`export-badge ${totalSignals > 100 ? 'warn' : ''}`}>
                  {totalSignals}
                </span>

                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-150 ${exportOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Export Dropdown — Exact 1:1 match with Prototype */}
              {exportOpen && (
                <div className="export-dropdown">
                  <div className="dropdown-inner">
                    <button
                      id="export-csv-option"
                      onClick={() => handleExportOption('csv')}
                      className="dropdown-item"
                    >
                      <div className="icon">
                        <TableIcon />
                      </div>
                      <div>
                        <div className="label">Download CSV</div>
                        <div className="sub">Spreadsheet with summary</div>
                      </div>
                    </button>

                    <div className="dropdown-divider" />

                    <button
                      id="export-pdf-option"
                      onClick={() => handleExportOption('pdf')}
                      className="dropdown-item"
                    >
                      <div className="icon">
                        <FileText />
                      </div>
                      <div>
                        <div className="label">Preview PDF</div>
                        <div className="sub">Print-ready document</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Fetch Button */}
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="hig-button !px-2.5 !py-1.5 flex items-center gap-1.5 text-xs whitespace-nowrap shadow-sm hover:shadow transition-all"
              title="Fetch signals from pipeline"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-slate-600 ${
                  isRefreshing ? 'animate-spin' : ''
                }`}
              />
              <span>Fetch</span>
            </button>
          </div>
        </div>
      </header>

      {/* Toast Notification — Option 2 Apple Light Pill */}
      <Toast
        isOpen={toastOpen}
        totalSignals={totalSignals}
        onClose={() => setToastOpen(false)}
      />
    </>
  );
};


