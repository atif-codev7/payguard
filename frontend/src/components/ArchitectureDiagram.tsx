'use client';

import React from 'react';
import { ArrowRight } from 'lucide-react';

const STEPS = [
  {
    num: '01',
    title: 'Client interface',
    desc: 'Generates client-side idempotency keys and renders double-entry previews.',
    meta: 'Idempotency-Key',
  },
  {
    num: '02',
    title: 'Redis edge cache',
    desc: 'Sliding-window rate limiting in sorted sets and concurrent flight locking.',
    meta: '60 req / 60s',
  },
  {
    num: '03',
    title: 'FastAPI coordinator',
    desc: 'Deterministic ID ordering to eliminate circular deadlocks across accounts.',
    meta: 'Ordered locks',
  },
  {
    num: '04',
    title: 'PostgreSQL ACID',
    desc: 'Row-level locking with atomic conditional updates and zero balance checks.',
    meta: 'Sum(D) == Sum(C)',
    isKey: true,
  },
  {
    num: '05',
    title: 'AWS ECS Fargate',
    desc: 'Multi-AZ task deployment behind application load balancer with CloudWatch metrics.',
    meta: 'Container fleet',
  },
];

export const ArchitectureDiagram: React.FC = () => {
  return (
    <section className="bg-ink-card border border-ink-border rounded-panel p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-medium text-ink-primary">
            Architecture pipeline
          </h2>
          <p className="text-xs text-ink-muted mt-0.5">
            Request path from client edge to row-level database locks
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {STEPS.map((step) => (
          <div
            key={step.num}
            className={`p-3.5 rounded-card border flex flex-col justify-between ${
              step.isKey
                ? 'bg-ink-raised border-ink-border'
                : 'bg-ink-bg border-ink-border'
            }`}
          >
            <div>
              <div className="font-mono text-xs text-ink-muted mb-2">
                {step.num}
              </div>
              <h3 className="text-xs font-medium text-ink-primary">
                {step.title}
              </h3>
              <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                {step.desc}
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-ink-border flex items-center justify-between text-[11px] font-mono text-ink-muted">
              <span>{step.meta}</span>
              <ArrowRight className="w-3 h-3 text-ink-muted/50" strokeWidth={1.5} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
