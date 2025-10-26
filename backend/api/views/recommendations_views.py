from django.db.models import Max
from django.utils.timezone import now
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.models import (
    Plot,
    SoilSensorReading,
    Harvest,
    Chemical,
)

from ml.recommend import generate_recommendations


# ---------------------------------
# helpers to get latest data per plot
# ---------------------------------

def _get_user_plots(user):
    # all plots that belong to this user
    return Plot.objects.filter(user=user)


def _get_latest_soilreading_by_plot(plots):
    """
    Returns { plot.id: latest SoilSensorReading }.
    We assume:
      SoilSensorReading.plot_number == Plot.plot_id  (string match)
    and we choose "latest" by max(timestamp).
    """
    out = {}

    # gather all plot_ids like ["6801", "6802", ...]
    plot_id_strings = [p.plot_id for p in plots]

    if not plot_id_strings:
        return out

    # for each plot_number, get the latest timestamp
    latest_rows = (
        SoilSensorReading.objects
        .filter(plot_number__in=plot_id_strings)
        .values("plot_number")
        .annotate(latest_ts=Max("timestamp"))
    )

    # now resolve those into actual rows
    for row in latest_rows:
        plot_code = row["plot_number"]
        ts = row["latest_ts"]
        try:
            reading = SoilSensorReading.objects.get(
                plot_number=plot_code,
                timestamp=ts
            )
            # find which Plot this belongs to
            matching_plot = next(
                (p for p in plots if p.plot_id == plot_code),
                None
            )
            if matching_plot:
                out[matching_plot.id] = reading
        except SoilSensorReading.DoesNotExist:
            continue

    return out


def _get_latest_harvest_by_plot(plots):
    """
    Returns { plot.id: most recent Harvest row } using highest id.
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
    if not harvest_obj or not harvest_obj.start_date:
        return None
    delta = now() - harvest_obj.start_date
    return delta.days


def _get_chemical_for_harvest(harvest_obj):
    """
    Harvest has OneToOne 'chemical' (Chemical model)
    """
    if not harvest_obj:
        return None
    try:
        return harvest_obj.chemical
    except Chemical.DoesNotExist:
        return None


# ---------------------------------
# split ML output text -> buckets for UI
# ---------------------------------

def _split_model_messages(rec_list):
    soil_actions = []
    chemical_actions = []
    model_recommendations = []

    for line in rec_list or []:
        lower = line.lower()

        # soil / nutrients / env
        if any(key in lower for key in [
            "nitrogen", "phosphor", "potassium", "k is", "p is", "n is",
            "ph is", "soil ph", "moisture", "rainfall", "temperature",
            "humidity", "increase ", "reduce ",
        ]):
            soil_actions.append(line)
            continue

        # fert / pesticide
        if any(key in lower for key in [
            "fertilizer", "pesticide", "spray", "apply", "split application",
        ]):
            chemical_actions.append(line)
            continue

        # yield / summary
        model_recommendations.append(line)

    return soil_actions, chemical_actions, model_recommendations


# ---------------------------------
# build ML input for ONE plot
# ---------------------------------

def _build_model_input(soil_row, harvest_row, chemical_row):
    """
    Convert DB rows -> dict for generate_recommendations()
    We do NOT send None for model-critical numeric fields.
    """

    # soil / environment readings from SoilSensorReading
    # field names from your screenshot:
    #   pH_level, N, P, K, moisture_level, Temperature, Humidity, Rainfall
    N_val           = soil_row.N if soil_row else 0.0
    P_val           = soil_row.P if soil_row else 0.0
    K_val           = soil_row.K if soil_row else 0.0
    pH_val          = soil_row.pH_level if soil_row else 7.0
    Temperature_val = soil_row.Temperature if soil_row else 25.0
    Humidity_val    = soil_row.Humidity if soil_row else 60.0
    Rainfall_val    = soil_row.Rainfall if soil_row else 800.0

    # crop name for this plot (from Harvest)
    crop_name = harvest_row.crop_type if harvest_row and harvest_row.crop_type else None

    # chem usage (from Chemical)
    fert_total = chemical_row.fert_total if chemical_row else 0.0
    pest_total = chemical_row.pest_total if chemical_row else 0.0

    model_input = {
        "N": N_val,
        "P": P_val,
        "K": K_val,
        "pH": pH_val,
        "Temperature": Temperature_val,
        "Rainfall": Rainfall_val,
        "Humidity": Humidity_val,
        "Soil_Type": None,        # you can wire actual soil type later
        "Current_Crop": crop_name,
        "Fertilizer": fert_total,
        "Pesticide": pest_total,
    }

    return model_input


# ---------------------------------
# build per-plot response payload for frontend
# ---------------------------------

def _build_plot_payload(plot, soil_row, harvest_row, chemical_row):
    # Header basics
    if harvest_row:
        crop_name = harvest_row.crop_type or "Unknown Crop"
        days_in_cycle = _estimate_days_in_cycle(harvest_row)
    else:
        crop_name = "Unknown Crop"
        days_in_cycle = None

    plot_display_name = plot.plot_id or f"Plot {plot.id}"

    # soil metrics shown in card
    metrics = None
    if soil_row:
        metrics = {
            "nitrogen": soil_row.N,
            "phosphorus": soil_row.P,
            "potassium": soil_row.K,
            "ph": soil_row.pH_level,
            "moisture": soil_row.moisture_level,
            "temperature": soil_row.Temperature,
            "humidity": soil_row.Humidity,
            "rainfall": soil_row.Rainfall,
        }

    # chem summary shown in card
    if chemical_row:
        fert_total = chemical_row.fert_total
        pest_total = chemical_row.pest_total
        chemicals = {
            "fert_total": fert_total,
            "pest_total": pest_total,
        }
    else:
        fert_total = 0.0
        pest_total = 0.0
        chemicals = {
            "fert_total": 0.0,
            "pest_total": 0.0,
        }

    # ---- run your ML model exactly as-is ----
    model_input = _build_model_input(soil_row, harvest_row, chemical_row)
    model_output = generate_recommendations(model_input)
    # model_output = {
    #   "current_crop": ...,
    #   "current_yield": ...,
    #   "recommendations": [ "...", ... ]
    # }

    soil_actions, chemical_actions, model_recommendations = _split_model_messages(
        model_output.get("recommendations", [])
    )

    # ---- urgent warnings for Immediate Attention + severity pill ----
    warnings_list = []

    # moisture extremes
    if soil_row and soil_row.moisture_level is not None:
        m = soil_row.moisture_level
        if m < 30:
            warnings_list.append("Soil moisture is low. Crop may be stressed.")
        elif m > 80:
            warnings_list.append(
                "Soil moisture is very high. Risk of root rot / fungus."
            )

    # fert burn
    if fert_total is not None and fert_total > 100:
        warnings_list.append(
            "High fertilizer usage for this stage. Risk of nutrient burn."
        )

    # pesticide overuse
    if pest_total is not None and pest_total > 500:
        warnings_list.append(
            "Very high pesticide application. Resistance risk increasing."
        )

    severity = "high" if warnings_list else "low"

    return {
        "plot_id": plot.id,
        "plot_name": plot_display_name,
        "crop_name": crop_name,
        "days_in_cycle": days_in_cycle,

        "metrics": metrics,
        "chemicals": chemicals,

        "soil_actions": soil_actions,
        "chemical_actions": chemical_actions,
        "model_recommendations": model_recommendations,

        "warnings": warnings_list,
        "severity": severity,
    }


# ---------------------------------
# public API
# ---------------------------------

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def plot_recommendations(request):
    """
    GET /api/recommendations/plots/
    One card per plot owned by this user.
    """
    plots = _get_user_plots(request.user)

    # latest sensor/soil per plot
    soil_map = _get_latest_soilreading_by_plot(plots)

    # latest harvest per plot
    harvest_map = _get_latest_harvest_by_plot(plots)

    payload = []

    for plot in plots:
        soil_row = soil_map.get(plot.id)          # SoilSensorReading
        harvest_row = harvest_map.get(plot.id)    # Harvest
        chemical_row = _get_chemical_for_harvest(harvest_row)  # Chemical

        plot_blob = _build_plot_payload(
            plot,
            soil_row,
            harvest_row,
            chemical_row,
        )
        payload.append(plot_blob)

    return Response(payload)
