from datetime import UTC, date, datetime, time, timedelta
import hashlib
import hmac
import re
import secrets
from zoneinfo import ZoneInfo

from bson import ObjectId
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
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
    STRIPE_WEBHOOK_SECRET,
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


def get_center_rating_summary(center_id: ObjectId):
    pipeline = [
        {"$match": {"center_id": center_id}},
        {
            "$group": {
                "_id": "$center_id",
                "average": {"$avg": "$rating"},
                "count": {"$sum": 1},
            }
        },
    ]
    summary = next(db.reviews.aggregate(pipeline), None)
    if not summary:
        return {"rating_average": None, "reviews_count": 0}

    average = summary.get("average")
    return {
        "rating_average": round(average, 1) if isinstance(average, (int, float)) else None,
        "reviews_count": summary.get("count", 0),
    }


def serialize_center(document):
    rating_summary = get_center_rating_summary(document["_id"])
    return {
        "id": serialize_id(document["_id"]),
        "email": document.get("email") or document.get("mail"),
        "name": document.get("name"),
        "branding": document.get("branding", {}),
        "opening_hours": document.get("opening_hours", {}),
        "opening_days": document.get("opening_days", []),
        "availability_overrides": document.get("availability_overrides", {}),
        "primary_services": document.get("primary_services", []),
        "registration_status": document.get("registration_status"),
        "subscription_status": document.get("subscription_status"),
        "is_listable": document.get("is_listable", False),
        "rating_average": rating_summary["rating_average"],
        "reviews_count": rating_summary["reviews_count"],
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
        "favorite_center_ids": [serialize_id(center_id) for center_id in document.get("favorite_center_ids", [])],
        "created_at": document.get("created_at"),
    }


def serialize_booking(document):
    start_time = document.get("start_time")
    end_time = document.get("end_time")
    price = document.get("service", {}).get("price")
    operator_name = document.get("operator_name")

    if not operator_name or operator_name == "Staff":
        center = document.get("center")
        if not center and document.get("center_id"):
            center = db.centers.find_one({"_id": document.get("center_id")})
        operator_name = (center or {}).get("name") or "Centro"

    return {
        "id": serialize_id(document["_id"]),
        "center_id": serialize_id(document.get("center_id")),
        "user_id": serialize_id(document.get("user_id")),
        "service_id": serialize_id(document.get("service_id")),
        "service_name": document.get("service_name") or document.get("service", {}).get("name"),
        "operator_name": operator_name,
        "client_name": document.get("client_name"),
        "client_phone": document.get("client_phone"),
        "status": document.get("status"),
        "slot_id": document.get("slot_id"),
        "start_time": start_time,
        "end_time": end_time,
        "date_label": start_time.strftime("%d/%m/%Y") if start_time else None,
        "time_label": start_time.strftime("%H:%M") if start_time else None,
        "price": price,
        "created_at": document.get("created_at"),
    }


def serialize_review(document):
    if not document:
        return None

    return {
        "id": serialize_id(document["_id"]),
        "center_id": serialize_id(document.get("center_id")),
        "user_id": serialize_id(document.get("user_id")),
        "booking_id": serialize_id(document.get("booking_id")),
        "service_name": document.get("service_name"),
        "rating": document.get("rating"),
        "comment": document.get("comment"),
        "user_name": document.get("user_name"),
        "created_at": document.get("created_at"),
    }


def build_client_booking_stats(user_id: ObjectId, center_id: ObjectId | None = None):
    now = datetime.now(ZoneInfo("Europe/Rome")).replace(tzinfo=None)
    match_query = {
        "user_id": user_id,
        "status": {"$ne": "canceled"},
        "start_time": {"$lte": now},
    }
    if center_id is not None:
        match_query["center_id"] = center_id

    pipeline = [
        {"$match": match_query},
        {
            "$lookup": {
                "from": "services",
                "localField": "service_id",
                "foreignField": "_id",
                "as": "service",
            }
        },
        {"$unwind": {"path": "$service", "preserveNullAndEmptyArrays": True}},
    ]
    bookings = list(db.bookings.aggregate(pipeline))

    treatment_counts: dict[str, int] = {}
    category_counts: dict[str, int] = {}
    time_counts: dict[str, int] = {}

    for booking in bookings:
        service = booking.get("service") or {}
        treatment_label = booking.get("service_name") or service.get("name") or "Trattamento"
        category_label = service.get("category") or "Senza categoria"
        start_time = booking.get("start_time")

        if isinstance(start_time, datetime):
            hour = start_time.hour
            if hour < 12:
                time_label = "Mattina"
            elif hour < 18:
                time_label = "Pomeriggio"
            else:
                time_label = "Sera"
        else:
            time_label = "Orario non disponibile"

        treatment_counts[treatment_label] = treatment_counts.get(treatment_label, 0) + 1
        category_counts[category_label] = category_counts.get(category_label, 0) + 1
        time_counts[time_label] = time_counts.get(time_label, 0) + 1

    def as_stats(counts: dict[str, int]):
        max_count = max(counts.values(), default=1)
        return [
            {
                "label": label,
                "count": count,
                "percent": max(8, round((count / max_count) * 100)),
            }
            for label, count in sorted(counts.items(), key=lambda item: item[1], reverse=True)
        ]

    treatments = as_stats(treatment_counts)
    categories = as_stats(category_counts)
    time_slots = as_stats(time_counts)

    return {
        "summary": {
            "total_treatments": len(bookings),
            "top_treatment": treatments[0]["label"] if treatments else "n/a",
            "top_category": categories[0]["label"] if categories else "n/a",
            "top_time_slot": time_slots[0]["label"] if time_slots else "n/a",
        },
        "treatments": treatments,
        "categories": categories,
        "time_slots": time_slots,
    }


def serialize_notification(document):
    return {
        "id": serialize_id(document["_id"]),
        "role": document.get("role"),
        "center_id": serialize_id(document.get("center_id")),
        "user_id": serialize_id(document.get("user_id")),
        "type": document.get("type"),
        "title": document.get("title"),
        "message": document.get("message"),
        "is_read": document.get("is_read", False),
        "metadata": document.get("metadata", {}),
        "created_at": document.get("created_at"),
    }


def create_notification(
    *,
    role: str,
    title: str,
    message: str,
    center_id: ObjectId | None = None,
    user_id: ObjectId | None = None,
    notification_type: str,
    metadata: dict | None = None,
):
    now = datetime.now(UTC)
    db.notifications.insert_one(
        {
            "role": role,
            "center_id": center_id,
            "user_id": user_id,
            "type": notification_type,
            "title": title,
            "message": message,
            "is_read": False,
            "metadata": metadata or {},
            "created_at": now,
            "updated_at": now,
        }
    )


def parse_object_id(value: str, label: str):
    try:
        return ObjectId(value)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"Invalid {label}.") from exc


class CenterRegistrationPayload(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=5, max_length=160)
    password: str = Field(min_length=6, max_length=128)
    vat_number: str = Field(min_length=5, max_length=32)
    address: str = Field(min_length=4, max_length=180)
    city: str = Field(min_length=2, max_length=120)
    postal_code: str = Field(min_length=3, max_length=16)
    province: str = Field(min_length=2, max_length=64)
    country: str = Field(min_length=2, max_length=64)


class CenterOnboardingPayload(BaseModel):
    logo_url: str | None = None
    opening_days: list[str] = Field(default_factory=list)
    opening_hours: dict[str, dict[str, str | None]] = Field(default_factory=dict)
    primary_services: list[str] = Field(default_factory=list)


class CenterAvailabilityDayPayload(BaseModel):
    enabled: bool = True
    start: str | None = None
    end: str | None = None
    note: str | None = None


class CenterAvailabilityPayload(BaseModel):
    availability_overrides: dict[str, CenterAvailabilityDayPayload] = Field(default_factory=dict)


class CenterProfilePayload(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    logo_url: str | None = None


class UserProfilePayload(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    phone: str | None = Field(default=None, max_length=32)


class CenterServiceConfigItemPayload(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    category: str = Field(min_length=2, max_length=80)
    duration: int | None = Field(default=None, ge=1, le=600)
    price: float | None = Field(default=None, ge=0)
    description: str | None = None
    visibility: str = Field(default="active", min_length=2, max_length=32)


class CenterServicesCatalogPayload(BaseModel):
    services: list[CenterServiceConfigItemPayload] = Field(default_factory=list)


class ReviewPayload(BaseModel):
    booking_id: str = Field(min_length=24, max_length=24)
    user_email: str = Field(min_length=5, max_length=160)
    rating: int = Field(ge=1, le=5)
    comment: str = Field(min_length=1, max_length=128)


class NotificationReadPayload(BaseModel):
    notification_ids: list[str] = Field(default_factory=list)


class ClientRegistrationPayload(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=5, max_length=160)
    password: str = Field(min_length=6, max_length=128)
    phone: str | None = None


class LoginPayload(BaseModel):
    email: str = Field(min_length=5, max_length=160)
    password: str = Field(min_length=6, max_length=128)


class BookingPayload(BaseModel):
    center_id: str = Field(min_length=24, max_length=24)
    user_email: str = Field(min_length=5, max_length=160)
    service_id: str = Field(min_length=24, max_length=24)
    slot_id: str = Field(min_length=1, max_length=64)


class BookingUpdatePayload(BaseModel):
    role: str = Field(min_length=5, max_length=16)
    user_email: str | None = None
    center_id: str | None = None
    service_id: str = Field(min_length=24, max_length=24)
    slot_id: str = Field(min_length=1, max_length=64)


ITALIAN_WEEKDAY_KEYS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"]


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


def hash_password(password: str):
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000)
    return f"{salt}${digest.hex()}"


def verify_password(password: str, stored_hash: str | None):
    if not stored_hash or "$" not in stored_hash:
        return False

    salt, digest = stored_hash.split("$", 1)
    computed = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000)
    return hmac.compare_digest(digest, computed.hex())


def ensure_review_prompt_notifications(user_id: ObjectId):
    now = datetime.now(UTC)
    bookings = list(
        db.bookings.find(
            {
                "user_id": user_id,
                "start_time": {"$lte": now},
                "status": {"$ne": "canceled"},
            }
        )
    )

    for booking in bookings:
        has_review = db.reviews.find_one({"booking_id": booking["_id"], "user_id": user_id})
        if has_review:
            continue

        existing_notification = db.notifications.find_one(
            {
                "user_id": user_id,
                "type": "review_prompt",
                "metadata.booking_id": str(booking["_id"]),
            }
        )
        start_time = booking.get("start_time")
        date_label = start_time.strftime("%d/%m/%Y") if isinstance(start_time, datetime) else None
        time_label = start_time.strftime("%H:%M") if isinstance(start_time, datetime) else None
        service_name = booking.get("service_name") or "Trattamento"
        message = (
            f"Recensisci {service_name} del {date_label} alle {time_label}."
            if date_label and time_label
            else f"Recensisci {service_name}."
        )

        if existing_notification:
            db.notifications.update_one(
                {"_id": existing_notification["_id"]},
                {
                    "$set": {
                        "message": message,
                        "metadata": {
                            **existing_notification.get("metadata", {}),
                            "booking_id": str(booking["_id"]),
                            "service_name": service_name,
                            "date_label": date_label,
                            "time_label": time_label,
                        },
                        "updated_at": now,
                    }
                },
            )
            continue

        create_notification(
            role="client",
            user_id=user_id,
            center_id=booking.get("center_id"),
            notification_type="review_prompt",
            title="Valuta il tuo trattamento!",
            message=message,
            metadata={
                "booking_id": str(booking["_id"]),
                "service_name": service_name,
                "date_label": date_label,
                "time_label": time_label,
            },
        )


def parse_slot_datetime(slot_id: str):
    try:
        normalized = slot_id.strip().replace("Z", "")
        return datetime.fromisoformat(normalized)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail="Invalid slot id.") from exc


def parse_time_value(value: str | None):
    if not value:
        return None

    try:
        parsed = time.fromisoformat(value)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail="Invalid opening time.") from exc
    return parsed


def build_center_day_window(center: dict, target_date: date):
    date_key = target_date.isoformat()
    overrides = center.get("availability_overrides") or {}
    override = overrides.get(date_key)

    if override is not None:
        if not override.get("enabled"):
            return None
        start_value = parse_time_value(override.get("start"))
        end_value = parse_time_value(override.get("end"))
    else:
        weekday_key = ITALIAN_WEEKDAY_KEYS[target_date.weekday()]
        if weekday_key not in (center.get("opening_days") or []):
            return None
        hours = (center.get("opening_hours") or {}).get(weekday_key) or {}
        start_value = parse_time_value(hours.get("start"))
        end_value = parse_time_value(hours.get("end"))

    if not start_value or not end_value:
        return None

    start_dt = datetime.combine(target_date, start_value)
    end_dt = datetime.combine(target_date, end_value)
    if end_dt <= start_dt:
        return None
    return start_dt, end_dt


def load_service_for_center(center_object_id: ObjectId, service_id: str):
    service_object_id = parse_object_id(service_id, "service id")
    service = db.services.find_one({"_id": service_object_id, "center_id": center_object_id})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found or does not belong to center.")
    return service_object_id, service


def has_booking_overlap(center_object_id: ObjectId, start_dt: datetime, end_dt: datetime, *, exclude_booking_id: ObjectId | None = None):
    query: dict = {
        "center_id": center_object_id,
        "status": {"$ne": "canceled"},
        "start_time": {"$lt": end_dt},
        "end_time": {"$gt": start_dt},
    }
    if exclude_booking_id is not None:
        query["_id"] = {"$ne": exclude_booking_id}
    return db.bookings.find_one(query) is not None


def build_booking_slot_list(center: dict, service: dict, target_date: date, *, exclude_booking_id: ObjectId | None = None):
    day_window = build_center_day_window(center, target_date)
    if not day_window:
        return []

    duration_minutes = service.get("duration") if isinstance(service.get("duration"), int) else 60
    slot_step = timedelta(minutes=15)
    start_dt, end_dt = day_window
    now = datetime.now()
    if target_date == now.date():
        minimum_start = now.replace(second=0, microsecond=0)
        remainder = minimum_start.minute % 15
        if remainder:
            minimum_start += timedelta(minutes=15 - remainder)
        if minimum_start > start_dt:
            start_dt = minimum_start
    cursor = start_dt
    slots = []

    while cursor + timedelta(minutes=duration_minutes) <= end_dt:
        slot_end = cursor + timedelta(minutes=duration_minutes)
        if not has_booking_overlap(center["_id"], cursor, slot_end, exclude_booking_id=exclude_booking_id):
            slots.append(
                {
                    "id": cursor.isoformat(timespec="minutes"),
                    "start_time": cursor.isoformat(),
                    "end_time": slot_end.isoformat(),
                    "date_label": cursor.strftime("%d/%m/%Y"),
                    "time_label": cursor.strftime("%H:%M"),
                    "availability_label": "Disponibile",
                }
            )
        cursor += slot_step

    return slots


def validate_booking_actor(booking: dict, *, role: str, user_email: str | None = None, center_id: str | None = None):
    if role == "client":
        if not user_email:
            raise HTTPException(status_code=400, detail="User email is required.")
        user = db.users.find_one({"email": user_email.strip().lower(), "role": "client"})
        if not user or booking.get("user_id") != user["_id"]:
            raise HTTPException(status_code=403, detail="Booking does not belong to this client.")
        return user

    if role == "center":
        if not center_id:
            raise HTTPException(status_code=400, detail="Center id is required.")
        center_object_id = parse_object_id(center_id, "center id")
        if booking.get("center_id") != center_object_id:
            raise HTTPException(status_code=403, detail="Booking does not belong to this center.")
        return db.centers.find_one({"_id": center_object_id})

    raise HTTPException(status_code=400, detail="Unsupported role.")


def is_past_booking(booking: dict):
    start_time = booking.get("start_time")
    if not isinstance(start_time, datetime):
        return False

    now = datetime.now(UTC)
    if start_time.tzinfo is None:
        now = now.replace(tzinfo=None)

    return start_time <= now


def build_checkout_urls(request: Request):
    success_url = STRIPE_CHECKOUT_SUCCESS_URL
    cancel_url = STRIPE_CHECKOUT_CANCEL_URL

    if success_url and cancel_url:
        return success_url, cancel_url

    base_url = str(request.base_url).rstrip("/")
    return (
        success_url or f"{base_url}/checkout/success?center_id={{CHECKOUT_CENTER_ID}}",
        cancel_url or f"{base_url}/checkout/cancel?center_id={{CHECKOUT_CENTER_ID}}",
    )


def create_checkout_session(center_id: str, center_name: str, request: Request):
    if not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Missing STRIPE_SECRET_KEY environment variable.")

    if not STRIPE_PRICE_ID:
        raise HTTPException(status_code=500, detail="Missing STRIPE_PRICE_ID environment variable.")

    stripe.api_key = STRIPE_SECRET_KEY
    success_url, cancel_url = build_checkout_urls(request)
    success_url = success_url.replace("{CHECKOUT_CENTER_ID}", center_id)
    cancel_url = cancel_url.replace("{CHECKOUT_CENTER_ID}", center_id)

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


def update_center_payment_state(center_id: str, subscription_status: str, stripe_payload: dict):
    object_id = parse_object_id(center_id, "center id")
    center = db.centers.find_one({"_id": object_id})

    if not center:
        raise HTTPException(status_code=404, detail="Center not found.")

    next_registration_status = (
        "onboarding_pending" if subscription_status == "active" else "payment_pending"
    )
    next_is_listable = subscription_status == "active" and bool(center.get("primary_services")) and bool(
        center.get("opening_days")
    )
    if next_is_listable:
        next_registration_status = "active"

    db.centers.update_one(
        {"_id": object_id},
        {
            "$set": {
                "subscription_status": subscription_status,
                "registration_status": next_registration_status,
                "is_listable": next_is_listable,
                "stripe": stripe_payload,
                "updated_at": datetime.now(UTC),
            }
        },
    )


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
    normalized_email = payload.email.strip().lower()

    if db.centers.find_one({"email": normalized_email}):
        raise HTTPException(status_code=409, detail="Center email already registered.")

    now = datetime.now(UTC)
    center_document = {
        "name": payload.name,
        "email": normalized_email,
        "password_hash": hash_password(payload.password),
        "vat_number": payload.vat_number,
        "address": payload.address,
        "city": payload.city,
        "postal_code": payload.postal_code,
        "province": payload.province,
        "country": payload.country,
        "branding": {},
        "opening_hours": {},
        "opening_days": [],
        "availability_overrides": {},
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
    checkout_url = session.url
    checkout_session_id = session.id

    created_center = db.centers.find_one({"_id": result.inserted_id})
    activation_status = build_activation_status(created_center)

    return {
        "center": serialize_center(created_center),
        "checkout_url": checkout_url,
        "checkout_session_id": checkout_session_id,
        "activation": activation_status,
    }


@app.post("/api/auth/centers/login")
def login_center(payload: LoginPayload):
    normalized_email = payload.email.strip().lower()
    center = db.centers.find_one({"email": normalized_email})

    if not center or not verify_password(payload.password, center.get("password_hash")):
        raise HTTPException(status_code=401, detail="Invalid center credentials.")

    return {
        "center": serialize_center(center),
        "activation": build_activation_status(center),
    }


@app.post("/api/stripe/webhook")
async def stripe_webhook(request: Request):
    if not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Missing STRIPE_SECRET_KEY environment variable.")

    if not STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=500, detail="Missing STRIPE_WEBHOOK_SECRET environment variable.")

    stripe.api_key = STRIPE_SECRET_KEY
    payload = await request.body()
    signature = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(payload, signature, STRIPE_WEBHOOK_SECRET)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"Invalid Stripe webhook: {exc}") from exc

    event_type = event["type"]
    event_data = event["data"]["object"]

    if event_type == "checkout.session.completed":
        center_id = event_data.get("metadata", {}).get("center_id") or event_data.get("client_reference_id")
        if center_id:
            update_center_payment_state(
                center_id,
                "active",
                {
                    "checkout_session_id": event_data.get("id"),
                    "customer_id": event_data.get("customer"),
                    "subscription_id": event_data.get("subscription"),
                    "price_id": STRIPE_PRICE_ID,
                    "checkout_completed_at": datetime.now(UTC),
                },
            )
    elif event_type == "invoice.payment_failed":
        subscription_id = event_data.get("subscription")
        center = db.centers.find_one({"stripe.subscription_id": subscription_id})
        if center:
            update_center_payment_state(
                str(center["_id"]),
                "payment_failed",
                {
                    **(center.get("stripe") or {}),
                    "subscription_id": subscription_id,
                    "last_invoice_id": event_data.get("id"),
                    "last_payment_failed_at": datetime.now(UTC),
                },
            )
    elif event_type == "customer.subscription.deleted":
        subscription_id = event_data.get("id")
        center = db.centers.find_one({"stripe.subscription_id": subscription_id})
        if center:
            update_center_payment_state(
                str(center["_id"]),
                "canceled",
                {
                    **(center.get("stripe") or {}),
                    "subscription_id": subscription_id,
                    "canceled_at": datetime.now(UTC),
                },
            )
    elif event_type == "invoice.paid":
        subscription_id = event_data.get("subscription")
        center = db.centers.find_one({"stripe.subscription_id": subscription_id})
        if center:
            update_center_payment_state(
                str(center["_id"]),
                "active",
                {
                    **(center.get("stripe") or {}),
                    "subscription_id": subscription_id,
                    "last_invoice_id": event_data.get("id"),
                    "last_invoice_paid_at": datetime.now(UTC),
                },
            )

    return {"received": True}


@app.post("/api/auth/clients/register")
def register_client(payload: ClientRegistrationPayload):
    normalized_email = payload.email.strip().lower()

    if db.users.find_one({"email": normalized_email}):
        raise HTTPException(status_code=409, detail="Client email already registered.")

    now = datetime.now(UTC)
    user_document = {
        "email": normalized_email,
        "password_hash": hash_password(payload.password),
        "name": payload.name,
        "role": "client",
        "phone": payload.phone,
        "center_id": None,
        "favorite_center_ids": [],
        "created_at": now,
        "updated_at": now,
    }

    result = db.users.insert_one(user_document)
    user = db.users.find_one({"_id": result.inserted_id})
    return {"user": serialize_user(user)}


@app.post("/api/auth/clients/login")
def login_client(payload: LoginPayload):
    normalized_email = payload.email.strip().lower()
    user = db.users.find_one({"email": normalized_email, "role": "client"})

    if not user or not verify_password(payload.password, user.get("password_hash")):
        raise HTTPException(status_code=401, detail="Invalid client credentials.")

    return {"user": serialize_user(user)}


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


@app.get("/checkout/success", response_class=HTMLResponse)
def checkout_success(center_id: str | None = None):
    title = "Pagamento completato"
    description = (
        "Il pagamento e stato registrato. Torna nell'app e continua l'onboarding del centro."
    )
    if center_id:
        description = (
            f"Il pagamento per il centro {center_id} e stato registrato. Torna nell'app e continua "
            "l'onboarding del centro."
        )

    return f"""
    <html>
      <head><title>{title}</title></head>
      <body style="font-family: Arial, sans-serif; padding: 32px; background: #faf9f7;">
        <h1 style="color:#20364E;">{title}</h1>
        <p style="color:#243F5C; max-width: 520px;">{description}</p>
      </body>
    </html>
    """


@app.get("/checkout/cancel", response_class=HTMLResponse)
def checkout_cancel(center_id: str | None = None):
    description = "Il checkout e stato annullato. Torna nell'app per riprovare."
    if center_id:
        description = f"Il checkout del centro {center_id} e stato annullato. Torna nell'app per riprovare."

    return f"""
    <html>
      <head><title>Pagamento annullato</title></head>
      <body style="font-family: Arial, sans-serif; padding: 32px; background: #faf9f7;">
        <h1 style="color:#20364E;">Pagamento annullato</h1>
        <p style="color:#243F5C; max-width: 520px;">{description}</p>
      </body>
    </html>
    """


@app.patch("/api/centers/{center_id}/onboarding")
def update_center_onboarding(center_id: str, payload: CenterOnboardingPayload):
    object_id = parse_object_id(center_id, "center id")
    center = db.centers.find_one({"_id": object_id})

    if not center:
        raise HTTPException(status_code=404, detail="Center not found.")

    opening_days = [day.strip() for day in payload.opening_days if day.strip()]
    primary_services = [service.strip() for service in payload.primary_services if service.strip()]
    branding = center.get("branding", {})

    if payload.logo_url is not None:
        branding["logo"] = payload.logo_url.strip()

    update_fields = {
        "branding": branding,
        "opening_days": opening_days,
        "opening_hours": payload.opening_hours,
        "primary_services": primary_services,
        "updated_at": datetime.now(UTC),
    }

    provisional_document = {
        **center,
        **update_fields,
        "subscription_status": center.get("subscription_status", "pending"),
    }
    activation_status = build_activation_status(provisional_document)
    update_fields["onboarding_completed"] = activation_status["onboarding_completed"]
    update_fields["is_listable"] = activation_status["is_listable"]
    update_fields["registration_status"] = activation_status["state"]

    db.centers.update_one({"_id": object_id}, {"$set": update_fields})
    updated_center = db.centers.find_one({"_id": object_id})

    return {
        "center": serialize_center(updated_center),
        "activation": build_activation_status(updated_center),
    }


@app.patch("/api/centers/{center_id}/profile")
def update_center_profile(center_id: str, payload: CenterProfilePayload):
    object_id = parse_object_id(center_id, "center id")
    center = db.centers.find_one({"_id": object_id})

    if not center:
        raise HTTPException(status_code=404, detail="Center not found.")

    branding = center.get("branding", {})
    update_fields = {
        "updated_at": datetime.now(UTC),
    }

    if payload.name is not None and payload.name.strip():
        update_fields["name"] = payload.name.strip()

    if payload.logo_url is not None:
        branding["logo"] = payload.logo_url.strip()

    update_fields["branding"] = branding

    db.centers.update_one({"_id": object_id}, {"$set": update_fields})
    updated_center = db.centers.find_one({"_id": object_id})

    return {
        "center": serialize_center(updated_center),
        "activation": build_activation_status(updated_center),
    }


@app.patch("/api/centers/{center_id}/availability")
def update_center_availability(center_id: str, payload: CenterAvailabilityPayload):
    object_id = parse_object_id(center_id, "center id")
    center = db.centers.find_one({"_id": object_id})

    if not center:
        raise HTTPException(status_code=404, detail="Center not found.")

    sanitized_overrides = {}
    for raw_date, override in payload.availability_overrides.items():
        date_key = raw_date.strip()
        if not date_key:
            continue

        sanitized_overrides[date_key] = {
            "enabled": bool(override.enabled),
            "start": override.start.strip() if isinstance(override.start, str) and override.start.strip() else None,
            "end": override.end.strip() if isinstance(override.end, str) and override.end.strip() else None,
            "note": override.note.strip() if isinstance(override.note, str) and override.note.strip() else None,
        }

    db.centers.update_one(
        {"_id": object_id},
        {
            "$set": {
                "availability_overrides": sanitized_overrides,
                "updated_at": datetime.now(UTC),
            }
        },
    )
    updated_center = db.centers.find_one({"_id": object_id})

    return {
        "center": serialize_center(updated_center),
        "activation": build_activation_status(updated_center),
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


@app.get("/api/centers/{center_id}/booking-slots")
def get_center_booking_slots(center_id: str, service_id: str = Query(...), date: str = Query(...), booking_id: str | None = Query(default=None)):
    center_object_id = parse_object_id(center_id, "center id")
    center = db.centers.find_one({"_id": center_object_id})
    if not center:
        raise HTTPException(status_code=404, detail="Center not found.")

    service_object_id, service = load_service_for_center(center_object_id, service_id)
    try:
        target_date = datetime.fromisoformat(date).date()
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail="Invalid date.") from exc

    excluded_booking_id = parse_object_id(booking_id, "booking id") if booking_id else None
    slots = build_booking_slot_list(center, service, target_date, exclude_booking_id=excluded_booking_id)
    return {
        "center_id": center_id,
        "service_id": str(service_object_id),
        "date": target_date.isoformat(),
        "slots": slots,
    }


@app.get("/api/centers/{center_id}/reviews")
def list_center_reviews(center_id: str):
    object_id = parse_object_id(center_id, "center id")
    documents = list(db.reviews.find({"center_id": object_id}).sort("created_at", -1))
    return [serialize_review(document) for document in documents]


@app.patch("/api/centers/{center_id}/services")
def update_center_services(center_id: str, payload: CenterServicesCatalogPayload):
    object_id = parse_object_id(center_id, "center id")
    center = db.centers.find_one({"_id": object_id})

    if not center:
        raise HTTPException(status_code=404, detail="Center not found.")

    now = datetime.now(UTC)
    configured_services = []

    for item in payload.services:
        normalized_name = item.name.strip()
        normalized_category = item.category.strip()
        normalized_visibility = item.visibility.strip() or "active"
        normalized_description = item.description.strip() if item.description else None

        db.services.update_one(
            {"center_id": object_id, "name": normalized_name},
            {
                "$set": {
                    "center_id": object_id,
                    "name": normalized_name,
                    "category": normalized_category,
                    "subcategory": normalized_category.lower(),
                    "duration": item.duration,
                    "price": item.price,
                    "description": normalized_description,
                    "visibility": normalized_visibility,
                    "updated_at": now,
                },
                "$setOnInsert": {
                    "created_at": now,
                },
            },
            upsert=True,
        )
        configured_services.append(normalized_name)

    if configured_services:
        center = db.centers.find_one({"_id": object_id})

    documents = list(
        db.services.find({"center_id": object_id, "visibility": "active"}).sort(
            [("category", 1), ("name", 1)]
        )
    )
    return [serialize_service(document) for document in documents]


@app.get("/api/users/profile")
def get_profile(email: str = Query(default=DEFAULT_PROFILE_EMAIL)):
    document = db.users.find_one({"email": email})

    if not document:
        raise HTTPException(status_code=404, detail="User not found.")

    return serialize_user(document)


@app.patch("/api/users/profile")
def update_user_profile(payload: UserProfilePayload, email: str = Query(default=DEFAULT_PROFILE_EMAIL)):
    document = db.users.find_one({"email": email.strip().lower(), "role": "client"})

    if not document:
        raise HTTPException(status_code=404, detail="User not found.")

    update_fields = {"updated_at": datetime.now(UTC)}

    if payload.name is not None and payload.name.strip():
        update_fields["name"] = payload.name.strip()

    if payload.phone is not None:
        update_fields["phone"] = payload.phone.strip()

    db.users.update_one({"_id": document["_id"]}, {"$set": update_fields})
    updated_user = db.users.find_one({"_id": document["_id"]})
    return serialize_user(updated_user)


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


@app.get("/api/users/stats")
def get_user_stats(email: str = Query(default=DEFAULT_PROFILE_EMAIL)):
    user = db.users.find_one({"email": email.strip().lower(), "role": "client"})

    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    return build_client_booking_stats(user["_id"])


@app.get("/api/users/favorite-centers")
def get_user_favorite_centers(email: str = Query(default=DEFAULT_PROFILE_EMAIL)):
    user = db.users.find_one({"email": email.strip().lower(), "role": "client"})

    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    favorite_ids = [
        center_id
        for center_id in user.get("favorite_center_ids", [])
        if isinstance(center_id, ObjectId)
    ]
    centers = list(db.centers.find({"_id": {"$in": favorite_ids}}).sort("name", 1))

    return {
        "favorite_center_ids": [serialize_id(center_id) for center_id in favorite_ids],
        "centers": [serialize_center(center) for center in centers],
    }


@app.patch("/api/users/favorite-centers/{center_id}")
def toggle_user_favorite_center(center_id: str, email: str = Query(default=DEFAULT_PROFILE_EMAIL)):
    user = db.users.find_one({"email": email.strip().lower(), "role": "client"})

    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    center_object_id = parse_object_id(center_id, "center id")
    center = db.centers.find_one({"_id": center_object_id})

    if not center:
        raise HTTPException(status_code=404, detail="Center not found.")

    favorite_ids = user.get("favorite_center_ids", [])
    is_favorite = center_object_id in favorite_ids
    update_operator = "$pull" if is_favorite else "$addToSet"

    db.users.update_one(
        {"_id": user["_id"]},
        {
            update_operator: {"favorite_center_ids": center_object_id},
            "$set": {"updated_at": datetime.now(UTC)},
        },
    )
    updated_user = db.users.find_one({"_id": user["_id"]})
    updated_favorite_ids = [
        item for item in updated_user.get("favorite_center_ids", []) if isinstance(item, ObjectId)
    ]
    centers = list(db.centers.find({"_id": {"$in": updated_favorite_ids}}).sort("name", 1))

    return {
        "favorite_center_ids": [serialize_id(item) for item in updated_favorite_ids],
        "centers": [serialize_center(item) for item in centers],
    }


@app.get("/api/notifications")
def get_notifications(
    role: str = Query(...),
    email: str | None = Query(default=None),
    center_id: str | None = Query(default=None),
):
    query: dict = {"role": role}

    if role == "client":
        if not email:
            raise HTTPException(status_code=400, detail="Email is required for client notifications.")
        user = db.users.find_one({"email": email.strip().lower(), "role": "client"})
        if not user:
            raise HTTPException(status_code=404, detail="User not found.")
        ensure_review_prompt_notifications(user["_id"])
        query["user_id"] = user["_id"]
    elif role == "center":
        if not center_id:
            raise HTTPException(status_code=400, detail="Center id is required for center notifications.")
        query["center_id"] = parse_object_id(center_id, "center id")
    else:
        raise HTTPException(status_code=400, detail="Unsupported role.")

    documents = list(db.notifications.find(query).sort("created_at", -1))
    return [serialize_notification(document) for document in documents]


@app.patch("/api/notifications/read")
def mark_notifications_read(payload: NotificationReadPayload):
    object_ids = [parse_object_id(value, "notification id") for value in payload.notification_ids]
    if not object_ids:
        return {"updated": 0}

    result = db.notifications.update_many(
        {"_id": {"$in": object_ids}},
        {"$set": {"is_read": True, "updated_at": datetime.now(UTC)}},
    )
    return {"updated": result.modified_count}


@app.get("/api/centers/{center_id}/dashboard")
def get_center_dashboard(center_id: str):
    object_id = parse_object_id(center_id, "center id")
    center = db.centers.find_one({"_id": object_id})
    if not center:
        raise HTTPException(status_code=404, detail="Center not found.")

    now = datetime.now(ZoneInfo("Europe/Rome")).replace(tzinfo=None)
    today_start = datetime.combine(now.date(), time(0, 0))
    tomorrow_start = today_start + timedelta(days=1)
    active_booking_query = {"center_id": object_id, "status": {"$ne": "canceled"}}

    todays_bookings = list(
        db.bookings.find(
            {
                **active_booking_query,
                "start_time": {"$gte": today_start, "$lt": tomorrow_start},
            }
        ).sort("start_time", 1)
    )
    upcoming_bookings = list(
        db.bookings.find(
            {
                **active_booking_query,
                "start_time": {"$gte": today_start},
            }
        )
        .sort("start_time", 1)
        .limit(8)
    )

    pipeline = [
        {"$match": active_booking_query},
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
        {"$limit": 30},
    ]
    recent_bookings = list(db.bookings.aggregate(pipeline))

    todays_clients = {
        booking.get("user_id")
        for booking in todays_bookings
        if booking.get("user_id") is not None
    }
    upcoming_bookings_count = db.bookings.count_documents(
        {**active_booking_query, "start_time": {"$gte": now}}
    )

    total_revenue = 0
    service_ids = [booking.get("service_id") for booking in todays_bookings if booking.get("service_id")]
    services_by_id = {
        service["_id"]: service
        for service in db.services.find({"_id": {"$in": service_ids}})
    }
    for booking in todays_bookings:
        service = services_by_id.get(booking.get("service_id"))
        if service and isinstance(service.get("price"), (int, float)):
            total_revenue += service["price"]

    agenda = []
    for booking in upcoming_bookings:
        user = db.users.find_one({"_id": booking.get("user_id")})
        start_time = booking.get("start_time")
        date_prefix = ""
        if isinstance(start_time, datetime) and start_time.date() != today_start.date():
            date_prefix = start_time.strftime("%d/%m ")
        agenda.append(
            {
                "id": serialize_id(booking["_id"]),
                "time_label": f"{date_prefix}{start_time.strftime('%H:%M')}" if isinstance(start_time, datetime) else "",
                "client_name": (user or {}).get("name", "Cliente"),
                "operator_name": center.get("name", "Centro"),
                "service": booking.get("service_name", "Servizio"),
                "status_label": "" if booking.get("status") == "confirmed" else booking.get("status", ""),
            }
        )

    clients_by_key = {}
    for booking in recent_bookings:
        user = booking.get("user") or {}
        start_time = booking.get("start_time")
        serialized_client_id = serialize_id(user.get("_id")) if user.get("_id") else serialize_id(booking["_id"])
        user_phone = user.get("phone", "")
        user_name = user.get("name", "Cliente")
        normalized_phone = re.sub(r"\D", "", user_phone)
        client_key = (
            f"phone:{normalized_phone}"
            if normalized_phone
            else f"name:{user_name.strip().lower()}" if user_name else f"id:{serialized_client_id}"
        )
        history_item = {
            "id": serialize_id(booking["_id"]),
            "service_name": booking.get("service_name", "Servizio"),
            "date_label": start_time.strftime("%d %b") if isinstance(start_time, datetime) else "",
            "time_label": start_time.strftime("%H:%M") if isinstance(start_time, datetime) else "",
            "status": booking.get("status", ""),
        }

        if client_key not in clients_by_key:
            clients_by_key[client_key] = {
                "id": serialized_client_id,
                "name": user_name,
                "phone": user_phone or "n/a",
                "last_visit": (
                    start_time.strftime("Ultima visita: %d %b")
                    if isinstance(start_time, datetime)
                    else "Ultima visita: n/a"
                ),
                "history": [],
            }

        clients_by_key[client_key]["history"].append(history_item)

    clients = list(clients_by_key.values())[:5]

    return {
        "metrics": [
            {"id": "metric-1", "label": "Appuntamenti oggi", "value": str(len(todays_bookings))},
            {"id": "metric-2", "label": "Clienti oggi", "value": str(len(todays_clients))},
            {"id": "metric-3", "label": "Incasso previsto oggi", "value": f"EUR {total_revenue:g}"},
            {"id": "metric-4", "label": "Prossime prenotazioni", "value": str(upcoming_bookings_count)},
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
        if document.get("_id") is not None
    ]


@app.get("/api/centers/{center_id}/clients/{client_id}")
def get_center_client_detail(center_id: str, client_id: str):
    center_object_id = parse_object_id(center_id, "center id")
    client_object_id = parse_object_id(client_id, "client id")

    center = db.centers.find_one({"_id": center_object_id})
    if not center:
        raise HTTPException(status_code=404, detail="Center not found.")

    user = db.users.find_one({"_id": client_object_id, "role": "client"})
    if not user:
        raise HTTPException(status_code=404, detail="Client not found.")

    pipeline = [
        {"$match": {"center_id": center_object_id, "user_id": client_object_id}},
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
    bookings = list(db.bookings.aggregate(pipeline))
    reviews = list(
        db.reviews.find({"center_id": center_object_id, "user_id": client_object_id}).sort(
            "created_at", -1
        )
    )

    return {
        "client": serialize_user(user),
        "bookings": [serialize_booking(booking) for booking in bookings],
        "reviews": [serialize_review(review) for review in reviews],
        "stats": build_client_booking_stats(client_object_id, center_object_id),
    }


@app.get("/api/centers/{center_id}/bookings")
def get_center_bookings(center_id: str, date: str | None = Query(default=None)):
    center_object_id = parse_object_id(center_id, "center id")
    query: dict = {"center_id": center_object_id}

    if date:
        try:
            target_date = datetime.fromisoformat(date).date()
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=400, detail="Invalid date.") from exc
        day_start = datetime.combine(target_date, time(0, 0))
        day_end = day_start + timedelta(days=1)
        query["start_time"] = {"$gte": day_start, "$lt": day_end}

    bookings = list(db.bookings.find(query).sort("start_time", 1))
    documents = []
    for booking in bookings:
        user = db.users.find_one({"_id": booking.get("user_id")})
        booking = {
            **booking,
            "client_name": (user or {}).get("name", "Cliente"),
            "client_phone": (user or {}).get("phone", "n/a"),
        }
        documents.append(serialize_booking(booking))
    return documents


@app.get("/api/centers/{center_id}/user-stats")
def get_center_user_stats(center_id: str, email: str = Query(default=DEFAULT_PROFILE_EMAIL)):
    center_object_id = parse_object_id(center_id, "center id")
    center = db.centers.find_one({"_id": center_object_id})
    if not center:
        raise HTTPException(status_code=404, detail="Center not found.")

    user = db.users.find_one({"email": email.strip().lower(), "role": "client"})
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    return build_client_booking_stats(user["_id"], center_object_id)


@app.get("/api/centers/{center_id}/bookings/{booking_id}")
def get_center_booking_detail(center_id: str, booking_id: str):
    center_object_id = parse_object_id(center_id, "center id")
    booking_object_id = parse_object_id(booking_id, "booking id")
    booking = db.bookings.find_one({"_id": booking_object_id, "center_id": center_object_id})

    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found.")

    user = db.users.find_one({"_id": booking.get("user_id")})
    service = db.services.find_one({"_id": booking.get("service_id")})
    review = db.reviews.find_one({"booking_id": booking_object_id})

    enriched_booking = {
        **booking,
        "service": service or {},
        "client_name": (user or {}).get("name", "Cliente"),
        "client_phone": (user or {}).get("phone", "n/a"),
    }

    return {
        "booking": serialize_booking(enriched_booking),
        "review": serialize_review(review),
    }


@app.post("/api/reviews")
def create_review(payload: ReviewPayload):
    booking_object_id = parse_object_id(payload.booking_id, "booking id")
    user = db.users.find_one({"email": payload.user_email.strip().lower(), "role": "client"})
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    booking = db.bookings.find_one({"_id": booking_object_id, "user_id": user["_id"]})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found.")

    existing_review = db.reviews.find_one({"booking_id": booking_object_id, "user_id": user["_id"]})
    if existing_review:
        raise HTTPException(status_code=409, detail="Review already submitted for this booking.")

    now = datetime.now(UTC)
    review_document = {
        "booking_id": booking_object_id,
        "center_id": booking.get("center_id"),
        "user_id": user["_id"],
        "user_name": user.get("name", "Cliente"),
        "service_name": booking.get("service_name"),
        "rating": payload.rating,
        "comment": payload.comment.strip(),
        "created_at": now,
        "updated_at": now,
    }
    result = db.reviews.insert_one(review_document)
    db.notifications.delete_many(
        {
            "user_id": user["_id"],
            "type": "review_prompt",
            "metadata.booking_id": payload.booking_id,
        },
    )
    create_notification(
        role="center",
        center_id=booking.get("center_id"),
        user_id=user["_id"],
        notification_type="review_received",
        title="Nuova recensione ricevuta",
        message=f"{user.get('name', 'Cliente')} ha lasciato {payload.rating}/5 stelle.",
        metadata={
            "booking_id": payload.booking_id,
            "rating": payload.rating,
            "service_name": booking.get("service_name"),
        },
    )
    created_review = db.reviews.find_one({"_id": result.inserted_id})
    return serialize_review(created_review)


@app.post("/api/bookings")
def create_booking(payload: BookingPayload):
    center_object_id = parse_object_id(payload.center_id, "center id")
    center = db.centers.find_one({"_id": center_object_id})
    if not center:
        raise HTTPException(status_code=404, detail="Center not found.")

    user = db.users.find_one({"email": payload.user_email.strip().lower(), "role": "client"})
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    service_object_id, service = load_service_for_center(center_object_id, payload.service_id)
    start_time = parse_slot_datetime(payload.slot_id)
    duration = service.get("duration") if isinstance(service.get("duration"), int) else 60
    end_time = start_time + timedelta(minutes=duration)
    day_window = build_center_day_window(center, start_time.date())
    if not day_window or start_time < day_window[0] or end_time > day_window[1]:
        raise HTTPException(status_code=409, detail="Selected slot is outside center availability.")
    if has_booking_overlap(center_object_id, start_time, end_time):
        raise HTTPException(status_code=409, detail="Selected slot is no longer available.")

    now = datetime.now(UTC)
    booking_document = {
        "center_id": center_object_id,
        "user_id": user["_id"],
        "service_id": service_object_id,
        "service_name": service.get("name"),
        "operator_name": center.get("name", "Centro"),
        "status": "confirmed",
        "slot_id": payload.slot_id,
        "start_time": start_time,
        "end_time": end_time,
        "created_at": now,
        "updated_at": now,
    }

    result = db.bookings.insert_one(booking_document)
    created_booking = db.bookings.find_one({"_id": result.inserted_id})
    create_notification(
        role="center",
        center_id=center_object_id,
        user_id=user["_id"],
        notification_type="new_booking",
        title="Nuova prenotazione",
        message=f"{user.get('name', 'Cliente')} ha prenotato {service.get('name')}.",
        metadata={
            "booking_id": str(result.inserted_id),
            "service_name": service.get("name"),
            "user_name": user.get("name", "Cliente"),
        },
    )

    return serialize_booking(created_booking)


@app.patch("/api/bookings/{booking_id}")
def update_booking(booking_id: str, payload: BookingUpdatePayload):
    booking_object_id = parse_object_id(booking_id, "booking id")
    booking = db.bookings.find_one({"_id": booking_object_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found.")

    validate_booking_actor(
        booking,
        role=payload.role,
        user_email=payload.user_email,
        center_id=payload.center_id,
    )

    if payload.role == "client":
        raise HTTPException(status_code=403, detail="Clients can only cancel bookings.")

    center_object_id = booking.get("center_id")
    center = db.centers.find_one({"_id": center_object_id})
    if not center:
        raise HTTPException(status_code=404, detail="Center not found.")

    service_object_id, service = load_service_for_center(center_object_id, payload.service_id)
    start_time = parse_slot_datetime(payload.slot_id)
    duration = service.get("duration") if isinstance(service.get("duration"), int) else 60
    end_time = start_time + timedelta(minutes=duration)
    day_window = build_center_day_window(center, start_time.date())
    if not day_window or start_time < day_window[0] or end_time > day_window[1]:
        raise HTTPException(status_code=409, detail="Selected slot is outside center availability.")
    if has_booking_overlap(center_object_id, start_time, end_time, exclude_booking_id=booking_object_id):
        raise HTTPException(status_code=409, detail="Selected slot is no longer available.")

    db.bookings.update_one(
        {"_id": booking_object_id},
        {
            "$set": {
                "service_id": service_object_id,
                "service_name": service.get("name"),
                "slot_id": payload.slot_id,
                "start_time": start_time,
                "end_time": end_time,
                "status": "confirmed",
                "updated_at": datetime.now(UTC),
            }
        },
    )
    updated_booking = db.bookings.find_one({"_id": booking_object_id})
    return serialize_booking(updated_booking)


@app.patch("/api/bookings/{booking_id}/cancel")
def cancel_booking(booking_id: str, role: str = Query(...), user_email: str | None = Query(default=None), center_id: str | None = Query(default=None)):
    booking_object_id = parse_object_id(booking_id, "booking id")
    booking = db.bookings.find_one({"_id": booking_object_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found.")

    validate_booking_actor(
        booking,
        role=role,
        user_email=user_email,
        center_id=center_id,
    )

    if role == "client" and is_past_booking(booking):
        raise HTTPException(status_code=409, detail="Past bookings can no longer be managed.")

    db.bookings.update_one(
        {"_id": booking_object_id},
        {"$set": {"status": "canceled", "updated_at": datetime.now(UTC)}},
    )
    updated_booking = db.bookings.find_one({"_id": booking_object_id})
    return serialize_booking(updated_booking)
