from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from ..serializers import CropSerializer
from dateutil.parser import parse as parse_datetime
from datetime import datetime

from ..models import Crop, Plot, Farm


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def farm_crops(request):
    try:
        if request.method == 'GET':
            qs = Crop.objects.filter(user=request.user).select_related('plot', 'farm').order_by('id')
            rows = []
            for c in qs:
                rows.append({
                    "id": c.id,
                    "plot_id": c.plot.id if c.plot else None,
                    "plot_code": c.plot.plot_id if c.plot else None,
                    "plot_number": c.plot_number,
                    "crop_type": c.crop_type,
                    "crop_variety": c.crop_variety,
                    "soil_type": c.soil_type,
                    "status": c.status,
                })
            return Response(rows)

        # POST request: create a new crop
        data = request.data or {}

        # Extract plot info
        plot_id_raw = data.get('plot_id') or data.get('plotId') or data.get('plot')
        plot_code   = data.get('plot_code') or data.get('plotCode') or data.get('plot_number') or data.get('plotNumber')
        plot_key    = data.get('plot_key') or data.get('plotKey') or data.get('unique_plot_key') or data.get('uniquePlotKey')

        # Extract crop info
        crop_type    = data.get('crop_type') or data.get('cropType')
        crop_variety = data.get('crop_variety') or data.get('cropVariety')
        soil_type    = data.get('soil_type') or data.get('soilType')
        status_val   = data.get('status', 'planting')
        expected_end_date_raw = data.get('expected_end_date')

        pest_month = data.get('pest_month') or data.get('pestMonth') or 0.0
        fert_month = data.get('fert_month') or data.get('fertMonth') or 0.0

        # Validate required fields
        if not crop_type or not crop_variety or not soil_type or not (plot_id_raw or plot_code or plot_key):
            return Response(
                {'error': 'plot_id/plot_code/plot_key, crop_type, crop_variety and soil_type are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Resolve plot
        plot = None
        if plot_id_raw:
            try:
                plot = Plot.objects.get(id=int(plot_id_raw), user=request.user)
            except (ValueError, Plot.DoesNotExist):
                pass
        if plot is None and plot_code:
            try:
                plot = Plot.objects.get(plot_id=str(plot_code), user=request.user)
            except Plot.DoesNotExist:
                pass
        if plot is None and plot_key:
            try:
                plot = Plot.objects.get(unique_plot_key=str(plot_key), user=request.user)
            except Plot.DoesNotExist:
                pass
        if plot is None:
            return Response({'error': 'Plot not found'}, status=status.HTTP_404_NOT_FOUND)

        # Parse expected_end_date
        expected_end_date = None
        if expected_end_date_raw:
            try:
                expected_end_date = parse_datetime(expected_end_date_raw)
            except Exception:
                return Response({'error': 'Invalid expected_end_date format'}, status=status.HTTP_400_BAD_REQUEST)

        # Find user's farm
        farm = Farm.objects.filter(user=request.user).first()
        if not farm:
            return Response({'error': 'Create a farm first'}, status=status.HTTP_400_BAD_REQUEST)

        # Prepare crop data for serializer
        crop_data = {
            'farm': farm.id,
            'plot': plot.unique_plot_key,  # Use unique_plot_key for ForeignKey
            'plot_number': plot.plot_id,
            'crop_type': crop_type,
            'crop_variety': crop_variety,
            'soil_type': soil_type,
            'status': status_val,
            'expected_end_date': expected_end_date,
            'pest_month': pest_month,
            'fert_month': fert_month,
        }

        # Serialize and save
        serializer = CropSerializer(data=crop_data)
        serializer.is_valid(raise_exception=True)
        crop = serializer.save(user=request.user, expected_end_date=expected_end_date)

        # Return response
        return Response({
            'id': crop.id,
            'plot_id': plot.id,
            'plot_code': plot.plot_id,
            'crop_type': crop.crop_type,
            'crop_variety': crop.crop_variety,
            'soil_type': crop.soil_type,
            'status': crop.status,
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def crop_detail(request, crop_id):
    try:
        crop = Crop.objects.get(id=crop_id, user=request.user)
    except Crop.DoesNotExist:
        return Response({'error': 'Crop not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        return Response({
            'id': crop.id,
            'plot_id': crop.plot.id if crop.plot else None,
            'plot_code': crop.plot.plot_id if crop.plot else None,
            'plot_number': crop.plot_number,
            'crop_type': crop.crop_type,
            'crop_variety': crop.crop_variety,
            'soil_type': crop.soil_type,
            'status': crop.status,
        })
    
    elif request.method in ['PUT', 'PATCH']:
        data = request.data or {}
        plot_id_raw = data.get('plot_id') or data.get('plotId') or data.get('plot')
        plot_code = data.get('plot_code') or data.get('plotCode') or data.get('plot_number') or data.get('plotNumber')
        crop_type = data.get('crop_type') or data.get('cropType')
        crop_variety = data.get('crop_variety') or data.get('cropVariety')
        soil_type = data.get('soil_type') or data.get('soilType')
        
        if plot_id_raw or plot_code:
            plot = None
            if plot_id_raw:
                try:
                    plot_pk = int(plot_id_raw)
                    plot = Plot.objects.get(id=plot_pk, user=request.user)
                except (ValueError, Plot.DoesNotExist):
                    pass
            
            if plot is None and plot_code:
                try:
                    plot = Plot.objects.get(plot_id=str(plot_code), user=request.user)
                except Plot.DoesNotExist:
                    pass
            
            if plot is None:
                return Response({'error': 'Plot not found'}, status=status.HTTP_400_BAD_REQUEST)
            
            crop.plot = plot
            crop.plot_number = plot.plot_id
        
        if crop_type:
            crop.crop_type = crop_type
        if crop_variety:
            crop.crop_variety = crop_variety
        if soil_type:
            crop.soil_type = soil_type
            
        try:
            crop.save()
            return Response({
                'id': crop.id,
                'plot_id': crop.plot.id if crop.plot else None,
                'plot_code': crop.plot.plot_id if crop.plot else None,
                'plot_number': crop.plot_number,
                'crop_type': crop.crop_type,
                'crop_variety': crop.crop_variety,
                'soil_type': crop.soil_type,
                'status': crop.status,
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        crop.delete()
        return Response({'message': 'Crop deleted successfully'}, status=status.HTTP_204_NO_CONTENT)


@api_view(['PATCH', 'POST'])
@permission_classes([IsAuthenticated])
def update_crop_status(request, crop_id: int):
    try:
        crop = Crop.objects.get(id=crop_id, user=request.user)
    except Crop.DoesNotExist:
        return Response({'error': 'Crop not found'}, status=status.HTTP_404_NOT_FOUND)

    new_status = (
        request.data.get('status')
        or request.query_params.get('status')
    )
    if not new_status:
        return Response({'error': 'status is required'}, status=status.HTTP_400_BAD_REQUEST)

    allowed = {code for code, _ in Crop.STATUS_CHOICES}
    if new_status not in allowed:
        return Response(
            {'error': f'Invalid status. Allowed: {sorted(list(allowed))}'},
            status=status.HTTP_400_BAD_REQUEST
        )

    crop.status = new_status
    crop.save(update_fields=['status'])

    return Response({
        'id': crop.id,
        'plot_id': crop.plot.id if crop.plot else None,
        'plot_code': crop.plot.plot_id if crop.plot else crop.plot_number,
        'crop_type': crop.crop_type,
        'crop_variety': crop.crop_variety,
        'soil_type': crop.soil_type,
        'status': crop.status,
    })
