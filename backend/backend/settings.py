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

# Local development mode
DEBUG = True

ALLOWED_HOSTS = [
    'agricode-17ed.onrender.com', 'localhost', '127.0.0.1'
]

AUTH_USER_MODEL = "api.CustomUser"

# -------------------------------------------------
# Installed apps
# -------------------------------------------------
INSTALLED_APPS = [
    # NOTE: We REMOVED "daphne"
    # NOTE: We REMOVED "channels"

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

# -------------------------------------------------
# CORS / CSRF / Cookies
# -------------------------------------------------
# Allow React dev app (port 3000) to talk to Django dev server (port 8000)
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

CORS_ALLOW_CREDENTIALS = True

CSRF_TRUSTED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
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
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=30),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "UPDATE_LAST_LOGIN": True,
}

# -------------------------------------------------
# URL / WSGI
# -------------------------------------------------
ROOT_URLCONF = "backend.backend.urls"

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

# Pure Django dev server uses WSGI
WSGI_APPLICATION = "backend.wsgi.application"

# NOTE:
# We REMOVED:
#   ASGI_APPLICATION = "backend.asgi.application"
#   CHANNEL_LAYERS = {...}
# because we are no longer running Channels or Daphne.

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
    # When you flip DEBUG=False for deployment later:
    # WhiteNoise handles static files in production.
    MIDDLEWARE.insert(2, "whitenoise.middleware.WhiteNoiseMiddleware")
