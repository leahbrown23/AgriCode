import os
import django
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack

from api.routing import websocket_urlpatterns

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")

# Make sure Django is loaded before we build the ProtocolTypeRouter
django.setup()

django_asgi_app = get_asgi_application()

application = ProtocolTypeRouter({
    # Normal HTTP requests (Django views, DRF, admin, etc.)
    "http": django_asgi_app,

    # WebSocket requests
    "websocket": AuthMiddlewareStack(
        URLRouter(websocket_urlpatterns)
    ),
})
