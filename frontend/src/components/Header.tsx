'use client';

import React from 'react';
import { ShieldCheck, Activity, Database, RefreshCw } from 'lucide-react';
import { LedgerAuditSummary } from '../lib/types';

interface HeaderProps {
  auditSummary: LedgerAuditSummary | null;
  onRefresh: () => void;
  isLoading: boolean;
}

export const Header: React.FC<HeaderProps> = ({ auditSummary, onRefresh, isLoading }) => {
  return (
    <header className="border-b border-ink-border bg-ink-deep/90 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-control bg-ink-raised border border-ink-border flex items-center justify-center text-ink-primary">
            <ShieldCheck className="w-4 h-4 text-ink-secondary" strokeWidth={1.5} />
          </div>
          <div className="flex items-center space-x-2.5">
            <span className="text-sm font-medium tracking-tight text-ink-primary">
              PayGuard
            </span>
            <span className="px-2 py-0.5 text-xs text-ink-secondary bg-ink-raised border border-ink-border rounded-tag">
              Double-Entry Ledger
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Invariant Health Indicator */}
          {auditSummary && (
            <div className="flex items-center space-x-2 px-2.5 py-1 rounded-control bg-ink-card border border-ink-border text-xs">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  auditSummary.is_balanced ? 'bg-ink-positive' : 'bg-ink-negative'
                }`}
              />
              <span className="text-ink-secondary">
                {auditSummary.is_balanced
                  ? 'Ledger zero-sum verified'
                  : `Imbalance: $${(auditSummary.imbalance_cents / 100).toFixed(2)}`}
              </span>
            </div>
          )}

          {/* Engine Spec Chips */}
          <div className="hidden md:flex items-center space-x-3 text-xs text-ink-muted bg-ink-card border border-ink-border px-3 py-1 rounded-control">
            <span className="flex items-center space-x-1.5">
              <Database className="w-3.5 h-3.5 text-ink-muted" strokeWidth={1.5} />
              <span className="text-ink-secondary">PostgreSQL</span>
            </span>
            <span className="text-ink-muted/40">/</span>
            <span className="flex items-center space-x-1.5">
              <Activity className="w-3.5 h-3.5 text-ink-muted" strokeWidth={1.5} />
              <span className="text-ink-secondary">Redis</span>
            </span>
          </div>

          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1.5 text-ink-muted hover:text-ink-primary rounded-control bg-ink-card hover:bg-ink-raised border border-ink-border transition-colors disabled:opacity-50"
            title="Refresh state"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </header>
  );
};
