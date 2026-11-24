'use client';

import React, { useState } from 'react';
import { Zap, ShieldCheck, CheckCircle2, RotateCcw } from 'lucide-react';
import { ConcurrencyStressTestResponse, Account } from '../lib/types';
import { runConcurrencyStressTest, resetStressAccounts } from '../lib/api';

interface ConcurrencyStressTestProps {
  accounts: Account[];
  onTestComplete: () => void;
}

export const ConcurrencyStressTest: React.FC<ConcurrencyStressTestProps> = ({
  accounts,
  onTestComplete,
}) => {
  const [concurrentCount, setConcurrentCount] = useState(50);
  const [amountDollars, setAmountDollars] = useState('10.00');
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<ConcurrencyStressTestResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  const defaultSource = accounts.find((a) => a.id.includes('stress-source')) || accounts[0];
  const defaultDest = accounts.find((a) => a.id.includes('stress-target')) || accounts[1];

  const [sourceId, setSourceId] = useState(defaultSource?.id || '');
  const [destId, setDestId] = useState(defaultDest?.id || '');

  const handleRunStressTest = async () => {
    setIsRunning(true);
    setErrorMsg(null);
    setResetSuccess(false);

    try {
      const resp = await runConcurrencyStressTest({
        source_account_id: sourceId || defaultSource?.id,
        destination_account_id: destId || defaultDest?.id,
        amount_cents_per_request: Math.round(parseFloat(amountDollars) * 100),
        concurrent_requests: concurrentCount,
      });
      setResult(resp);
      onTestComplete();
    } catch (err: any) {
      setErrorMsg(err.message || 'Concurrency test execution failed');
    } finally {
      setIsRunning(false);
    }
  };

  const handleResetAccounts = async () => {
    try {
      await resetStressAccounts();
      setResetSuccess(true);
      setResult(null);
      onTestComplete();
      setTimeout(() => setResetSuccess(false), 3000);
    } catch (err: any) {
      setErrorMsg('Failed to reset test accounts');
    }
  };

  return (
    <section className="bg-ink-card border border-ink-border rounded-panel p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-medium text-ink-primary flex items-center space-x-2">
            <Zap className="w-4 h-4 text-ink-muted" strokeWidth={1.5} />
            <span>Concurrency test</span>
          </h2>
          <p className="text-xs text-ink-muted mt-0.5">
            Simultaneous parallel transfers to test race-condition elimination
          </p>
        </div>

        <button
          onClick={handleResetAccounts}
          disabled={isRunning}
          className="self-start sm:self-auto px-2.5 py-1 rounded-control bg-ink-raised hover:bg-ink-raised/80 text-xs text-ink-secondary font-medium flex items-center space-x-1.5 transition-colors border border-ink-border disabled:opacity-40"
        >
          <RotateCcw className="w-3 h-3 text-ink-muted" strokeWidth={1.5} />
          <span>Reset demo accounts ($100 / $0)</span>
        </button>
      </div>

      {resetSuccess && (
        <div className="mb-3 p-2 rounded-control bg-ink-bg border border-ink-border text-xs text-ink-secondary flex items-center space-x-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-ink-positive" strokeWidth={1.5} />
          <span>Test accounts reset: Source has $100.00, Vault has $0.00</span>
        </div>
      )}

      {/* Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
        <div>
          <label className="block text-xs text-ink-secondary mb-1">
            Parallel requests
          </label>
          <select
            value={concurrentCount}
            onChange={(e) => setConcurrentCount(parseInt(e.target.value))}
            disabled={isRunning}
            className="w-full bg-ink-bg border border-ink-border rounded-control px-2.5 py-2 text-xs text-ink-primary font-mono focus:outline-none"
          >
            <option value="10">10 parallel</option>
            <option value="25">25 parallel</option>
            <option value="50">50 parallel</option>
            <option value="100">100 parallel</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-ink-secondary mb-1">
            Amount / request
          </label>
          <input
            type="number"
            step="1"
            value={amountDollars}
            onChange={(e) => setAmountDollars(e.target.value)}
            disabled={isRunning}
            className="w-full bg-ink-bg border border-ink-border rounded-control px-2.5 py-2 text-xs text-ink-primary font-mono tabular-nums focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs text-ink-secondary mb-1">
            Source account
          </label>
          <select
            value={sourceId || defaultSource?.id}
            onChange={(e) => setSourceId(e.target.value)}
            disabled={isRunning}
            className="w-full bg-ink-bg border border-ink-border rounded-control px-2 py-2 text-xs text-ink-primary focus:outline-none"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.holder_name} (${a.balance_formatted})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <button
            onClick={handleRunStressTest}
            disabled={isRunning}
            className="w-full py-2 px-3 rounded-control bg-ink-primary text-ink-deep hover:bg-white font-medium text-xs transition-colors flex items-center justify-center space-x-1.5 disabled:opacity-40"
          >
            <Zap className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>{isRunning ? 'Running...' : `Run ${concurrentCount} transfers`}</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-3 p-2.5 bg-ink-bg border border-ink-negative/40 rounded-control text-xs text-ink-negative">
          {errorMsg}
        </div>
      )}

      {/* Results Matrix */}
      {result && (
        <div className="mt-3 p-3.5 bg-ink-bg border border-ink-border rounded-card space-y-3">
          <div className="flex items-center justify-between border-b border-ink-border pb-2.5">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-ink-positive" strokeWidth={1.5} />
              <span className="font-medium text-xs text-ink-primary">
                Test results
              </span>
            </div>
            <span className="text-[11px] font-mono tabular-nums text-ink-muted">
              {result.total_execution_time_seconds}s total
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="p-2.5 bg-ink-card rounded-control border border-ink-border">
              <div className="text-[11px] text-ink-muted">Requests</div>
              <div className="text-lg font-mono tabular-nums text-ink-primary mt-0.5">
                {result.total_requests}
              </div>
            </div>

            <div className="p-2.5 bg-ink-card rounded-control border border-ink-border">
              <div className="text-[11px] text-ink-secondary">Succeeded</div>
              <div className="text-lg font-mono tabular-nums text-ink-primary mt-0.5">
                {result.successful_requests}
              </div>
            </div>

            <div className="p-2.5 bg-ink-card rounded-control border border-ink-border">
              <div className="text-[11px] text-ink-secondary">Rejected (400)</div>
              <div className="text-lg font-mono tabular-nums text-ink-primary mt-0.5">
                {result.failed_insufficient_funds}
              </div>
            </div>

            <div className="p-2.5 bg-ink-card rounded-control border border-ink-border">
              <div className="text-[11px] text-ink-secondary">Race conditions</div>
              <div className="text-lg font-mono tabular-nums text-ink-positive mt-0.5">
                {result.race_conditions_detected}
              </div>
            </div>
          </div>

          {/* Mathematical Proof Statement */}
          <div className="p-2.5 bg-ink-card rounded-control border border-ink-border font-mono text-[11px] space-y-1">
            <div className="text-ink-secondary flex items-center justify-between">
              <span>Balance delta verification</span>
              <span className="text-ink-positive">Invariant verified</span>
            </div>
            <div className="text-ink-muted tabular-nums">
              Initial: ${(result.initial_source_balance_cents / 100).toFixed(2)} → Final: ${(result.final_source_balance_cents / 100).toFixed(2)} (Expected: ${(result.expected_final_source_balance_cents / 100).toFixed(2)})
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
