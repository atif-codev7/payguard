import uuid
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_idempotent_transfer_replay(client: AsyncClient):
    acc_a = (await client.post("/api/v1/accounts", json={
        "holder_name": "Idempotent Sender",
        "account_type": "USER_CHECKING",
        "currency": "USD",
        "initial_deposit_cents": 10000  # $100.00
    })).json()

    acc_b = (await client.post("/api/v1/accounts", json={
        "holder_name": "Idempotent Receiver",
        "account_type": "USER_SAVINGS",
        "currency": "USD",
        "initial_deposit_cents": 0
    })).json()

    idempotency_key = f"idemp-{uuid.uuid4().hex}"
    payload = {
        "source_account_id": acc_a["id"],
        "destination_account_id": acc_b["id"],
        "amount_cents": 2500,  # $25.00
        "description": "Idempotent transfer test"
    }

    # First attempt: Fresh execution
    headers = {"Idempotency-Key": idempotency_key}
    first_res = await client.post("/api/v1/transfers", json=payload, headers=headers)
    assert first_res.status_code == 201
    first_data = first_res.json()
    assert first_data["success"] is True
    assert first_data["amount_cents"] == 2500
    assert first_data["source_balance_after"] == 7500
    txn_id = first_data["transaction_id"]

    # Second attempt: Exact same request with same Idempotency-Key
    second_res = await client.post("/api/v1/transfers", json=payload, headers=headers)
    assert second_res.status_code == 201
    assert second_res.headers.get("idempotent-replay") == "true"
    second_data = second_res.json()
    assert second_data["transaction_id"] == txn_id
    assert second_data["source_balance_after"] == 7500

    # Verify sender balance in DB was deducted ONLY ONCE (still $75.00, NOT $50.00)
    check_a = (await client.get(f"/api/v1/accounts/{acc_a['id']}")).json()
    assert check_a["balance"] == 7500

@pytest.mark.asyncio
async def test_idempotency_payload_mismatch_rejected(client: AsyncClient):
    acc_a = (await client.post("/api/v1/accounts", json={
        "holder_name": "Mismatch Sender",
        "account_type": "USER_CHECKING",
        "currency": "USD",
        "initial_deposit_cents": 10000
    })).json()

    acc_b = (await client.post("/api/v1/accounts", json={
        "holder_name": "Mismatch Receiver",
        "account_type": "USER_SAVINGS",
        "currency": "USD",
        "initial_deposit_cents": 0
    })).json()

    idempotency_key = f"idemp-mismatch-{uuid.uuid4().hex}"
    payload_1 = {
        "source_account_id": acc_a["id"],
        "destination_account_id": acc_b["id"],
        "amount_cents": 1000,
        "description": "Original intent"
    }
    # Initial request
    res1 = await client.post("/api/v1/transfers", json=payload_1, headers={"Idempotency-Key": idempotency_key})
    assert res1.status_code == 201

    # Tampered request with same idempotency key but different amount
    payload_2 = {
        "source_account_id": acc_a["id"],
        "destination_account_id": acc_b["id"],
        "amount_cents": 2000,  # Modified amount!
        "description": "Original intent"
    }
    res2 = await client.post("/api/v1/transfers", json=payload_2, headers={"Idempotency-Key": idempotency_key})
    assert res2.status_code == 422
    assert "different request payload" in res2.json()["detail"]
