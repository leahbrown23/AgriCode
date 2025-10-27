from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from . import inference
from . import recommend
from .models import Recommendation
from .serializers import RecommendationSerializer


def _normalize_crop_name(name):
    """
    Make 'maize' -> 'Maize', 'TOMATO' -> 'Tomato'
    so the ML encoder & optimal_ranges keys match.
    """
    if not name:
        return None
    name = str(name).strip()
    if not name:
        return None
    return name[0].upper() + name[1:].lower()


def _coerce_float(val, fallback=None):
    """
    Try convert incoming values to float so the model doesn't choke on strings.
    If it's None or cannot parse, return fallback.
    """
    if val is None:
        return fallback
    try:
        # allow "6,5" style commas
        if isinstance(val, str):
            val = val.replace(",", ".")
        return float(val)
    except Exception:
        return fallback


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def recommend_crop(request):
    """
    POST /ml/recommend-crop/

    Expects JSON input with keys:
      N, P, K, pH, Temperature, Humidity, Rainfall,
      Fertilizer, Pesticide, Soil_Type,
      optional Current_Crop

    Returns:
      - Best crop recommendation with confidence score
      - Predicted yield for recommended crop
      - Predicted yield for current crop (if provided)
      - Yield comparison
    """
    try:
        data = request.data.copy()

        # required checks
        required_fields = [
            "N",
            "P",
            "K",
            "pH",
            "Temperature",
            "Humidity",
            "Rainfall",
            "Soil_Type",
        ]
        missing_fields = [f for f in required_fields if f not in data]
        if missing_fields:
            return Response(
                {
                    "error": f"Missing required fields: {', '.join(missing_fields)}",
                    "recommendation": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # normalize casing of Current_Crop for downstream model code
        if "Current_Crop" in data:
            data["Current_Crop"] = _normalize_crop_name(data.get("Current_Crop"))

        # coerce numerics so inference.recommend_and_compare() doesn't get strings
        numeric_keys = [
            "N",
            "P",
            "K",
            "pH",
            "Temperature",
            "Humidity",
            "Rainfall",
            "Fertilizer",
            "Pesticide",
        ]
        for key in numeric_keys:
            if key in data:
                data[key] = _coerce_float(data[key], data[key])

        result = inference.recommend_and_compare(data)

        return Response(
            {
                "recommendation": result.get("crop_recommendation"),
                "predicted_yield_recommended_crop": result.get(
                    "predicted_yield_recommended_crop"
                ),
                "predicted_yield_current_crop": result.get(
                    "predicted_yield_current_crop"
                ),
                "yield_comparison": result.get("comparison"),
                "status": "success",
                "input_data": data,
            },
            status=status.HTTP_200_OK,
        )

    except Exception as e:
        print(f"[recommend_crop] error: {e}")
        # graceful fallback to keep UI alive
        return Response(
            {
                "recommendation": {
                    "crop": "maize",
                    "ml_confidence": 70,
                    "compatibility_score": 65,
                },
                "predicted_yield_recommended_crop": None,
                "predicted_yield_current_crop": None,
                "yield_comparison": None,
                "status": "fallback",
                "error": str(e),
            },
            status=status.HTTP_200_OK,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_recommendations_view(request):
    """
    POST /ml/generate-recommendations/

    -> Used by InsightsScreen for:
        - Predicted yield for CURRENT crop
        - Actionable recommendations list

    No DB writes.

    Expected body:
      N, P, K, pH, Temperature, Humidity, Rainfall,
      Soil_Type, Current_Crop, Fertilizer, Pesticide

    Response example:
    {
      "current_crop": "maize",
      "current_yield": 125.65,
      "recommendations": [
        "K is below optimal (60)...",
        "Low rainfall detected — consider irrigation or drought-tolerant crops.",
        "Maize already performs optimally under current conditions."
      ]
    }
    """
    try:
        data = request.data.copy()

        # normalize crop name
        data["Current_Crop"] = _normalize_crop_name(data.get("Current_Crop"))

        # coerce numerics, same reasoning as above
        numeric_keys = [
            "N",
            "P",
            "K",
            "pH",
            "Temperature",
            "Humidity",
            "Rainfall",
            "Fertilizer",
            "Pesticide",
        ]
        for key in numeric_keys:
            if key in data:
                data[key] = _coerce_float(data[key], data[key])

        result = recommend.generate_recommendations(data)

        # result should already be:
        # {
        #   "current_crop": ...,
        #   "current_yield": ...,
        #   "recommendations": [...]
        # }

        return Response(
            {
                "current_crop": result.get("current_crop"),
                "current_yield": result.get("current_yield"),
                "recommendations": result.get("recommendations", []),
            },
            status=status.HTTP_200_OK,
        )

    except Exception as e:
        print(f"[generate_recommendations_view] error: {e}")
        return Response(
            {
                "current_crop": _normalize_crop_name(
                    request.data.get("Current_Crop")
                ),
                "current_yield": None,
                "recommendations": [],
                "error": str(e),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_and_store_recommendation(request):
    """
    POST /ml/recommendations/

    1. Run generate_recommendations(data)
    2. Save a Recommendation row tied to this user/harvest
    3. Return saved record id

    This is for logging/history, NOT the live InsightsScreen card.
    """
    try:
        data = request.data.copy()
        harvest_id = data.get("harvest_id")

        # validation
        required_fields = [
            "N",
            "P",
            "K",
            "pH",
            "Temperature",
            "Humidity",
            "Rainfall",
            "Soil_Type",
        ]
        missing_fields = [f for f in required_fields if f not in data]
        if missing_fields:
            return Response(
                {
                    "error": f"Missing required fields: {', '.join(missing_fields)}",
                    "recommendation": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not harvest_id:
            return Response(
                {"error": "Missing harvest_id in request body"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # normalize crop
        data["Current_Crop"] = _normalize_crop_name(data.get("Current_Crop"))

        # coerce numerics
        numeric_keys = [
            "N",
            "P",
            "K",
            "pH",
            "Temperature",
            "Humidity",
            "Rainfall",
            "Fertilizer",
            "Pesticide",
        ]
        for key in numeric_keys:
            if key in data:
                data[key] = _coerce_float(data[key], data[key])

        # run model
        result = recommend.generate_recommendations(data)

        # store to DB
        rec = Recommendation.objects.create(
            user=request.user,
            harvest_id=harvest_id,
            input_data=data,
            output_data=result,
            status="to_do",
        )

        return Response(
            {
                "recommendation": result,
                "status": "success",
                "id": rec.id,
            },
            status=status.HTTP_200_OK,
        )

    except Exception as e:
        print(f"[generate_and_store_recommendation] error: {e}")
        return Response(
            {
                "recommendation": None,
                "status": "error",
                "error": str(e),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_recommendations(request):
    """
    GET /ml/recommendations/history/

    Return last 5 saved recommendations for this user.
    """
    recs = (
        Recommendation.objects.filter(user=request.user)
        .order_by("-created_at")[:5]
    )

    return Response(
        {
            "recommendations": [r.to_dict() for r in recs],
            "status": "success",
        },
        status=status.HTTP_200_OK,
    )


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def update_recommendation_status(request, recommendation_id):
    """
    PATCH /ml/recommendations/<id>/update-status/

    Update status on a stored Recommendation row.
    e.g. "accepted", "implemented"
    """
    try:
        recommendation = Recommendation.objects.get(
            id=recommendation_id, user=request.user
        )
    except Recommendation.DoesNotExist:
        return Response(
            {"error": "Recommendation not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    new_status = request.data.get("status")
    if not new_status:
        return Response(
            {"error": "Missing status field."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    recommendation.status = new_status
    recommendation.save()

    serializer = RecommendationSerializer(recommendation)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_available_crops(request):
    """
    GET /ml/available-crops/

    Returns which crop names are valid for the model.
    """
    try:
        available_crops = [
            "wheat",
            "tomato",
            "sugarcane",
            "maize",
            "potato",
            "rice",
        ]
        return Response(
            {
                "available_crops": available_crops,
                "status": "success",
            },
            status=status.HTTP_200_OK,
        )

    except Exception as e:
        return Response(
            {"error": str(e)}, status=status.HTTP_400_BAD_REQUEST
        )
