from fastapi import APIRouter

from ..services import center_service, client_service


router = APIRouter()

router.add_api_route("/api/auth/centers/login", center_service.login_center, methods=["POST"])
router.add_api_route("/api/auth/clients/register", client_service.register_client, methods=["POST"])
router.add_api_route("/api/auth/clients/login", client_service.login_client, methods=["POST"])
router.add_api_route(
    "/api/onboarding/invitations/{invitation_code}",
    center_service.resolve_invitation,
    methods=["GET"],
)
router.add_api_route(
    "/api/users/center-memberships",
    client_service.create_center_membership,
    methods=["POST"],
)
