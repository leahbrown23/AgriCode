from django.contrib.auth import authenticate
from django.contrib.auth.hashers import make_password
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from ..models import CustomUser


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    try:
        username = (request.data.get('username') or "").strip()
        email = (request.data.get('email') or "").strip()
        password = request.data.get('password')
        phone_number = (request.data.get('phone_number') or "").strip()
        first_name = (request.data.get('first_name') or "").strip()
        last_name = (request.data.get('last_name') or "").strip()

        if not username:
            username = email

        if not username or not email or not password:
            return Response({'error': 'Username, email, and password are required'}, status=400)

        if CustomUser.objects.filter(username=username).exists():
            return Response({'error': 'Username already exists'}, status=400)
        if CustomUser.objects.filter(email=email).exists():
            return Response({'error': 'Email already exists'}, status=400)

        user = CustomUser.objects.create(
            username=username,
            email=email,
            password=make_password(password),
            phone_number=phone_number,
            first_name=first_name,
            last_name=last_name
        )

        refresh = RefreshToken.for_user(user)
        return Response({
            'message': 'User created successfully',
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'phone_number': user.phone_number,
                'first_name': user.first_name,
                'last_name': user.last_name
            }
        }, status=201)

    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    try:
        username = request.data.get('username')
        password = request.data.get('password')

        if not username or not password:
            return Response({'error': 'Username and password are required'}, status=400)

        user = authenticate(username=username, password=password)
        if not user:
            return Response({'error': 'Invalid credentials'}, status=401)

        refresh = RefreshToken.for_user(user)
        return Response({
            'message': 'Login successful',
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'phone_number': getattr(user, 'phone_number', ''),
                'first_name': user.first_name,
                'last_name': user.last_name
            }
        })
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    try:
        refresh_token = request.data.get('refresh')
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
        return Response({'message': 'Logout successful'})
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_profile(request):
    try:
        user = request.user
        return Response({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'phone_number': getattr(user, 'phone_number', ''),
            'first_name': getattr(user, 'first_name', ''),
            'last_name': getattr(user, 'last_name', ''),
        })
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_favorites(request):
    try:
        return Response([])  # placeholder
    except Exception as e:
        return Response({'error': str(e)}, status=500)
