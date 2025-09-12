from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..models import Farm


@api_view(['GET', 'POST', 'PUT'])
@permission_classes([IsAuthenticated])
def farm_view(request):
    try:
        if request.method == 'GET':
            farm = Farm.objects.filter(user=request.user).first()
            if not farm:
                return Response({'detail': 'Farm not found'}, status=404)
            return Response({
                'id': farm.id,
                'farm_name': farm.farm_name,
                'location': farm.location,
                'crop_types': farm.crop_types,
                'size': float(farm.size) if farm.size else None,
                'has_livestock': farm.has_livestock
            })

        payload = request.data or {}
        fields = {
            'farm_name': payload.get('farm_name'),
            'location': payload.get('location'),
            'crop_types': payload.get('crop_types'),
            'size': payload.get('size'),
            'has_livestock': payload.get('has_livestock', False),
        }

        if request.method == 'POST':
            if Farm.objects.filter(user=request.user).exists():
                return Response({'detail': 'Farm already exists for this user'}, status=400)
            if not fields['farm_name'] or not fields['location'] or not fields['crop_types']:
                return Response({'detail': 'farm_name, location, crop_types are required'}, status=400)
            farm = Farm.objects.create(user=request.user, **fields)
            return Response({
                'id': farm.id,
                'farm_name': farm.farm_name,
                'location': farm.location,
                'crop_types': farm.crop_types,
                'size': float(farm.size) if farm.size else None,
                'has_livestock': farm.has_livestock
            }, status=201)

        farm = Farm.objects.filter(user=request.user).first()
        if not farm:
            return Response({'detail': 'Farm not found'}, status=404)
        for k, v in fields.items():
            if v is not None:
                setattr(farm, k, v)
        farm.save()
        return Response({
            'id': farm.id,
            'farm_name': farm.farm_name,
            'location': farm.location,
            'crop_types': farm.crop_types,
            'size': float(farm.size) if farm.size else None,
            'has_livestock': farm.has_livestock
        })
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_farms(request):
    try:
        farms = Farm.objects.filter(user=request.user)
        data = [{
            'id': f.id,
            'farm_name': f.farm_name,
            'location': f.location,
            'crop_types': f.crop_types,
            'size': float(f.size) if f.size else None,
            'has_livestock': f.has_livestock
        } for f in farms]
        return Response(data)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_farm(request):
    try:
        farm_name = request.data.get('farm_name')
        location = request.data.get('location')
        crop_types = request.data.get('crop_types')
        size = request.data.get('size')
        has_livestock = request.data.get('has_livestock', False)

        if not farm_name or not location or not crop_types:
            return Response({'error': 'farm_name, location, and crop_types are required'}, status=400)

        farm = Farm.objects.create(
            user=request.user,
            farm_name=farm_name,
            location=location,
            crop_types=crop_types,
            size=size,
            has_livestock=has_livestock
        )
        return Response({
            'message': 'Farm created successfully',
            'farm': {
                'id': farm.id,
                'farm_name': farm.farm_name,
                'location': farm.location,
                'crop_types': farm.crop_types,
                'size': float(farm.size) if farm.size else None,
                'has_livestock': farm.has_livestock
            }
        }, status=201)
    except Exception as e:
        return Response({'error': str(e)}, status=500)
