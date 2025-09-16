from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from backend.ml import inference  # adjust import based on your project structure

@api_view(['POST'])
def recommend_crop(request):
    """
    Expects JSON input with keys:
    N, P, K, pH, Temperature, Humidity, Rainfall, Soil_Type
    """
    try:
        data = request.data
        crop = inference.predict_crop(data)
        return Response({"recommended_crop": crop}, status=200)
    except Exception as e:
        return Response({"error": str(e)}, status=400)
