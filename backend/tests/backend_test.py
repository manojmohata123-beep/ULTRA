"""Backend API tests for Order Desk"""
import os
import io
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    # fallback: read from frontend .env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip()
                break
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"

TEST_PHONE = "9999900001"
created_ids = []


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    yield s
    # cleanup
    for oid in created_ids:
        try:
            s.delete(f"{API}/orders/{oid}", timeout=10)
        except Exception:
            pass


def _upload_file(client, name="test.txt", content=b"hello", ctype="text/plain"):
    files = {"file": (name, io.BytesIO(content), ctype)}
    r = client.post(f"{API}/files", files=files, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["id"]


# ---------- Files ----------
def test_file_upload_and_fetch(client):
    fid = _upload_file(client, "hi.txt", b"world", "text/plain")
    r = client.get(f"{API}/files/{fid}", timeout=10)
    assert r.status_code == 200
    assert r.content == b"world"


def test_file_not_found(client):
    r = client.get(f"{API}/files/does-not-exist", timeout=10)
    assert r.status_code == 404


# ---------- Order lifecycle ----------
def test_create_order(client):
    doc_id = _upload_file(client, "order.txt", b"orderdoc")
    payload = {
        "customer_name": "TEST_Alice",
        "firm_name": "TEST_Firm",
        "phone": TEST_PHONE,
        "company_name": "TEST_Co",
        "document_id": doc_id,
        "total_value": 10000,
        "advance_value": 2000,
        "notes": "TEST notes",
        "delivery_address": "TEST addr",
        "items": [
            {"name": "Item A", "brand": "BrandA", "quantity": "2"},
            {"name": "Item B", "brand": "BrandB", "quantity": "1"},
        ],
    }
    r = client.post(f"{API}/orders", json=payload, timeout=15)
    assert r.status_code == 200, r.text
    o = r.json()
    created_ids.append(o["id"])
    assert o["customer_name"] == "TEST_Alice"
    assert len(o["items"]) == 2
    assert o["derived"]["status"] == "Confirmed"
    assert o["derived"]["balance"] == 8000
    # persistence check
    r2 = client.get(f"{API}/orders/{o['id']}", timeout=10)
    assert r2.status_code == 200
    assert r2.json()["id"] == o["id"]


def test_list_orders(client):
    r = client.get(f"{API}/orders", timeout=10)
    assert r.status_code == 200
    orders = r.json()
    assert any(o["id"] == created_ids[0] for o in orders)


def test_customer_lookup(client):
    r = client.get(f"{API}/customers/lookup", params={"phone": TEST_PHONE}, timeout=10)
    assert r.status_code == 200
    data = r.json()
    assert data["found"] is True
    assert data["customer_name"] == "TEST_Alice"
    assert data["firm_name"] == "TEST_Firm"


def test_customer_lookup_not_found(client):
    r = client.get(f"{API}/customers/lookup", params={"phone": "0000000000"}, timeout=10)
    assert r.status_code == 200
    assert r.json()["found"] is False


def test_stage_ordered_makes_partially(client):
    oid = created_ids[0]
    order = client.get(f"{API}/orders/{oid}").json()
    item_id = order["items"][0]["id"]
    r = client.put(
        f"{API}/orders/{oid}/items/{item_id}/stage",
        json={"stage": "ordered", "done": True},
        timeout=10,
    )
    assert r.status_code == 200
    d = r.json()["derived"]
    assert d["status"] == "Partially Ordered"


def test_dispatch_requires_lr(client):
    oid = created_ids[0]
    order = client.get(f"{API}/orders/{oid}").json()
    item_id = order["items"][0]["id"]
    r = client.put(
        f"{API}/orders/{oid}/items/{item_id}/stage",
        json={"stage": "dispatched", "done": True},
        timeout=10,
    )
    assert r.status_code == 400
    assert "LR" in r.text or "lr" in r.text.lower()


def test_full_stage_progression_and_payment(client):
    oid = created_ids[0]
    order = client.get(f"{API}/orders/{oid}").json()
    # progress every item through all 4 stages
    for it in order["items"]:
        for stage in ["ordered", "dispatched", "received", "delivered"]:
            body = {"stage": stage, "done": True}
            if stage == "dispatched":
                body["lr_document_id"] = _upload_file(client, "lr.txt", b"lr")
            r = client.put(f"{API}/orders/{oid}/items/{it['id']}/stage", json=body, timeout=15)
            assert r.status_code == 200, f"{stage}: {r.text}"
    fresh = client.get(f"{API}/orders/{oid}").json()
    assert fresh["derived"]["status"] == "Payment Pending", fresh["derived"]
    # Pay remaining
    balance = fresh["derived"]["balance"]
    r = client.post(f"{API}/orders/{oid}/payments", json={"amount": balance, "note": "final"}, timeout=10)
    assert r.status_code == 200
    assert r.json()["derived"]["status"] == "Completed"
    assert r.json()["derived"]["balance"] == 0


def test_payments_overview_places_in_archive(client):
    r = client.get(f"{API}/payments", timeout=10)
    assert r.status_code == 200
    data = r.json()
    assert "pending" in data and "archive" in data
    assert any(row["id"] == created_ids[0] for row in data["archive"])


def test_customers_list(client):
    r = client.get(f"{API}/customers", timeout=10)
    assert r.status_code == 200
    customers = r.json()
    match = [c for c in customers if c["phone"] == TEST_PHONE]
    assert match
    c = match[0]
    assert c["order_count"] >= 1
    assert c["lifetime_value"] >= 10000
    assert len(c["orders"]) >= 1


def test_archive_endpoint_ok(client):
    # completed order should NOT be in archive yet (3-day rule)
    r = client.get(f"{API}/orders", params={"archived": "true"}, timeout=10)
    assert r.status_code == 200
    ids = [o["id"] for o in r.json()]
    assert created_ids[0] not in ids
