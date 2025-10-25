from django.urls import re_path
from .consumers import SoilConsumer

websocket_urlpatterns = [
    # ws://127.0.0.1:8000/ws/soil/6803/
    re_path(r"ws/soil/(?P<plot_id>\d+)/$", SoilConsumer.as_asgi()),
]
