'use client';

import React from 'react';
import { Wallet, ArrowUpRight, ArrowDownLeft, Shield, CheckCircle2, AlertCircle } from 'lucide-react';
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
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center space-x-2">
            <Wallet className="w-5 h-5 text-blue-400" />
            <span>Ledger Accounts &amp; Real-Time Balances</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            ACID transaction isolated balances stored in exact minor currency units (cents)
          </p>
        </div>
        <span className="text-xs text-slate-400 font-mono bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700/50">
          {accounts.length} Accounts Active
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map((acc) => {
          const isSource = acc.id === selectedSourceId;
          const isDest = acc.id === selectedDestId;
          const isSystem = acc.account_type.startsWith('SYSTEM');
          const isStressAccount = acc.id.includes('stress');

          return (
            <div
              key={acc.id}
              className={`p-4 rounded-xl border transition-all duration-200 relative overflow-hidden flex flex-col justify-between ${
                isSource
                  ? 'bg-blue-950/40 border-blue-500/50 shadow-md shadow-blue-500/10'
                  : isDest
                  ? 'bg-indigo-950/40 border-indigo-500/50 shadow-md shadow-indigo-500/10'
                  : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-950/80'
              }`}
            >
              {/* Highlight strip */}
              <div
                className={`absolute top-0 left-0 right-0 h-1 ${
                  isSystem
                    ? 'bg-purple-500'
                    : isStressAccount
                    ? 'bg-amber-500'
                    : 'bg-blue-500'
                }`}
              />

              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-mono text-slate-400">
                      {acc.account_number}
                    </span>
                    <h3 className="font-medium text-slate-200 text-sm mt-0.5 line-clamp-1">
                      {acc.holder_name}
                    </h3>
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      acc.status === 'ACTIVE'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {acc.account_type.replace('USER_', '')}
                  </span>
                </div>

                <div className="mt-4">
                  <div className="text-2xl font-bold font-mono tracking-tight text-white">
                    ${acc.balance_formatted}
                    <span className="text-xs font-sans font-normal text-slate-400 ml-1">
                      {acc.currency}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                    {acc.balance.toLocaleString()} minor units (cents)
                  </div>
                </div>
              </div>

              {onSelectAccount && (
                <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onSelectAccount(acc, 'source')}
                    className={`flex-1 py-1 px-2 rounded text-xs font-medium flex items-center justify-center space-x-1 transition-colors ${
                      isSource
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>Debit (From)</span>
                  </button>
                  <button
                    onClick={() => onSelectAccount(acc, 'destination')}
                    className={`flex-1 py-1 px-2 rounded text-xs font-medium flex items-center justify-center space-x-1 transition-colors ${
                      isDest
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                    <span>Credit (To)</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
