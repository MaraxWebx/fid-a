from datetime import UTC, date, datetime, time, timedelta
import hashlib
import hmac
from pathlib import Path
import re
import secrets
import shutil
from zoneinfo import ZoneInfo

from bson import ObjectId
from fastapi import FastAPI, File, HTTPException, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, Response
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

UPLOAD_ROOT = Path(__file__).resolve().parent.parent / "uploads"
ALLOWED_LOGO_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
ALLOWED_LOGO_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_LOGO_BYTES = 5 * 1024 * 1024


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
        "center_uid": document.get("center_uid"),
        "invitation_code": document.get("invitation_code"),
        "onboarding_link": document.get("onboarding_link"),
        "qr_payload": document.get("qr_payload"),
        "email": document.get("email") or document.get("mail"),
        "name": document.get("name"),
        "owner_name": document.get("owner_name"),
        "phone": document.get("phone"),
        "address": document.get("address"),
        "subscription_plan": document.get("subscription_plan"),
        "branding": document.get("branding", {}),
        "logoStoragePath": document.get("logoStoragePath"),
        "opening_hours": document.get("opening_hours", {}),
        "opening_days": document.get("opening_days", []),
        "availability_overrides": document.get("availability_overrides", {}),
        "enableWhatsapp": document.get("enableWhatsapp", False),
        "whatsappPhoneNumber": document.get("whatsappPhoneNumber", ""),
        "whatsappBookingMessageTemplate": document.get("whatsappBookingMessageTemplate", ""),
        "whatsappInfoMessageTemplate": document.get("whatsappInfoMessageTemplate", ""),
        "whatsappAppointmentReminderTemplate": document.get("whatsappAppointmentReminderTemplate", ""),
        "showWhatsappButtonToClients": document.get("showWhatsappButtonToClients", False),
        "staff_members": document.get("staff_members", []),
        "rooms": document.get("rooms", []),
        "calendar_exceptions": document.get("calendar_exceptions", []),
        "slot_step_minutes": document.get("slot_step_minutes", 15),
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
        "buffer_before_minutes": document.get("buffer_before_minutes", 0),
        "buffer_after_minutes": document.get("buffer_after_minutes", 0),
        "is_bookable_online": document.get("is_bookable_online", document.get("visibility") == "active"),
        "required_room_type": document.get("required_room_type"),
        "required_room_ids": [serialize_id(item) if isinstance(item, ObjectId) else str(item) for item in document.get("required_room_ids", [])],
        "assigned_staff_ids": [serialize_id(item) if isinstance(item, ObjectId) else str(item) for item in document.get("assigned_staff_ids", [])],
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
        "center_membership_ids": [
            serialize_id(center_id)
            for center_id in document.get("center_membership_ids", [])
            if isinstance(center_id, ObjectId)
        ],
        "favorite_center_ids": [serialize_id(center_id) for center_id in document.get("favorite_center_ids", [])],
        "created_at": document.get("created_at"),
    }


def serialize_booking(document):
    start_time = document.get("start_time")
    end_time = document.get("end_time")
    price = document.get("service", {}).get("price") if document.get("service") else document.get("total_price")
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
        "staff_member_id": document.get("staff_member_id"),
        "room_id": document.get("room_id"),
        "client_name": document.get("client_name"),
        "client_phone": document.get("client_phone"),
        "is_delayed": (bool(document.get("is_delayed")) or document.get("status") == "late") and document.get("status") in ["booked", "confirmed", "late"],
        "status": document.get("status"),
        "slot_id": document.get("slot_id"),
        "start_time": start_time,
        "end_time": end_time,
        "date_label": start_time.strftime("%d/%m/%Y") if start_time else None,
        "time_label": start_time.strftime("%H:%M") if start_time else None,
        "price": price,
        "canceled_at": document.get("canceled_at"),
        "cancellation_reason": document.get("cancellation_reason"),
        "status_history": document.get("status_history", []),
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


SUBSCRIPTION_PLANS = {
    "starter": {
        "name": "Starter",
        "monthly_price": 29,
        "features": ["QR privato centro", "Agenda e prenotazioni", "Profilo clienti"],
    },
    "growth": {
        "name": "Growth",
        "monthly_price": 49,
        "features": ["Percorsi clienti", "Reminder automatici", "Insights beauty"],
    },
    "studio_plus": {
        "name": "Studio+",
        "monthly_price": 79,
        "features": ["Multi-team", "Loyalty avanzata", "Campagne e segmenti"],
    },
}

SUBSCRIPTION_STATES = {"active", "trial", "past_due", "cancelled"}


def normalize_subscription_plan(value: str | None):
    normalized = (value or "growth").strip().lower().replace("+", "_plus").replace("-", "_")
    return normalized if normalized in SUBSCRIPTION_PLANS else "growth"


def generate_center_uid(name: str):
    letters = "".join(character for character in name.upper() if character.isalnum())
    prefix = (letters[:3] or "BLM").ljust(3, "X")

    for _ in range(12):
        candidate = f"{prefix}-{secrets.randbelow(9000) + 1000}"
        if not db.centers.find_one({"center_uid": candidate}):
            return candidate

    return f"{prefix}-{secrets.token_hex(3).upper()}"


def generate_invitation_code(name: str):
    letters = "".join(character for character in name.upper() if character.isalnum())
    prefix = (letters[:4] or "BEAU").ljust(4, "X")

    for _ in range(12):
        candidate = f"{prefix}{secrets.randbelow(9000) + 1000}"
        if not db.centers.find_one({"invitation_code": candidate}):
            return candidate

    return f"{prefix}{secrets.token_hex(3).upper()}"


def build_center_onboarding_assets(request: Request, *, center_uid: str, invitation_code: str):
    base_url = str(request.base_url).rstrip("/")
    onboarding_link = f"{base_url}/join/{invitation_code}"
    return {
        "onboarding_link": onboarding_link,
        "qr_payload": f"fidea://join?code={invitation_code}&center={center_uid}",
    }


def normalize_invitation_code(value: str | None):
    if not value:
        return None
    return re.sub(r"[^A-Z0-9-]", "", value.strip().upper())


def find_center_by_invitation(value: str):
    normalized = normalize_invitation_code(value)
    if not normalized:
        raise HTTPException(status_code=400, detail="Invitation code is required.")

    center = db.centers.find_one(
        {
            "$or": [
                {"invitation_code": normalized},
                {"center_uid": normalized},
            ]
        }
    )
    if not center:
        raise HTTPException(status_code=404, detail="Invitation code not found.")
    return center


def add_client_center_membership(user_id: ObjectId, center_id: ObjectId, source: str = "invitation"):
    now = datetime.now(UTC)
    existing_membership = db.client_center_memberships.find_one(
        {"user_id": user_id, "center_id": center_id}
    )
    if not existing_membership:
        db.client_center_memberships.insert_one(
            {
                "user_id": user_id,
                "center_id": center_id,
                "source": source,
                "status": "active",
                "loyalty": {
                    "points": 0,
                    "tier": "member",
                    "rewards_unlocked": [],
                },
                "preferences": {
                    "reminders_enabled": True,
                    "marketing_opt_in": False,
                    "recommended_categories": [],
                },
                "analytics": {
                    "first_qr_scan_at": now if source in {"qr", "invitation"} else None,
                    "last_association_at": now,
                    "referral_source": source,
                },
                "created_at": now,
                "updated_at": now,
            }
        )
    else:
        db.client_center_memberships.update_one(
            {"_id": existing_membership["_id"]},
            {
                "$set": {
                    "status": "active",
                    "analytics.last_association_at": now,
                    "updated_at": now,
                }
            },
        )

    db.users.update_one(
        {"_id": user_id},
        {
            "$set": {"center_id": center_id, "updated_at": now},
            "$addToSet": {
                "center_membership_ids": center_id,
                "favorite_center_ids": center_id,
            },
        },
    )


class CenterRegistrationPayload(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    owner_name: str | None = Field(default=None, max_length=120)
    email: str = Field(min_length=5, max_length=160)
    password: str = Field(min_length=6, max_length=128)
    phone: str | None = Field(default=None, max_length=32)
    subscription_plan: str = Field(default="growth", min_length=2, max_length=32)
    vat_number: str | None = Field(default=None, max_length=32)
    address: str = Field(min_length=4, max_length=180)
    city: str = Field(min_length=2, max_length=120)
    postal_code: str = Field(min_length=3, max_length=16)
    province: str = Field(min_length=2, max_length=64)
    country: str = Field(min_length=2, max_length=64)


class OpeningHourSlotPayload(BaseModel):
    start: str | None = None
    end: str | None = None


class CenterOpeningHoursPayload(BaseModel):
    start: str | None = None
    end: str | None = None
    slots: list[OpeningHourSlotPayload] = Field(default_factory=list)
    break_enabled: bool = False
    break_start: str | None = None
    break_end: str | None = None


class CenterStaffMemberPayload(BaseModel):
    id: str | None = None
    name: str = Field(min_length=1, max_length=120)
    role: str | None = Field(default=None, max_length=80)
    avatar_url: str | None = None
    is_active: bool = True
    working_hours: dict[str, CenterOpeningHoursPayload] = Field(default_factory=dict)
    service_ids: list[str] = Field(default_factory=list)


class CenterRoomPayload(BaseModel):
    id: str | None = None
    name: str = Field(min_length=1, max_length=120)
    type: str | None = Field(default=None, max_length=80)
    is_active: bool = True
    compatible_treatment_ids: list[str] = Field(default_factory=list)
    compatible_treatment_names: list[str] = Field(default_factory=list)


class CalendarExceptionPayload(BaseModel):
    id: str | None = None
    date: str
    type: str = Field(min_length=2, max_length=40)
    start_time: str | None = None
    end_time: str | None = None
    staff_member_id: str | None = None
    room_id: str | None = None
    reason: str | None = Field(default=None, max_length=240)


class CenterOnboardingPayload(BaseModel):
    logo_url: str | None = None
    opening_days: list[str] = Field(default_factory=list)
    opening_hours: dict[str, CenterOpeningHoursPayload] = Field(default_factory=dict)
    primary_services: list[str] = Field(default_factory=list)
    staff_members: list[CenterStaffMemberPayload] | None = None
    rooms: list[CenterRoomPayload] | None = None
    calendar_exceptions: list[CalendarExceptionPayload] | None = None
    slot_step_minutes: int | None = Field(default=None, ge=5, le=120)


class CenterAvailabilityDayPayload(BaseModel):
    enabled: bool = True
    start: str | None = None
    end: str | None = None
    note: str | None = None


class CenterAvailabilityPayload(BaseModel):
    availability_overrides: dict[str, CenterAvailabilityDayPayload] = Field(default_factory=dict)


class CenterProfilePayload(BaseModel):
    description: str | None = Field(default=None, max_length=300)
    enableWhatsapp: bool | None = None
    instagram_url: str | None = Field(default=None, max_length=240)
    tiktok_url: str | None = Field(default=None, max_length=240)
    name: str | None = Field(default=None, min_length=2, max_length=120)
    logo_url: str | None = None
    showWhatsappButtonToClients: bool | None = None
    whatsappAppointmentReminderTemplate: str | None = Field(default=None, max_length=500)
    whatsappBookingMessageTemplate: str | None = Field(default=None, max_length=500)
    whatsappInfoMessageTemplate: str | None = Field(default=None, max_length=500)
    whatsappPhoneNumber: str | None = Field(default=None, max_length=40)


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
    buffer_before_minutes: int = Field(default=0, ge=0, le=240)
    buffer_after_minutes: int = Field(default=0, ge=0, le=240)
    is_bookable_online: bool | None = None
    required_room_type: str | None = Field(default=None, max_length=80)
    required_room_ids: list[str] = Field(default_factory=list)
    assigned_staff_ids: list[str] = Field(default_factory=list)


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
    invitation_code: str | None = Field(default=None, max_length=64)


class LoginPayload(BaseModel):
    email: str = Field(min_length=5, max_length=160)
    password: str = Field(min_length=6, max_length=128)
    invitation_code: str | None = Field(default=None, max_length=64)


class CenterAssociationPayload(BaseModel):
    email: str = Field(min_length=5, max_length=160)
    invitation_code: str = Field(min_length=2, max_length=64)


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
    staff_member_id: str | None = None
    room_id: str | None = None


class BookingStatusPayload(BaseModel):
    role: str = Field(min_length=5, max_length=16)
    center_id: str | None = None
    status: str = Field(min_length=2, max_length=32)
    cancellation_reason: str | None = Field(default=None, max_length=240)


ITALIAN_WEEKDAY_KEYS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"]
ITALIAN_WEEKDAY_FULL = ["Lunedi", "Martedi", "Mercoledi", "Giovedi", "Venerdi", "Sabato", "Domenica"]


def format_eur(value: float):
    formatted = f"{value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return f"€ {formatted}"


def parse_report_period(period: str):
    today = datetime.now(ZoneInfo("Europe/Rome")).replace(tzinfo=None).date()
    normalized = period.strip().lower()

    if normalized == "today":
        start = today
        end = today + timedelta(days=1)
        title = "Oggi"
    elif normalized == "week":
        start = today - timedelta(days=today.weekday())
        end = start + timedelta(days=7)
        title = "Settimana corrente"
    elif normalized == "quarter":
        quarter_month = ((today.month - 1) // 3) * 3 + 1
        start = date(today.year, quarter_month, 1)
        end_month = quarter_month + 3
        end_year = today.year + (1 if end_month > 12 else 0)
        end_month = end_month - 12 if end_month > 12 else end_month
        end = date(end_year, end_month, 1)
        title = "Trimestre corrente"
    elif normalized == "year":
        start = date(today.year, 1, 1)
        end = date(today.year + 1, 1, 1)
        title = "Anno corrente"
    else:
        start = date(today.year, today.month, 1)
        end = date(today.year + (1 if today.month == 12 else 0), 1 if today.month == 12 else today.month + 1, 1)
        title = "Mese corrente"
        normalized = "month"

    return normalized, datetime.combine(start, time(0, 0)), datetime.combine(end, time(0, 0)), title


def booking_price(booking: dict):
    service = booking.get("service") or {}
    price = service.get("price")
    return float(price) if isinstance(price, (int, float)) else 0.0


def add_breakdown(accumulator: dict[str, float], label: str, amount: float):
    key = label or "Non assegnato"
    accumulator[key] = accumulator.get(key, 0.0) + amount


def sorted_breakdown(items: dict[str, float], limit: int = 5):
    total = sum(items.values()) or 1
    return [
        {
            "label": label,
            "value": round(value, 2),
            "percent": max(4, round((value / total) * 100)),
        }
        for label, value in sorted(items.items(), key=lambda item: item[1], reverse=True)[:limit]
    ]


def build_business_insights(center: dict, period: str = "month"):
    normalized_period, start, end, period_label = parse_report_period(period)
    now = datetime.now(ZoneInfo("Europe/Rome")).replace(tzinfo=None)
    no_show_deletion = db.no_show_report_deletions.find_one(
        {
            "center_id": center["_id"],
            "period_key": normalized_period,
            "period_start": start,
            "period_end": end,
        }
    )
    no_show_report_deleted = bool(no_show_deletion)

    pipeline = [
        {
            "$match": {
                "center_id": center["_id"],
                "start_time": {"$gte": start, "$lt": end},
            }
        },
        {
            "$lookup": {
                "from": "services",
                "localField": "service_id",
                "foreignField": "_id",
                "as": "service",
            }
        },
        {"$unwind": {"path": "$service", "preserveNullAndEmptyArrays": True}},
        {
            "$lookup": {
                "from": "users",
                "localField": "user_id",
                "foreignField": "_id",
                "as": "user",
            }
        },
        {"$unwind": {"path": "$user", "preserveNullAndEmptyArrays": True}},
        {"$sort": {"start_time": 1}},
    ]
    bookings = list(db.bookings.aggregate(pipeline))

    expected_revenue = 0.0
    confirmed_revenue = 0.0
    no_show_losses = 0.0
    categories: dict[str, float] = {}
    staff: dict[str, float] = {}
    weekdays: dict[str, float] = {}
    time_slots: dict[str, float] = {}
    no_show_clients: dict[str, dict] = {}
    no_show_slots: dict[str, float] = {}
    no_show_services: dict[str, float] = {}
    treatment_stats: dict[str, dict] = {}
    staff_stats: dict[str, dict] = {}
    completed_count = 0
    cancellations = 0
    no_shows = 0

    def slot_label(value: datetime | None):
        if not isinstance(value, datetime):
            return "Orario n/d"
        if value.hour < 12:
            return "08:00-12:00"
        if value.hour < 16:
            return "12:00-16:00"
        if value.hour < 20:
            return "16:00-20:00"
        return "20:00+"

    for booking in bookings:
        status = booking.get("status")
        amount = booking_price(booking)
        start_time = booking.get("start_time")
        service = booking.get("service") or {}
        category = service.get("category") or "Trattamenti"
        operator = booking.get("operator_name") or center.get("name") or "Staff"
        weekday = ITALIAN_WEEKDAY_FULL[start_time.weekday()] if isinstance(start_time, datetime) else "Giorno n/d"
        slot = slot_label(start_time)
        service_name = booking.get("service_name") or service.get("name") or "Trattamento"
        duration = 60
        if isinstance(start_time, datetime) and isinstance(booking.get("end_time"), datetime):
            duration = max(15, int((booking["end_time"] - start_time).total_seconds() // 60))

        if status in ["booked", "confirmed", "late"] and isinstance(start_time, datetime) and start_time >= now:
            expected_revenue += amount
        if status == "completed":
            completed_count += 1
            confirmed_revenue += amount
            add_breakdown(categories, category, amount)
            add_breakdown(staff, operator, amount)
            add_breakdown(weekdays, weekday, amount)
            add_breakdown(time_slots, slot, amount)
            if service_name not in treatment_stats:
                treatment_stats[service_name] = {"label": service_name, "bookings": 0, "revenue": 0.0, "duration": 0}
            treatment_stats[service_name]["bookings"] += 1
            treatment_stats[service_name]["revenue"] += amount
            treatment_stats[service_name]["duration"] += duration
            if operator not in staff_stats:
                staff_stats[operator] = {"label": operator, "appointments": 0, "revenue": 0.0}
            staff_stats[operator]["appointments"] += 1
            staff_stats[operator]["revenue"] += amount
        if status in ["canceled", "cancelled"]:
            cancellations += 1
        if status == "no_show" and not no_show_report_deleted:
            no_shows += 1
            no_show_losses += amount
            client_name = (booking.get("user") or {}).get("name") or booking.get("client_name") or "Cliente"
            if client_name not in no_show_clients:
                no_show_clients[client_name] = {"label": client_name, "count": 0, "value": 0.0}
            no_show_clients[client_name]["count"] += 1
            no_show_clients[client_name]["value"] += amount
            add_breakdown(no_show_slots, slot, amount)
            add_breakdown(no_show_services, service_name, amount)

    breakdowns = {
        "categories": sorted_breakdown(categories),
        "staff": sorted_breakdown(staff),
        "weekdays": sorted_breakdown(weekdays),
        "time_slots": sorted_breakdown(time_slots),
    }

    insights = []
    top_day = breakdowns["weekdays"][0] if breakdowns["weekdays"] else None
    top_category = breakdowns["categories"][0] if breakdowns["categories"] else None
    weak_slot = sorted(time_slots.items(), key=lambda item: item[1])[0] if time_slots else None

    if top_day:
        insights.append(f"{top_day['label']} e il giorno con ricavi piu alti nel periodo.")
    if top_category:
        insights.append(f"{top_category['label']} guida il fatturato: valuta disponibilita dedicate.")
    if weak_slot:
        insights.append(f"{weak_slot[0]} genera meno ricavi: considera promozioni o lista attesa mirata.")
    if no_show_losses > 0:
        insights.append(f"I no-show hanno generato {format_eur(no_show_losses)} di perdite stimate.")
    if not insights:
        insights.append("Dati ancora limitati: completa piu appuntamenti per leggere trend affidabili.")

    repeated_no_show_clients = sorted(
        no_show_clients.values(),
        key=lambda item: (item["count"], item["value"]),
        reverse=True,
    )[:5]
    period_days = max(1, (end.date() - start.date()).days)
    estimated_capacity = max(1, period_days * 8)
    active_appointments = len([booking for booking in bookings if booking.get("status") not in ["canceled", "cancelled", "no_show"]])
    occupancy_rate = min(100, round((active_appointments / estimated_capacity) * 100))
    top_treatments = [
        {
            "label": item["label"],
            "bookings": item["bookings"],
            "revenue": round(item["revenue"], 2),
            "average_duration": round(item["duration"] / item["bookings"]) if item["bookings"] else 0,
        }
        for item in sorted(treatment_stats.values(), key=lambda value: (value["bookings"], value["revenue"]), reverse=True)[:5]
    ]
    staff_performance = [
        {
            "label": item["label"],
            "appointments": item["appointments"],
            "revenue": round(item["revenue"], 2),
            "occupancy_rate": min(100, round((item["appointments"] / estimated_capacity) * 100)),
            "average_review": None,
        }
        for item in sorted(staff_stats.values(), key=lambda value: value["label"])[:5]
    ]

    return {
        "period": {
            "key": normalized_period,
            "label": period_label,
            "start": start.date().isoformat(),
            "end": (end - timedelta(days=1)).date().isoformat(),
        },
        "kpis": {
            "expected_revenue": round(expected_revenue, 2),
            "confirmed_revenue": round(confirmed_revenue, 2),
            "no_show_losses": round(no_show_losses, 2),
            "average_ticket": round(confirmed_revenue / completed_count, 2) if completed_count else 0,
        },
        "operations": {
            "total_appointments": len(bookings),
            "free_slots": max(0, estimated_capacity - active_appointments),
            "occupancy_rate": occupancy_rate,
            "cancellations": cancellations,
            "no_shows": no_shows,
        },
        "breakdowns": breakdowns,
        "top_treatments": top_treatments,
        "staff_performance": staff_performance,
        "insights": insights[:4],
        "no_show_report": {
            "deleted": no_show_report_deleted,
            "deleted_at": no_show_deletion.get("deleted_at") if no_show_deletion else None,
            "total_losses": round(no_show_losses, 2),
            "repeated_clients": repeated_no_show_clients,
            "worst_time_slots": sorted_breakdown(no_show_slots),
            "affected_services": sorted_breakdown(no_show_services),
        },
    }


def make_pdf_document(lines: list[str]):
    def clean(value: str):
        return value.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)").encode("latin-1", "replace").decode("latin-1")

    content_lines = ["BT", "/F1 11 Tf", "50 790 Td", "14 TL"]
    for line in lines:
        content_lines.append(f"({clean(line)}) Tj")
        content_lines.append("T*")
    content_lines.append("ET")
    stream = "\n".join(content_lines).encode("latin-1")

    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        b"<< /Length " + str(len(stream)).encode("ascii") + b" >>\nstream\n" + stream + b"\nendstream",
    ]
    pdf = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for index, obj in enumerate(objects, start=1):
        offsets.append(len(pdf))
        pdf.extend(f"{index} 0 obj\n".encode("ascii"))
        pdf.extend(obj)
        pdf.extend(b"\nendobj\n")
    xref = len(pdf)
    pdf.extend(f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode("ascii"))
    for offset in offsets[1:]:
        pdf.extend(f"{offset:010d} 00000 n \n".encode("ascii"))
    pdf.extend(f"trailer << /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF".encode("ascii"))
    return bytes(pdf)


def build_activation_status(document):
    missing_fields = []

    if not document.get("opening_days"):
        missing_fields.append("opening_days")

    if not document.get("primary_services"):
        missing_fields.append("primary_services")

    subscription_status = document.get("subscription_status", "trial")
    onboarding_completed = not missing_fields
    is_listable = subscription_status == "active" and onboarding_completed

    if is_listable:
        state = "active"
        message = "Il centro e attivo e puo essere mostrato in app."
    elif subscription_status == "trial":
        state = "subscription_trial"
        message = "Il centro e in prova: scegli e attiva un piano per completare l'accesso professionale."
    elif subscription_status != "active":
        state = "payment_pending"
        message = "Riattiva l'abbonamento per continuare a gestire il centro."
    else:
        state = "inactive_incomplete"
        message = (
            "Il pagamento e completato, ma il centro non e ancora visibile finche non inserisci "
            "giorni di apertura e servizi principali."
        )

    return {
        "state": state,
        "subscription_status": subscription_status,
        "subscription_plan": document.get("subscription_plan", "growth"),
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


def booking_error(code: str, message: str, status_code: int = 409, **extra):
    detail = {"code": code, "message": message}
    detail.update(extra)
    raise HTTPException(status_code=status_code, detail=detail)


def ranges_overlap(start_a: datetime, end_a: datetime, start_b: datetime, end_b: datetime):
    return start_a < end_b and end_a > start_b


def normalize_resource_id(value):
    if value is None:
        return None
    return str(value)


def normalize_whatsapp_number(value: str | None):
    return "".join(character for character in (value or "") if character.isdigit())


def safe_logo_extension(filename: str | None, content_type: str | None):
    suffix = Path(filename or "").suffix.lower().lstrip(".")
    if suffix == "jpg" or suffix == "jpeg":
        ext = suffix
    elif suffix in ALLOWED_LOGO_EXTENSIONS:
        ext = suffix
    elif content_type == "image/jpeg":
        ext = "jpg"
    elif content_type == "image/png":
        ext = "png"
    elif content_type == "image/webp":
        ext = "webp"
    else:
        ext = ""
    if ext not in ALLOWED_LOGO_EXTENSIONS:
        raise HTTPException(status_code=400, detail={"code": "INVALID_LOGO_FORMAT", "message": "Formato non valido. Carica un'immagine JPG, PNG o WEBP."})
    return ext


def public_upload_url(request: Request, storage_path: str):
    return f"{str(request.base_url).rstrip('/')}/api/uploads/{storage_path}"


def get_center_staff_members(center: dict):
    raw_staff = center.get("staff_members") or []
    if raw_staff:
        return [
            {
                "id": str(item.get("id") or item.get("_id") or f"staff-{index}"),
                "name": item.get("name") or center.get("name") or "Operatrice",
                "role": item.get("role") or "Operatrice",
                "is_active": item.get("is_active", item.get("active", True)),
                "working_hours": item.get("working_hours") or {},
                "service_ids": [str(value) for value in item.get("service_ids", [])],
            }
            for index, item in enumerate(raw_staff)
            if isinstance(item, dict)
        ]
    return [
        {
            "id": "center-staff",
            "name": center.get("name") or "Centro",
            "role": "Staff",
            "is_active": True,
            "working_hours": {},
            "service_ids": [],
        }
    ]


def get_center_rooms(center: dict):
    return [
        {
            "id": str(item.get("id") or item.get("_id") or f"room-{index}"),
            "name": item.get("name") or "Cabina",
            "type": item.get("type") or "cabina",
            "is_active": item.get("is_active", item.get("active", True)),
            "compatible_treatment_ids": [str(value) for value in item.get("compatible_treatment_ids", [])],
            "compatible_treatment_names": [str(value).lower() for value in item.get("compatible_treatment_names", [])],
        }
        for index, item in enumerate(center.get("rooms") or [])
        if isinstance(item, dict)
    ]


def service_is_online_bookable(service: dict):
    return (
        service.get("visibility") == "active"
        and service.get("is_bookable_online", True) is not False
        and service.get("duration") is not None
        and service.get("price") is not None
    )


def staff_can_perform_service(staff_member: dict, service: dict):
    service_id = str(service.get("_id"))
    assigned = [str(value) for value in service.get("assigned_staff_ids", [])]
    enabled = [str(value).lower() for value in staff_member.get("service_ids", [])]
    service_name = str(service.get("name") or "").lower()
    service_category = str(service.get("category") or "").lower()
    enabled_match = (
        not enabled
        or service_id in enabled
        or any(token and (token in service_name or token in service_category) for token in enabled)
    )
    return (not assigned or staff_member["id"] in assigned) and enabled_match


def room_can_host_service(room: dict, service: dict):
    service_id = str(service.get("_id"))
    required_ids = [str(value) for value in service.get("required_room_ids", [])]
    compatible_ids = [str(value) for value in room.get("compatible_treatment_ids", [])]
    compatible_names = [str(value).lower() for value in room.get("compatible_treatment_names", [])]
    service_name = str(service.get("name") or "").lower()
    service_category = str(service.get("category") or "").lower()

    if required_ids:
        return room["id"] in required_ids
    if service.get("required_room_type"):
        return room.get("type") == service.get("required_room_type")
    if compatible_ids or compatible_names:
        return service_id in compatible_ids or any(token and (token in service_name or token in service_category) for token in compatible_names)
    return True


def build_resource_day_windows(default_windows: list[tuple[datetime, datetime]], raw_hours: dict, target_date: date):
    if not raw_hours:
        return default_windows
    weekday_key = ITALIAN_WEEKDAY_KEYS[target_date.weekday()]
    hours = raw_hours.get(weekday_key) or {}
    raw_slots = hours.get("slots") or []
    raw_windows = [
        (parse_time_value(slot.get("start")), parse_time_value(slot.get("end")))
        for slot in raw_slots
        if isinstance(slot, dict)
    ]
    if not raw_windows and (hours.get("start") or hours.get("end")):
        raw_windows = [(parse_time_value(hours.get("start")), parse_time_value(hours.get("end")))]
    if not raw_windows:
        return default_windows
    return [
        (datetime.combine(target_date, start_value), datetime.combine(target_date, end_value))
        for start_value, end_value in raw_windows
        if start_value and end_value and end_value > start_value
    ]


def calendar_exception_blocks(center: dict, target_date: date, start_dt: datetime, end_dt: datetime, *, staff_member_id: str | None = None, room_id: str | None = None):
    date_key = target_date.isoformat()
    for item in center.get("calendar_exceptions") or []:
        if not isinstance(item, dict) or item.get("date") != date_key:
            continue
        exception_type = item.get("type")
        if exception_type not in ["closed", "staff_unavailable", "room_unavailable"]:
            continue
        if exception_type == "staff_unavailable" and item.get("staff_member_id") != staff_member_id:
            continue
        if exception_type == "room_unavailable" and item.get("room_id") != room_id:
            continue
        exception_start = parse_time_value(item.get("start_time")) or time(0, 0)
        exception_end = parse_time_value(item.get("end_time")) or time(23, 59)
        if ranges_overlap(start_dt, end_dt, datetime.combine(target_date, exception_start), datetime.combine(target_date, exception_end)):
            return True
    return False


def build_center_day_windows(center: dict, target_date: date):
    date_key = target_date.isoformat()
    overrides = center.get("availability_overrides") or {}
    override = overrides.get(date_key)
    break_window = None

    if override is not None:
        if not override.get("enabled"):
            return [], None
        start_value = parse_time_value(override.get("start"))
        end_value = parse_time_value(override.get("end"))
        raw_windows = [(start_value, end_value)]
    else:
        weekday_key = ITALIAN_WEEKDAY_KEYS[target_date.weekday()]
        if weekday_key not in (center.get("opening_days") or []):
            return [], None
        hours = (center.get("opening_hours") or {}).get(weekday_key) or {}
        raw_slots = hours.get("slots") or []
        raw_windows = [
            (parse_time_value(slot.get("start")), parse_time_value(slot.get("end")))
            for slot in raw_slots
            if isinstance(slot, dict)
        ]
        if not raw_windows:
            raw_windows = [(parse_time_value(hours.get("start")), parse_time_value(hours.get("end")))]

        if hours.get("break_enabled"):
            break_start = parse_time_value(hours.get("break_start"))
            break_end = parse_time_value(hours.get("break_end"))
            if break_start and break_end and break_end > break_start:
                break_window = (
                    datetime.combine(target_date, break_start),
                    datetime.combine(target_date, break_end),
                )

    windows = []
    for start_value, end_value in raw_windows:
        if not start_value or not end_value:
            continue

        start_dt = datetime.combine(target_date, start_value)
        end_dt = datetime.combine(target_date, end_value)
        if end_dt > start_dt:
            windows.append((start_dt, end_dt))

    return windows, break_window


def build_center_day_window(center: dict, target_date: date):
    windows, _break_window = build_center_day_windows(center, target_date)
    if not windows:
        return None
    return min(start for start, _end in windows), max(end for _start, end in windows)


def load_service_for_center(center_object_id: ObjectId, service_id: str):
    service_object_id = parse_object_id(service_id, "service id")
    service = db.services.find_one({"_id": service_object_id, "center_id": center_object_id})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found or does not belong to center.")
    return service_object_id, service


def has_booking_overlap(center_object_id: ObjectId, start_dt: datetime, end_dt: datetime, *, exclude_booking_id: ObjectId | None = None, staff_member_id: str | None = None, room_id: str | None = None):
    query: dict = {
        "center_id": center_object_id,
        "status": {"$ne": "canceled"},
        "start_time": {"$lt": end_dt},
        "end_time": {"$gt": start_dt},
    }
    if exclude_booking_id is not None:
        query["_id"] = {"$ne": exclude_booking_id}
    for booking in db.bookings.find(query):
        booking_staff_id = normalize_resource_id(booking.get("staff_member_id"))
        booking_room_id = normalize_resource_id(booking.get("room_id"))
        if not booking_staff_id and not booking_room_id:
            return True
        if staff_member_id and booking_staff_id == staff_member_id:
            return True
        if room_id and booking_room_id == room_id:
            return True
    return False


def get_available_slots(center: dict, service: dict, target_date: date, *, preferred_time: str | None = None, staff_member_id: str | None = None, room_id: str | None = None, exclude_booking_id: ObjectId | None = None, enforce_online: bool = False):
    day_windows, break_window = build_center_day_windows(center, target_date)
    if not day_windows:
        return {"slots": [], "alternatives": [], "reason": "CENTER_CLOSED"}
    if enforce_online and not service_is_online_bookable(service):
        return {"slots": [], "alternatives": [], "reason": "TREATMENT_NOT_BOOKABLE"}

    duration_minutes = service.get("duration") if isinstance(service.get("duration"), int) else 60
    buffer_before = service.get("buffer_before_minutes") if isinstance(service.get("buffer_before_minutes"), int) else 0
    buffer_after = service.get("buffer_after_minutes") if isinstance(service.get("buffer_after_minutes"), int) else 0
    slot_step = timedelta(minutes=center.get("slot_step_minutes") if isinstance(center.get("slot_step_minutes"), int) else 15)
    now = datetime.now()
    active_staff = [
        item
        for item in get_center_staff_members(center)
        if item.get("is_active") and (not staff_member_id or item["id"] == staff_member_id) and staff_can_perform_service(item, service)
    ]
    if not active_staff:
        return {"slots": [], "alternatives": [], "reason": "STAFF_NOT_AVAILABLE"}

    active_rooms = [
        item
        for item in get_center_rooms(center)
        if item.get("is_active") and (not room_id or item["id"] == room_id) and room_can_host_service(item, service)
    ]
    room_required = bool(service.get("required_room_ids") or service.get("required_room_type") or active_rooms)
    if room_required and not active_rooms:
        return {"slots": [], "alternatives": [], "reason": "ROOM_NOT_AVAILABLE"}

    slots = []

    for start_dt, end_dt in day_windows:
        if target_date == now.date():
            minimum_start = now.replace(second=0, microsecond=0)
            remainder = minimum_start.minute % 15
            if remainder:
                minimum_start += timedelta(minutes=15 - remainder)
            if minimum_start > start_dt:
                start_dt = minimum_start
        cursor = start_dt

        while cursor + timedelta(minutes=duration_minutes) <= end_dt:
            slot_end = cursor + timedelta(minutes=duration_minutes)
            blocked_start = cursor - timedelta(minutes=buffer_before)
            blocked_end = slot_end + timedelta(minutes=buffer_after)
            overlaps_break = bool(
                break_window
                and cursor < break_window[1]
                and slot_end > break_window[0]
            )
            if not overlaps_break and not calendar_exception_blocks(center, target_date, cursor, slot_end):
                for staff_item in active_staff:
                    staff_windows = build_resource_day_windows(day_windows, staff_item.get("working_hours") or {}, target_date)
                    if not any(cursor >= window_start and slot_end <= window_end for window_start, window_end in staff_windows):
                        continue
                    if calendar_exception_blocks(center, target_date, cursor, slot_end, staff_member_id=staff_item["id"]):
                        continue
                    candidate_rooms = active_rooms if room_required else [None]
                    for room_item in candidate_rooms:
                        candidate_room_id = room_item["id"] if room_item else None
                        if room_item and calendar_exception_blocks(center, target_date, cursor, slot_end, room_id=candidate_room_id):
                            continue
                        if has_booking_overlap(
                            center["_id"],
                            blocked_start,
                            blocked_end,
                            exclude_booking_id=exclude_booking_id,
                            staff_member_id=staff_item["id"],
                            room_id=candidate_room_id,
                        ):
                            continue
                        slots.append(
                            {
                                "id": cursor.isoformat(timespec="minutes"),
                                "start_time": cursor.isoformat(),
                                "end_time": slot_end.isoformat(),
                                "date_label": cursor.strftime("%d/%m/%Y"),
                                "time_label": cursor.strftime("%H:%M"),
                                "availability_label": "Disponibile",
                                "staff_member_id": staff_item["id"],
                                "staff_member_name": staff_item["name"],
                                "room_id": candidate_room_id,
                                "room_name": room_item["name"] if room_item else None,
                            }
                        )
                        break
                    else:
                        continue
                    break
            cursor += slot_step

    slots.sort(key=lambda item: item["start_time"])
    unique_slots = []
    seen_starts = set()
    for slot in slots:
        if slot["start_time"] in seen_starts:
            continue
        seen_starts.add(slot["start_time"])
        unique_slots.append(slot)

    alternatives = []
    if preferred_time:
        requested_dt = datetime.combine(target_date, parse_time_value(preferred_time) or time(0, 0))
        alternatives = sorted(
            [
                {**slot, "distance_minutes": abs(int((datetime.fromisoformat(slot["start_time"]) - requested_dt).total_seconds() // 60))}
                for slot in unique_slots
            ],
            key=lambda item: item["distance_minutes"],
        )[:3]
    return {"slots": unique_slots, "alternatives": alternatives, "reason": None if unique_slots else "SLOT_NOT_AVAILABLE"}


def suggest_alternative_slots(center: dict, service: dict, requested_date: date, requested_time: str, *, max_suggestions: int = 3):
    suggestions = get_available_slots(center, service, requested_date, preferred_time=requested_time)["alternatives"]
    if len(suggestions) >= max_suggestions:
        return suggestions[:max_suggestions]

    for offset in range(1, 15):
        target_date = requested_date + timedelta(days=offset)
        next_day_slots = get_available_slots(center, service, target_date)["slots"]
        if next_day_slots:
            return [*suggestions, *next_day_slots[: max_suggestions - len(suggestions)]]
    return suggestions


def build_booking_slot_list(center: dict, service: dict, target_date: date, *, exclude_booking_id: ObjectId | None = None):
    return get_available_slots(center, service, target_date, exclude_booking_id=exclude_booking_id)["slots"]


def validate_appointment_slot(center: dict, service: dict, start_time: datetime, *, staff_member_id: str | None = None, room_id: str | None = None, exclude_booking_id: ObjectId | None = None, enforce_online: bool = False):
    duration = service.get("duration") if isinstance(service.get("duration"), int) else 60
    if duration <= 0:
        booking_error("INVALID_DURATION", "La durata del trattamento non e valida.", 400)
    end_time = start_time + timedelta(minutes=duration)
    result = get_available_slots(
        center,
        service,
        start_time.date(),
        preferred_time=start_time.strftime("%H:%M"),
        staff_member_id=staff_member_id,
        room_id=room_id,
        exclude_booking_id=exclude_booking_id,
        enforce_online=enforce_online,
    )
    matching_slot = next(
        (
            slot
            for slot in result["slots"]
            if datetime.fromisoformat(slot["start_time"]).replace(second=0, microsecond=0) == start_time.replace(second=0, microsecond=0)
        ),
        None,
    )
    if not matching_slot:
        alternatives = suggest_alternative_slots(center, service, start_time.date(), start_time.strftime("%H:%M"))
        reason = result["reason"] or "SLOT_NOT_AVAILABLE"
        messages = {
            "CENTER_CLOSED": "Il centro e chiuso in questa data. Scegli un altro giorno.",
            "STAFF_NOT_AVAILABLE": "L'operatrice non e disponibile in questo orario.",
            "ROOM_NOT_AVAILABLE": "La cabina necessaria non e disponibile in questo orario.",
            "TREATMENT_NOT_BOOKABLE": "Il trattamento non e prenotabile online.",
            "SLOT_NOT_AVAILABLE": "Questo orario e gia occupato. Abbiamo trovato alcune alternative per te.",
        }
        booking_error(reason, messages.get(reason, "Slot non disponibile."), alternatives=alternatives)
    return matching_slot, end_time


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
    subscription_status = {
        "payment_failed": "past_due",
        "canceled": "cancelled",
    }.get(subscription_status, subscription_status)
    if subscription_status not in SUBSCRIPTION_STATES:
        raise HTTPException(status_code=400, detail="Unsupported subscription status.")

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
    center_uid = generate_center_uid(payload.name)
    invitation_code = generate_invitation_code(payload.name)
    onboarding_assets = build_center_onboarding_assets(
        request,
        center_uid=center_uid,
        invitation_code=invitation_code,
    )
    subscription_plan = normalize_subscription_plan(payload.subscription_plan)
    center_document = {
        "name": payload.name,
        "owner_name": payload.owner_name.strip() if payload.owner_name else None,
        "center_uid": center_uid,
        "invitation_code": invitation_code,
        **onboarding_assets,
        "email": normalized_email,
        "password_hash": hash_password(payload.password),
        "phone": payload.phone.strip() if payload.phone else None,
        "vat_number": payload.vat_number.strip() if payload.vat_number else None,
        "address": payload.address,
        "city": payload.city,
        "postal_code": payload.postal_code,
        "province": payload.province,
        "country": payload.country,
        "subscription_plan": subscription_plan,
        "branding": {},
        "opening_hours": {},
        "opening_days": [],
        "availability_overrides": {},
        "primary_services": [],
        "registration_status": "subscription_trial",
        "subscription_status": "trial",
        "onboarding_completed": False,
        "is_listable": False,
        "future_capabilities": {
            "stripe": {"enabled": bool(STRIPE_SECRET_KEY and STRIPE_PRICE_ID), "price_id": STRIPE_PRICE_ID},
            "apple_pay": {"enabled": False},
            "google_pay": {"enabled": False},
            "referrals": {"enabled": False},
            "qr_analytics": {"enabled": True},
            "loyalty_rewards": {"enabled": False},
            "client_segmentation": {"enabled": False},
            "push_campaigns": {"enabled": False},
            "smart_recommendations": {"enabled": False},
        },
        "created_at": now,
        "updated_at": now,
    }

    result = db.centers.insert_one(center_document)
    center_id = str(result.inserted_id)
    checkout_url = None
    checkout_session_id = f"sim_{secrets.token_hex(8)}"
    stripe_snapshot = {
        "checkout_session_id": checkout_session_id,
        "checkout_url": None,
        "price_id": STRIPE_PRICE_ID,
        "mode": "simulated",
    }
    if STRIPE_SECRET_KEY and STRIPE_PRICE_ID:
        session = create_checkout_session(center_id, payload.name, request)
        checkout_url = session.url
        checkout_session_id = session.id
        stripe_snapshot = {
            "checkout_session_id": session.id,
            "checkout_url": session.url,
            "price_id": STRIPE_PRICE_ID,
            "mode": "stripe",
        }

    db.centers.update_one(
        {"_id": result.inserted_id},
        {
            "$set": {
                "stripe": stripe_snapshot,
                "updated_at": datetime.now(UTC),
            }
        },
    )
    db.subscriptions.insert_one(
        {
            "center_id": result.inserted_id,
            "plan": subscription_plan,
            "status": "trial",
            "provider": "simulated" if not checkout_url else "stripe",
            "checkout_session_id": checkout_session_id,
            "current_period_start": now,
            "current_period_end": now + timedelta(days=14),
            "created_at": now,
            "updated_at": now,
        }
    )

    created_center = db.centers.find_one({"_id": result.inserted_id})
    activation_status = build_activation_status(created_center)

    return {
        "center": serialize_center(created_center),
        "checkout_url": checkout_url,
        "checkout_session_id": checkout_session_id,
        "activation": activation_status,
    }


@app.post("/api/centers/{center_id}/subscription/activate")
def activate_center_subscription(center_id: str):
    object_id = parse_object_id(center_id, "center id")
    center = db.centers.find_one({"_id": object_id})
    if not center:
        raise HTTPException(status_code=404, detail="Center not found.")

    now = datetime.now(UTC)
    subscription_plan = normalize_subscription_plan(center.get("subscription_plan"))
    db.subscriptions.update_one(
        {"center_id": object_id},
        {
            "$set": {
                "plan": subscription_plan,
                "status": "active",
                "provider": (center.get("stripe") or {}).get("mode", "simulated"),
                "current_period_start": now,
                "current_period_end": now + timedelta(days=30),
                "updated_at": now,
            },
            "$setOnInsert": {"created_at": now},
        },
        upsert=True,
    )

    provisional = {**center, "subscription_status": "active"}
    activation_status = build_activation_status(provisional)
    db.centers.update_one(
        {"_id": object_id},
        {
            "$set": {
                "subscription_status": "active",
                "registration_status": activation_status["state"],
                "is_listable": activation_status["is_listable"],
                "subscription_activated_at": now,
                "updated_at": now,
            }
        },
    )
    updated_center = db.centers.find_one({"_id": object_id})
    return {"center": serialize_center(updated_center), "activation": build_activation_status(updated_center)}


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
        "center_membership_ids": [],
        "favorite_center_ids": [],
        "created_at": now,
        "updated_at": now,
    }

    result = db.users.insert_one(user_document)
    if payload.invitation_code:
        center = find_center_by_invitation(payload.invitation_code)
        add_client_center_membership(result.inserted_id, center["_id"], source="invitation")
    user = db.users.find_one({"_id": result.inserted_id})
    return {"user": serialize_user(user)}


@app.post("/api/auth/clients/login")
def login_client(payload: LoginPayload):
    normalized_email = payload.email.strip().lower()
    user = db.users.find_one({"email": normalized_email, "role": "client"})

    if not user or not verify_password(payload.password, user.get("password_hash")):
        raise HTTPException(status_code=401, detail="Invalid client credentials.")

    if payload.invitation_code:
        center = find_center_by_invitation(payload.invitation_code)
        add_client_center_membership(user["_id"], center["_id"], source="invitation")
        user = db.users.find_one({"_id": user["_id"]})

    return {"user": serialize_user(user)}


@app.get("/api/onboarding/invitations/{invitation_code}")
def resolve_invitation(invitation_code: str):
    center = find_center_by_invitation(invitation_code)
    return {
        "center": serialize_center(center),
        "invitation_code": center.get("invitation_code"),
        "center_uid": center.get("center_uid"),
        "onboarding_link": center.get("onboarding_link"),
    }


@app.post("/api/users/center-memberships")
def create_center_membership(payload: CenterAssociationPayload):
    normalized_email = payload.email.strip().lower()
    user = db.users.find_one({"email": normalized_email, "role": "client"})
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    center = find_center_by_invitation(payload.invitation_code)
    add_client_center_membership(user["_id"], center["_id"], source="invitation")
    updated_user = db.users.find_one({"_id": user["_id"]})
    return {
        "user": serialize_user(updated_user),
        "center": serialize_center(center),
        "membership_status": "active",
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

    opening_hours = {
        day: hours.dict()
        for day, hours in payload.opening_hours.items()
    }
    now = datetime.now(UTC)

    update_fields = {
        "branding": branding,
        "opening_days": opening_days,
        "opening_hours": opening_hours,
        "primary_services": primary_services,
        "updated_at": now,
    }
    if payload.staff_members is not None:
        update_fields["staff_members"] = [
            {
                "id": item.id or f"staff-{index}",
                "name": item.name.strip(),
                "role": (item.role or "Operatrice").strip(),
                "avatar_url": item.avatar_url,
                "is_active": item.is_active,
                "working_hours": {day: hours.dict() for day, hours in item.working_hours.items()},
                "service_ids": item.service_ids,
                "created_at": now,
                "updated_at": now,
            }
            for index, item in enumerate(payload.staff_members)
        ]
    if payload.rooms is not None:
        update_fields["rooms"] = [
            {
                "id": item.id or f"room-{index}",
                "name": item.name.strip(),
                "type": (item.type or "cabina").strip(),
                "is_active": item.is_active,
                "compatible_treatment_ids": item.compatible_treatment_ids,
                "compatible_treatment_names": item.compatible_treatment_names,
                "created_at": now,
                "updated_at": now,
            }
            for index, item in enumerate(payload.rooms)
        ]
    if payload.calendar_exceptions is not None:
        update_fields["calendar_exceptions"] = [
            {
                "id": item.id or f"exception-{index}",
                "date": item.date,
                "type": item.type,
                "start_time": item.start_time,
                "end_time": item.end_time,
                "staff_member_id": item.staff_member_id,
                "room_id": item.room_id,
                "reason": item.reason,
                "created_at": now,
                "updated_at": now,
            }
            for index, item in enumerate(payload.calendar_exceptions)
        ]
    if payload.slot_step_minutes is not None:
        update_fields["slot_step_minutes"] = payload.slot_step_minutes

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

    if payload.description is not None:
        branding["description"] = payload.description.strip()

    if payload.instagram_url is not None:
        branding["instagram_url"] = payload.instagram_url.strip()

    if payload.tiktok_url is not None:
        branding["tiktok_url"] = payload.tiktok_url.strip()

    if payload.enableWhatsapp is not None:
        update_fields["enableWhatsapp"] = payload.enableWhatsapp
    if payload.showWhatsappButtonToClients is not None:
        update_fields["showWhatsappButtonToClients"] = payload.showWhatsappButtonToClients
    if payload.whatsappPhoneNumber is not None:
        normalized_whatsapp = normalize_whatsapp_number(payload.whatsappPhoneNumber)
        if payload.enableWhatsapp and not normalized_whatsapp:
            raise HTTPException(status_code=400, detail={"code": "INVALID_WHATSAPP_NUMBER", "message": "Numero WhatsApp obbligatorio."})
        update_fields["whatsappPhoneNumber"] = normalized_whatsapp
    if payload.whatsappBookingMessageTemplate is not None:
        update_fields["whatsappBookingMessageTemplate"] = payload.whatsappBookingMessageTemplate.strip()
    if payload.whatsappInfoMessageTemplate is not None:
        update_fields["whatsappInfoMessageTemplate"] = payload.whatsappInfoMessageTemplate.strip()
    if payload.whatsappAppointmentReminderTemplate is not None:
        update_fields["whatsappAppointmentReminderTemplate"] = payload.whatsappAppointmentReminderTemplate.strip()

    next_enable_whatsapp = update_fields.get("enableWhatsapp", center.get("enableWhatsapp", False))
    next_whatsapp_number = update_fields.get("whatsappPhoneNumber", center.get("whatsappPhoneNumber", ""))
    if next_enable_whatsapp and not next_whatsapp_number:
        raise HTTPException(status_code=400, detail={"code": "INVALID_WHATSAPP_NUMBER", "message": "Numero WhatsApp obbligatorio."})

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
        db.services.find({"center_id": object_id, "visibility": {"$ne": "archived"}}).sort(
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
    availability = get_available_slots(center, service, target_date, exclude_booking_id=excluded_booking_id, enforce_online=booking_id is None)
    return {
        "center_id": center_id,
        "service_id": str(service_object_id),
        "date": target_date.isoformat(),
        "slots": availability["slots"],
        "alternatives": availability["alternatives"],
        "reason": availability["reason"],
    }


@app.get("/api/centers/{center_id}/booking-slots/alternatives")
def get_center_booking_slot_alternatives(center_id: str, service_id: str = Query(...), date: str = Query(...), time: str = Query(...), max_suggestions: int = Query(default=3, ge=1, le=8)):
    center_object_id = parse_object_id(center_id, "center id")
    center = db.centers.find_one({"_id": center_object_id})
    if not center:
        raise HTTPException(status_code=404, detail="Center not found.")
    service_object_id, service = load_service_for_center(center_object_id, service_id)
    try:
        target_date = datetime.fromisoformat(date).date()
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail="Invalid date.") from exc
    return {
        "center_id": center_id,
        "service_id": str(service_object_id),
        "date": target_date.isoformat(),
        "requested_time": time,
        "suggestions": suggest_alternative_slots(center, service, target_date, time, max_suggestions=max_suggestions),
    }


@app.get("/api/centers/{center_id}/reviews")
def list_center_reviews(center_id: str):
    object_id = parse_object_id(center_id, "center id")
    documents = list(db.reviews.find({"center_id": object_id}).sort("created_at", -1))
    return [serialize_review(document) for document in documents]


@app.get("/api/uploads/{storage_path:path}")
def get_uploaded_asset(storage_path: str):
    target = (UPLOAD_ROOT / storage_path).resolve()
    root = UPLOAD_ROOT.resolve()
    if not str(target).startswith(str(root)) or not target.is_file():
        raise HTTPException(status_code=404, detail="File not found.")
    return FileResponse(target)


@app.post("/api/centers/{center_id}/branding/logo")
async def upload_center_logo(request: Request, center_id: str, file: UploadFile = File(...)):
    object_id = parse_object_id(center_id, "center id")
    center = db.centers.find_one({"_id": object_id})
    if not center:
        raise HTTPException(status_code=404, detail="Center not found.")
    if file.content_type not in ALLOWED_LOGO_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail={"code": "INVALID_LOGO_FORMAT", "message": "Formato non valido. Carica un'immagine JPG, PNG o WEBP."})

    ext = safe_logo_extension(file.filename, file.content_type)
    center_dir = UPLOAD_ROOT / "centers" / center_id / "branding"
    center_dir.mkdir(parents=True, exist_ok=True)
    storage_path = f"centers/{center_id}/branding/logo.{ext}"
    target = UPLOAD_ROOT / storage_path
    temporary = target.with_suffix(f".upload-{secrets.token_hex(4)}.{ext}")

    size = 0
    with temporary.open("wb") as output:
        while chunk := await file.read(1024 * 1024):
            size += len(chunk)
            if size > MAX_LOGO_BYTES:
                output.close()
                temporary.unlink(missing_ok=True)
                raise HTTPException(status_code=400, detail={"code": "LOGO_TOO_LARGE", "message": "Immagine troppo pesante. Carica un file sotto i 5 MB."})
            output.write(chunk)

    previous_path = center.get("logoStoragePath")
    if previous_path and previous_path != storage_path:
        previous_target = (UPLOAD_ROOT / previous_path).resolve()
        if str(previous_target).startswith(str(UPLOAD_ROOT.resolve())):
            previous_target.unlink(missing_ok=True)
    for old_ext in ALLOWED_LOGO_EXTENSIONS - {ext}:
        (center_dir / f"logo.{old_ext}").unlink(missing_ok=True)
    shutil.move(str(temporary), str(target))

    logo_url = public_upload_url(request, storage_path)
    db.centers.update_one(
        {"_id": object_id},
        {
            "$set": {
                "branding.logo": logo_url,
                "logoStoragePath": storage_path,
                "updated_at": datetime.now(UTC),
            }
        },
    )
    updated_center = db.centers.find_one({"_id": object_id})
    return {
        "center": serialize_center(updated_center),
        "activation": build_activation_status(updated_center),
        "logoUrl": logo_url,
        "logoStoragePath": storage_path,
    }


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
                    "buffer_before_minutes": item.buffer_before_minutes,
                    "buffer_after_minutes": item.buffer_after_minutes,
                    "is_bookable_online": item.is_bookable_online if item.is_bookable_online is not None else normalized_visibility == "active",
                    "required_room_type": item.required_room_type,
                    "required_room_ids": item.required_room_ids,
                    "assigned_staff_ids": item.assigned_staff_ids,
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
        db.services.find({"center_id": object_id, "visibility": {"$ne": "archived"}}).sort(
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


@app.get("/api/users/center-memberships")
def get_user_center_memberships(email: str = Query(default=DEFAULT_PROFILE_EMAIL)):
    user = db.users.find_one({"email": email.strip().lower(), "role": "client"})

    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    membership_documents = list(
        db.client_center_memberships.find({"user_id": user["_id"], "status": "active"}).sort(
            "updated_at", -1
        )
    )
    membership_ids = [
        membership.get("center_id")
        for membership in membership_documents
        if isinstance(membership.get("center_id"), ObjectId)
    ]
    legacy_ids = [
        center_id
        for center_id in user.get("center_membership_ids", [])
        if isinstance(center_id, ObjectId)
    ]
    center_ids = []
    for center_id in [*membership_ids, *legacy_ids]:
        if center_id not in center_ids:
            center_ids.append(center_id)

    centers = list(db.centers.find({"_id": {"$in": center_ids}}).sort("name", 1))
    memberships_by_center = {
        serialize_id(membership.get("center_id")): membership
        for membership in membership_documents
        if isinstance(membership.get("center_id"), ObjectId)
    }

    return {
        "center_ids": [serialize_id(center_id) for center_id in center_ids],
        "centers": [serialize_center(center) for center in centers],
        "memberships": [
            {
                "center_id": serialize_id(center.get("_id")),
                "status": memberships_by_center.get(serialize_id(center.get("_id")), {}).get("status", "active"),
                "loyalty": memberships_by_center.get(serialize_id(center.get("_id")), {}).get("loyalty", {}),
                "created_at": memberships_by_center.get(serialize_id(center.get("_id")), {}).get("created_at"),
            }
            for center in centers
        ],
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


@app.get("/api/centers/{center_id}/business-insights")
def get_center_business_insights(center_id: str, period: str = Query(default="month")):
    object_id = parse_object_id(center_id, "center id")
    center = db.centers.find_one({"_id": object_id})
    if not center:
        raise HTTPException(status_code=404, detail="Center not found.")
    return build_business_insights(center, period)


@app.get("/api/centers/{center_id}/business-insights/report.pdf")
def export_center_business_report(center_id: str, period: str = Query(default="month")):
    object_id = parse_object_id(center_id, "center id")
    center = db.centers.find_one({"_id": object_id})
    if not center:
        raise HTTPException(status_code=404, detail="Center not found.")

    report = build_business_insights(center, period)
    lines = [
        center.get("name", "Centro estetico"),
        f"Report andamento centro - {report['period']['label']}",
        f"Periodo: {report['period']['start']} / {report['period']['end']}",
        "",
        "Riepilogo incassi",
        f"Incasso previsto: {format_eur(report['kpis']['expected_revenue'])}",
        f"Incasso confermato: {format_eur(report['kpis']['confirmed_revenue'])}",
        f"Mancato incasso: {format_eur(report['kpis']['no_show_losses'])}",
        f"Ticket medio: {format_eur(report['kpis'].get('average_ticket', 0))}",
        "",
        "Categorie trattamenti",
        *[f"- {item['label']}: {format_eur(item['value'])}" for item in report["breakdowns"]["categories"][:4]],
        "",
        "Operatrici",
        *[f"- {item['label']}: {format_eur(item['value'])}" for item in report["breakdowns"]["staff"][:4]],
        "",
        "Giorni della settimana",
        *[f"- {item['label']}: {format_eur(item['value'])}" for item in report["breakdowns"]["weekdays"][:4]],
        "",
        "Fasce orarie",
        *[f"- {item['label']}: {format_eur(item['value'])}" for item in report["breakdowns"]["time_slots"][:4]],
        "",
        "Suggerimenti intelligenti",
        *[f"- {insight}" for insight in report["insights"]],
    ]
    filename = f"business-report-{report['period']['key']}.pdf"
    return Response(
        content=make_pdf_document(lines),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.get("/api/centers/{center_id}/business-insights/no-show-report.pdf")
def export_center_no_show_report(center_id: str, period: str = Query(default="month")):
    object_id = parse_object_id(center_id, "center id")
    center = db.centers.find_one({"_id": object_id})
    if not center:
        raise HTTPException(status_code=404, detail="Center not found.")

    report = build_business_insights(center, period)
    no_show = report["no_show_report"]
    lines = [
        center.get("name", "Centro estetico"),
        f"Report mancati appuntamenti - {report['period']['label']}",
        f"Periodo: {report['period']['start']} / {report['period']['end']}",
        "",
        f"Mancato incasso stimato: {format_eur(no_show['total_losses'])}",
        "",
        "Clienti con mancati appuntamenti ripetuti",
        *[f"- {item['label']}: {item['count']} no-show / {format_eur(item['value'])}" for item in no_show["repeated_clients"]],
        "",
        "Fasce orarie piu colpite",
        *[f"- {item['label']}: {format_eur(item['value'])}" for item in no_show["worst_time_slots"][:4]],
        "",
        "Trattamenti piu colpiti",
        *[f"- {item['label']}: {format_eur(item['value'])}" for item in no_show["affected_services"][:4]],
    ]
    filename = f"no-show-report-{report['period']['key']}.pdf"
    return Response(
        content=make_pdf_document(lines),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.delete("/api/centers/{center_id}/business-insights/no-show-report")
def delete_center_monthly_no_show_report(center_id: str, period: str = Query(default="month")):
    object_id = parse_object_id(center_id, "center id")
    center = db.centers.find_one({"_id": object_id})
    if not center:
        raise HTTPException(status_code=404, detail="Center not found.")

    normalized_period, start, end, period_label = parse_report_period(period)
    if normalized_period != "month":
        raise HTTPException(status_code=400, detail="Only monthly no-show reports can be deleted.")

    now = datetime.now(UTC)
    db.no_show_report_deletions.update_one(
        {
            "center_id": object_id,
            "period_key": normalized_period,
            "period_start": start,
            "period_end": end,
        },
        {
            "$set": {
                "center_id": object_id,
                "period_key": normalized_period,
                "period_label": period_label,
                "period_start": start,
                "period_end": end,
                "deleted_at": now,
                "updated_at": now,
            },
            "$setOnInsert": {"created_at": now},
        },
        upsert=True,
    )
    return {
        "deleted": True,
        "period": {
            "key": normalized_period,
            "label": period_label,
            "start": start.date().isoformat(),
            "end": (end - timedelta(days=1)).date().isoformat(),
        },
    }


@app.get("/api/centers/{center_id}/dashboard")
def get_center_dashboard(center_id: str):
    object_id = parse_object_id(center_id, "center id")
    center = db.centers.find_one({"_id": object_id})
    if not center:
        raise HTTPException(status_code=404, detail="Center not found.")

    now = datetime.now(ZoneInfo("Europe/Rome")).replace(tzinfo=None)
    today_start = datetime.combine(now.date(), time(0, 0))
    tomorrow_start = today_start + timedelta(days=1)
    active_booking_query = {"center_id": object_id, "status": {"$nin": ["canceled", "no_show"]}}
    canceled_today_query = {
        "center_id": object_id,
        "status": "canceled",
        "start_time": {"$gte": today_start, "$lt": tomorrow_start},
    }
    no_show_today_query = {
        "center_id": object_id,
        "status": "no_show",
        "start_time": {"$gte": today_start, "$lt": tomorrow_start},
    }

    todays_bookings = list(
        db.bookings.find(
            {
                **active_booking_query,
                "start_time": {"$gte": today_start, "$lt": tomorrow_start},
            }
        ).sort("start_time", 1)
    )
    canceled_today_bookings = list(db.bookings.find(canceled_today_query).sort("start_time", 1))
    no_show_today_bookings = list(db.bookings.find(no_show_today_query).sort("start_time", 1))
    upcoming_bookings = list(
        db.bookings.find(
            {
                **active_booking_query,
                "start_time": {"$gte": now},
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
    canceled_clients = {
        booking.get("user_id")
        for booking in canceled_today_bookings
        if booking.get("user_id") is not None
    }
    upcoming_bookings_count = db.bookings.count_documents(
        {**active_booking_query, "start_time": {"$gte": now}}
    )

    total_revenue = 0
    service_ids = [
        booking.get("service_id")
        for booking in [*todays_bookings, *upcoming_bookings, *canceled_today_bookings, *no_show_today_bookings]
        if booking.get("service_id")
    ]
    services_by_id = {
        service["_id"]: service
        for service in db.services.find({"_id": {"$in": service_ids}})
    }
    for booking in todays_bookings:
        service = services_by_id.get(booking.get("service_id"))
        if service and isinstance(service.get("price"), (int, float)):
            total_revenue += service["price"]

    agenda = []
    agenda_bookings_by_id = {booking["_id"]: booking for booking in todays_bookings}
    for booking in [*canceled_today_bookings, *no_show_today_bookings]:
        agenda_bookings_by_id[booking["_id"]] = booking

    agenda_bookings = sorted(
        agenda_bookings_by_id.values(),
        key=lambda item: item.get("start_time") or datetime.max,
    )[:12]

    for booking in agenda_bookings:
        user = db.users.find_one({"_id": booking.get("user_id")})
        start_time = booking.get("start_time")
        end_time = booking.get("end_time")
        date_prefix = ""
        if isinstance(start_time, datetime) and start_time.date() != today_start.date():
            date_prefix = start_time.strftime("%d/%m ")
        cancellation_count = db.bookings.count_documents(
            {"center_id": object_id, "user_id": booking.get("user_id"), "status": "canceled"}
        )
        booking_status = booking.get("status", "")
        is_delayed = (bool(booking.get("is_delayed")) or booking_status == "late") and booking_status in ["booked", "confirmed", "late"]
        service = services_by_id.get(booking.get("service_id"))
        duration = service.get("duration") if service else None
        agenda.append(
            {
                "id": serialize_id(booking["_id"]),
                "start_time": start_time.isoformat() if isinstance(start_time, datetime) else None,
                "end_time": end_time.isoformat() if isinstance(end_time, datetime) else None,
                "time_label": f"{date_prefix}{start_time.strftime('%H:%M')}" if isinstance(start_time, datetime) else "",
                "client_name": (user or {}).get("name", "Cliente"),
                "operator_name": center.get("name", "Centro"),
                "service": booking.get("service_name", "Servizio"),
                "is_delayed": is_delayed,
                "status_label": "Annullato" if booking_status == "canceled" else ("Confermato" if booking_status in ["confirmed", "late"] else booking_status),
                "duration_label": f"{duration} min" if isinstance(duration, int) else None,
                "canceled_at": booking.get("canceled_at"),
                "cancellation_reason": booking.get("cancellation_reason"),
                "client_cancellations_count": cancellation_count,
                "status_history": booking.get("status_history", []),
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
            {"id": "metric-5", "label": "Disdette oggi", "value": str(len(canceled_today_bookings))},
            {"id": "metric-6", "label": "Clienti con disdetta", "value": str(len(canceled_clients))},
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
    if center_object_id not in user.get("center_membership_ids", []):
        add_client_center_membership(user["_id"], center_object_id, source="booking")
        user = db.users.find_one({"_id": user["_id"]})

    service_object_id, service = load_service_for_center(center_object_id, payload.service_id)
    start_time = parse_slot_datetime(payload.slot_id)
    selected_slot, end_time = validate_appointment_slot(
        center,
        service,
        start_time,
        staff_member_id=payload.staff_member_id,
        room_id=payload.room_id,
        enforce_online=True,
    )

    now = datetime.now(UTC)
    booking_document = {
        "center_id": center_object_id,
        "user_id": user["_id"],
        "service_id": service_object_id,
        "service_name": service.get("name"),
        "operator_name": selected_slot.get("staff_member_name") or center.get("name", "Centro"),
        "staff_member_id": selected_slot.get("staff_member_id"),
        "room_id": selected_slot.get("room_id"),
        "total_price": service.get("price"),
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
    selected_slot, end_time = validate_appointment_slot(
        center,
        service,
        start_time,
        exclude_booking_id=booking_object_id,
    )

    db.bookings.update_one(
        {"_id": booking_object_id},
        {
            "$set": {
                "service_id": service_object_id,
                "service_name": service.get("name"),
                "operator_name": selected_slot.get("staff_member_name") or center.get("name", "Centro"),
                "staff_member_id": selected_slot.get("staff_member_id"),
                "room_id": selected_slot.get("room_id"),
                "total_price": service.get("price"),
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


@app.patch("/api/bookings/{booking_id}/status")
def update_booking_status(booking_id: str, payload: BookingStatusPayload):
    booking_object_id = parse_object_id(booking_id, "booking id")
    booking = db.bookings.find_one({"_id": booking_object_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found.")

    validate_booking_actor(
        booking,
        role=payload.role,
        center_id=payload.center_id,
    )

    status_map = {
        "booked": "booked",
        "prenotato": "booked",
        "prenotata": "booked",
        "confermato": "confirmed",
        "confermata": "confirmed",
        "confirmed": "confirmed",
        "arrivata": "arrived",
        "arrivato": "arrived",
        "arrived": "arrived",
        "completed": "completed",
        "completato": "completed",
        "completata": "completed",
        "in ritardo": "confirmed",
        "delayed": "confirmed",
        "late": "confirmed",
        "annullato": "canceled",
        "annullata": "canceled",
        "disdetta cliente": "canceled",
        "canceled": "canceled",
        "cancelled": "canceled",
        "no_show": "no_show",
        "no-show": "no_show",
        "noshow": "no_show",
    }
    requested_status = payload.status.strip().lower()
    normalized_status = status_map.get(requested_status)
    if normalized_status is None:
        raise HTTPException(status_code=400, detail="Unsupported booking status.")

    now = datetime.now(UTC)
    reason = payload.cancellation_reason.strip() if payload.cancellation_reason else None
    is_delayed_update = requested_status in {"in ritardo", "delayed", "late"}
    history_item = {
        "status": "late" if is_delayed_update else normalized_status,
        "changed_at": now,
        "changed_by": payload.role,
        "reason": reason,
    }
    update_fields = {
        "is_delayed": is_delayed_update,
        "status": normalized_status,
        "updated_at": now,
    }

    if normalized_status == "canceled":
        update_fields["canceled_at"] = now
        update_fields["cancellation_reason"] = reason
        update_fields["canceled_by"] = "client_request"
    elif booking.get("status") == "canceled":
        update_fields["canceled_at"] = None
        update_fields["cancellation_reason"] = None
        update_fields["canceled_by"] = None

    db.bookings.update_one(
        {"_id": booking_object_id},
        {
            "$set": update_fields,
            "$push": {"status_history": history_item},
        },
    )
    if normalized_status == "canceled" and booking.get("status") != "canceled" and booking.get("user_id"):
        db.users.update_one(
            {"_id": booking.get("user_id")},
            {
                "$inc": {"cancellations_count": 1},
                "$set": {"updated_at": now},
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

    now = datetime.now(UTC)
    db.bookings.update_one(
        {"_id": booking_object_id},
        {
            "$set": {
                "status": "canceled",
                "is_delayed": False,
                "canceled_at": now,
                "canceled_by": role,
                "updated_at": now,
            },
            "$push": {
                "status_history": {
                    "status": "canceled",
                    "changed_at": now,
                    "changed_by": role,
                    "reason": None,
                }
            },
        },
    )
    if booking.get("status") != "canceled" and booking.get("user_id"):
        db.users.update_one(
            {"_id": booking.get("user_id")},
            {
                "$inc": {"cancellations_count": 1},
                "$set": {"updated_at": now},
            },
        )
    updated_booking = db.bookings.find_one({"_id": booking_object_id})
    return serialize_booking(updated_booking)
