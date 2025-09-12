from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.utils.dateparse import parse_datetime

from ..models import Harvest, Plot


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def farm_harvests(request):
    """
    GET  /api/farm/harvests/?plot_id=<id>  -> list harvest records
    POST /api/farm/harvests/               -> create a harvest record
    """
    try:
        if request.method == 'GET':
            plot_id = request.query_params.get('plot_id')
            qs = Harvest.objects.filter(user=request.user).select_related('plot').order_by('-end_date')
            if plot_id:
                qs = qs.filter(plot_id=plot_id)

            out = []
            for h in qs:
                out.append({
                    'id': h.id,
                    'plot_id': h.plot.id if h.plot else None,
                    'plot_code': h.plot.plot_id if h.plot else None,
                    'plot_number': h.plot.plot_id if h.plot else None,
                    'crop_type': h.crop_type,
                    'crop_variety': h.crop_variety,
                    'start_date': h.start_date.isoformat(),
                    'end_date': h.end_date.isoformat(),
                    'yield_amount': h.yield_amount,
                    'comments': h.comments,
                })
            return Response(out)

        payload = request.data or {}
        plot_id = payload.get('plot_id')
        crop_type = payload.get('crop_type', 'Unknown')
        crop_variety = payload.get('crop_variety', 'Unknown')
        start_date = payload.get('start_date')
        end_date = payload.get('end_date')
        yield_amount = payload.get('yield_amount')
        comments = payload.get('comments', '')

        if not plot_id or start_date is None or end_date is None or yield_amount is None:
            return Response(
                {'error': 'plot_id, start_date, end_date, and yield_amount are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            plot = Plot.objects.get(id=plot_id, user=request.user)
        except Plot.DoesNotExist:
            return Response({'error': 'Plot not found'}, status=status.HTTP_404_NOT_FOUND)

        sd = parse_datetime(start_date) if isinstance(start_date, str) else start_date
        ed = parse_datetime(end_date) if isinstance(end_date, str) else end_date
        if sd is None or ed is None:
            return Response({'error': 'start_date and end_date must be ISO 8601 datetimes'},
                            status=status.HTTP_400_BAD_REQUEST)

        harvest = Harvest.objects.create(
            user=request.user,
            plot=plot,
            crop_type=crop_type,
            crop_variety=crop_variety,
            start_date=sd,
            end_date=ed,
            yield_amount=float(yield_amount),
            comments=comments or ''
        )

        return Response({
            'id': harvest.id,
            'plot_id': plot.id,
            'plot_code': plot.plot_id,
            'plot_number': plot.plot_id,
            'crop_type': harvest.crop_type,
            'crop_variety': harvest.crop_variety,
            'start_date': harvest.start_date.isoformat(),
            'end_date': harvest.end_date.isoformat(),
            'yield_amount': harvest.yield_amount,
            'comments': harvest.comments,
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
