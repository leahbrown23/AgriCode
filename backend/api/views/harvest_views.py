from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.utils.dateparse import parse_datetime
from ..serializers import HarvestSerializer

from ..models import Harvest, Plot

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_harvest(request, crop_id):
    try:
        harvest = Harvest.objects.get(crop_id=crop_id)
    except Harvest.DoesNotExist:
        return Response({"error": "Harvest not found"}, status=404)

    data = request.data
    harvest.end_date = data.get("end_date", harvest.end_date)
    harvest.yield_amount = data.get("yield_amount", harvest.yield_amount)
    harvest.comments = data.get("comments", harvest.comments)
    harvest.save()

    serializer = HarvestSerializer(harvest)
    return Response(serializer.data)




@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def harvest_detail(request, harvest_id):
    """
    GET /api/farm/harvests/<id>/ -> get harvest
    PUT /api/farm/harvests/<id>/ -> update harvest (end_date, yield_amount, comments)
    """
    try:
        harvest = Harvest.objects.get(id=harvest_id, user=request.user)
    except Harvest.DoesNotExist:
        return Response({'error': 'Harvest not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response({
            'id': harvest.id,
            'plot_id': harvest.plot.id if harvest.plot else None,
            'plot_code': harvest.plot.plot_id if harvest.plot else None,
            'plot_number': harvest.plot.plot_id if harvest.plot else None,
            'crop_type': harvest.crop_type,
            'crop_variety': harvest.crop_variety,
            'start_date': harvest.start_date.isoformat(),
            'expected_end_date': harvest.expected_end_date.isoformat() if harvest.expected_end_date else None,
            'end_date': harvest.end_date.isoformat() if harvest.end_date else None,
            'yield_amount': harvest.yield_amount,
            'comments': harvest.comments,
        })

    # PUT: update harvest
    payload = request.data or {}
    end_date = payload.get('end_date')
    yield_amount = payload.get('yield_amount')
    comments = payload.get('comments')

    if end_date:
        ed = parse_datetime(end_date) if isinstance(end_date, str) else end_date
        if ed is None:
            return Response({'error': 'end_date must be ISO 8601 datetime'}, status=status.HTTP_400_BAD_REQUEST)
        harvest.end_date = ed

    if yield_amount is not None:
        harvest.yield_amount = float(yield_amount)

    if comments is not None:
        harvest.comments = comments

    harvest.save()

    return Response({
        'id': harvest.id,
        'plot_id': harvest.plot.id if harvest.plot else None,
        'plot_code': harvest.plot.plot_id if harvest.plot else None,
        'plot_number': harvest.plot.plot_id if harvest.plot else None,
        'crop_type': harvest.crop_type,
        'crop_variety': harvest.crop_variety,
        'start_date': harvest.start_date.isoformat(),
        'expected_end_date': harvest.expected_end_date.isoformat() if harvest.expected_end_date else None,
        'end_date': harvest.end_date.isoformat() if harvest.end_date else None,
        'yield_amount': harvest.yield_amount,
        'comments': harvest.comments,
    }, status=status.HTTP_200_OK)


@api_view(['GET', 'POST', 'PATCH'])
@permission_classes([IsAuthenticated])
def farm_harvests(request):
    """
    GET   /api/farm/harvests/?plot_id=<id>  -> list harvest records
    POST  /api/farm/harvests/               -> create a harvest record
    PATCH /api/farm/harvests/<id>/          -> update harvest (end_date, yield_amount, comments)
    """
    try:
        # ---------- GET ----------
        if request.method == 'GET':
            plot_id = request.query_params.get('plot_id')
            qs = Harvest.objects.filter(user=request.user).select_related('plot').order_by('-start_date')
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
                    'expected_end_date': h.expected_end_date.isoformat() if h.expected_end_date else None,
                    'end_date': h.end_date.isoformat() if h.end_date else None,
                    'yield_amount': h.yield_amount,
                    'comments': h.comments,
                })
            return Response(out)

        # ---------- POST ----------
        if request.method == 'POST':
            payload = request.data or {}
            plot_id = payload.get('plot_id')
            crop_type = payload.get('crop_type', 'Unknown')
            crop_variety = payload.get('crop_variety', 'Unknown')
            start_date = payload.get('start_date')
            expected_end_date = payload.get('expected_end_date')
            yield_amount = payload.get('yield_amount')
            comments = payload.get('comments', '')

            if not plot_id or start_date is None or yield_amount is None:
                return Response(
                    {'error': 'plot_id, start_date, and yield_amount are required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            try:
                plot = Plot.objects.get(id=plot_id, user=request.user)
            except Plot.DoesNotExist:
                return Response({'error': 'Plot not found'}, status=status.HTTP_404_NOT_FOUND)

            sd = parse_datetime(start_date) if isinstance(start_date, str) else start_date
            ed = parse_datetime(expected_end_date) if isinstance(expected_end_date, str) else expected_end_date
            if sd is None:
                return Response({'error': 'start_date must be ISO 8601 datetime'},
                                status=status.HTTP_400_BAD_REQUEST)

            harvest = Harvest.objects.create(
                user=request.user,
                plot=plot,
                crop_type=crop_type,
                crop_variety=crop_variety,
                start_date=sd,
                expected_end_date=ed,
                end_date=None,  # actual end date will be set later
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
                'expected_end_date': harvest.expected_end_date.isoformat() if harvest.expected_end_date else None,
                'end_date': harvest.end_date.isoformat() if harvest.end_date else None,
                'yield_amount': harvest.yield_amount,
                'comments': harvest.comments,
            }, status=status.HTTP_201_CREATED)

        # ---------- PATCH ----------
        if request.method == 'PATCH':
            harvest_id = request.query_params.get('id')
            if not harvest_id:
                return Response({'error': 'Harvest id is required'}, status=status.HTTP_400_BAD_REQUEST)

            try:
                harvest = Harvest.objects.get(id=harvest_id, user=request.user)
            except Harvest.DoesNotExist:
                return Response({'error': 'Harvest not found'}, status=status.HTTP_404_NOT_FOUND)

            payload = request.data or {}
            end_date = payload.get('end_date')
            yield_amount = payload.get('yield_amount')
            comments = payload.get('comments')

            if end_date:
                ed = parse_datetime(end_date) if isinstance(end_date, str) else end_date
                if ed is None:
                    return Response({'error': 'end_date must be ISO 8601 datetime'}, status=status.HTTP_400_BAD_REQUEST)
                harvest.end_date = ed

            if yield_amount is not None:
                harvest.yield_amount = float(yield_amount)

            if comments is not None:
                harvest.comments = comments

            harvest.save()

            return Response({
                'id': harvest.id,
                'plot_id': harvest.plot.id if harvest.plot else None,
                'plot_code': harvest.plot.plot_id if harvest.plot else None,
                'plot_number': harvest.plot.plot_id if harvest.plot else None,
                'crop_type': harvest.crop_type,
                'crop_variety': harvest.crop_variety,
                'start_date': harvest.start_date.isoformat(),
                'expected_end_date': harvest.expected_end_date.isoformat() if harvest.expected_end_date else None,
                'end_date': harvest.end_date.isoformat() if harvest.end_date else None,
                'yield_amount': harvest.yield_amount,
                'comments': harvest.comments,
            }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
