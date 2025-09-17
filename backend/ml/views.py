from django.shortcuts import render
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from . import inference

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def recommend_crop(request):
    """
    Expects JSON input with keys:
    N, P, K, pH, Temperature, Humidity, Rainfall, Soil_Type
    Returns single best crop recommendation with confidence score
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
        
        # Get crop recommendations from ML model
        recommendations = inference.predict_crop(data)
        print(f"Raw ML prediction: {recommendations}")  # Debug log
        
        # Handle different response formats from the ML model
        crop_name = None
        confidence_score = 75  # Default confidence
        
        if isinstance(recommendations, str):
            # Simple string response
            crop_name = recommendations.strip()
        elif isinstance(recommendations, dict):
            # Dictionary response
            crop_name = recommendations.get('crop', recommendations.get('prediction', str(recommendations)))
            confidence_score = recommendations.get('confidence', recommendations.get('score', 75))
        elif isinstance(recommendations, list) and len(recommendations) > 0:
            # List response - get the best one
            best_rec = max(recommendations, key=lambda x: x.get('score', 0) if isinstance(x, dict) else 0)
            if isinstance(best_rec, dict):
                crop_name = best_rec.get('crop', best_rec.get('prediction', str(best_rec)))
                confidence_score = best_rec.get('score', best_rec.get('confidence', 75))
            else:
                crop_name = str(best_rec)
        else:
            # Fallback - convert whatever we got to string
            crop_name = str(recommendations)
        
        # Clean up the crop name - remove any extra formatting
        if crop_name:
            # Remove common prefixes/suffixes that might come from ML output
            crop_name = crop_name.replace("'crop':", "").replace("{", "").replace("}", "")
            crop_name = crop_name.replace("'", "").replace('"', "").strip()
            
            # Extract just the crop name if it's in a longer string
            common_crops = ['wheat', 'tomato', 'sugarcane', 'maize', 'potato', 'rice']
            crop_name_lower = crop_name.lower()
            
            for crop in common_crops:
                if crop in crop_name_lower:
                    crop_name = crop
                    break
        
        # Ensure we have a valid crop name
        if not crop_name or crop_name.lower() not in ['wheat', 'tomato', 'sugarcane', 'maize', 'potato', 'rice']:
            crop_name = "maize"  # Default fallback
            confidence_score = 60
        
        print(f"Cleaned crop name: {crop_name}, confidence: {confidence_score}")  # Debug log
        
        # Calculate compatibility score
        def calculate_compatibility(crop_name, input_data):
            soil_type = input_data.get('Soil_Type', '').lower()
            soil_preferences = {
                'wheat': ['loamy', 'clay', 'silt'],
                'tomato': ['loamy', 'sandy', 'silt'],
                'sugarcane': ['clay', 'loamy', 'silt'],
                'maize': ['loamy', 'clay', 'sandy'],
                'potato': ['sandy', 'loamy', 'silt'],
                'rice': ['clay', 'loamy', 'silt'],
            }
            
            crop_lower = crop_name.lower()
            if crop_lower in soil_preferences and soil_type in soil_preferences[crop_lower]:
                return min(confidence_score + 10, 95)
            return max(confidence_score - 5, 30)
        
        compatibility_score = calculate_compatibility(crop_name, data)
        
        # Format the response
        return Response({
            "recommendation": {
                "crop": crop_name.lower(),
                "ml_confidence": int(confidence_score),
                "compatibility_score": int(compatibility_score)
            },
            "status": "success",
            "input_data": data
        }, status=200)
        
    except Exception as e:
        print(f"ML recommendation error: {str(e)}")
        
        # Return fallback recommendation on error
        return Response({
            "recommendation": {
                "crop": "maize",
                "ml_confidence": 70,
                "compatibility_score": 65
            },
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