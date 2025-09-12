from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from ..models import Plot
from ..serializers import PlotSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_plots(request):
    try:
        plots = Plot.objects.filter(user=request.user).order_by('created_at')
        return Response(PlotSerializer(plots, many=True).data)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def get_farm_plots(request):
    try:
        if request.method == 'GET':
            plots = Plot.objects.filter(user=request.user).order_by('created_at')
            serializer = PlotSerializer(plots, many=True)
            return Response(serializer.data)

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


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def plot_detail(request, plot_id):
    try:
        plot = Plot.objects.get(id=plot_id, user=request.user)
    except Plot.DoesNotExist:
        return Response({'error': 'Plot not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        serializer = PlotSerializer(plot)
        return Response(serializer.data)
    
    elif request.method in ['PUT', 'PATCH']:
        serializer = PlotSerializer(
            plot, 
            data=request.data, 
            partial=(request.method == 'PATCH'),
            context={'request': request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        plot.delete()
        return Response({'message': 'Plot deleted successfully'}, status=status.HTTP_204_NO_CONTENT)


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
