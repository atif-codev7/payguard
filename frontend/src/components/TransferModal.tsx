'use client';

import React, { useState } from 'react';
import { ArrowRightLeft, Key, RotateCw, CheckCircle2, AlertCircle } from 'lucide-react';
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
  const [description, setDescription] = useState('Account settlement');
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
      setErrorMsg('Select both source and destination accounts');
      return;
    }
    if (selectedSourceId === selectedDestId) {
      setErrorMsg('Source and destination accounts must be distinct');
      return;
    }
    if (!isValidAmount) {
      setErrorMsg('Enter a valid transfer amount');
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
    <section className="bg-ink-card border border-ink-border rounded-panel p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-medium text-ink-primary flex items-center space-x-2">
            <ArrowRightLeft className="w-4 h-4 text-ink-muted" strokeWidth={1.5} />
            <span>Transfer execution</span>
          </h2>
          <p className="text-xs text-ink-muted mt-0.5">
            ACID transaction with client-supplied idempotency key
          </p>
        </div>
      </div>

      <form onSubmit={handleTransfer} className="space-y-3.5">
        {/* Account Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-ink-secondary mb-1">
              Source (Debited)
            </label>
            <select
              value={selectedSourceId}
              onChange={(e) => onSourceChange(e.target.value)}
              className="w-full bg-ink-bg border border-ink-border rounded-control px-3 py-2 text-xs text-ink-primary focus:outline-none focus:border-ink-secondary"
            >
              <option value="">Select source account</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.holder_name} (${a.balance_formatted})
                </option>
              ))}
            </select>
            {sourceAccount && (
              <p className="text-[11px] text-ink-muted mt-1 font-mono tabular-nums">
                Available: ${sourceAccount.balance_formatted} {sourceAccount.currency}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs text-ink-secondary mb-1">
              Destination (Credited)
            </label>
            <select
              value={selectedDestId}
              onChange={(e) => onDestChange(e.target.value)}
              className="w-full bg-ink-bg border border-ink-border rounded-control px-3 py-2 text-xs text-ink-primary focus:outline-none focus:border-ink-secondary"
            >
              <option value="">Select destination account</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.holder_name} (${a.balance_formatted})
                </option>
              ))}
            </select>
            {destAccount && (
              <p className="text-[11px] text-ink-muted mt-1 font-mono tabular-nums">
                Current: ${destAccount.balance_formatted} {destAccount.currency}
              </p>
            )}
          </div>
        </div>

        {/* Amount & Description */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-ink-secondary mb-1">
              Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-ink-muted text-xs font-mono">$</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-full bg-ink-bg border border-ink-border rounded-control pl-6 pr-3 py-2 text-xs text-ink-primary font-mono tabular-nums focus:outline-none focus:border-ink-secondary"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs text-ink-secondary mb-1">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-ink-bg border border-ink-border rounded-control px-3 py-2 text-xs text-ink-primary focus:outline-none focus:border-ink-secondary"
              placeholder="Settlement transfer"
            />
          </div>
        </div>

        {/* Idempotency Key Control */}
        <div className="p-3 bg-ink-bg border border-ink-border rounded-control space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs text-ink-secondary flex items-center space-x-1.5">
              <Key className="w-3.5 h-3.5 text-ink-muted" strokeWidth={1.5} />
              <span>Idempotency-Key</span>
            </label>
            <button
              type="button"
              onClick={handleNewKey}
              className="text-[11px] text-ink-muted hover:text-ink-primary flex items-center space-x-1 transition-colors"
            >
              <RotateCw className="w-3 h-3" strokeWidth={1.5} />
              <span>Generate new</span>
            </button>
          </div>
          <input
            type="text"
            value={idempotencyKey}
            onChange={(e) => setIdempotencyKey(e.target.value)}
            className="w-full bg-ink-card border border-ink-border rounded-tag px-2.5 py-1 text-xs text-ink-primary font-mono focus:outline-none"
          />
          <p className="text-[11px] text-ink-muted">
            Resending with this key replays cached response without duplicate debit.
          </p>
        </div>

        {/* Journal Preview */}
        {isValidAmount && sourceAccount && destAccount && (
          <div className="p-3 bg-ink-bg border border-ink-border rounded-control space-y-2 text-xs">
            <div className="text-ink-secondary flex items-center justify-between">
              <span>Journal entry preview</span>
              <span className="font-mono text-[11px] text-ink-muted">Balanced (1:1)</span>
            </div>
            <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
              <div className="p-2 bg-ink-card rounded-tag border border-ink-border">
                <span className="text-ink-negative font-medium">Debit</span>
                <div className="text-ink-primary mt-0.5 tabular-nums">
                  -${(amountCents / 100).toFixed(2)}
                </div>
                <div className="text-[10px] text-ink-muted truncate mt-0.5">
                  {sourceAccount.holder_name}
                </div>
              </div>
              <div className="p-2 bg-ink-card rounded-tag border border-ink-border">
                <span className="text-ink-positive font-medium">Credit</span>
                <div className="text-ink-primary mt-0.5 tabular-nums">
                  +${(amountCents / 100).toFixed(2)}
                </div>
                <div className="text-[10px] text-ink-muted truncate mt-0.5">
                  {destAccount.holder_name}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Feedback / Alerts */}
        {errorMsg && (
          <div className="p-2.5 bg-ink-bg border border-ink-negative/40 rounded-control text-xs text-ink-negative flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" strokeWidth={1.5} />
            <span>{errorMsg}</span>
          </div>
        )}

        {lastResponse && (
          <div className="p-2.5 bg-ink-bg border border-ink-border rounded-control text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-1.5 text-ink-primary">
                <CheckCircle2 className="w-3.5 h-3.5 text-ink-positive" strokeWidth={1.5} />
                <span>{lastResponse.message}</span>
              </span>
              {lastResponse.is_idempotent_replay && (
                <span className="px-1.5 py-0.5 rounded-tag bg-ink-raised border border-ink-border text-ink-secondary font-mono text-[10px]">
                  Cached replay
                </span>
              )}
            </div>
            <div className="font-mono text-[11px] text-ink-muted pt-0.5 tabular-nums">
              Ref: {lastResponse.reference_id} · Source balance: ${lastResponse.source_balance_after_formatted}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !isValidAmount || (sourceAccount && !hasSufficientFunds)}
          className="w-full py-2 px-4 rounded-control bg-ink-primary text-ink-deep hover:bg-white font-medium text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Executing transaction...' : 'Post transfer'}
        </button>
      </form>
    </section>
  );
};
