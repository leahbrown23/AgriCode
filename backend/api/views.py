from django.contrib.auth import authenticate
from django.contrib.auth.hashers import make_password
from django.db import IntegrityError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.db.models import Count, Min, Max

from datetime import datetime
from django.utils.dateparse import parse_datetime
from rest_framework import status

from django.utils.dateparse import parse_datetime
from django.db.models import F



from .models import (
    CustomUser, Plot, Farm, Crop, Harvest,
    SoilSensorReading, SensorDevice, SensorData
)
from .serializers import PlotSerializer


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def harvest_crop(request, crop_id):
    # TODO: implement actual harvest logic
    return Response({"detail": "harvest endpoint not implemented yet", "crop_id": crop_id}, status=501)

# -------------------------
# Authentication (AllowAny)
# -------------------------
@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    try:
        username      = (request.data.get('username') or "").strip()
        email         = (request.data.get('email') or "").strip()
        password      = request.data.get('password')
        phone_number  = (request.data.get('phone_number') or "").strip()
        first_name    = (request.data.get('first_name') or "").strip()   # <-- NEW
        last_name     = (request.data.get('last_name') or "").strip()     # <-- NEW

        # allow username to default to email so login works with your current form
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
            first_name=first_name,   # <-- NEW
            last_name=last_name      # <-- NEW
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
                'first_name': user.first_name,     # <-- NEW
                'last_name': user.last_name        # <-- NEW
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
                'first_name': user.first_name,     # <-- NEW
                'last_name': user.last_name        # <-- NEW
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



# -------------------------
# Profile & Favorites
# -------------------------
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
        # Placeholder until you wire favorites to the forum app
        return Response([])
    except Exception as e:
        return Response({'error': str(e)}, status=500)


# -------------------------
# Farm (single endpoint to match /api/farm/ in the frontend)
# -------------------------
@api_view(['GET', 'POST', 'PUT'])
@permission_classes([IsAuthenticated])
def farm_view(request):
    """
    GET  /api/farm/ -> return current user's farm (404 if none)
    POST /api/farm/ -> create (400 if already exists)
    PUT  /api/farm/ -> update current user's farm (404 if none)
    """
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
            'location'  : payload.get('location'),
            'crop_types': payload.get('crop_types'),
            'size'      : payload.get('size'),
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

        # PUT
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


# -------------------------
# Farms (list/create endpoints you already had)
# -------------------------
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


# -------------------------
# Plots
# -------------------------
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_plots(request):
    try:
        plots = Plot.objects.filter(user=request.user).order_by('created_at')
        return Response(PlotSerializer(plots, many=True).data)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


# views.py

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def get_farm_plots(request):
    """
    GET  /api/farm/plots/  -> list user's plots
    POST /api/farm/plots/  -> create a plot (alias to create_plot)
    """
    try:
        if request.method == 'GET':
            plots = Plot.objects.filter(user=request.user).order_by('created_at')
            serializer = PlotSerializer(plots, many=True)
            return Response(serializer.data)

        # POST — create a plot (same validation as create_plot)
        plot_id = request.data.get('plot_id')
        description = request.data.get('description', '')
        size = request.data.get('size')
        location = request.data.get('location')

        if not plot_id or size is None or not location:
            return Response({'error': 'plot_id, size, and location are required'}, status=400)

        if Plot.objects.filter(user=request.user, plot_id=plot_id).exists():
            return Response({'error': 'Plot ID already exists for this user'}, status=400)

        plot = Plot.objects.create(
            user=request.user,
            plot_id=plot_id,
            description=description,
            size=size,
            location=location
        )
        return Response({
            'message': 'Plot created successfully',
            'plot': PlotSerializer(plot).data
        }, status=201)

    except Exception as e:
        return Response({'error': str(e)}, status=500)



@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_plot(request):
    try:
        plot_id = request.data.get('plot_id')
        description = request.data.get('description', '')
        size = request.data.get('size')
        location = request.data.get('location')

        if not plot_id or not size or not location:
            return Response({'error': 'plot_id, size, and location are required'}, status=400)

        if Plot.objects.filter(user=request.user, plot_id=plot_id).exists():
            return Response({'error': 'Plot ID already exists for this user'}, status=400)

        plot = Plot.objects.create(
            user=request.user,
            plot_id=plot_id,
            description=description,
            size=size,
            location=location
        )
        return Response({'message': 'Plot created successfully',
                         'plot': PlotSerializer(plot).data}, status=201)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def farm_crops(request):
    """
    GET  /api/farm/crops/        -> list crops for current user
    POST /api/farm/crops/        -> create a crop

    Accepts either snake_case or camelCase keys, and either:
      - numeric plot id (plot_id / plotId), or
      - plot code (plot_code / plotCode) matching Plot.plot_id, or
      - unique plot key (plot_key / plotKey) matching Plot.unique_plot_key
    """
    try:
        if request.method == 'GET':
            qs = Crop.objects.filter(user=request.user).select_related('plot', 'farm').order_by('id')
            rows = []
            for c in qs:
                rows.append({
                    'id': c.id,
                    'plot_id': c.plot.id if c.plot else None,
                    'plot_code': c.plot.plot_id if c.plot else c.plot_number,
                    'crop_type': c.crop_type,
                    'crop_variety': c.crop_variety,
                    'status': c.status,
                })
            return Response(rows)

        # -------- POST (create) --------
        data = request.data or {}

        # Accept multiple key variants
        plot_id_raw   = data.get('plot_id')   or data.get('plotId')   or data.get('plot')
        plot_code     = data.get('plot_code') or data.get('plotCode') or data.get('plot_number') or data.get('plotNumber')
        plot_key      = data.get('plot_key')  or data.get('plotKey')  or data.get('unique_plot_key') or data.get('uniquePlotKey')

        crop_type     = data.get('crop_type') or data.get('cropType')
        crop_variety  = data.get('crop_variety') or data.get('cropVariety')
        status_val    = data.get('status', 'planting')

        # Validate required fields
        if not crop_type or not crop_variety or not (plot_id_raw or plot_code or plot_key):
            return Response(
                {'error': 'plot_id/plot_code/plot_key, crop_type and crop_variety are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Find the plot using any of the accepted identifiers
        plot = None
        if plot_id_raw is not None:
            try:
                plot_pk = int(plot_id_raw)
                plot = Plot.objects.get(id=plot_pk, user=request.user)
            except (ValueError, Plot.DoesNotExist):
                plot = None  # fall through to other options

        if plot is None and plot_code:
            # Frontend sometimes sends the human plot code stored in Plot.plot_id
            try:
                plot = Plot.objects.get(plot_id=str(plot_code), user=request.user)
            except Plot.DoesNotExist:
                pass

        if plot is None and plot_key:
            # Unique key P{plot_id}U{user_id}
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
            plot=plot,                    # OK: FK with to_field will resolve automatically
            plot_number=plot.plot_id,     # keep your human-readable code too
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
    
    from rest_framework import status as http_status

@api_view(['PATCH', 'POST'])
@permission_classes([IsAuthenticated])
def update_crop_status(request, crop_id: int):
    """
    PATCH/POST /api/farm/crops/<crop_id>/status/
    Body: { "status": "planting" | "growing" | "harvesting" | "closed" }
    """
    try:
        # must belong to the current user
        crop = Crop.objects.get(id=crop_id, user=request.user)
    except Crop.DoesNotExist:
        return Response({'error': 'Crop not found'}, status=http_status.HTTP_404_NOT_FOUND)

    new_status = (
        request.data.get('status')
        or request.query_params.get('status')
    )
    if not new_status:
        return Response({'error': 'status is required'}, status=http_status.HTTP_400_BAD_REQUEST)

    allowed = {code for code, _ in Crop.STATUS_CHOICES}
    if new_status not in allowed:
        return Response(
            {'error': f'Invalid status. Allowed: {sorted(list(allowed))}'},
            status=http_status.HTTP_400_BAD_REQUEST
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

# -------------------------
# Harvests (list/create)
# -------------------------
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def farm_harvests(request):
    """
    GET  /api/farm/harvests/?plot_id=<id>  -> list harvest records (optionally filter by plot)
    POST /api/farm/harvests/               -> create a harvest record
    Expected POST payload:
      {
        "plot_id": <int>,
        "crop_type": "Maize",
        "crop_variety": "Pioneer 30Y87",
        "start_date": "2025-08-01T08:00:00Z",
        "end_date":   "2025-08-15T17:00:00Z",
        "yield_amount": 123.4,
        "comments": "Great season"
      }
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
                    'crop_type': h.crop_type,
                    'crop_variety': h.crop_variety,
                    'start_date': h.start_date.isoformat(),
                    'end_date': h.end_date.isoformat(),
                    'yield_amount': h.yield_amount,
                    'comments': h.comments,
                })
            return Response(out)

        # POST
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

        # Parse datetimes (accept ISO 8601)
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
            'crop_type': harvest.crop_type,
            'crop_variety': harvest.crop_variety,
            'start_date': harvest.start_date.isoformat(),
            'end_date': harvest.end_date.isoformat(),
            'yield_amount': harvest.yield_amount,
            'comments': harvest.comments,
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# -------------------------
# Sensors: Validate / Connect / Activate / Toggle
# -------------------------
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def validate_sensor(request):
    """Validate that a sensor ID exists and has data (ORM-based)."""
    try:
        sensor_id = request.data.get('sensor_id')
        if not sensor_id:
            return Response({'detail': 'sensor_id is required'}, status=400)

        qs = SoilSensorReading.objects.filter(sensor_id=sensor_id)

        agg = qs.aggregate(
            total=Count('id'),
            earliest=Min('timestamp'),
            latest=Max('timestamp'),
        )
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
        print(f"Validation error: {e}")
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


# -------------------------
# Simulation Status & Data
# -------------------------
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
    
    # -------- Soil Health: latest + history (SoilSensorReading) --------


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def latest_reading(request):
    """
    Return latest SoilSensorReading for the user's selected plot,
    but only if the user has a SensorDevice connected to that plot.
    """
    plot_number = request.query_params.get('plot_number')
    if not plot_number:
        return Response({'detail': 'plot_number is required'}, status=400)

    # Find the user's connected device for this plot
    device = SensorDevice.objects.filter(
        user=request.user,
        plot__plot_id=str(plot_number)
    ).first()

    if not device:
        return Response(
            {'detail': 'No sensor is connected to this plot. Connect a sensor first.'},
            status=404
        )

    # Pull the most recent reading for (plot_number, sensor_id)
    row = (SoilSensorReading.objects
           .filter(plot_number=str(plot_number), sensor_id=device.linked_sensor_id)
           .order_by('-timestamp')
           .values('timestamp', 'pH_level', 'N', 'P', 'K', 'moisture_level')
           .first())

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
    Return historical SoilSensorReading rows for the user's selected plot,
    constrained by the connected sensor_id.
    Optional query params: limit (default 200).
    """
    plot_number = request.query_params.get('plot_number')
    limit = int(request.query_params.get('limit', 200))
    if not plot_number:
        return Response({'detail': 'plot_number is required'}, status=400)

    device = SensorDevice.objects.filter(
        user=request.user,
        plot__plot_id=str(plot_number)
    ).first()

    if not device:
        return Response(
            {'detail': 'No sensor is connected to this plot. Connect a sensor first.'},
            status=404
        )

    qs = (SoilSensorReading.objects
          .filter(plot_number=str(plot_number), sensor_id=device.linked_sensor_id)
          .order_by('timestamp')
          .values('timestamp', 'pH_level', 'N', 'P', 'K', 'moisture_level')[:limit])

    return Response(list(qs))

