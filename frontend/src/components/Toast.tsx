'use client';

import React, { useEffect } from 'react';

interface ToastProps {
  isOpen: boolean;
  totalSignals?: number;
  onClose: () => void;
  autoDismissMs?: number;
}

export const Toast: React.FC<ToastProps> = ({
  isOpen,
  totalSignals = 100,
  onClose,
  autoDismissMs = 4500,
}) => {
  useEffect(() => {
    if (!isOpen || !autoDismissMs) return;
    const timer = setTimeout(() => {
      onClose();
    }, autoDismissMs);
    return () => clearTimeout(timer);
  }, [isOpen, autoDismissMs, onClose]);

  return (
    <div
      role="alert"
      className={`toast-v2 ${isOpen ? 'visible' : ''}`}
    >
      <div className="badge-pill">Limit Exceeded</div>
      <div className="text-block">
        <strong>{totalSignals} signals filtered.</strong> Filter below 100 to export CSV or PDF.
      </div>
      <button
        onClick={onClose}
        className="close-pill"
        aria-label="Dismiss toast"
      >
        ✕
      </button>
    </div>
  );
};

