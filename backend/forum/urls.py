from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TopicViewSet, ThreadViewSet, ChatMessageViewSet

router = DefaultRouter()
router.register(r'topics', TopicViewSet)
router.register(r'threads', ThreadViewSet)
router.register(r'chats', ChatMessageViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
