'use client';

import React from 'react';
import { Layers, ShieldCheck, Database, Cpu, Cloud, GitBranch, ArrowRight } from 'lucide-react';

export const ArchitectureDiagram: React.FC = () => {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center space-x-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            <span>PayGuard Flagship Architecture Pipeline</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            End-to-end transaction journey from Next.js client to AWS ECS Fargate &amp; Multi-AZ RDS
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {/* Step 1 */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-mono text-xs font-bold mb-3">
              01
            </div>
            <h3 className="text-sm font-semibold text-white">Next.js UI</h3>
            <p className="text-xs text-slate-400 mt-1">
              Client generates UUIDv4 <code className="text-amber-400">Idempotency-Key</code> and optimistic double-entry preview.
            </p>
          </div>
          <div className="mt-4 pt-2 border-t border-slate-900 text-[10px] text-blue-400 font-mono flex items-center space-x-1">
            <span>HTTP POST</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        {/* Step 2 */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-mono text-xs font-bold mb-3">
              02
            </div>
            <h3 className="text-sm font-semibold text-white">Redis Edge</h3>
            <p className="text-xs text-slate-400 mt-1">
              Sliding-window ZSET rate limiter + Atomic lock check for deduplication &amp; replay caching.
            </p>
          </div>
          <div className="mt-4 pt-2 border-t border-slate-900 text-[10px] text-amber-400 font-mono flex items-center space-x-1">
            <span>60 req / 60s</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        {/* Step 3 */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-mono text-xs font-bold mb-3">
              03
            </div>
            <h3 className="text-sm font-semibold text-white">FastAPI Async</h3>
            <p className="text-xs text-slate-400 mt-1">
              Deterministic ID sorting (<code className="text-indigo-400">acc_ids.sort()</code>) eliminating circular deadlocks.
            </p>
          </div>
          <div className="mt-4 pt-2 border-t border-slate-900 text-[10px] text-indigo-400 font-mono flex items-center space-x-1">
            <span>Pessimistic Order</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        {/* Step 4 */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-mono text-xs font-bold mb-3">
              04
            </div>
            <h3 className="text-sm font-semibold text-white">PostgreSQL ACID</h3>
            <p className="text-xs text-slate-400 mt-1">
              <code className="text-emerald-400">FOR UPDATE</code> row-locks + atomic conditional check constraint preventing double-spending.
            </p>
          </div>
          <div className="mt-4 pt-2 border-t border-slate-900 text-[10px] text-emerald-400 font-mono flex items-center space-x-1">
            <span>Sum(D) == Sum(C)</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        {/* Step 5 */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-mono text-xs font-bold mb-3">
              05
            </div>
            <h3 className="text-sm font-semibold text-white">AWS ECS Fargate</h3>
            <p className="text-xs text-slate-400 mt-1">
              Terraform-provisioned containerized fleet with ALB, Multi-AZ RDS, and CloudWatch metrics.
            </p>
          </div>
          <div className="mt-4 pt-2 border-t border-slate-900 text-[10px] text-cyan-400 font-mono flex items-center space-x-1">
            <span>Prod Infra</span>
            <Cloud className="w-3 h-3" />
          </div>
        </div>
      </div>
    </div>
  );
};
