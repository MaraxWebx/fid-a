from fastapi import APIRouter

from ..services import stripe_service


router = APIRouter()

router.add_api_route("/api/stripe/webhook", stripe_service.stripe_webhook, methods=["POST"])
