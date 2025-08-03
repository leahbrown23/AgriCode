from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import (
    RegisterView, 
    ProfileView, 
    PlotViewSet, 
    CropViewSet, 
    farm_view, 
    crop_view, 
    crop_detail_view, 
    upload_soil_data, 
    latest_soil_data, 
    latest_soil_reading_by_plot, 
    get_user_plot_numbers,
    get_crop_by_plot_key,
    get_favorite_threads,
    add_favorite_thread,
    remove_favorite_thread,
    update_crop_status,
    harvest_crop,
    list_harvests,
)

# DRF Router for viewsets
router = DefaultRouter()
router.register(r'farm/plots', PlotViewSet, basename='plot')
router.register(r'farm/crops', CropViewSet, basename='crop')

urlpatterns = [
    # Authentication
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('profile/', ProfileView.as_view(), name='profile'),

    # Farm
    path('farm/', farm_view, name='farm'),

    # Crops
    path('farm/crops/', crop_view, name='crop-list'),
    path('farm/crops/<int:crop_id>/', crop_detail_view, name='crop-detail'),
    path('farm/crops/by-plot/<str:plot_key>/', get_crop_by_plot_key, name='crop-by-plot'),
    path('farm/crops/<int:crop_id>/status/', update_crop_status, name='update-crop-status'),
    path('farm/crops/<int:crop_id>/harvest/', harvest_crop, name='harvest-crop'),

    # Harvests
    path('harvests/', list_harvests, name='list-harvests'),

    # Sensor Data
    path('upload-sensor-data/', upload_soil_data, name='upload-sensor-data'),
    path('latest-soil-data/', latest_soil_data, name='latest-soil-data'),
    path('latest-reading/', latest_soil_reading_by_plot, name='latest-reading'),
    path('get-user-plots/', get_user_plot_numbers, name='get-user-plots'),

    # Favorite Threads
    path('favorites/', get_favorite_threads, name='favorite-threads'),
    path('favorites/add/', add_favorite_thread, name='add-favorite'),
    path('favorites/<int:favorite_id>/', remove_favorite_thread, name='remove-favorite'),

    # ViewSets
    path('', include(router.urls)),
]
