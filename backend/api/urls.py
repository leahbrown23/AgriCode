from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import RegisterView, ProfileView, farm_view, crop_view, upload_soil_data, latest_soil_data, latest_soil_reading_by_plot, get_user_plot_numbers

urlpatterns = [
    path('register/', RegisterView.as_view()),
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('profile/', ProfileView.as_view()),
    path('farm/', farm_view),
    path('farm/crops/', crop_view),
    path('upload-soil/', upload_soil_data),
    path('latest-soil-data/', latest_soil_data),
    path('latest-reading/', latest_soil_reading_by_plot),
    path('get-user-plots/', get_user_plot_numbers, name='latest-reading'),
]
