'use client';

import React from 'react';
import { ShieldCheck, Activity, Database, Server, RefreshCw } from 'lucide-react';
import { LedgerAuditSummary } from '../lib/types';

interface HeaderProps {
  auditSummary: LedgerAuditSummary | null;
  onRefresh: () => void;
  isLoading: boolean;
}

export const Header: React.FC<HeaderProps> = ({ auditSummary, onRefresh, isLoading }) => {
  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                PayGuard
              </span>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                ACID Ledger
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              High-Concurrency Double-Entry Bookkeeping &amp; Row-Lock Engine
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 sm:space-x-4">
          {/* Invariant Health Badge */}
          {auditSummary && (
            <div
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                auditSummary.is_balanced
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  auditSummary.is_balanced ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                }`}
              />
              <span>
                {auditSummary.is_balanced
                  ? 'Ledger Invariant: Balanced (Zero-Sum)'
                  : `Imbalance: $${(auditSummary.imbalance_cents / 100).toFixed(2)}`}
              </span>
            </div>
          )}

          {/* Engine Spec Badges */}
          <div className="hidden md:flex items-center space-x-2 text-xs text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
            <span className="flex items-center space-x-1">
              <Database className="w-3.5 h-3.5 text-indigo-400" />
              <span>PostgreSQL / Row-Locks</span>
            </span>
            <span className="text-slate-600">|</span>
            <span className="flex items-center space-x-1">
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              <span>Redis Sliding-Window</span>
            </span>
          </div>

          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 text-slate-400 hover:text-white rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors disabled:opacity-50"
            title="Refresh System State"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
    </header>
  );
};
