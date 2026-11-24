# PayGuard: High-Concurrency Financial Ledger System

PayGuard is an enterprise financial ledger and double-entry transaction engine engineered to guarantee absolute data integrity, eliminate race conditions under extreme concurrent load, and maintain transaction isolation across distributed services.

![Architecture](https://img.shields.io/badge/Architecture-Double--Entry%20ACID-blue)
![Stack](https://img.shields.io/badge/Stack-FastAPI%20%7C%20PostgreSQL%20%7C%20Redis%20%7C%20Next.js-emerald)
![Tests](https://img.shields.io/badge/Concurrency%20Tests-50%20Parallel%20Passed-brightgreen)
![AWS](https://img.shields.io/badge/Deployment-ECS%20Fargate%20%2B%20RDS-orange)

---

## 🏛️ System Architecture

```
[ Next.js 15 UI (TypeScript) ]
         │
         │ HTTP / JSON (Client UUID Idempotency-Key)
         ▼
[ Redis 7 Edge Layer ]
  ├── Sliding-Window Rate Limiter (ZSET atomic window)
  └── Idempotency Replay Cache (TTL locking & payload hashing)
         │
         ▼
[ FastAPI Async Engine ]
  ├── Structured JSON Logging & OpenTelemetry / CloudWatch
  ├── Deadlock-Free ID Sorting: min(acc_id, dest_id) → max(acc_id, dest_id)
  └── Double-Entry Bookkeeping Journal Coordinator
         │
         ▼
[ PostgreSQL 16 (RDS Multi-AZ) ]
  ├── Row-Level Locks: SELECT ... FOR UPDATE
  ├── Atomic Conditional Updates: WHERE balance >= :amount
  ├── Database Check Constraints: CHECK ((type = 'SETTLEMENT') OR (balance >= 0))
  └── Immutable Ledger Entries: Sum(Debits) == Sum(Credits)
         │
         ▼
[ AWS ECS Fargate & ALB via Terraform + GitHub Actions CI/CD ]
```

---

## ⚡ Core Engineering Pillars

### 1. Double-Entry Bookkeeping Schema
Every financial transfer is recorded as a journal transaction header (`LedgerTransaction`) containing at least two offsetting entries (`LedgerEntry`):
- **Source Account Entry:** `entry_type = DEBIT`, positive amount in cents, balance decremented.
- **Destination Account Entry:** `entry_type = CREDIT`, positive amount in cents, balance incremented.
- **System Invariant:** 
  $$\sum \text{Debits} == \sum \text{Credits} \quad (\Delta = 0.00)$$
- **Immutable Audit Trail:** Every ledger entry stores the exact `balance_after` snapshot for permanent auditability.

### 2. Multi-Layer Concurrency Control & Race-Condition Elimination
When dozens of concurrent requests attempt to withdraw or transfer funds from an account at the same millisecond:
- **Deadlock-Free Row Ordering:** All transactions sort account IDs in ascending alphanumeric order before querying the database (`SELECT ... FOR UPDATE` on PostgreSQL). Circular deadlocks are mathematically eliminated.
- **Atomic Conditional Updates:** Decrement queries execute with conditional checks:
  ```sql
  UPDATE accounts 
  SET balance = balance - :amount, version = version + 1 
  WHERE id = :source_id AND balance >= :amount;
  ```
  If another concurrent transaction has already claimed the funds, `rowcount == 0` is immediately returned, raising `InsufficientFundsError`.
- **Database Check Constraints:** A PostgreSQL schema check constraint `CHECK (balance >= 0)` guarantees at the storage engine level that an account balance can never drop below zero.

### 3. Idempotent Transfer Execution
Clients submit requests with an `Idempotency-Key` HTTP header (UUID v4):
- **Atomic Lock Acquisition:** The key is locked in `PROCESSING` status for 120 seconds.
- **Concurrent Request Conflict:** Simultaneous requests with the same key receive `409 Conflict`.
- **Cached Replay:** Repeated calls with the same key and payload return the original response with header `Idempotent-Replay: true` without double-debiting.
- **Payload Tamper Detection:** Using the same key with different payload parameters returns `422 Unprocessable Content`.

### 4. Redis Sliding-Window Rate Limiting
- Employs Redis Sorted Sets (`ZSET`) where scores represent millisecond timestamps.
- Prunes entries older than the sliding window (`ZREMRANGEBYSCORE`).
- Rejects requests exceeding limits with HTTP `429 Too Many Requests` and standard headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`).

---

## 🧪 Automated 50-Request Concurrency Test Suite

PayGuard includes an automated Pytest test suite that spawns **50 simultaneous parallel asynchronous requests** via `asyncio.gather` attempting to overdraw an account with \$100.00 (10,000 cents) by \$10.00 each:

```bash
# Run full Pytest test suite
cd backend
pytest -v tests/
```

### Verified Test Assertions:
1. **Exact Mathematical Outcome:** Exactly 10 transfers succeed (`201 Created`); exactly 40 transfers are rejected (`400 Insufficient Funds`).
2. **Zero Negative Balances:** Source balance ends at \$0.00 (0 cents) and never drops below zero.
3. **Zero Balance Leakage:** Destination balance ends at \$100.00 (10,000 cents).
4. **Ledger Balance Verification:** Full audit query verifies $\Delta = 0$ imbalance across the ledger.
5. **Idempotency Storm Test:** 20 parallel requests with the same key execute exactly once and return the identical transaction ID.

---

## 🚀 Local Development Setup

### Option A: Direct Local Run (Python + Node.js)

```bash
# 1. Start Backend
cd backend
python -m venv .venv
# On Windows: .venv\Scripts\Activate.ps1 | On Linux/Mac: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 2. Start Frontend
cd frontend
npm install
npm run dev
# Open http://localhost:3000
```

### Option B: Docker Compose (Postgres + Redis + API + UI)

```bash
docker-compose up --build
```
Services initialized:
- **FastAPI API & Docs:** http://localhost:8000/docs
- **Next.js Dashboard:** http://localhost:3000
- **PostgreSQL 16:** localhost:5432
- **Redis 7:** localhost:6379

---

## ☁️ Production AWS ECS Fargate & RDS (Terraform)

The `terraform/` directory contains complete infrastructure manifests:
- **VPC:** Multi-AZ with public subnets (ALB, NAT), private application subnets (ECS), and private database subnets (RDS, Redis).
- **RDS PostgreSQL:** Multi-AZ `db.t4g.medium` with automated snapshots, encryption at rest, and strict security groups.
- **ElastiCache Redis:** Multi-AZ replication group with automated failover and in-transit encryption.
- **ECS Fargate:** Autoscaled container services with zero-downtime rolling deployments.
- **Application Load Balancer:** Path-based routing (`/api/*` to FastAPI, `/*` to Next.js) with health checks (`/health`).
- **CloudWatch:** Log groups with 30-day retention and metric alarms for high CPU, memory, and 5xx rates.

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

---

## 🔄 CI/CD Pipeline (GitHub Actions)

Located in `.github/workflows/`:
1. `ci.yml`: Executes on all pull requests and pushes to `main`. Runs Pytest concurrency test suite and Next.js production build verification.
2. `deploy.yml`: Configures AWS OIDC, builds Docker containers, pushes to Amazon ECR, and deploys zero-downtime task definitions to AWS ECS Fargate.
