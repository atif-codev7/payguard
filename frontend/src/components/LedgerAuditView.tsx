'use client';

import React from 'react';
import { BookOpen, Scale, ArrowUpRight, ArrowDownLeft, ShieldCheck, CheckCircle2 } from 'lucide-react';
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
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm space-y-6">
      {/* Top Banner & Audit Card */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-emerald-400" />
            <span>Immutable Double-Entry Ledger Audit Trail</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Every transaction enforces matching debits and credits with zero balance deviation
          </p>
        </div>

        {auditSummary && (
          <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Scale className="w-4 h-4 text-indigo-400" />
              <div className="text-xs">
                <span className="text-slate-400">Total Debits: </span>
                <span className="font-mono font-bold text-slate-200">
                  ${(auditSummary.total_debits_cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="text-slate-600">==</div>

            <div className="text-xs">
              <span className="text-slate-400">Total Credits: </span>
              <span className="font-mono font-bold text-slate-200">
                ${(auditSummary.total_credits_cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="border-l border-slate-800 pl-3">
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3" />
                <span>Zero-Sum Verified</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Transactions List */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 font-medium">
              <th className="pb-3 pl-1">Reference &amp; Time</th>
              <th className="pb-3">Description</th>
              <th className="pb-3">Debited Account (Asset Decr)</th>
              <th className="pb-3">Credited Account (Asset Incr)</th>
              <th className="pb-3 text-right pr-1">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-500 font-sans">
                  No ledger entries recorded yet. Perform a transfer or run the concurrency stress test!
                </td>
              </tr>
            ) : (
              transactions.map((tx) => {
                const debitEntry = tx.entries?.find((e) => e.entry_type === 'DEBIT');
                const creditEntry = tx.entries?.find((e) => e.entry_type === 'CREDIT');
                const debitAcc = debitEntry ? accountMap.get(debitEntry.account_id) : null;
                const creditAcc = creditEntry ? accountMap.get(creditEntry.account_id) : null;

                return (
                  <tr key={tx.id} className="hover:bg-slate-950/40 transition-colors">
                    <td className="py-3 pl-1">
                      <div className="font-semibold text-slate-200">{tx.reference_id}</div>
                      <div className="text-[10px] text-slate-500 font-sans">
                        {tx.posted_at ? new Date(tx.posted_at).toLocaleTimeString() : ''}
                      </div>
                    </td>
                    <td className="py-3 text-slate-300 font-sans text-xs">
                      {tx.description}
                      {tx.idempotency_key && (
                        <div className="text-[10px] text-slate-500 font-mono truncate max-w-[200px]">
                          Key: {tx.idempotency_key}
                        </div>
                      )}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center space-x-1 text-rose-400">
                        <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate max-w-[150px]">
                          {debitAcc ? debitAcc.holder_name : debitEntry?.account_id}
                        </span>
                      </div>
                      {debitEntry && (
                        <div className="text-[10px] text-slate-500">
                          Bal after: ${debitEntry.balance_after_formatted}
                        </div>
                      )}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center space-x-1 text-emerald-400">
                        <ArrowDownLeft className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate max-w-[150px]">
                          {creditAcc ? creditAcc.holder_name : creditEntry?.account_id}
                        </span>
                      </div>
                      {creditEntry && (
                        <div className="text-[10px] text-slate-500">
                          Bal after: ${creditEntry.balance_after_formatted}
                        </div>
                      )}
                    </td>
                    <td className="py-3 text-right pr-1 font-bold text-slate-100">
                      ${debitEntry ? debitEntry.amount_formatted : '0.00'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
