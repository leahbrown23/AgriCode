from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from ..models import SensorDevice, Plot, SensorData


def _plot_for_user_by_pk_or_code(user, identifier):
    """
    Try resolve a plot that belongs to `user` using either:
      1) internal PK == identifier
      2) public code Plot.plot_id == identifier
    `identifier` is int (from URL).
    """
    # 1) try by PK
    try:
        return Plot.objects.get(pk=identifier, user=user)
    except Plot.DoesNotExist:
        pass
    # 2) try by public code
    try:
        return Plot.objects.get(plot_id=identifier, user=user)
    except Plot.DoesNotExist:
        return None


def _serialize_reading(r):
    return {
        "timestamp": r.ts.isoformat(),
        "ph": r.ph,
        "moisture": r.moisture,
        "n": r.n,
        "p": r.p,
        "k": r.k,
        "device_name": r.device.name if getattr(r, "device", None) else "Unknown",
        "source": r.source,
        # Nice-to-have aliases some frontends may expect
        "pH_level": r.ph,
        "N": r.n,
        "P": r.p,
        "K": r.k,
        "Temperature": None,  # not stored here
        "Humidity": None,
        "Rainfall": None,
    }


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def sim_status(request):
    """Get status of all sensor devices for current user."""
    try:
        devices = (
            SensorDevice.objects.filter(user=request.user)
            .order_by("id")
            .select_related("plot")
        )
        device_data = [
            {
                "id": d.id,
                "name": d.name or f"Sensor {d.linked_sensor_id}",
                "external_id": d.external_id,
                "sensor_id": d.linked_sensor_id,
                "plot": d.plot.plot_id if d.plot else None,   # public code
                "plot_name": f"Plot {d.plot.plot_id}" if d.plot else "No Plot",
                "is_active": d.is_active,
                "data_source": getattr(d, "data_source", "unknown"),
                "last_seen": d.last_seen.isoformat() if d.last_seen else None,
                "sim_seq": getattr(d, "sim_seq", 0),
            }
            for d in devices
        ]
        return Response(device_data)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_sensor_data(request, plot_id: int):
    """
    GET /api/sensors/data/<plot_id>/

    Accepts either:
      - internal Plot.pk, OR
      - public code Plot.plot_id

    Returns:
    {
      "plot_id": <public code>,
      "plot_pk": <internal pk>,
      "latest": {...},               # latest reading object
      "history": [ {...}, ... ]      # up to last 100 readings (newest first)
    }
    """
    try:
        plot = _plot_for_user_by_pk_or_code(request.user, int(plot_id))
        if not plot:
            return Response({"error": "Plot not found"}, status=status.HTTP_404_NOT_FOUND)

        recent_qs = (
            SensorData.objects.filter(plot=plot)
            .select_related("device")
            .order_by("-ts")[:100]
        )
        history = [_serialize_reading(r) for r in recent_qs]
        latest = history[0] if history else None

        return Response(
            {
                "plot_id": plot.plot_id,   # public code
                "plot_pk": plot.pk,        # internal pk
                "latest": latest,
                "history": history,
            }
        )
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_sensor_data_by_code(request, plot_code: int):
    """
    GET /api/sensors/data/by-code/<plot_code>/

    Explicit variant when you know you're passing the public code.
    """
    try:
        plot = Plot.objects.get(plot_id=plot_code, user=request.user)
    except Plot.DoesNotExist:
        return Response({"error": "Plot not found"}, status=status.HTTP_404_NOT_FOUND)

    recent_qs = (
        SensorData.objects.filter(plot=plot)
        .select_related("device")
        .order_by("-ts")[:100]
    )
    history = [_serialize_reading(r) for r in recent_qs]
    latest = history[0] if history else None

    return Response(
        {
            "plot_id": plot.plot_id,
            "plot_pk": plot.pk,
            "latest": latest,
            "history": history,
        }
    )
