export interface Account {
  id: string;
  account_number: string;
  holder_name: string;
  account_type: 'USER_CHECKING' | 'USER_SAVINGS' | 'SYSTEM_RESERVE' | 'SYSTEM_SETTLEMENT';
  currency: string;
  balance: number;
  balance_formatted: string;
  status: 'ACTIVE' | 'FROZEN' | 'CLOSED';
  created_at: string;
  updated_at: string;
}

export interface LedgerEntry {
  id: string;
  transaction_id: string;
  account_id: string;
  entry_type: 'DEBIT' | 'CREDIT';
  amount: number;
  amount_formatted: string;
  balance_after: number;
  balance_after_formatted: string;
  created_at: string;
}

export interface LedgerTransaction {
  id: string;
  reference_id: string;
  idempotency_key?: string | null;
  description: string;
  status: string;
  posted_at: string;
  created_at: string;
  entries: LedgerEntry[];
}

export interface LedgerAuditSummary {
  total_transactions: number;
  total_entries: number;
  total_debits_cents: number;
  total_credits_cents: number;
  is_balanced: boolean;
  imbalance_cents: number;
  system_invariant_verified: boolean;
}

export interface TransferRequest {
  source_account_id: string;
  destination_account_id: string;
  amount_cents: number;
  description?: string;
}

export interface TransferResponse {
  success: boolean;
  reference_id: string;
  idempotency_key?: string | null;
  transaction_id: string;
  amount_cents: number;
  amount_formatted: string;
  source_balance_after: number;
  source_balance_after_formatted: string;
  destination_balance_after: number;
  destination_balance_after_formatted: string;
  timestamp: string;
  message: string;
  is_idempotent_replay?: boolean;
}

export interface StressTestDetail {
  request_index: number;
  idempotency_key: string;
  status_code: number;
  success: boolean;
  error?: string | null;
  latency_ms: number;
}

export interface ConcurrencyStressTestResponse {
  total_requests: number;
  successful_requests: number;
  failed_insufficient_funds: number;
  failed_rate_limited: number;
  failed_other: number;
  initial_source_balance_cents: number;
  final_source_balance_cents: number;
  initial_dest_balance_cents: number;
  final_dest_balance_cents: number;
  expected_final_source_balance_cents: number;
  race_conditions_detected: number;
  double_spend_prevented: boolean;
  ledger_balanced: boolean;
  total_execution_time_seconds: number;
  details: StressTestDetail[];
}
