from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Count, Min, Max

from ..models import SoilSensorReading, SensorDevice, Plot


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def validate_sensor(request):
    """Validate that a sensor ID exists and has data."""
    try:
        sensor_id = request.data.get('sensor_id')
        if not sensor_id:
            return Response({'detail': 'sensor_id is required'}, status=400)

        qs = SoilSensorReading.objects.filter(sensor_id=sensor_id)
        agg = qs.aggregate(total=Count('id'), earliest=Min('timestamp'), latest=Max('timestamp'))

        if not agg['total']:
            return Response({'detail': f'No data found for sensor {sensor_id}'}, status=404)

        sample = qs.order_by('-timestamp').values(
            'pH_level', 'N', 'P', 'K', 'moisture_level', 'timestamp'
        ).first()

        existing_device = SensorDevice.objects.filter(
            linked_sensor_id=sensor_id,
            user=request.user
        ).select_related('plot').first()

        return Response({
            'sensor_id': sensor_id,
            'total_readings': agg['total'],
            'date_range': {
                'earliest': agg['earliest'].isoformat() if agg['earliest'] else None,
                'latest': agg['latest'].isoformat() if agg['latest'] else None,
            },
            'sample_data': {
                'ph': sample['pH_level'] if sample else None,
                'n': sample['N'] if sample else None,
                'p': sample['P'] if sample else None,
                'k': sample['K'] if sample else None,
                'moisture': sample['moisture_level'] if sample else None,
            } if sample else None,
            'already_connected': existing_device is not None,
            'connected_plot': existing_device.plot.plot_id if (existing_device and existing_device.plot) else None,
        })
    except Exception as e:
        return Response({'detail': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def connect_sensor(request):
    """Connect a sensor to a plot."""
    try:
        sensor_id = request.data.get('sensor_id')
        plot_id = request.data.get('plot_id')
        device_name = request.data.get('device_name')

        if not all([sensor_id, plot_id, device_name]):
            return Response({'detail': 'sensor_id, plot_id, and device_name are required'}, status=400)

        try:
            sensor_id_int = int(sensor_id)
        except ValueError:
            return Response({'detail': 'sensor_id must be an integer'}, status=400)

        try:
            plot = Plot.objects.get(id=plot_id, user=request.user)
        except Plot.DoesNotExist:
            return Response({'detail': 'Plot not found'}, status=404)

        if SensorDevice.objects.filter(linked_sensor_id=sensor_id_int, user=request.user).exists():
            return Response({'detail': 'Sensor already connected to your account'}, status=400)

        external_id = f"SENSOR_{sensor_id_int}_{request.user.id}"
        device = SensorDevice.objects.create(
            user=request.user,
            name=device_name,
            external_id=external_id,
            linked_sensor_id=sensor_id_int,
            plot=plot,
            is_active=False,
            data_source='existing_data'
        )

        return Response({
            'id': device.id,
            'name': device.name,
            'linked_sensor_id': device.linked_sensor_id,
            'plot_id': plot.id,
            'plot_name': plot.plot_id,
            'is_active': device.is_active
        })
    except Exception as e:
        return Response({'detail': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def activate_sensor(request, device_id):
    """Activate/deactivate a sensor device."""
    try:
        device = SensorDevice.objects.get(id=device_id, user=request.user)
        active = request.data.get('active', True)
        device.is_active = bool(active)
        device.save()
        return Response({
            'id': device.id,
            'is_active': device.is_active,
            'message': f'Device {"activated" if device.is_active else "deactivated"}'
        })
    except SensorDevice.DoesNotExist:
        return Response({'detail': 'Device not found'}, status=404)
    except Exception as e:
        return Response({'detail': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_device(request, device_id):
    """Toggle a sensor device on/off."""
    try:
        device = SensorDevice.objects.get(id=device_id, user=request.user)
        active = request.data.get('active', not device.is_active)
        device.is_active = bool(active)
        device.save()
        return Response({
            'id': device.id,
            'is_active': device.is_active,
            'message': f'Device {"activated" if device.is_active else "deactivated"}'
        })
    except SensorDevice.DoesNotExist:
        return Response({'error': 'Device not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_device(request, device_id):
    """Delete a sensor device."""
    try:
        device = SensorDevice.objects.get(id=device_id, user=request.user)
        device_name = device.name
        device.delete()
        return Response({'message': f'Device "{device_name}" deleted successfully'}, status=status.HTTP_200_OK)

    except SensorDevice.DoesNotExist:
        return Response({'error': 'Device not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
