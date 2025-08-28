# backend/api/urls.py
from django.urls import path
from . import views
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView


urlpatterns = [

    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # -------------------------
    # Authentication
    # -------------------------
    path('register/', views.register, name='register'),
    path('login/', views.login, name='login'),
    path('logout/', views.logout, name='logout'),

    # -------------------------
    # Profile & Favorites
    # -------------------------
    path('profile/', views.get_profile, name='get_profile'),
    path('favorites/', views.get_favorites, name='get_favorites'),

    # -------------------------
    # Farm (single endpoint used by FarmSetupScreen)
    # -------------------------
    # GET  /api/farm/ -> current user's farm (404 if none)
    # POST /api/farm/ -> create farm for current user
    # PUT  /api/farm/ -> update current user's farm
    path('farm/', views.farm_view, name='farm_view'),

    # -------------------------
    # Farm Management (list/create)
    # -------------------------
    path('farms/', views.get_farms, name='get_farms'),
    path('farms/create/', views.create_farm, name='create_farm'),

    # -------------------------
    # Plot Management
    # -------------------------
    path('plots/', views.get_plots, name='get_plots'),
    path('plots/create/', views.create_plot, name='create_plot'),
    path('farm/plots/', views.get_farm_plots, name='get_farm_plots'),

    # -------------------------
    # Sensor Validation & Connection
    # -------------------------
    path('sensors/validate/', views.validate_sensor, name='validate_sensor'),
    path('sensors/connect/', views.connect_sensor, name='connect_sensor'),
    path('sensors/activate/<int:device_id>/', views.activate_sensor, name='activate_sensor'),

    # -------------------------
    # Sensor Data
    # -------------------------
    path('sensors/data/<int:plot_id>/', views.get_sensor_data, name='get_sensor_data'),

    # Soil Health (SoilSensorReading)
    path('latest-reading/', views.latest_reading, name='latest_reading'),
    path('reading-history/', views.reading_history, name='reading_history'),

    # -------------------------
    # Simulation (for FarmSetupScreen)
    # -------------------------
    path('sim/status/', views.sim_status, name='sim_status'),
    path('sim/devices/<int:device_id>/toggle/', views.toggle_device, name='toggle_device'),

    # -------------------------
    # Crops & Harvests
    # -------------------------
    path('farm/crops/', views.farm_crops, name='farm_crops'),                 # GET (list), POST (create)
    path('farm/crops/<int:crop_id>/status/', views.update_crop_status, name='update_crop_status'),
    path('farm/crops/<int:crop_id>/harvest/', views.harvest_crop, name='harvest_crop'),  # ✅ add per-plot harvest

    # Keep both routes so your frontend can call either `/api/harvests/` or `/api/farm/harvests/`
    path('farm/harvests/', views.farm_harvests, name='farm_harvests'),        # GET (history), POST (optional)
    path('harvests/', views.farm_harvests, name='farm_harvests_root'),        # ✅ alias for compatibility
]
