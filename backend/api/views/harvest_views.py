from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from ..serializers import HarvestSerializer
from ..models import Harvest, Plot, Crop


def _aware(dt):
    """Make parsed datetimes timezone-aware if USE_TZ=True."""
    if not dt:
        return None
    if timezone.is_naive(dt):
        return timezone.make_aware(dt, timezone.get_current_timezone())
    return dt


@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def update_harvest(request, crop_id):
    """
    PUT /api/farm/harvests/<crop_id>/update/
    Update a harvest that belongs to the given crop_id (and current user).
    Optionally deletes the crop (your existing behavior).
    """
    try:
        harvest = Harvest.objects.get(crop_id=crop_id, user=request.user)  # 👈 scope to user
    except Harvest.DoesNotExist:
        return Response({"error": "Harvest not found"}, status=status.HTTP_404_NOT_FOUND)

    data = request.data or {}

    # Optional fields
    end_date = data.get("end_date")
    if end_date:
        ed = parse_datetime(end_date) if isinstance(end_date, str) else end_date
        harvest.end_date = _aware(ed)

    if "yield_amount" in data:
        harvest.yield_amount = float(data.get("yield_amount") or 0)

    if "comments" in data:
        harvest.comments = data.get("comments") or ""

    harvest.save()

    # Keep your current behavior (delete crop on update) — if this is
    # your "mark complete" action. Otherwise, remove this block.
    try:
        crop = Crop.objects.get(id=crop_id, user=request.user)
        crop.delete()
    except Crop.DoesNotExist:
        pass

    return Response(HarvestSerializer(harvest).data, status=status.HTTP_200_OK)


@api_view(["GET", "PUT"])
@permission_classes([IsAuthenticated])
def harvest_detail(request, harvest_id):
    """
    GET /api/farm/harvests/<id>/
    PUT /api/farm/harvests/<id>/
    """
    try:
        harvest = Harvest.objects.get(id=harvest_id, user=request.user)
    except Harvest.DoesNotExist:
        return Response({"error": "Harvest not found"}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response(HarvestSerializer(harvest).data)

    # PUT
    payload = request.data or {}
    end_date = payload.get("end_date")
    if end_date:
        ed = parse_datetime(end_date) if isinstance(end_date, str) else end_date
        harvest.end_date = _aware(ed)

    if "yield_amount" in payload:
        harvest.yield_amount = float(payload.get("yield_amount") or 0)

    if "comments" in payload:
        harvest.comments = payload.get("comments") or ""

    harvest.save()
    return Response(HarvestSerializer(harvest).data, status=status.HTTP_200_OK)


@api_view(["GET", "POST", "PATCH"])
@permission_classes([IsAuthenticated])
def farm_harvests(request):
    """
    GET   /api/farm/harvests/?plot_id=<pk_or_code>&open=true
           - Returns harvests for the current user.
           - If 'open=true', only end_date IS NULL.
           - plot_id can be either internal PK or public plot_code (plot.plot_id).
    POST  /api/farm/harvests/
           - Create a harvest for a given plot (PK) with optional expected_end_date.
    PATCH /api/farm/harvests/?id=<harvest_id>
           - Partial update: end_date, yield_amount, comments.
    """
    try:
        # ---------- GET ----------
        if request.method == "GET":
            qs = Harvest.objects.filter(user=request.user).select_related("plot").order_by("-start_date")

            plot_id = request.query_params.get("plot_id")
            if plot_id:
                # accept either plot PK or public code
                if plot_id.isdigit() and Plot.objects.filter(pk=int(plot_id), user=request.user).exists():
                    qs = qs.filter(plot_id=int(plot_id))
                else:
                    qs = qs.filter(plot__plot_id=plot_id)

            open_only = request.query_params.get("open")
            if open_only in ("1", "true", "True"):
                qs = qs.filter(end_date__isnull=True)

            return Response([HarvestSerializer(h).data for h in qs], status=status.HTTP_200_OK)

        # ---------- POST ----------
        if request.method == "POST":
            payload = request.data or {}
            plot_pk = payload.get("plot_id")        # expects PK here for creation
            crop_type = payload.get("crop_type", "Unknown")
            crop_variety = payload.get("crop_variety", "Unknown")
            start_date = payload.get("start_date")
            expected_end_date = payload.get("expected_end_date")
            yield_amount = payload.get("yield_amount", 0)
            comments = payload.get("comments", "")

            if not plot_pk or start_date is None:
                return Response(
                    {"error": "plot_id and start_date are required"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            try:
                plot = Plot.objects.get(pk=plot_pk, user=request.user)
            except Plot.DoesNotExist:
                return Response({"error": "Plot not found"}, status=status.HTTP_404_NOT_FOUND)

            sd = parse_datetime(start_date) if isinstance(start_date, str) else start_date
            ed = parse_datetime(expected_end_date) if isinstance(expected_end_date, str) else expected_end_date
            sd, ed = _aware(sd), _aware(ed)

            if sd is None:
                return Response({"error": "start_date must be ISO 8601 datetime"}, status=status.HTTP_400_BAD_REQUEST)

            harvest = Harvest.objects.create(
                user=request.user,
                plot=plot,
                crop_type=crop_type or "Unknown",
                crop_variety=crop_variety or "Unknown",
                start_date=sd,
                expected_end_date=ed,
                end_date=None,
                yield_amount=float(yield_amount or 0),
                comments=comments or "",
            )
            return Response(HarvestSerializer(harvest).data, status=status.HTTP_201_CREATED)

        # ---------- PATCH ----------
        if request.method == "PATCH":
            harvest_id = request.query_params.get("id")
            if not harvest_id:
                return Response({"error": "Harvest id is required"}, status=status.HTTP_400_BAD_REQUEST)

            try:
                harvest = Harvest.objects.get(id=harvest_id, user=request.user)
            except Harvest.DoesNotExist:
                return Response({"error": "Harvest not found"}, status=status.HTTP_404_NOT_FOUND)

            payload = request.data or {}

            end_date = payload.get("end_date")
            if end_date:
                ed = parse_datetime(end_date) if isinstance(end_date, str) else end_date
                harvest.end_date = _aware(ed)

            if "yield_amount" in payload:
                harvest.yield_amount = float(payload.get("yield_amount") or 0)

            if "comments" in payload:
                harvest.comments = payload.get("comments") or ""

            harvest.save()
            return Response(HarvestSerializer(harvest).data, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
