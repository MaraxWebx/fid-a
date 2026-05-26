from fastapi import APIRouter

from ..services import legacy_service


router = APIRouter()

router.add_api_route("/health", legacy_service.health, methods=["GET"])
router.add_api_route("/api/health", legacy_service.api_health, methods=["GET"])
