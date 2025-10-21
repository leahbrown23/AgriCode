from django.shortcuts import render
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from . import inference
import json

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def recommend_crop(request):
    """
    Expects JSON input with keys:
    N, P, K, pH, Temperature, Humidity, Rainfall, Soil_Type, optional Current_Crop
    Returns:
        - Best crop recommendation with confidence score
        - Predicted yield for recommended crop
        - Predicted yield for current crop (if provided)
        - Yield comparison
    """
    try:
        data = request.data

        # Validate required fields
        required_fields = ['N', 'P', 'K', 'pH', 'Temperature', 'Humidity', 'Rainfall', 'Soil_Type']
        missing_fields = [field for field in required_fields if field not in data]
        if missing_fields:
            return Response({
                "error": f"Missing required fields: {', '.join(missing_fields)}",
                "recommendation": None
            }, status=400)

        # Call the unified inference function
        result = inference.recommend_and_compare(data)

        return Response({
            "recommendation": result["crop_recommendation"],
            "predicted_yield_recommended_crop": result["predicted_yield_recommended_crop"],
            "predicted_yield_current_crop": result["predicted_yield_current_crop"],
            "yield_comparison": result["comparison"],
            "status": "success",
            "input_data": data
        }, status=200)

    except Exception as e:
        print(f"ML recommendation error: {str(e)}")
        return Response({
            "recommendation": {
                "crop": "maize",
                "ml_confidence": 70,
                "compatibility_score": 65
            },
            "predicted_yield_recommended_crop": None,
            "predicted_yield_current_crop": None,
            "yield_comparison": None,
            "status": "fallback",
            "error": str(e)
        }, status=200)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_available_crops(request):
    """
    GET endpoint to retrieve available crop types for recommendations
    """
    try:
        available_crops = [
            "wheat", "tomato", "sugarcane", "maize", "potato", "rice"
        ]

        return Response({
            "available_crops": available_crops,
            "status": "success"
        }, status=200)

    except Exception as e:
        return Response({"error": str(e)}, status=400)
