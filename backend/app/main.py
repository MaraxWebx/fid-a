from datetime import UTC, datetime

from bson import ObjectId
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from pymongo.errors import PyMongoError
from pydantic import BaseModel, Field
import stripe

from .config import (
    DEFAULT_PROFILE_EMAIL,
    MONGODB_DB_NAME,
    STRIPE_CHECKOUT_CANCEL_URL,
    STRIPE_CHECKOUT_SUCCESS_URL,
    STRIPE_PRICE_ID,
    STRIPE_SECRET_KEY,
)
from .db import client, db

app = FastAPI(title="Fidea Local API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def serialize_id(value):
    return str(value) if isinstance(value, ObjectId) else value


def serialize_center(document):
    return {
        "id": serialize_id(document["_id"]),
        "email": document.get("email") or document.get("mail"),
        "name": document.get("name"),
        "branding": document.get("branding", {}),
        "opening_hours": document.get("opening_hours", {}),
        "opening_days": document.get("opening_days", []),
        "primary_services": document.get("primary_services", []),
        "registration_status": document.get("registration_status"),
        "subscription_status": document.get("subscription_status"),
        "is_listable": document.get("is_listable", False),
        "created_at": document.get("created_at"),
    }


def serialize_service(document):
    return {
        "id": serialize_id(document["_id"]),
        "center_id": serialize_id(document.get("center_id")),
        "name": document.get("name"),
        "category": document.get("category"),
        "subcategory": document.get("subcategory"),
        "duration": document.get("duration"),
        "price": document.get("price"),
        "description": document.get("description"),
        "visibility": document.get("visibility"),
        "created_at": document.get("created_at"),
    }


def serialize_user(document):
    return {
        "id": serialize_id(document["_id"]),
        "email": document.get("email"),
        "name": document.get("name"),
        "role": document.get("role"),
        "phone": document.get("phone"),
        "center_id": serialize_id(document.get("center_id")),
        "created_at": document.get("created_at"),
    }


def serialize_booking(document):
    start_time = document.get("start_time")
    end_time = document.get("end_time")
    price = document.get("service", {}).get("price")

    return {
        "id": serialize_id(document["_id"]),
        "center_id": serialize_id(document.get("center_id")),
        "user_id": serialize_id(document.get("user_id")),
        "service_id": serialize_id(document.get("service_id")),
        "service_name": document.get("service_name") or document.get("service", {}).get("name"),
        "operator_name": document.get("operator_name"),
        "status": document.get("status"),
        "start_time": start_time,
        "end_time": end_time,
        "date_label": start_time.strftime("%d/%m/%Y") if start_time else None,
        "time_label": start_time.strftime("%H:%M") if start_time else None,
        "price": price,
        "created_at": document.get("created_at"),
    }


def parse_object_id(value: str, label: str):
    try:
        return ObjectId(value)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"Invalid {label}.") from exc


class CenterRegistrationPayload(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    vat_number: str = Field(min_length=5, max_length=32)
    address: str = Field(min_length=4, max_length=180)
    city: str = Field(min_length=2, max_length=120)
    postal_code: str = Field(min_length=3, max_length=16)
    province: str = Field(min_length=2, max_length=64)
    country: str = Field(min_length=2, max_length=64)


def build_activation_status(document):
    missing_fields = []

    if not document.get("opening_days"):
        missing_fields.append("opening_days")

    if not document.get("primary_services"):
        missing_fields.append("primary_services")

    subscription_status = document.get("subscription_status", "pending")
    onboarding_completed = not missing_fields
    is_listable = subscription_status == "active" and onboarding_completed

    if is_listable:
        state = "active"
        message = "Il centro e attivo e puo essere mostrato in app."
    elif subscription_status != "active":
        state = "payment_pending"
        message = "Completa il pagamento dell'abbonamento per continuare con l'attivazione."
    else:
        state = "inactive_incomplete"
        message = (
            "Il pagamento e completato, ma il centro non e ancora visibile finche non inserisci "
            "giorni di apertura e servizi principali."
        )

    return {
        "state": state,
        "subscription_status": subscription_status,
        "onboarding_completed": onboarding_completed,
        "missing_fields": missing_fields,
        "is_listable": is_listable,
        "message": message,
    }


def build_checkout_urls(request: Request):
    success_url = STRIPE_CHECKOUT_SUCCESS_URL
    cancel_url = STRIPE_CHECKOUT_CANCEL_URL

    if success_url and cancel_url:
        return success_url, cancel_url

    base_url = str(request.base_url).rstrip("/")
    return (
        success_url or f"{base_url}/health?checkout=success",
        cancel_url or f"{base_url}/health?checkout=cancel",
    )


def create_checkout_session(center_id: str, center_name: str, request: Request):
    if not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Missing STRIPE_SECRET_KEY environment variable.")

    if not STRIPE_PRICE_ID:
        raise HTTPException(status_code=500, detail="Missing STRIPE_PRICE_ID environment variable.")

    stripe.api_key = STRIPE_SECRET_KEY
    success_url, cancel_url = build_checkout_urls(request)

    try:
        return stripe.checkout.Session.create(
            mode="subscription",
            line_items=[{"price": STRIPE_PRICE_ID, "quantity": 1}],
            success_url=success_url,
            cancel_url=cancel_url,
            client_reference_id=center_id,
            metadata={
                "center_id": center_id,
                "center_name": center_name,
            },
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Stripe checkout creation failed: {exc}") from exc


@app.get("/health")
def health():
    database_status = "ok"
    database_error = None

    try:
        client.admin.command("ping")
    except PyMongoError as exc:
        database_status = "error"
        database_error = str(exc)

    return {
        "status": "ok" if database_status == "ok" else "degraded",
        "api": {
            "status": "ok",
            "name": app.title,
            "version": app.version,
        },
        "services": {
            "database": {
                "status": database_status,
                "name": MONGODB_DB_NAME,
                "error": database_error,
            }
        },
        "endpoints": {
            "health": "/health",
            "centers": "/api/centers",
            "profile": "/api/users/profile",
        },
        "timestamp": datetime.now(UTC).isoformat(),
    }


@app.get("/api/health")
def api_health():
    return health()


@app.post("/api/centers/register")
def register_center(payload: CenterRegistrationPayload, request: Request):
    now = datetime.now(UTC)
    center_document = {
        "name": payload.name,
        "vat_number": payload.vat_number,
        "address": payload.address,
        "city": payload.city,
        "postal_code": payload.postal_code,
        "province": payload.province,
        "country": payload.country,
        "branding": {},
        "opening_hours": {},
        "opening_days": [],
        "primary_services": [],
        "registration_status": "draft",
        "subscription_status": "pending",
        "onboarding_completed": False,
        "is_listable": False,
        "created_at": now,
        "updated_at": now,
    }

    result = db.centers.insert_one(center_document)
    center_id = str(result.inserted_id)
    session = create_checkout_session(center_id, payload.name, request)

    db.centers.update_one(
        {"_id": result.inserted_id},
        {
            "$set": {
                "registration_status": "payment_pending",
                "stripe": {
                    "checkout_session_id": session.id,
                    "checkout_url": session.url,
                    "price_id": STRIPE_PRICE_ID,
                },
                "updated_at": datetime.now(UTC),
            }
        },
    )

    created_center = db.centers.find_one({"_id": result.inserted_id})
    activation_status = build_activation_status(created_center)

    return {
        "center": serialize_center(created_center),
        "checkout_url": session.url,
        "checkout_session_id": session.id,
        "activation": activation_status,
    }


@app.get("/api/centers/{center_id}/activation-status")
def get_center_activation_status(center_id: str):
    object_id = parse_object_id(center_id, "center id")
    center = db.centers.find_one({"_id": object_id})

    if not center:
        raise HTTPException(status_code=404, detail="Center not found.")

    return {
        "center_id": center_id,
        "center_name": center.get("name"),
        "activation": build_activation_status(center),
    }


@app.get("/api/centers")
def list_centers():
    documents = list(db.centers.find().sort("name", 1))
    return [serialize_center(document) for document in documents]


@app.get("/api/centers/{center_id}/services")
def list_center_services(center_id: str):
    object_id = parse_object_id(center_id, "center id")

    documents = list(
        db.services.find({"center_id": object_id, "visibility": "active"}).sort(
            [("category", 1), ("subcategory", 1), ("name", 1)]
        )
    )
    return [serialize_service(document) for document in documents]


@app.get("/api/users/profile")
def get_profile(email: str = Query(default=DEFAULT_PROFILE_EMAIL)):
    document = db.users.find_one({"email": email})

    if not document:
        raise HTTPException(status_code=404, detail="User not found.")

    return serialize_user(document)


@app.get("/api/users/bookings")
def get_user_bookings(email: str = Query(default=DEFAULT_PROFILE_EMAIL)):
    user = db.users.find_one({"email": email})

    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    pipeline = [
        {"$match": {"user_id": user["_id"]}},
        {
            "$lookup": {
                "from": "services",
                "localField": "service_id",
                "foreignField": "_id",
                "as": "service",
            }
        },
        {"$unwind": {"path": "$service", "preserveNullAndEmptyArrays": True}},
        {"$sort": {"start_time": -1}},
    ]

    documents = list(db.bookings.aggregate(pipeline))
    return [serialize_booking(document) for document in documents]


@app.get("/api/centers/{center_id}/dashboard")
def get_center_dashboard(center_id: str):
    object_id = parse_object_id(center_id, "center id")
    today_start = datetime(2026, 5, 2, 0, 0, 0)
    today_end = datetime(2026, 5, 2, 23, 59, 59)

    todays_bookings = list(
        db.bookings.find(
            {
                "center_id": object_id,
                "start_time": {"$gte": today_start, "$lte": today_end},
            }
        ).sort("start_time", 1)
    )

    pipeline = [
        {"$match": {"center_id": object_id}},
        {
            "$lookup": {
                "from": "users",
                "localField": "user_id",
                "foreignField": "_id",
                "as": "user",
            }
        },
        {"$unwind": {"path": "$user", "preserveNullAndEmptyArrays": True}},
        {"$sort": {"start_time": -1}},
        {"$limit": 5},
    ]
    recent_bookings = list(db.bookings.aggregate(pipeline))

    distinct_clients = db.bookings.distinct("user_id", {"center_id": object_id})
    services_count = db.services.count_documents({"center_id": object_id, "visibility": "active"})

    total_revenue = 0
    for booking in todays_bookings:
        service = db.services.find_one({"_id": booking.get("service_id")})
        if service and isinstance(service.get("price"), (int, float)):
            total_revenue += service["price"]

    agenda = []
    for booking in todays_bookings:
        user = db.users.find_one({"_id": booking.get("user_id")})
        agenda.append(
            {
                "id": serialize_id(booking["_id"]),
                "time_label": booking["start_time"].strftime("%H:%M"),
                "client_name": (user or {}).get("name", "Cliente"),
                "operator_name": booking.get("operator_name") or "Staff",
                "service": booking.get("service_name", "Servizio"),
                "status_label": booking.get("status", "confirmed"),
            }
        )

    clients = []
    for booking in recent_bookings:
        user = booking.get("user") or {}
        clients.append(
            {
                "id": serialize_id(user.get("_id")) if user.get("_id") else serialize_id(booking["_id"]),
                "name": user.get("name", "Cliente"),
                "phone": user.get("phone", "n/a"),
                "last_visit": booking["start_time"].strftime("Ultima visita: %d %b"),
            }
        )

    return {
        "metrics": [
            {"id": "metric-1", "label": "Appuntamenti oggi", "value": str(len(todays_bookings))},
            {"id": "metric-2", "label": "Clienti attivi", "value": str(len(distinct_clients))},
            {"id": "metric-3", "label": "Trattamenti attivi", "value": str(services_count)},
            {"id": "metric-4", "label": "Fatturato oggi", "value": f"EUR {total_revenue}"},
        ],
        "agenda": agenda,
        "clients": clients,
    }


@app.get("/api/centers/{center_id}/clients")
def get_center_clients(center_id: str):
    object_id = parse_object_id(center_id, "center id")

    pipeline = [
        {"$match": {"center_id": object_id}},
        {
            "$lookup": {
                "from": "users",
                "localField": "user_id",
                "foreignField": "_id",
                "as": "user",
            }
        },
        {"$unwind": {"path": "$user", "preserveNullAndEmptyArrays": True}},
        {
            "$group": {
                "_id": "$user._id",
                "name": {"$first": "$user.name"},
                "phone": {"$first": "$user.phone"},
                "email": {"$first": "$user.email"},
                "bookings": {"$sum": 1},
                "last_visit": {"$max": "$start_time"},
            }
        },
        {"$sort": {"last_visit": -1}},
    ]

    documents = list(db.bookings.aggregate(pipeline))

    return [
        {
            "id": serialize_id(document["_id"]),
            "name": document.get("name", "Cliente"),
            "phone": document.get("phone", "n/a"),
            "email": document.get("email"),
            "bookings": document.get("bookings", 0),
            "last_visit": document["last_visit"].strftime("%d/%m/%Y") if document.get("last_visit") else None,
        }
        for document in documents
    ]
