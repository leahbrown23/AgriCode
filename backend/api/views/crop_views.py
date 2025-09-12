from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

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
                    "status": c.status,
                })
            return Response(rows)

        data = request.data or {}
        plot_id_raw   = data.get('plot_id') or data.get('plotId') or data.get('plot')
        plot_code     = data.get('plot_code') or data.get('plotCode') or data.get('plot_number') or data.get('plotNumber')
        plot_key      = data.get('plot_key') or data.get('plotKey') or data.get('unique_plot_key') or data.get('uniquePlotKey')

        crop_type     = data.get('crop_type') or data.get('cropType')
        crop_variety  = data.get('crop_variety') or data.get('cropVariety')
        status_val    = data.get('status', 'planting')

        if not crop_type or not crop_variety or not (plot_id_raw or plot_code or plot_key):
            return Response(
                {'error': 'plot_id/plot_code/plot_key, crop_type and crop_variety are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        plot = None
        if plot_id_raw is not None:
            try:
                plot_pk = int(plot_id_raw)
                plot = Plot.objects.get(id=plot_pk, user=request.user)
            except (ValueError, Plot.DoesNotExist):
                plot = None

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

        farm = Farm.objects.filter(user=request.user).first()
        if not farm:
            return Response({'error': 'Create a farm first'}, status=status.HTTP_400_BAD_REQUEST)

        crop = Crop.objects.create(
            user=request.user,
            farm=farm,
            plot=plot,
            plot_number=plot.plot_id,
            crop_type=crop_type,
            crop_variety=crop_variety,
            status=status_val
        )

        return Response({
            'id': crop.id,
            'plot_id': plot.id,
            'plot_code': plot.plot_id,
            'crop_type': crop.crop_type,
            'crop_variety': crop.crop_variety,
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
            'status': crop.status,
        })
    
    elif request.method in ['PUT', 'PATCH']:
        data = request.data or {}
        plot_id_raw = data.get('plot_id') or data.get('plotId') or data.get('plot')
        plot_code = data.get('plot_code') or data.get('plotCode') or data.get('plot_number') or data.get('plotNumber')
        crop_type = data.get('crop_type') or data.get('cropType')
        crop_variety = data.get('crop_variety') or data.get('cropVariety')
        
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
            
        try:
            crop.save()
            return Response({
                'id': crop.id,
                'plot_id': crop.plot.id if crop.plot else None,
                'plot_code': crop.plot.plot_id if crop.plot else None,
                'plot_number': crop.plot_number,
                'crop_type': crop.crop_type,
                'crop_variety': crop.crop_variety,
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
        'status': crop.status,
    })
