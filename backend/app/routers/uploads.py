from fastapi import APIRouter

from ..services import upload_service


router = APIRouter()

router.add_api_route(
    "/api/uploads/{storage_path:path}",
    upload_service.get_uploaded_asset,
    methods=["GET"],
)
router.add_api_route(
    "/api/centers/{center_id}/branding/logo",
    upload_service.upload_center_logo,
    methods=["POST"],
)
