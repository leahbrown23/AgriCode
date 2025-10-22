from django.shortcuts import render
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from . import inference
from . import recommend
from .models import Recommendation
from .serializers import RecommendationSerializer
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

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_recommendation(request):
    """
    Generates recommendations for the given input data and saves them for the user.
    """
    try:
        data = request.data
        harvest_id = data.get("harvest_id")

        # Validate required fields
        required_fields = ['N', 'P', 'K', 'pH', 'Temperature', 'Humidity', 'Rainfall', 'Soil_Type']
        missing_fields = [field for field in required_fields if field not in data]
        if missing_fields:
            return Response({
                "error": f"Missing required fields: {', '.join(missing_fields)}",
                "recommendation": None
            }, status=400)
        
        if not harvest_id:
            return Response({
                "error": "Missing harvest_id in request body"
            }, status=400)


        # Call recommendation logic
        result = recommend.generate_recommendations(data)

        # Save recommendation for user
        rec = Recommendation.objects.create(
            user=request.user,
            harvest_id=harvest_id,
            input_data=data,
            output_data=result,
            status="to_do"
        )

        return Response({
            "recommendation": result,
            "status": "success",
            "id": rec.id
        }, status=200)

    except Exception as e:
        return Response({
            "recommendation": None,
            "status": "error",
            "error": str(e)
        }, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_recommendations(request):
    """
    Retrieves the last 5 saved recommendations for the authenticated user.
    """
    recs = Recommendation.objects.filter(user=request.user).order_by('-created_at')[:5]
    return Response({
        "recommendations": [r.to_dict() for r in recs],
        "status": "success"
    })

@api_view(['PATCH'])
def update_recommendation_status(request, recommendation_id):
    """
    Update the status of a recommendation (e.g., accepted, rejected, implemented)
    """
    try:
        recommendation = Recommendation.objects.get(id=recommendation_id)
    except Recommendation.DoesNotExist:
        return Response({"error": "Recommendation not found."}, status=status.HTTP_404_NOT_FOUND)

    new_status = request.data.get("status")
    if not new_status:
        return Response({"error": "Missing status field."}, status=status.HTTP_400_BAD_REQUEST)

    recommendation.status = new_status
    recommendation.save()

    serializer = RecommendationSerializer(recommendation)
    return Response(serializer.data, status=status.HTTP_200_OK)

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
