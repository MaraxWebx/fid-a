from fastapi import APIRouter

from ..services import client_service


router = APIRouter()

router.add_api_route("/api/users/profile", client_service.get_profile, methods=["GET"])
router.add_api_route("/api/users/profile", client_service.update_user_profile, methods=["PATCH"])
router.add_api_route("/api/users/bookings", client_service.get_user_bookings, methods=["GET"])
router.add_api_route("/api/users/stats", client_service.get_user_stats, methods=["GET"])
router.add_api_route(
    "/api/users/favorite-centers",
    client_service.get_user_favorite_centers,
    methods=["GET"],
)
router.add_api_route(
    "/api/users/center-memberships",
    client_service.get_user_center_memberships,
    methods=["GET"],
)
router.add_api_route(
    "/api/users/favorite-centers/{center_id}",
    client_service.toggle_user_favorite_center,
    methods=["PATCH"],
)
