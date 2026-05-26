from fastapi import APIRouter

from ..services import notification_service


router = APIRouter()

router.add_api_route("/api/notifications", notification_service.get_notifications, methods=["GET"])
router.add_api_route(
    "/api/notifications/read",
    notification_service.mark_notifications_read,
    methods=["PATCH"],
)
