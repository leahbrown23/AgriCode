from django.urls import re_path
from .consumers import SoilConsumer

websocket_urlpatterns = [
    re_path(r"ws/soil/(?P<plot_id>\d+)/$", SoilConsumer.as_asgi()),
]
