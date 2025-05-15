from django.shortcuts import render

# Create your views here.
from rest_framework.decorators import api_view, permission_classes
from rest_framework import generics, permissions
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import CustomUser
from .serializers import RegisterSerializer
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from .models import Farm
from .serializers import FarmSerializer
from rest_framework.permissions import AllowAny

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
            "farm_name": user.farm_name,
        })
    
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
