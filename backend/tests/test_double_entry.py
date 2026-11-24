import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_account_creation_and_listing(client: AsyncClient):
    # 1. Create a new checking account
    create_payload = {
        "holder_name": "Test User Alpha",
        "account_type": "USER_CHECKING",
        "currency": "USD",
        "initial_deposit_cents": 5000  # $50.00
    }
    response = await client.post("/api/v1/accounts", json=create_payload)
    assert response.status_code == 201
    data = response.json()
    assert data["holder_name"] == "Test User Alpha"
    assert data["balance"] == 5000
    assert data["balance_formatted"] == "50.00"
    account_id = data["id"]

    # 2. Retrieve account by ID
    get_res = await client.get(f"/api/v1/accounts/{account_id}")
    assert get_res.status_code == 200
    assert get_res.json()["account_number"] == data["account_number"]

@pytest.mark.asyncio
async def test_double_entry_transfer_success(client: AsyncClient):
    # Create two fresh accounts
    acc_a_res = await client.post("/api/v1/accounts", json={
        "holder_name": "Alice DoubleEntry",
        "account_type": "USER_CHECKING",
        "currency": "USD",
        "initial_deposit_cents": 20000  # $200.00
    })
    acc_b_res = await client.post("/api/v1/accounts", json={
        "holder_name": "Bob DoubleEntry",
        "account_type": "USER_SAVINGS",
        "currency": "USD",
        "initial_deposit_cents": 10000  # $100.00
    })
    acc_a_id = acc_a_res.json()["id"]
    acc_b_id = acc_b_res.json()["id"]

    # Transfer $75.00 (7500 cents) from A to B
    transfer_payload = {
        "source_account_id": acc_a_id,
        "destination_account_id": acc_b_id,
        "amount_cents": 7500,
        "description": "Payment for software design services"
    }
    res = await client.post("/api/v1/transfers", json=transfer_payload)
    assert res.status_code == 201
    t_data = res.json()
    assert t_data["success"] is True
    assert t_data["amount_cents"] == 7500
    assert t_data["source_balance_after"] == 12500       # 20000 - 7500 = 12500 ($125.00)
    assert t_data["destination_balance_after"] == 17500  # 10000 + 7500 = 17500 ($175.00)

    # Verify audit summary: Total Debits == Total Credits
    audit_res = await client.get("/api/v1/ledger/audit")
    assert audit_res.status_code == 200
    audit_data = audit_res.json()
    assert audit_data["is_balanced"] is True
    assert audit_data["imbalance_cents"] == 0
    assert audit_data["system_invariant_verified"] is True

@pytest.mark.asyncio
async def test_insufficient_funds_rejection(client: AsyncClient):
    acc_c_res = await client.post("/api/v1/accounts", json={
        "holder_name": "Low Balance User",
        "account_type": "USER_CHECKING",
        "currency": "USD",
        "initial_deposit_cents": 500  # $5.00
    })
    acc_d_res = await client.post("/api/v1/accounts", json={
        "holder_name": "Target User",
        "account_type": "USER_SAVINGS",
        "currency": "USD",
        "initial_deposit_cents": 0
    })
    acc_c_id = acc_c_res.json()["id"]
    acc_d_id = acc_d_res.json()["id"]

    # Attempt to transfer $50.00 (5000 cents) with only $5.00 available
    transfer_payload = {
        "source_account_id": acc_c_id,
        "destination_account_id": acc_d_id,
        "amount_cents": 5000,
        "description": "Illegal overdraft attempt"
    }
    res = await client.post("/api/v1/transfers", json=transfer_payload)
    assert res.status_code == 400
    assert "Insufficient funds" in res.json()["detail"]

    # Verify balance was untouched
    check_c = await client.get(f"/api/v1/accounts/{acc_c_id}")
    assert check_c.json()["balance"] == 500

@pytest.mark.asyncio
async def test_self_transfer_forbidden(client: AsyncClient):
    acc_res = await client.post("/api/v1/accounts", json={
        "holder_name": "Self Sender",
        "account_type": "USER_CHECKING",
        "currency": "USD",
        "initial_deposit_cents": 1000
    })
    acc_id = acc_res.json()["id"]

    res = await client.post("/api/v1/transfers", json={
        "source_account_id": acc_id,
        "destination_account_id": acc_id,
        "amount_cents": 100,
        "description": "Self transfer"
    })
    assert res.status_code == 400
    assert "distinct" in res.json()["detail"]
