'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from '../components/Header';
import { AccountList } from '../components/AccountList';
import { TransferModal } from '../components/TransferModal';
import { ConcurrencyStressTest } from '../components/ConcurrencyStressTest';
import { LedgerAuditView } from '../components/LedgerAuditView';
import { ArchitectureDiagram } from '../components/ArchitectureDiagram';
import { Account, LedgerTransaction, LedgerAuditSummary } from '../lib/types';
import { fetchAccounts, fetchTransactions, fetchAuditSummary } from '../lib/api';

export default function DashboardPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [auditSummary, setAuditSummary] = useState<LedgerAuditSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedSourceId, setSelectedSourceId] = useState<string>('');
  const [selectedDestId, setSelectedDestId] = useState<string>('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [accs, txs, audit] = await Promise.all([
        fetchAccounts().catch(() => []),
        fetchTransactions(50).catch(() => []),
        fetchAuditSummary().catch(() => null),
      ]);
      setAccounts(accs);
      setTransactions(txs);
      setAuditSummary(audit);

      // Pre-select defaults if not yet selected
      if (accs.length >= 2) {
        if (!selectedSourceId) setSelectedSourceId(accs[0].id);
        if (!selectedDestId) setSelectedDestId(accs[1].id);
      }
    } catch (err) {
      console.error('Failed to load PayGuard dashboard data', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedSourceId, selectedDestId]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // 10s auto-refresh
    return () => clearInterval(interval);
  }, [loadData]);

  const handleSelectAccount = (account: Account, role: 'source' | 'destination') => {
    if (role === 'source') {
      setSelectedSourceId(account.id);
    } else {
      setSelectedDestId(account.id);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Header
        auditSummary={auditSummary}
        onRefresh={loadData}
        isLoading={isLoading}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Architecture Spec Banner */}
        <ArchitectureDiagram />

        {/* Account Cards */}
        <AccountList
          accounts={accounts}
          onSelectAccount={handleSelectAccount}
          selectedSourceId={selectedSourceId}
          selectedDestId={selectedDestId}
        />

        {/* Transfer Terminal & Concurrency Simulator */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <TransferModal
            accounts={accounts}
            selectedSourceId={selectedSourceId}
            selectedDestId={selectedDestId}
            onSourceChange={setSelectedSourceId}
            onDestChange={setSelectedDestId}
            onSuccess={loadData}
          />

          <ConcurrencyStressTest
            accounts={accounts}
            onTestComplete={loadData}
          />
        </div>

        {/* Double-Entry Ledger Audit Trail */}
        <LedgerAuditView
          transactions={transactions}
          auditSummary={auditSummary}
          accounts={accounts}
        />
      </main>

      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-center text-xs text-slate-500 font-mono">
        PayGuard Flagship Architectural Portfolio | Python FastAPI · PostgreSQL ACID Row-Locks · Redis · Next.js · AWS ECS Fargate
      </footer>
    </div>
  );
}
