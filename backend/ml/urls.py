from django.urls import path
from . import views

urlpatterns = [
    path('recommend-crop/', views.recommend_crop, name='recommend-crop'),
]
