from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..models import SensorDevice, Plot, SensorData


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def sim_status(request):
    """Get status of all sensor devices for current user."""
    try:
        devices = SensorDevice.objects.filter(user=request.user).order_by('id').select_related('plot')
        device_data = [{
            'id': d.id,
            'name': d.name or f'Sensor {d.linked_sensor_id}',
            'external_id': d.external_id,
            'sensor_id': d.linked_sensor_id,
            'plot': d.plot.plot_id if d.plot else None,
            'plot_name': f'Plot {d.plot.plot_id}' if d.plot else 'No Plot',
            'is_active': d.is_active,
            'data_source': getattr(d, 'data_source', 'unknown'),
            'last_seen': d.last_seen.isoformat() if d.last_seen else None,
            'sim_seq': getattr(d, 'sim_seq', 0),
        } for d in devices]
        return Response(device_data)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_sensor_data(request, plot_id):
    """Get last 100 readings for a plot from SensorData."""
    try:
        plot = Plot.objects.get(id=plot_id, user=request.user)
        recent = SensorData.objects.filter(plot=plot).select_related('device').order_by('-ts')[:100]
        data = [{
            'timestamp': r.ts.isoformat(),
            'ph': r.ph,
            'moisture': r.moisture,
            'n': r.n,
            'p': r.p,
            'k': r.k,
            'device_name': r.device.name if r.device else 'Unknown',
            'source': r.source,
        } for r in recent]
        return Response({'plot_id': plot.plot_id, 'data': data})
    except Plot.DoesNotExist:
        return Response({'error': 'Plot not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)
