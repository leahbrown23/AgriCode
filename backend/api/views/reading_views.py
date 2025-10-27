from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from ..models import (
    SoilSensorReading,
    SensorDevice,
    Crop,
    Harvest,
    Chemical,
)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def latest_reading(request):
    """
    ENRICHED latest reading for a plot_number, for THIS USER.
    Query param: ?plot_number=6801

    We return ONE merged object that includes:
    - Soil chemistry (N, P, K, pH_level, moisture_level)
    - Environmental data (Temperature, Humidity, Rainfall)
    - Crop info (Current_Crop, Soil_Type)
    - Chemical usage (Fertilizer, Pesticide) via Harvest -> Chemical
    - timestamp, plot_number, sensor_id

    This gives the frontend EVERYTHING it needs to call the ML model
    directly (no guessing, no defaults).
    """

    plot_number = request.query_params.get('plot_number')
    if not plot_number:
        return Response(
            {'detail': 'plot_number is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # 1. Find this user's sensor device for that plot
    device = (
        SensorDevice.objects
        .filter(
            user=request.user,
            plot__plot_id=str(plot_number)
        )
        .first()
    )

    if not device:
        return Response(
            {
                'detail': 'No sensor is connected to this plot. Connect a sensor first.'
            },
            status=status.HTTP_404_NOT_FOUND
        )

    # 2. Get the most recent SoilSensorReading row for THIS plot + THIS user's device
    latest_reading_obj = (
        SoilSensorReading.objects
        .filter(
            plot_number=str(plot_number),
            sensor_id=device.linked_sensor_id
        )
        .order_by('-timestamp')
        .first()
    )

    if not latest_reading_obj:
        return Response(
            {
                'detail': 'No readings found for this plot/sensor pair.'
            },
            status=status.HTTP_404_NOT_FOUND
        )

    # 3. Get crop info for this plot_number
    #    Crop.plot_number is a CharField like "6801"
    crop_obj = (
        Crop.objects
        .filter(
            user=request.user,
            plot_number=str(plot_number)
        )
        .order_by('-id')
        .first()
    )

    current_crop_name = crop_obj.crop_type if crop_obj else None
    soil_type_value = crop_obj.soil_type if crop_obj else None

    # 4. Get latest Harvest for this plot, then pull Chemical usage
    #    Harvest.plot is FK to Plot, and Plot.plot_id matches this plot_number
    harvest_obj = (
        Harvest.objects
        .filter(
            user=request.user,
            plot__plot_id=str(plot_number)
        )
        .order_by('-start_date')
        .first()
    )

    fert_value = None
    pest_value = None

    if harvest_obj:
        chem_obj = (
            Chemical.objects
            .filter(harvest=harvest_obj)
            .first()
        )
        if chem_obj:
            # Choose what to feed the ML model:
            # We'll treat fert_total as "Fertilizer" and pest_total as "Pesticide".
            fert_value = float(chem_obj.fert_total) if chem_obj.fert_total is not None else None
            pest_value = float(chem_obj.pest_total) if chem_obj.pest_total is not None else None

    # 5. Build enriched response
    enriched_payload = {
        # IDs / meta
        'plot_number': str(plot_number),
        'sensor_id': device.linked_sensor_id,
        'timestamp': latest_reading_obj.timestamp,

        # Soil chemistry
        'pH_level': latest_reading_obj.pH_level,
        'N': latest_reading_obj.N,
        'P': latest_reading_obj.P,
        'K': latest_reading_obj.K,
        'moisture_level': latest_reading_obj.moisture_level,

        # Environmental (these may be nullable in the DB, but we just send them directly)
        'Temperature': latest_reading_obj.Temperature,
        'Humidity': latest_reading_obj.Humidity,
        'Rainfall': latest_reading_obj.Rainfall,

        # Crop context - the crop you're actually growing now on this plot
        'Current_Crop': current_crop_name,
        'Soil_Type': soil_type_value,

        # Inputs from Chemical model, for the ML's Fertilizer/Pesticide params
        'Fertilizer': fert_value,
        'Pesticide': pest_value,
    }

    return Response(enriched_payload, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def reading_history(request):
    """
    Return historical readings (chronological order) for charts.
    Query param: ?plot_number=6801&limit=200

    NOTE:
    We leave this as-is and still only return the soil sensor values.
    The frontend uses this for graphs, not for ML.
    """
    plot_number = request.query_params.get('plot_number')
    if not plot_number:
        return Response(
            {'detail': 'plot_number is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Optional history limit
    try:
        limit = int(request.query_params.get('limit', 200))
    except ValueError:
        limit = 200

    # Make sure this user actually has a device on that plot
    device = (
        SensorDevice.objects
        .filter(
            user=request.user,
            plot__plot_id=str(plot_number)
        )
        .first()
    )

    if not device:
        return Response(
            {
                'detail': 'No sensor is connected to this plot. Connect a sensor first.'
            },
            status=status.HTTP_404_NOT_FOUND
        )

    qs = (
        SoilSensorReading.objects
        .filter(
            plot_number=str(plot_number),
            sensor_id=device.linked_sensor_id
        )
        .order_by('timestamp')  # ascending for graph visualizations
        .values(
            'timestamp',
            'pH_level',
            'N',
            'P',
            'K',
            'moisture_level',
        )[:limit]
    )

    return Response(list(qs), status=status.HTTP_200_OK)
