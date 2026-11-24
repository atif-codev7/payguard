'use client';

import React from 'react';
import { BookOpen, Scale } from 'lucide-react';
import { LedgerTransaction, LedgerAuditSummary, Account } from '../lib/types';

interface LedgerAuditViewProps {
  transactions: LedgerTransaction[];
  auditSummary: LedgerAuditSummary | null;
  accounts: Account[];
}

export const LedgerAuditView: React.FC<LedgerAuditViewProps> = ({
  transactions,
  auditSummary,
  accounts,
}) => {
  const accountMap = new Map(accounts.map((a) => [a.id, a]));

  return (
    <section className="bg-ink-card border border-ink-border rounded-panel p-5 space-y-4">
      {/* Top Banner & Audit Card */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-ink-primary flex items-center space-x-2">
            <BookOpen className="w-4 h-4 text-ink-muted" strokeWidth={1.5} />
            <span>Ledger audit trail</span>
          </h2>
          <p className="text-xs text-ink-muted mt-0.5">
            Immutable double-entry journal records
          </p>
        </div>

        {auditSummary && (
          <div className="p-2.5 bg-ink-bg border border-ink-border rounded-control flex items-center space-x-3 text-xs">
            <div className="flex items-center space-x-2">
              <Scale className="w-3.5 h-3.5 text-ink-muted" strokeWidth={1.5} />
              <div>
                <span className="text-ink-muted">Debits: </span>
                <span className="font-mono text-ink-primary tabular-nums font-medium">
                  ${(auditSummary.total_debits_cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <span className="text-ink-muted/50">=</span>

            <div>
              <span className="text-ink-muted">Credits: </span>
              <span className="font-mono text-ink-primary tabular-nums font-medium">
                ${(auditSummary.total_credits_cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="border-l border-ink-border pl-3">
              <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-tag text-[10px] font-mono bg-ink-raised border border-ink-border text-ink-secondary">
                <span className="w-1.5 h-1.5 rounded-full bg-ink-positive" />
                <span>Zero-sum verified</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Transactions List */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-ink-border text-ink-muted font-normal">
              <th className="pb-2.5 font-normal">Reference</th>
              <th className="pb-2.5 font-normal">Description</th>
              <th className="pb-2.5 font-normal">Debited (Out)</th>
              <th className="pb-2.5 font-normal">Credited (In)</th>
              <th className="pb-2.5 text-right font-normal">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-border font-mono">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-ink-muted font-sans">
                  No transactions recorded yet
                </td>
              </tr>
            ) : (
              transactions.map((tx) => {
                const debitEntry = tx.entries?.find((e) => e.entry_type === 'DEBIT');
                const creditEntry = tx.entries?.find((e) => e.entry_type === 'CREDIT');
                const debitAcc = debitEntry ? accountMap.get(debitEntry.account_id) : null;
                const creditAcc = creditEntry ? accountMap.get(creditEntry.account_id) : null;

                return (
                  <tr key={tx.id} className="hover:bg-ink-raised/40 transition-colors">
                    <td className="py-2.5">
                      <div className="text-ink-primary">{tx.reference_id}</div>
                      <div className="text-[10px] text-ink-muted font-sans">
                        {tx.posted_at ? new Date(tx.posted_at).toLocaleTimeString() : ''}
                      </div>
                    </td>
                    <td className="py-2.5 text-ink-secondary font-sans">
                      {tx.description}
                      {tx.idempotency_key && (
                        <div className="text-[10px] text-ink-muted font-mono truncate max-w-[180px]">
                          key: {tx.idempotency_key}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 text-ink-secondary">
                      <span className="truncate max-w-[140px] block font-sans">
                        {debitAcc ? debitAcc.holder_name : debitEntry?.account_id}
                      </span>
                      {debitEntry && (
                        <span className="text-[10px] text-ink-muted tabular-nums">
                          Bal: ${debitEntry.balance_after_formatted}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 text-ink-secondary">
                      <span className="truncate max-w-[140px] block font-sans">
                        {creditAcc ? creditAcc.holder_name : creditEntry?.account_id}
                      </span>
                      {creditEntry && (
                        <span className="text-[10px] text-ink-muted tabular-nums">
                          Bal: ${creditEntry.balance_after_formatted}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 text-right font-medium text-ink-primary tabular-nums">
                      ${debitEntry ? debitEntry.amount_formatted : '0.00'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
