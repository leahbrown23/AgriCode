# --- views.py ---

from django.shortcuts import render, get_object_or_404
import pandas as pd
import traceback
from forum.models import Thread
from forum.serializers import ThreadSerializer
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework import generics, permissions, status, viewsets
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import CustomUser, CustomerFavoriteThread, Farm, Crop, SoilSensorReading, Plot, Harvest
from .serializers import (
    RegisterSerializer,
    CustomerFavoriteThreadSerializer,
    FarmSerializer,
    CropSerializer,
    PlotSerializer,
    HarvestSerializer
)
from django.core.files.storage import default_storage
from io import BytesIO

# --- Registration and Profile ---
class RegisterView(generics.CreateAPIView):
    queryset = CustomUser.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

class ProfileView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        return Response({
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
        })

# --- Plot ViewSet ---
class PlotViewSet(viewsets.ModelViewSet):
    serializer_class = PlotSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Plot.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=['get'])
    def plot_ids(self, request):
        plots = self.get_queryset().values_list('plot_id', flat=True)
        return Response({"plot_ids": list(plots)})

# --- Crop ViewSet ---
class CropViewSet(viewsets.ModelViewSet):
    serializer_class = CropSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Crop.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        try:
            farm = Farm.objects.get(user=self.request.user)
        except Farm.DoesNotExist:
            farm = Farm.objects.create(user=self.request.user, name="Default Farm")
        serializer.save(user=self.request.user, farm=farm)

# --- Farm View ---
@api_view(['GET', 'POST', 'PUT'])
@permission_classes([IsAuthenticated])
def farm_view(request):
    try:
        farm = Farm.objects.get(user=request.user)
    except Farm.DoesNotExist:
        farm = None
    
    if request.method == 'GET':
        if farm:
            serializer = FarmSerializer(farm)
            return Response(serializer.data)
        return Response({'detail': 'No farm found'}, status=404)
    
    elif request.method in ['POST', 'PUT']:
        serializer = FarmSerializer(farm, data=request.data, partial=True) if farm else FarmSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=status.HTTP_200_OK if farm else status.HTTP_201_CREATED)
        return Response(serializer.errors, status=400)

# --- Crop Views ---
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def crop_view(request):
    if request.method == 'GET':
        crops = Crop.objects.filter(user=request.user)
        serializer = CropSerializer(crops, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        try:
            farm = Farm.objects.get(user=request.user)
        except Farm.DoesNotExist:
            farm = Farm.objects.create(user=request.user, name="Default Farm")
        
        serializer = CropSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user, farm=farm)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=400)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def crop_detail_view(request, crop_id):
    crop = get_object_or_404(Crop, id=crop_id, user=request.user)
    
    if request.method == 'GET':
        serializer = CropSerializer(crop)
        return Response(serializer.data)
    
    elif request.method == 'PUT':
        serializer = CropSerializer(crop, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        crop.delete()
        return Response({'message': 'Crop deleted successfully'}, status=status.HTTP_204_NO_CONTENT)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_crop_by_plot_key(request, plot_key):
    crop = get_object_or_404(Crop, user=request.user, plot__unique_plot_key=plot_key)
    serializer = CropSerializer(crop)
    return Response(serializer.data)

# --- Soil Sensor Data ---
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def upload_soil_data(request):
    file = request.FILES.get('file')
    if not file:
        return Response({'error': 'No file provided'}, status=400)
    
    try:
        df = pd.read_excel(file)
        if 'plot_id' in df.columns:
            df.rename(columns={'plot_id': 'plot_number'}, inplace=True)
        
        for _, row in df.iterrows():
            SoilSensorReading.objects.create(
                user=request.user,
                sensor_id=row['sensor_id'],
                plot_number=row['plot_number'],
                pH_level=row['pH_level'],
                N=row['N'],
                P=row['P'],
                K=row['K'],
                moisture_level=row['moisture_level'],
                timestamp=row['timestamp'],
            )
        return Response({'message': 'Soil data uploaded successfully'})
    except Exception as e:
        traceback.print_exc()
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def latest_soil_data(request):
    readings = SoilSensorReading.objects.filter(user=request.user).order_by('-timestamp')[:10]
    data = [
        {
            "sensor_id": r.sensor_id,
            "plot_number": r.plot_number,
            "pH_level": r.pH_level,
            "N": r.N,
            "P": r.P,
            "K": r.K,
            "moisture_level": r.moisture_level,
            "timestamp": r.timestamp,
        }
        for r in readings
    ]
    return Response(data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def latest_soil_reading_by_plot(request):
    plot_number = request.query_params.get('plot_number')
    if not plot_number:
        return Response({'error': 'plot_number query parameter is required'}, status=400)
    
    latest_reading = (
        SoilSensorReading.objects
        .filter(user=request.user, plot_number=plot_number)
        .order_by('-timestamp')
        .first()
    )
    
    if not latest_reading:
        return Response({'error': 'No readings found for this plot'}, status=404)
    
    return Response({
        'plot_number': latest_reading.plot_number,
        'pH_level': latest_reading.pH_level,
        'moisture_level': latest_reading.moisture_level,
        'N': latest_reading.N,
        'P': latest_reading.P,
        'K': latest_reading.K,
        'timestamp': latest_reading.timestamp,
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_plot_numbers(request):
    plot_numbers = SoilSensorReading.objects.filter(user=request.user).values_list('plot_number', flat=True).distinct()
    return Response({'plots': list(plot_numbers)})

# --- Favorite Threads ---
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_favorite_threads(request):
    favorites = CustomerFavoriteThread.objects.filter(customer=request.user)
    serializer = CustomerFavoriteThreadSerializer(favorites, many=True)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_favorite_thread(request):
    thread_id = request.data.get('thread_id')
    if not thread_id:
        return Response({"error": "thread_id is required"}, status=400)

    try:
        thread = Thread.objects.get(id=thread_id)
        favorite, created = CustomerFavoriteThread.objects.get_or_create(
            customer=request.user,
            thread=thread
        )
        return Response({
            "message": "Thread added to favorites." if created else "Thread is already in favorites.",
            "id": favorite.id,
            "thread_id": thread.id,
        }, status=201 if created else 200)
    except Thread.DoesNotExist:
        return Response({"error": "Thread not found."}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def remove_favorite_thread(request, favorite_id):
    try:
        favorite = CustomerFavoriteThread.objects.get(id=favorite_id, customer=request.user)
        favorite.delete()
        return Response({"message": "Favorite removed successfully."}, status=204)
    except CustomerFavoriteThread.DoesNotExist:
        return Response({"error": "Favorite not found."}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

# --- Crop Status & Harvest ---
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_crop_status(request, crop_id):
    crop = get_object_or_404(Crop, id=crop_id, user=request.user)
    status = request.data.get("status")
    if status not in dict(Crop.STATUS_CHOICES):
        return Response({"error": "Invalid status"}, status=400)
    crop.status = status
    crop.save()
    return Response({"message": "Status updated", "status": crop.status})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def harvest_crop(request, crop_id):
    crop = get_object_or_404(Crop, id=crop_id, user=request.user)
    plot = crop.plot
    yield_amount = request.data.get("yield_amount")
    comments = request.data.get("comments", "")
    end_date = request.data.get("end_date")
    start_date = request.data.get("start_date")

    if not yield_amount or not end_date or not start_date:
        return Response({"error": "Missing fields"}, status=400)

    harvest = Harvest.objects.create(
        user=request.user,
        plot=plot,
        crop=crop,
        start_date=start_date,
        end_date=end_date,
        yield_amount=yield_amount,
        comments=comments,
    )
    crop.status = "closed"
    crop.save()
    data = HarvestSerializer(harvest).data
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_harvests(request):
    harvests = Harvest.objects.filter(user=request.user).order_by('-end_date')
    serializer = HarvestSerializer(harvests, many=True)
    return Response(serializer.data)
