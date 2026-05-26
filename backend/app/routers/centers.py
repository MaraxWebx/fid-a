from fastapi import APIRouter
from fastapi.responses import HTMLResponse

from ..services import center_service, stripe_service


router = APIRouter()

router.add_api_route("/api/centers/register", center_service.register_center, methods=["POST"])
router.add_api_route(
    "/api/centers/{center_id}/subscription/activate",
    center_service.activate_center_subscription,
    methods=["POST"],
)
router.add_api_route(
    "/api/centers/{center_id}/activation-status",
    center_service.get_center_activation_status,
    methods=["GET"],
)
router.add_api_route(
    "/checkout/success",
    stripe_service.checkout_success,
    methods=["GET"],
    response_class=HTMLResponse,
)
router.add_api_route(
    "/checkout/cancel",
    stripe_service.checkout_cancel,
    methods=["GET"],
    response_class=HTMLResponse,
)
router.add_api_route(
    "/api/centers/{center_id}/onboarding",
    center_service.update_center_onboarding,
    methods=["PATCH"],
)
router.add_api_route(
    "/api/centers/{center_id}/profile",
    center_service.update_center_profile,
    methods=["PATCH"],
)
router.add_api_route(
    "/api/centers/{center_id}/availability",
    center_service.update_center_availability,
    methods=["PATCH"],
)
router.add_api_route("/api/centers", center_service.list_centers, methods=["GET"])
router.add_api_route(
    "/api/centers/{center_id}/services",
    center_service.list_center_services,
    methods=["GET"],
)
router.add_api_route(
    "/api/centers/{center_id}/booking-slots",
    center_service.get_center_booking_slots,
    methods=["GET"],
)
router.add_api_route(
    "/api/centers/{center_id}/booking-slots/alternatives",
    center_service.get_center_booking_slot_alternatives,
    methods=["GET"],
)
router.add_api_route(
    "/api/centers/{center_id}/services",
    center_service.update_center_services,
    methods=["PATCH"],
)
router.add_api_route(
    "/api/centers/{center_id}/user-stats",
    center_service.get_center_user_stats,
    methods=["GET"],
)
