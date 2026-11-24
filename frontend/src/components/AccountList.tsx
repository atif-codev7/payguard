'use client';

import React from 'react';
import { Wallet, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { Account } from '../lib/types';

interface AccountListProps {
  accounts: Account[];
  onSelectAccount?: (account: Account, role: 'source' | 'destination') => void;
  selectedSourceId?: string;
  selectedDestId?: string;
}

export const AccountList: React.FC<AccountListProps> = ({
  accounts,
  onSelectAccount,
  selectedSourceId,
  selectedDestId,
}) => {
  return (
    <section className="bg-ink-card border border-ink-border rounded-panel p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-medium text-ink-primary flex items-center space-x-2">
            <Wallet className="w-4 h-4 text-ink-muted" strokeWidth={1.5} />
            <span>Accounts &amp; balances</span>
          </h2>
          <p className="text-xs text-ink-muted mt-0.5">
            Balances stored in minor currency units (cents)
          </p>
        </div>
        <span className="text-xs text-ink-muted font-mono bg-ink-bg border border-ink-border px-2 py-0.5 rounded-tag">
          {accounts.length} accounts
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {accounts.map((acc) => {
          const isSource = acc.id === selectedSourceId;
          const isDest = acc.id === selectedDestId;

          return (
            <div
              key={acc.id}
              className={`p-4 rounded-card border flex flex-col justify-between transition-colors ${
                isSource || isDest
                  ? 'bg-ink-raised border-ink-accent/40'
                  : 'bg-ink-bg border-ink-border hover:bg-ink-raised/50'
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] font-mono text-ink-muted">
                      {acc.account_number}
                    </span>
                    <h3 className="font-medium text-ink-primary text-xs mt-0.5 line-clamp-1">
                      {acc.holder_name}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-ink-muted px-1.5 py-0.5 rounded-tag bg-ink-raised border border-ink-border">
                    {acc.account_type.replace('USER_', '').replace('SYSTEM_', '')}
                  </span>
                </div>

                <div className="mt-4">
                  <div className="text-2xl font-mono tabular-nums text-ink-primary">
                    ${acc.balance_formatted}
                    <span className="text-xs font-sans text-ink-muted ml-1">
                      {acc.currency}
                    </span>
                  </div>
                  <div className="text-[11px] text-ink-muted font-mono mt-0.5 tabular-nums">
                    {acc.balance.toLocaleString()} cents
                  </div>
                </div>
              </div>

              {onSelectAccount && (
                <div className="mt-4 pt-3 border-t border-ink-border flex items-center gap-2">
                  <button
                    onClick={() => onSelectAccount(acc, 'source')}
                    className={`flex-1 py-1.5 px-2 rounded-control text-xs font-medium flex items-center justify-center space-x-1 transition-colors ${
                      isSource
                        ? 'bg-ink-primary text-ink-deep'
                        : 'bg-ink-raised text-ink-secondary hover:text-ink-primary border border-ink-border'
                    }`}
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={1.5} />
                    <span>Debit from</span>
                  </button>
                  <button
                    onClick={() => onSelectAccount(acc, 'destination')}
                    className={`flex-1 py-1.5 px-2 rounded-control text-xs font-medium flex items-center justify-center space-x-1 transition-colors ${
                      isDest
                        ? 'bg-ink-primary text-ink-deep'
                        : 'bg-ink-raised text-ink-secondary hover:text-ink-primary border border-ink-border'
                    }`}
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
                    <span>Credit to</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
