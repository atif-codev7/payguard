import {
  Account,
  LedgerTransaction,
  LedgerAuditSummary,
  TransferRequest,
  TransferResponse,
  ConcurrencyStressTestResponse,
} from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export async function fetchAccounts(): Promise<Account[]> {
  const res = await fetch(`${API_BASE}/api/v1/accounts`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch accounts');
  return res.json();
}

export async function createAccount(data: {
  holder_name: string;
  account_type: string;
  currency: string;
  initial_deposit_cents: number;
}): Promise<Account> {
  const res = await fetch(`${API_BASE}/api/v1/accounts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to create account');
  }
  return res.json();
}

export async function executeTransfer(
  data: TransferRequest,
  idempotencyKey?: string
): Promise<TransferResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }

  const res = await fetch(`${API_BASE}/api/v1/transfers`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });

  const isReplay = res.headers.get('Idempotent-Replay') === 'true';

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.message || `Transfer failed with HTTP ${res.status}`);
  }

  const result: TransferResponse = await res.json();
  result.is_idempotent_replay = isReplay;
  return result;
}

export async function fetchTransactions(limit = 30): Promise<LedgerTransaction[]> {
  const res = await fetch(`${API_BASE}/api/v1/ledger/transactions?limit=${limit}`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to fetch ledger transactions');
  return res.json();
}

export async function fetchAuditSummary(): Promise<LedgerAuditSummary> {
  const res = await fetch(`${API_BASE}/api/v1/ledger/audit`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch ledger audit summary');
  return res.json();
}

export async function runConcurrencyStressTest(data: {
  source_account_id: string;
  destination_account_id: string;
  amount_cents_per_request: number;
  concurrent_requests: number;
}): Promise<ConcurrencyStressTestResponse> {
  const res = await fetch(`${API_BASE}/api/v1/stress-test/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Concurrency stress test failed');
  }
  return res.json();
}

export async function resetStressAccounts(): Promise<any> {
  const res = await fetch(`${API_BASE}/api/v1/stress-test/reset`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to reset stress test accounts');
  return res.json();
}
