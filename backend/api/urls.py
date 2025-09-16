from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

# Import views from the new modular structure
from .views import (
    auth_views, farm_views, plot_views, crop_views,
    harvest_views, sensor_views, sim_views, reading_views, misc_views
)

urlpatterns = [
    # -------------------------
    # JWT Authentication
    # -------------------------
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # -------------------------
    # Authentication
    # -------------------------
    path('register/', auth_views.register, name='register'),
    path('login/', auth_views.login, name='login'),
    path('logout/', auth_views.logout, name='logout'),

    # -------------------------
    # Profile & Favorites
    # -------------------------
    path('profile/', auth_views.get_profile, name='get_profile'),
    path('favorites/', auth_views.get_favorites, name='get_favorites'),

    # -------------------------
    # Farm (single endpoint used by FarmSetupScreen)
    # -------------------------
    path('farm/', farm_views.farm_view, name='farm_view'),

    # -------------------------
    # Farm Management (list/create)
    # -------------------------
    path('farms/', farm_views.get_farms, name='get_farms'),
    path('farms/create/', farm_views.create_farm, name='create_farm'),

    # -------------------------
    # Plot Management
    # -------------------------
    path('plots/', plot_views.get_plots, name='get_plots'),
    path('plots/create/', plot_views.create_plot, name='create_plot'),
    path('farm/plots/', plot_views.get_farm_plots, name='get_farm_plots'),
    path('farm/plots/<int:plot_id>/', plot_views.plot_detail, name='plot_detail'),

    # -------------------------
    # Sensor Validation & Connection
    # -------------------------
    path('sensors/validate/', sensor_views.validate_sensor, name='validate_sensor'),
    path('sensors/connect/', sensor_views.connect_sensor, name='connect_sensor'),
    path('sensors/<int:device_id>/activate/', sensor_views.activate_sensor, name='activate_sensor'),
    path('sensors/<int:device_id>/toggle/', sensor_views.toggle_device, name='toggle_device'),
    path('sensors/<int:device_id>/delete/', sensor_views.delete_device, name='delete_device'),

    # -------------------------
    # Sensor Data
    # -------------------------
    path('sensors/data/<int:plot_id>/', sim_views.get_sensor_data, name='get_sensor_data'),

    # -------------------------
    # Soil Health (SoilSensorReading)
    # -------------------------
    path('latest-reading/', reading_views.latest_reading, name='latest_reading'),
    path('reading-history/', reading_views.reading_history, name='reading_history'),

    # -------------------------
    # Simulation (for FarmSetupScreen)
    # -------------------------
    path('sim/status/', sim_views.sim_status, name='sim_status'),

    # -------------------------
    # Crops & Harvests
    # -------------------------
    path('farm/crops/', crop_views.farm_crops, name='farm_crops'),
    path('farm/crops/<int:crop_id>/', crop_views.crop_detail, name='crop_detail'),
    path('farm/crops/<int:crop_id>/status/', crop_views.update_crop_status, name='update_crop_status'),
    path('farm/crops/<int:crop_id>/harvest/', misc_views.harvest_crop, name='harvest_crop'),

    # Harvest history + creation
    path('farm/harvests/', harvest_views.farm_harvests, name='farm_harvests'),
    path('harvests/', harvest_views.farm_harvests, name='farm_harvests_root'),
]
