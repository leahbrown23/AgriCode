from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def harvest_crop(request, crop_id):
    """Placeholder for harvest endpoint."""
    return Response(
        {"detail": "harvest endpoint not implemented yet", "crop_id": crop_id},
        status=501
    )
