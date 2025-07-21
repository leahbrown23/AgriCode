from django.shortcuts import render
import pandas as pd
import traceback

# Create your views here.
from rest_framework.decorators import api_view, permission_classes
from rest_framework import generics, permissions
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import CustomUser
from .serializers import RegisterSerializer
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from .models import Farm, Crop, SoilSensorReading, Plot
from .serializers import FarmSerializer, CropSerializer, PlotSerializer
from rest_framework.permissions import AllowAny
from django.core.files.storage import default_storage
from io import BytesIO


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
    
class PlotViewSet(viewsets.ModelViewSet):
    serializer_class = PlotSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Plot.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'])
    def plot_ids(self, request):
        """
        Custom action to get only the plot_id values for the current user
        """
        plots = self.get_queryset().values_list('plot_id', flat=True)
        return Response({"plot_ids": list(plots)})
    


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
            return Response({'detail': 'Farm not found'}, status=404)

        serializer = CropSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user, farm=farm)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=400)
    

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def upload_soil_data(request):
    file = request.FILES.get('file')
    if not file:
        return Response({'error': 'No file provided'}, status=400)

    try:
        df = pd.read_excel(file)

        # rename colum to fit model (plot_id to plot_numner)
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

    try:
        # Filter by user and plot_number, order by timestamp descending
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
            'moisture_level': latest_reading.moisture_level,
            'N': latest_reading.N,
            'P': latest_reading.P,
            'K': latest_reading.K,
            'timestamp': latest_reading.timestamp,
        })

    except Exception as e:
        return Response({'error': str(e)}, status=500)
    
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_plot_numbers(request):
    user = request.user
    plot_numbers = SoilSensorReading.objects.filter(user=user).values_list('plot_number', flat=True).distinct()
    return Response({'plots': list(plot_numbers)})