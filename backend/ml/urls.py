from django.urls import path
from . import views

urlpatterns = [
    path('recommend-crop/', views.recommend_crop, name='recommend_crop'),
    path('recommendations/', views.generate_recommendation, name='generate_recommendation'),
    path('recommendations/history/', views.get_recommendations, name='get_recommendations'),
    path('recommendations/<int:recommendation_id>/update-status/', views.update_recommendation_status, name='update_recommendation_status'),
    path('available-crops/', views.get_available_crops, name='get_available_crops'),
]