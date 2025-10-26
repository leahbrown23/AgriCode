from django.db.models import Max
from django.utils.timezone import now
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.models import (
    Plot,
    SensorData,
    Harvest,
)

# -------------------------
# Helpers to fetch latest records per plot
# -------------------------

def _get_user_plots(user):
    """
    All plots owned by this user.
    Your Plot model has a direct FK: user = ForeignKey(CustomUser)
    So we just filter Plot.user.
    """
    return Plot.objects.filter(user=user)


def _get_latest_sensor_by_plot(plots):
    """
    Return { plot_id: latest SensorData row }.
    We use SensorData.ts as the timestamp.
    """
    latest_rows = (
        SensorData.objects
        .filter(plot__in=plots)
        .values("plot_id")
        .annotate(latest_ts=Max("ts"))
    )

    out = {}
    for row in latest_rows:
        pid = row["plot_id"]
        ts = row["latest_ts"]
        try:
            reading = SensorData.objects.get(plot_id=pid, ts=ts)
            out[pid] = reading
        except SensorData.DoesNotExist:
            continue
    return out


def _get_latest_harvest_by_plot(plots):
    """
    Return { plot_id: latest Harvest row }.
    This gives us crop info and lets us estimate 'days_in_cycle'.
    We don't have updated_at, so we'll just take the most recent start_date/end_date by -id.
    """
    out = {}
    for p in plots:
        latest = (
            Harvest.objects
            .filter(plot=p)
            .order_by("-id")
            .first()
        )
        if latest:
            out[p.id] = latest
    return out


def _estimate_days_in_cycle(harvest_obj):
    """
    Derive how long this crop has been in the ground.
    If no harvest_obj or no start_date, return None.
    """
    if not harvest_obj or not harvest_obj.start_date:
        return None
    delta = now() - harvest_obj.start_date
    # convert seconds to days (floor)
    return delta.days


# -------------------------
# Build the response per plot
# -------------------------

def _build_plot_payload(plot, sensor_row, harvest_row):
    """
    Build the JSON object for one plot to send to the frontend.
    Matches what RecommendationsScreen wants.
    """

    # 1. Metrics block from SensorData
    metrics = None
    if sensor_row:
        # Map your real SensorData fields:
        # ph, moisture, n, p, k, ts
        metrics = {
            "nitrogen": getattr(sensor_row, "n", None),
            "phosphorus": getattr(sensor_row, "p", None),
            "potassium": getattr(sensor_row, "k", None),
            "ph": getattr(sensor_row, "ph", None),
            "moisture": getattr(sensor_row, "moisture", None),
            # You don't have humidity / rainfall / temperature in SensorData.
            "temperature": None,
            "humidity": None,
            "rainfall": None,
        }

    # 2. Chemicals block
    # You don't currently have fert_total / pest_total on any Django model
    # but your Supabase table api_chemical has them.
    # For now we return None so the UI can handle it gracefully.
    chemicals = {
        "fert_total": None,
        "pest_total": None,
    }

    # 3. Crop info + days in cycle from Harvest
    crop_name = "Unknown Crop"
    days_in_cycle = None
    if harvest_row:
        crop_name = harvest_row.crop_type or "Unknown Crop"
        days_in_cycle = _estimate_days_in_cycle(harvest_row)

    # 4. Generate warnings and actions (rule logic from sensor readings)
    warnings_list = []
    actions_list = []

    if metrics and metrics.get("moisture") is not None:
        moisture_val = metrics["moisture"]
        # low moisture risk
        if moisture_val is not None and moisture_val < 30:
            warnings_list.append("Soil moisture is low. Crop may be stressed.")
            actions_list.append("Irrigate this plot within the next 12 hours.")
        # high moisture risk
        if moisture_val is not None and moisture_val > 80:
            warnings_list.append(
                "Soil moisture is very high. Risk of root rot / fungus."
            )
            actions_list.append(
                "Reduce irrigation until moisture drops into normal range."
            )

    # no fert/pest thresholds yet since we don't have fert_total / pest_total from Django
    # later: once you expose api_chemical in Django, add threshold logic here.

    # 5. Severity badge for UI
    severity = "low"
    if len(warnings_list) > 0:
        severity = "high"

    # 6. Plot label
    # Your Plot model:
    #   plot_id (string like "P1")
    #   unique_plot_key, etc.
    # We don't have a "name" field, so we'll use plot.plot_id.
    plot_display_name = plot.plot_id or f"Plot {plot.id}"

    return {
        "plot_id": plot.id,
        "plot_name": plot_display_name,
        "crop_name": crop_name,
        "days_in_cycle": days_in_cycle,
        "metrics": metrics,
        "chemicals": chemicals,
        "warnings": warnings_list,
        "actions": actions_list,
        "severity": severity,
    }


# -------------------------
# Public API view
# -------------------------

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def plot_recommendations(request):
    """
    GET /api/recommendations/plots/
    Returns an array of per-plot recommendations for the logged-in user.
    """
    # 1. Get all this user's plots
    plots = _get_user_plots(request.user)

    # 2. For those plots, get:
    #    - latest SensorData reading
    #    - latest Harvest record
    sensor_map = _get_latest_sensor_by_plot(plots)
    harvest_map = _get_latest_harvest_by_plot(plots)

    # 3. Build payload per plot
    out = []
    for plot in plots:
        sensor_row = sensor_map.get(plot.id)
        harvest_row = harvest_map.get(plot.id)
        out.append(_build_plot_payload(plot, sensor_row, harvest_row))

    return Response(out)
