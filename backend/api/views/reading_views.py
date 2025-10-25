from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..models import SoilSensorReading, SensorDevice


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def latest_reading(request):
    """
    Return the most recent SoilSensorReading for the given plot_number,
    for the current user's connected sensor.
    Query param: ?plot_number=6801
    """
    plot_number = request.query_params.get('plot_number')
    if not plot_number:
        return Response({'detail': 'plot_number is required'}, status=400)

    # find the user's device assigned to that plot
    device = SensorDevice.objects.filter(
        user=request.user,
        plot__plot_id=str(plot_number)
    ).first()

    if not device:
        return Response(
            {'detail': 'No sensor is connected to this plot. Connect a sensor first.'},
            status=404
        )

    # get most recent row for that plot+sensor
    row = (
        SoilSensorReading.objects
        .filter(plot_number=str(plot_number), sensor_id=device.linked_sensor_id)
        .order_by('-timestamp')
        .values('timestamp', 'pH_level', 'N', 'P', 'K', 'moisture_level')
        .first()
    )

    if not row:
        return Response(
            {'detail': 'No readings found for this plot/sensor pair.'},
            status=404
        )

    return Response({
        'plot_number': str(plot_number),
        'sensor_id': device.linked_sensor_id,
        'timestamp': row['timestamp'],
        'pH_level': row['pH_level'],
        'N': row['N'],
        'P': row['P'],
        'K': row['K'],
        'moisture_level': row['moisture_level'],
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def reading_history(request):
    """
    Return historical readings (chronological order) for charts.
    Query param: ?plot_number=6801&limit=200
    """
    plot_number = request.query_params.get('plot_number')
    if not plot_number:
        return Response({'detail': 'plot_number is required'}, status=400)

    limit = int(request.query_params.get('limit', 200))

    device = SensorDevice.objects.filter(
        user=request.user,
        plot__plot_id=str(plot_number)
    ).first()

    if not device:
        return Response(
            {'detail': 'No sensor is connected to this plot. Connect a sensor first.'},
            status=404
        )

    qs = (
        SoilSensorReading.objects
        .filter(plot_number=str(plot_number), sensor_id=device.linked_sensor_id)
        .order_by('timestamp')  # ascending for graph
        .values('timestamp', 'pH_level', 'N', 'P', 'K', 'moisture_level')[:limit]
    )

    return Response(list(qs))
