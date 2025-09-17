from django.urls import path
from . import views

urlpatterns = [
    path('recommend-crop/', views.recommend_crop, name='recommend_crop'),
    path('available-crops/', views.get_available_crops, name='get_available_crops'),
]