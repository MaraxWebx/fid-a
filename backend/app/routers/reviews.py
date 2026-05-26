from fastapi import APIRouter

from ..services import review_service


router = APIRouter()

router.add_api_route(
    "/api/centers/{center_id}/reviews",
    review_service.list_center_reviews,
    methods=["GET"],
)
router.add_api_route("/api/reviews", review_service.create_review, methods=["POST"])
