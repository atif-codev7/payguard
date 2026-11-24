import asyncio
import uuid
import pytest
from httpx import AsyncClient
from app.services.ledger_service import ledger_service
from app.schemas.transfer import TransferRequest

@pytest.mark.asyncio
async def test_50_parallel_concurrent_transfers_no_double_spending(client: AsyncClient):
    """
    Core Verification: 50 simultaneous parallel transfer requests trying to
    overdraw an account with $100.00 (10,000 cents).
    Transfer amount: $10.00 (1,000 cents).
    Mathematical Guarantee:
    - Exactly 10 transfers must succeed.
    - Exactly 40 transfers must be cleanly rejected with Insufficient Funds (400).
    - Source balance MUST end up at $0.00 (0 cents) and never negative.
    - Destination balance MUST end up at $100.00 (10,000 cents).
    - Zero double-spending, zero race conditions, zero ledger imbalances!
    """
    # 1. Create dedicated source and destination accounts
    source_acc = (await client.post("/api/v1/accounts", json={
        "holder_name": "Parallel Concurrency Source",
        "account_type": "USER_CHECKING",
        "currency": "USD",
        "initial_deposit_cents": 10000  # $100.00
    })).json()

    dest_acc = (await client.post("/api/v1/accounts", json={
        "holder_name": "Parallel Concurrency Vault",
        "account_type": "USER_SAVINGS",
        "currency": "USD",
        "initial_deposit_cents": 0      # $0.00
    })).json()

    source_id = source_acc["id"]
    dest_id = dest_acc["id"]

    # 2. Prepare 50 concurrent transfer requests
    NUM_CONCURRENT_REQUESTS = 50
    AMOUNT_PER_REQUEST = 1000  # $10.00

    async def execute_transfer_task(i: int):
        unique_key = f"concurrency-50-{uuid.uuid4().hex}"
        payload = {
            "source_account_id": source_id,
            "destination_account_id": dest_id,
            "amount_cents": AMOUNT_PER_REQUEST,
            "description": f"Parallel transfer #{i+1}"
        }
        res = await client.post(
            "/api/v1/transfers",
            json=payload,
            headers={"Idempotency-Key": unique_key}
        )
        return res.status_code, res.json()

    # 3. Fire all 50 requests simultaneously via asyncio.gather
    tasks = [execute_transfer_task(i) for i in range(NUM_CONCURRENT_REQUESTS)]
    results = await asyncio.gather(*tasks)

    # 4. Analyze results
    success_responses = [r for r in results if r[0] == 201]
    insufficient_funds_responses = [r for r in results if r[0] == 400]

    assert len(success_responses) == 10, f"Expected exactly 10 successes, got {len(success_responses)}"
    assert len(insufficient_funds_responses) == 40, f"Expected exactly 40 rejections, got {len(insufficient_funds_responses)}"

    # 5. Check post-test account balances
    source_final = (await client.get(f"/api/v1/accounts/{source_id}")).json()
    dest_final = (await client.get(f"/api/v1/accounts/{dest_id}")).json()

    assert source_final["balance"] == 0, f"Source balance must be 0, got {source_final['balance']}"
    assert dest_final["balance"] == 10000, f"Destination balance must be 10000, got {dest_final['balance']}"

    # 6. Verify absolute zero-sum ledger balance across the entire system
    audit = (await client.get("/api/v1/ledger/audit")).json()
    assert audit["is_balanced"] is True
    assert audit["imbalance_cents"] == 0
    assert audit["system_invariant_verified"] is True

@pytest.mark.asyncio
async def test_concurrent_idempotency_storm(client: AsyncClient):
    """
    Test 20 parallel requests attempting to execute with the EXACT SAME Idempotency-Key.
    Guarantees:
    - Only ONE transaction is processed in the ledger.
    - All requests return either 201 (fresh or cached replay) or 409 (in-flight conflict).
    - Exactly one unique transaction ID exists.
    - Balance is deducted exactly ONCE.
    """
    source_acc = (await client.post("/api/v1/accounts", json={
        "holder_name": "Idempotency Storm Sender",
        "account_type": "USER_CHECKING",
        "currency": "USD",
        "initial_deposit_cents": 50000  # $500.00
    })).json()

    dest_acc = (await client.post("/api/v1/accounts", json={
        "holder_name": "Idempotency Storm Vault",
        "account_type": "USER_SAVINGS",
        "currency": "USD",
        "initial_deposit_cents": 0
    })).json()

    storm_key = f"storm-key-{uuid.uuid4().hex}"
    payload = {
        "source_account_id": source_acc["id"],
        "destination_account_id": dest_acc["id"],
        "amount_cents": 5000,  # $50.00
        "description": "Storm test"
    }

    async def storm_worker():
        return await client.post(
            "/api/v1/transfers",
            json=payload,
            headers={"Idempotency-Key": storm_key}
        )

    tasks = [storm_worker() for _ in range(20)]
    responses = await asyncio.gather(*tasks)

    completed_tx_ids = set()
    for resp in responses:
        assert resp.status_code in (201, 409), f"Unexpected status code {resp.status_code}"
        if resp.status_code == 201:
            data = resp.json()
            completed_tx_ids.add(data["transaction_id"])

    # Exactly 1 unique transaction was created
    assert len(completed_tx_ids) == 1, f"Expected 1 unique transaction, got {len(completed_tx_ids)}"

    # Check that balance was deducted by $50.00 exactly once (50000 - 5000 = 45000)
    source_check = (await client.get(f"/api/v1/accounts/{source_acc['id']}")).json()
    assert source_check["balance"] == 45000
