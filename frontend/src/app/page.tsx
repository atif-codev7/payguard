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

      if (accs.length >= 2) {
        if (!selectedSourceId) setSelectedSourceId(accs[0].id);
        if (!selectedDestId) setSelectedDestId(accs[1].id);
      }
    } catch (err) {
      console.error('Failed to load ledger data', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedSourceId, selectedDestId]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
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
    <div className="min-h-screen bg-ink-bg text-ink-primary flex flex-col">
      <Header
        auditSummary={auditSummary}
        onRefresh={loadData}
        isLoading={isLoading}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-6 space-y-6">
        <ArchitectureDiagram />

        <AccountList
          accounts={accounts}
          onSelectAccount={handleSelectAccount}
          selectedSourceId={selectedSourceId}
          selectedDestId={selectedDestId}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

        <LedgerAuditView
          transactions={transactions}
          auditSummary={auditSummary}
          accounts={accounts}
        />
      </main>

      <footer className="border-t border-ink-border bg-ink-deep/60 py-5 text-center text-xs text-ink-muted">
        PayGuard · Double-entry financial ledger · ACID row-level locking
      </footer>
    </div>
  );
}
