from fastapi import APIRouter

from ..services import insights_service


router = APIRouter()

router.add_api_route(
    "/api/centers/{center_id}/business-insights",
    insights_service.get_center_business_insights,
    methods=["GET"],
)
router.add_api_route(
    "/api/centers/{center_id}/business-insights/report.pdf",
    insights_service.export_center_business_report,
    methods=["GET"],
)
router.add_api_route(
    "/api/centers/{center_id}/business-insights/no-show-report.pdf",
    insights_service.export_center_no_show_report,
    methods=["GET"],
)
router.add_api_route(
    "/api/centers/{center_id}/business-insights/no-show-report",
    insights_service.delete_center_monthly_no_show_report,
    methods=["DELETE"],
)
router.add_api_route(
    "/api/centers/{center_id}/dashboard",
    insights_service.get_center_dashboard,
    methods=["GET"],
)
router.add_api_route(
    "/api/centers/{center_id}/clients",
    insights_service.get_center_clients,
    methods=["GET"],
)
router.add_api_route(
    "/api/centers/{center_id}/clients/{client_id}",
    insights_service.get_center_client_detail,
    methods=["GET"],
)
