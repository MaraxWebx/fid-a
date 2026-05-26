from fastapi import APIRouter

from ..services import booking_service


router = APIRouter()

router.add_api_route(
    "/api/centers/{center_id}/bookings",
    booking_service.get_center_bookings,
    methods=["GET"],
)
router.add_api_route(
    "/api/centers/{center_id}/bookings/{booking_id}",
    booking_service.get_center_booking_detail,
    methods=["GET"],
)
router.add_api_route("/api/bookings", booking_service.create_booking, methods=["POST"])
router.add_api_route("/api/bookings/{booking_id}", booking_service.update_booking, methods=["PATCH"])
router.add_api_route(
    "/api/bookings/{booking_id}/status",
    booking_service.update_booking_status,
    methods=["PATCH"],
)
router.add_api_route(
    "/api/bookings/{booking_id}/cancel",
    booking_service.cancel_booking,
    methods=["PATCH"],
)
