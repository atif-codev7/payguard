'use client';

import React, { useState } from 'react';
import { ArrowRightLeft, Key, ShieldCheck, AlertCircle, CheckCircle2, RotateCw } from 'lucide-react';
import { Account, TransferResponse } from '../lib/types';
import { executeTransfer } from '../lib/api';

interface TransferModalProps {
  accounts: Account[];
  selectedSourceId: string;
  selectedDestId: string;
  onSuccess: () => void;
  onSourceChange: (id: string) => void;
  onDestChange: (id: string) => void;
}

function generateUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const TransferModal: React.FC<TransferModalProps> = ({
  accounts,
  selectedSourceId,
  selectedDestId,
  onSuccess,
  onSourceChange,
  onDestChange,
}) => {
  const [amountStr, setAmountStr] = useState('25.00');
  const [description, setDescription] = useState('Standard payment transfer');
  const [idempotencyKey, setIdempotencyKey] = useState<string>(generateUuid());
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<TransferResponse | null>(null);

  const sourceAccount = accounts.find((a) => a.id === selectedSourceId);
  const destAccount = accounts.find((a) => a.id === selectedDestId);

  const amountCents = Math.round(parseFloat(amountStr || '0') * 100);
  const isValidAmount = !isNaN(amountCents) && amountCents > 0;
  const hasSufficientFunds = sourceAccount ? sourceAccount.balance >= amountCents : false;

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLastResponse(null);

    if (!selectedSourceId || !selectedDestId) {
      setErrorMsg('Please select both source and destination accounts');
      return;
    }
    if (selectedSourceId === selectedDestId) {
      setErrorMsg('Source and destination accounts must be distinct');
      return;
    }
    if (!isValidAmount) {
      setErrorMsg('Please enter a valid positive transfer amount');
      return;
    }

    setIsLoading(true);
    try {
      const resp = await executeTransfer(
        {
          source_account_id: selectedSourceId,
          destination_account_id: selectedDestId,
          amount_cents: amountCents,
          description,
        },
        idempotencyKey
      );
      setLastResponse(resp);
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Transfer failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewKey = () => {
    setIdempotencyKey(generateUuid());
    setLastResponse(null);
    setErrorMsg(null);
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center space-x-2">
            <ArrowRightLeft className="w-5 h-5 text-indigo-400" />
            <span>Atomic Transfer &amp; Idempotency Terminal</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Client-generated idempotency key with pessimistic row-locking prevention of double-spending
          </p>
        </div>
      </div>

      <form onSubmit={handleTransfer} className="space-y-4">
        {/* Account Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Source Account (Debited)
            </label>
            <select
              value={selectedSourceId}
              onChange={(e) => onSourceChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select source account...</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.holder_name} (${a.balance_formatted})
                </option>
              ))}
            </select>
            {sourceAccount && (
              <p className="text-[11px] text-slate-400 mt-1 font-mono">
                Available: ${sourceAccount.balance_formatted} {sourceAccount.currency}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Destination Account (Credited)
            </label>
            <select
              value={selectedDestId}
              onChange={(e) => onDestChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select destination account...</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.holder_name} (${a.balance_formatted})
                </option>
              ))}
            </select>
            {destAccount && (
              <p className="text-[11px] text-slate-400 mt-1 font-mono">
                Current: ${destAccount.balance_formatted} {destAccount.currency}
              </p>
            )}
          </div>
        </div>

        {/* Amount & Description */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Amount (USD)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-slate-400 text-sm font-mono">$</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-7 pr-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Ledger Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Settlement transfer"
            />
          </div>
        </div>

        {/* Idempotency Key Control */}
        <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-300 flex items-center space-x-1.5">
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span>Idempotency-Key Header (UUID v4)</span>
            </label>
            <button
              type="button"
              onClick={handleNewKey}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center space-x-1"
            >
              <RotateCw className="w-3 h-3" />
              <span>New Key</span>
            </button>
          </div>
          <input
            type="text"
            value={idempotencyKey}
            onChange={(e) => setIdempotencyKey(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
          <p className="text-[11px] text-slate-500">
            Clicking transfer again with the SAME key tests safe idempotent replay recovery.
          </p>
        </div>

        {/* Double-Entry Journal Preview */}
        {isValidAmount && sourceAccount && destAccount && (
          <div className="p-3 bg-blue-950/20 border border-blue-900/40 rounded-xl space-y-2 text-xs">
            <div className="font-semibold text-blue-300 flex items-center justify-between">
              <span>Journal Entry Double-Entry Preview</span>
              <span className="font-mono text-emerald-400">Sum(Debits) == Sum(Credits)</span>
            </div>
            <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
              <div className="p-2 bg-slate-900/80 rounded border border-slate-800">
                <span className="text-rose-400 font-bold">DEBIT:</span> {sourceAccount.holder_name}
                <div className="text-slate-300 font-bold mt-0.5">
                  -${(amountCents / 100).toFixed(2)} USD
                </div>
              </div>
              <div className="p-2 bg-slate-900/80 rounded border border-slate-800">
                <span className="text-emerald-400 font-bold">CREDIT:</span> {destAccount.holder_name}
                <div className="text-slate-300 font-bold mt-0.5">
                  +${(amountCents / 100).toFixed(2)} USD
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Status / Error Alerts */}
        {errorMsg && (
          <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {lastResponse && (
          <div
            className={`p-3 rounded-xl border text-xs space-y-1 ${
              lastResponse.is_idempotent_replay
                ? 'bg-amber-950/40 border-amber-800/60 text-amber-200'
                : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
            }`}
          >
            <div className="flex items-center justify-between font-semibold">
              <span className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{lastResponse.message}</span>
              </span>
              {lastResponse.is_idempotent_replay && (
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono text-[10px]">
                  IDEMPOTENT REPLAY CACHE
                </span>
              )}
            </div>
            <div className="font-mono text-[11px] text-slate-300 pt-1">
              Ref: {lastResponse.reference_id} | Source After: ${lastResponse.source_balance_after_formatted} | Dest After: ${lastResponse.destination_balance_after_formatted}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !isValidAmount || (sourceAccount && !hasSufficientFunds)}
          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {isLoading ? (
            <span>Executing ACID Double-Entry Transaction...</span>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4" />
              <span>Post Transaction with Row-Locks</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
