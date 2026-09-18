from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import base64
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
import jwt
import bcrypt
from datetime import datetime, timezone, timedelta


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()

security = HTTPBearer()

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM]
        )
        username = payload.get("sub")

        if not username:
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication token"
            )

        user = await db.users.find_one(
            {"username": username},
            {"_id": 0}
        )

        if not user:
            raise HTTPException(
                status_code=401,
                detail="User not found"
            )

        return user

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=401,
            detail="Authentication token expired"
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication token"
        )


api_router = APIRouter(
    prefix="/api",
    dependencies=[Depends(get_current_user)]
)

auth_router = APIRouter(prefix="/api")

STAGES = ["ordered", "dispatched", "received", "delivered"]
STAGE_LABELS = {
    "ordered": "Ordered",
    "dispatched": "Dispatched",
    "received": "Received",
    "delivered": "Delivered",
}
ARCHIVE_AFTER_DAYS = 3


def now_iso():
    return datetime.now(timezone.utc).isoformat()


# ---------- Models ----------
class ItemStage(BaseModel):
    done: bool = False
    at: Optional[str] = None
    lr_document_id: Optional[str] = None


class ItemInput(BaseModel):
    name: str
    brand: Optional[str] = ""
    quantity: str = "1"


class Payment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    amount: float
    document_id: Optional[str] = None
    note: Optional[str] = ""
    at: str = Field(default_factory=now_iso)


class OrderCreate(BaseModel):
    customer_name: str
    firm_name: str
    phone: str
    company_name: Optional[str] = ""
    document_id: Optional[str] = None
    total_value: float = 0
    advance_value: float = 0
    notes: Optional[str] = ""
    delivery_address: Optional[str] = ""
    items: List[ItemInput] = []


class StageUpdate(BaseModel):
    stage: str
    done: bool
    lr_document_id: Optional[str] = None


class PaymentCreate(BaseModel):
    amount: float
    document_id: Optional[str] = None
    note: Optional[str] = ""


def new_item(item: ItemInput):
    stages = {}
    for s in STAGES:
        stages[s] = {"done": False, "at": None}
        if s == "dispatched":
            stages[s]["lr_document_id"] = None
    return {
        "id": str(uuid.uuid4()),
        "name": item.name,
        "brand": item.brand or "",
        "quantity": item.quantity or "1",
        "stages": stages,
    }


def compute_derived(order: dict) -> dict:
    items = order.get("items", [])
    total = len(items)
    counts = {s: 0 for s in STAGES}
    for it in items:
        for s in STAGES:
            if it["stages"].get(s, {}).get("done"):
                counts[s] += 1

    highest = None
    for s in STAGES:
        if counts[s] > 0:
            highest = s

    delivered_full = total > 0 and counts["delivered"] == total

    if highest is None:
        progress_label = "Confirmed"
    else:
        full = counts[highest] == total
        progress_label = STAGE_LABELS[highest] if full else "Partially " + STAGE_LABELS[highest]

    total_value = float(order.get("total_value", 0) or 0)
    advance = float(order.get("advance_value", 0) or 0)
    paid_payments = sum(float(p.get("amount", 0) or 0) for p in order.get("payments", []))
    total_paid = advance + paid_payments
    balance = round(total_value - total_paid, 2)
    fully_paid = balance <= 0 and total_value > 0

    if delivered_full and fully_paid:
        status = "Completed"
    elif delivered_full and not fully_paid:
        status = "Payment Pending"
    else:
        status = progress_label

    # archive computation
    is_archived = False
    completed_at = None
    if delivered_full and fully_paid:
        delivered_at = order.get("delivered_at")
        fully_paid_at = order.get("fully_paid_at")
        candidates = [d for d in [delivered_at, fully_paid_at] if d]
        if candidates:
            completed_at = max(candidates)
            try:
                ca = datetime.fromisoformat(completed_at)
                if datetime.now(timezone.utc) - ca > timedelta(days=ARCHIVE_AFTER_DAYS):
                    is_archived = True
            except Exception:
                pass

    order["derived"] = {
        "status": status,
        "progress_label": progress_label,
        "counts": counts,
        "total_items": total,
        "delivered_full": delivered_full,
        "total_paid": total_paid,
        "balance": balance,
        "fully_paid": fully_paid,
        "is_archived": is_archived,
        "completed_at": completed_at,
    }
    return order


def clean(order: dict) -> dict:
    order.pop("_id", None)
    return compute_derived(order)


async def recompute_timestamps(order: dict):
    """Set delivered_at / fully_paid_at markers when thresholds first crossed."""
    d = compute_derived(dict(order))["derived"]
    update = {}
    if d["delivered_full"] and not order.get("delivered_at"):
        update["delivered_at"] = now_iso()
    if not d["delivered_full"] and order.get("delivered_at"):
        update["delivered_at"] = None
    if d["fully_paid"] and not order.get("fully_paid_at"):
        update["fully_paid_at"] = now_iso()
    if not d["fully_paid"] and order.get("fully_paid_at"):
        update["fully_paid_at"] = None
    if update:
        order.update(update)
        await db.orders.update_one({"id": order["id"]}, {"$set": update})


# ---------- Authentication ----------

class LoginRequest(BaseModel):
    username: str
    password: str


@auth_router.post("/auth/login")
async def login(payload: LoginRequest):
    user = await db.users.find_one(
        {"username": payload.username},
        {"_id": 0}
    )

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )

    if not bcrypt.checkpw(
        payload.password.encode("utf-8"),
        user["password_hash"].encode("utf-8")
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )

    token = jwt.encode(
        {
            "sub": user["username"],
            "exp": datetime.now(timezone.utc) + timedelta(days=7)
        },
        JWT_SECRET,
        algorithm=JWT_ALGORITHM
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "username": user["username"]
    }


@auth_router.get("/auth/me")
async def current_user(user=Depends(get_current_user)):
    return {
        "username": user["username"]
    }
    
# ---------- Files ----------
@api_router.post("/files")
async def upload_file(file: UploadFile = File(...)):
    content = await file.read()
    file_id = str(uuid.uuid4())
    doc = {
        "id": file_id,
        "filename": file.filename,
        "content_type": file.content_type or "application/octet-stream",
        "data": base64.b64encode(content).decode("utf-8"),
        "uploaded_at": now_iso(),
    }
    await db.files.insert_one(doc)
    return {"id": file_id, "filename": file.filename, "content_type": doc["content_type"]}


@api_router.get("/files/{file_id}")
async def get_file(file_id: str):
    doc = await db.files.find_one({"id": file_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="File not found")
    data = base64.b64decode(doc["data"])
    return Response(
        content=data,
        media_type=doc["content_type"],
        headers={"Content-Disposition": f'inline; filename="{doc["filename"]}"'},
    )


# ---------- Orders ----------
@api_router.post("/orders")
async def create_order(payload: OrderCreate):
    order = payload.model_dump()
    order["id"] = str(uuid.uuid4())
    order["items"] = [new_item(ItemInput(**it)) for it in order["items"]]
    order["payments"] = []
    order["created_at"] = now_iso()
    order["delivered_at"] = None
    order["fully_paid_at"] = None
    await db.orders.insert_one(dict(order))
    await recompute_timestamps(order)
    fresh = await db.orders.find_one({"id": order["id"]}, {"_id": 0})
    return clean(fresh)


@api_router.get("/orders")
async def list_orders(archived: bool = False):
    orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(2000)
    result = [clean(o) for o in orders]
    result = [o for o in result if o["derived"]["is_archived"] == archived]
    return result


@api_router.get("/orders/{order_id}")
async def get_order(order_id: str):
    o = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not o:
        raise HTTPException(status_code=404, detail="Order not found")
    return clean(o)


@api_router.delete("/orders/{order_id}")
async def delete_order(order_id: str):
    await db.orders.delete_one({"id": order_id})
    return {"ok": True}


@api_router.put("/orders/{order_id}/items/{item_id}/stage")
async def update_stage(order_id: str, item_id: str, payload: StageUpdate):
    if payload.stage not in STAGES:
        raise HTTPException(status_code=400, detail="Invalid stage")
    o = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not o:
        raise HTTPException(status_code=404, detail="Order not found")
    if payload.stage == "dispatched" and payload.done and not payload.lr_document_id:
        raise HTTPException(status_code=400, detail="LR document required for dispatch")

    found = False
    for it in o["items"]:
        if it["id"] == item_id:
            found = True
            st = it["stages"][payload.stage]
            st["done"] = payload.done
            st["at"] = now_iso() if payload.done else None
            if payload.stage == "dispatched":
                st["lr_document_id"] = payload.lr_document_id if payload.done else None
    if not found:
        raise HTTPException(status_code=404, detail="Item not found")

    await db.orders.update_one({"id": order_id}, {"$set": {"items": o["items"]}})
    o = await db.orders.find_one({"id": order_id}, {"_id": 0})
    await recompute_timestamps(o)
    fresh = await db.orders.find_one({"id": order_id}, {"_id": 0})
    return clean(fresh)


@api_router.post("/orders/{order_id}/payments")
async def add_payment(order_id: str, payload: PaymentCreate):
    o = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not o:
        raise HTTPException(status_code=404, detail="Order not found")
    payment = Payment(amount=payload.amount, document_id=payload.document_id, note=payload.note or "").model_dump()
    o.setdefault("payments", []).append(payment)
    await db.orders.update_one({"id": order_id}, {"$set": {"payments": o["payments"]}})
    o = await db.orders.find_one({"id": order_id}, {"_id": 0})
    await recompute_timestamps(o)
    fresh = await db.orders.find_one({"id": order_id}, {"_id": 0})
    return clean(fresh)


# ---------- Customers ----------
@api_router.get("/customers/lookup")
async def lookup_customer(phone: str):
    o = await db.orders.find_one({"phone": phone}, {"_id": 0}, sort=[("created_at", -1)])
    if not o:
        return {"found": False}
    return {
        "found": True,
        "customer_name": o.get("customer_name", ""),
        "firm_name": o.get("firm_name", ""),
        "company_name": o.get("company_name", ""),
        "delivery_address": o.get("delivery_address", ""),
    }


@api_router.get("/customers")
async def list_customers():
    orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(5000)
    customers = {}
    for o in orders:
        d = compute_derived(dict(o))["derived"]
        phone = o.get("phone", "")
        key = phone or o.get("customer_name", "")
        if key not in customers:
            customers[key] = {
                "phone": phone,
                "customer_name": o.get("customer_name", ""),
                "firm_name": o.get("firm_name", ""),
                "company_name": o.get("company_name", ""),
                "order_count": 0,
                "lifetime_value": 0.0,
                "outstanding": 0.0,
                "orders": [],
            }
        c = customers[key]
        c["order_count"] += 1
        c["lifetime_value"] += float(o.get("total_value", 0) or 0)
        if d["balance"] > 0:
            c["outstanding"] += d["balance"]
        c["orders"].append({
            "id": o["id"],
            "created_at": o.get("created_at"),
            "total_value": o.get("total_value", 0),
            "status": d["status"],
            "balance": d["balance"],
            "item_count": d["total_items"],
        })
    return list(customers.values())


# ---------- Payments ----------
@api_router.get("/payments")
async def payments_overview():
    orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(5000)
    pending = []
    archive = []
    for o in orders:
        d = compute_derived(dict(o))["derived"]
        row = {
            "id": o["id"],
            "customer_name": o.get("customer_name", ""),
            "firm_name": o.get("firm_name", ""),
            "phone": o.get("phone", ""),
            "total_value": float(o.get("total_value", 0) or 0),
            "total_paid": d["total_paid"],
            "balance": d["balance"],
            "status": d["status"],
            "created_at": o.get("created_at"),
            "payments": o.get("payments", []),
        }
        if d["fully_paid"]:
            archive.append(row)
        else:
            pending.append(row)
    pending.sort(key=lambda r: r["balance"], reverse=True)
    return {"pending": pending, "archive": archive}


app.include_router(auth_router)
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
