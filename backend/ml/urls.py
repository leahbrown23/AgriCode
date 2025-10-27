from django.urls import path
from . import views

urlpatterns = [
    # High-level crop suggestion + yield comparison between current vs recommended crop
    path("recommend-crop/", views.recommend_crop, name="recommend_crop"),

    # Lightweight endpoint InsightsScreen calls:
    # returns predicted yield for CURRENT_CROP + advice (no DB write)
    path(
        "generate-recommendations/",
        views.generate_recommendations_view,
        name="generate_recommendations",
    ),

    # Create + persist a Recommendation row linked to user/harvest
    path(
        "recommendations/",
        views.generate_and_store_recommendation,
        name="generate_and_store_recommendation",
    ),

    # Recent saved recommendations (for history / dashboard etc.)
    path(
        "recommendations/history/",
        views.get_recommendations,
        name="get_recommendations",
    ),

    # Update status field on a saved recommendation row
    path(
        "recommendations/<int:recommendation_id>/update-status/",
        views.update_recommendation_status,
        name="update_recommendation_status",
    ),

    # Helper for frontend validation / dropdowns
    path(
        "available-crops/",
        views.get_available_crops,
        name="get_available_crops",
    ),
]
