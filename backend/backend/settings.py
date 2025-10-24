"""
Django settings for backend project.
"""

from pathlib import Path
import os
from datetime import timedelta
from dotenv import load_dotenv

# -------------------------------------------------
# Base and env
# -------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(dotenv_path=BASE_DIR / ".env")

SECRET_KEY = 'django-insecure-j+$(v4)$icyo51n)n@i*5dz4*ujvri!-esrsz7olmc$eponr)&'

# In production on Render you should flip this to False
DEBUG = True

ALLOWED_HOSTS = [
    "agricode-wsa2.onrender.com",
    "agricode-1.onrender.com",
    "localhost",
    "127.0.0.1",
]

AUTH_USER_MODEL = "api.CustomUser"

# -------------------------------------------------
# Installed apps
# -------------------------------------------------
INSTALLED_APPS = [
    # Django core
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    # Third-party
    "corsheaders",
    "rest_framework",
    "channels",
    "rest_framework_simplejwt.token_blacklist",

    # Your apps
    "api",
    "forum",
    "ml",
]

# -------------------------------------------------
# Middleware
# -------------------------------------------------
MIDDLEWARE = [
    # CORS must be high, before CommonMiddleware
    "corsheaders.middleware.CorsMiddleware",

    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

# In production we also want WhiteNoise to serve static files.
# We'll inject it just after SecurityMiddleware when DEBUG = False (see bottom).

# -------------------------------------------------
# CORS / CSRF / Cookies
# -------------------------------------------------
# Frontends that are allowed to call this API from the browser
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    # if you have a deployed frontend somewhere else, include it here:
    "https://agricode-1.onrender.com",
]

# If you send cookies / Authorization headers across origins
CORS_ALLOW_CREDENTIALS = True

# Domains allowed to POST to us with CSRF tokens (mainly matters if you use cookies)
CSRF_TRUSTED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://agricode-wsa2.onrender.com",
    "https://agricode-1.onrender.com",
]

# Dev cookie policy
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False

# -------------------------------------------------
# DRF / JWT auth
# -------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.LimitOffsetPagination",
    "PAGE_SIZE": 10,
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),      # Increased from 15 min
    "REFRESH_TOKEN_LIFETIME": timedelta(days=30),        # "remember me" window
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "UPDATE_LAST_LOGIN": True,
}

# -------------------------------------------------
# URL / ASGI / WSGI
# -------------------------------------------------
ROOT_URLCONF = "backend.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# Django's normal WSGI app (admin, management commands, etc.)
WSGI_APPLICATION = "backend.wsgi.application"

# Channels ASGI app for websockets / realtime
ASGI_APPLICATION = "backend.asgi.application"

# -------------------------------------------------
# Databases
# -------------------------------------------------
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("dbname"),
        "USER": os.getenv("user"),
        "PASSWORD": os.getenv("password"),
        "HOST": os.getenv("host"),
        "PORT": os.getenv("port"),
    },
    "sensorsim": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "sensorsim.sqlite3",
    },
}

# -------------------------------------------------
# Channels / Redis
# -------------------------------------------------
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0")],
        },
    }
}

# -------------------------------------------------
# i18n / tz
# -------------------------------------------------
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# -------------------------------------------------
# Static files
# -------------------------------------------------
STATIC_URL = "/static/"
STATIC_ROOT = os.path.join(BASE_DIR, "static")

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# -------------------------------------------------
# Production-only extras
# -------------------------------------------------
if not DEBUG:
    # Insert WhiteNoise right after SecurityMiddleware
    # (index 1 because CorsMiddleware is index 0, SecurityMiddleware is index 1 initially)
    MIDDLEWARE.insert(2, "whitenoise.middleware.WhiteNoiseMiddleware")
