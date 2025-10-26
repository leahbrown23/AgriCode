from django.contrib.auth.models import AbstractUser
from django.db import models
from django.conf import settings
from forum.models import Thread
from datetime import datetime
# Remove this line: from django.contrib.auth.models import User


# -------------------------
# User & Favorites
# -------------------------
class CustomUser(AbstractUser):
    phone_number = models.CharField(max_length=50, blank=True, null=True)

    def __str__(self):
        return self.username


class CustomerFavoriteThread(models.Model):
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='customer_favorites'
    )
    thread = models.ForeignKey(Thread, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'api_customer_favorite_threads'
        unique_together = ['customer', 'thread']

    def __str__(self):
        return f"{self.customer.username} - {self.thread.title}"


# -------------------------
# Farm Management
# -------------------------
class Farm(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    farm_name = models.CharField(max_length=100)
    location = models.CharField(max_length=100)
    crop_types = models.CharField(max_length=255)
    size = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    has_livestock = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.farm_name} ({self.user.email})"


class Plot(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    plot_id = models.CharField(max_length=50)
    unique_plot_key = models.CharField(max_length=100, unique=True, blank=True)
    description = models.TextField(blank=True)
    size = models.DecimalField(max_digits=10, decimal_places=2)
    location = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.unique_plot_key:
            self.unique_plot_key = f"P{self.plot_id}U{self.user.id}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.plot_id} (User {self.user.id})"


class Crop(models.Model):
    STATUS_CHOICES = [
        ("planting", "Planting"),
        ("growing", "Growing"),
        ("harvesting", "Harvesting"),
        ("closed", "Closed"),
    ]
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    farm = models.ForeignKey(Farm, on_delete=models.CASCADE)
    plot_number = models.CharField(max_length=100)
    # Uses Plot.unique_plot_key as the FK target
    plot = models.ForeignKey(Plot, to_field='unique_plot_key', on_delete=models.CASCADE, null=True)
    crop_type = models.CharField(max_length=100)
    crop_variety = models.CharField(max_length=100)
    soil_type = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="planting")

    def __str__(self):
        return f"{self.crop_type} ({self.plot_number})"


class Harvest(models.Model):
    crop = models.ForeignKey(Crop, on_delete=models.SET_NULL, related_name="harvests", null=True, blank=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    plot = models.ForeignKey(Plot, on_delete=models.CASCADE)
    crop_type = models.CharField(max_length=100, default="Unknown")
    crop_variety = models.CharField(max_length=100, default="Unknown")
    start_date = models.DateTimeField()
    expected_end_date = models.DateTimeField(
        blank=True,
        null=True,  # allow empty
        default=datetime(2025, 10, 30, 0, 0, 0))
    end_date = models.DateTimeField(blank=True, null=True)  # allow later update
    yield_amount = models.FloatField(default=0)
    comments = models.TextField(default="", blank=True)

    def __str__(self):
        return f"Harvest {self.crop_type} on {self.plot} ({self.end_date})"
    
class Chemical(models.Model):
    harvest = models.OneToOneField(
        'Harvest', on_delete=models.CASCADE, related_name='chemical'
    )
    pest_month = models.FloatField(default=0.0)
    fert_month = models.FloatField(default=0.0)
    harvest_days = models.IntegerField(default=0)
    pest_days = models.FloatField(default=0.0)
    fert_days = models.FloatField(default=0.0)
    pest_total = models.FloatField(default=0.0)
    fert_total = models.FloatField(default=0.0)

    def save(self, *args, **kwargs):
        if self.harvest and self.harvest.start_date and self.harvest.expected_end_date:
            delta = self.harvest.expected_end_date - self.harvest.start_date
            self.harvest_days = delta.days

        self.pest_days = self.pest_month / 30
        self.fert_days = self.fert_month / 30
        self.pest_total = self.pest_days * self.harvest_days
        self.fert_total = self.fert_days * self.harvest_days

        super().save(*args, **kwargs)

    def __str__(self):
        return f"Chemicals for Harvest ID {self.harvest.id}"


class SoilSensorReading(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    plot_number = models.CharField(max_length=100)
    sensor_id = models.IntegerField()

    # Soil chemistry / nutrients
    pH_level = models.FloatField()
    N = models.FloatField()
    P = models.FloatField()
    K = models.FloatField()

    # Soil conditions
    moisture_level = models.FloatField()

    # 🔥 NEW: we are now explicitly telling Django
    # about the weather/env columns that ALREADY
    # exist in your Supabase table.
    Temperature = models.FloatField(null=True, blank=True)
    Humidity = models.FloatField(null=True, blank=True)
    Rainfall = models.FloatField(null=True, blank=True)

    # Timestamp of the reading
    timestamp = models.DateTimeField()

    def __str__(self):
        return f"{self.plot_number} - {self.timestamp}"


# -------------------------
# New Sensor Simulation Models
# -------------------------
class SensorDevice(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)  # Changed from User to settings.AUTH_USER_MODEL
    name = models.CharField(max_length=100, blank=True, null=True)
    external_id = models.CharField(max_length=50, unique=True)
    linked_sensor_id = models.IntegerField(null=True, blank=True)
    plot = models.ForeignKey('Plot', on_delete=models.CASCADE, null=True, blank=True)
    is_active = models.BooleanField(default=False)
    data_source = models.CharField(max_length=20, default='existing_data')
    last_seen = models.DateTimeField(null=True, blank=True)
    sim_seq = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name or self.external_id} - Sensor {self.linked_sensor_id}"

    class Meta:
        unique_together = ['user', 'linked_sensor_id']


class SensorData(models.Model):
    device = models.ForeignKey(SensorDevice, on_delete=models.CASCADE, related_name="readings")
    plot = models.ForeignKey("api.Plot", on_delete=models.CASCADE, related_name="sensor_readings", null=True, blank=True)
    ts = models.DateTimeField()  # Remove auto_now_add to allow manual timestamps
    ph = models.FloatField(null=True, blank=True)
    moisture = models.FloatField(null=True, blank=True)
    n = models.FloatField(null=True, blank=True)
    p = models.FloatField(null=True, blank=True)
    k = models.FloatField(null=True, blank=True)
    source = models.CharField(max_length=15, default="existing_data")

    class Meta:
        indexes = [
            models.Index(fields=["plot", "ts"]),
            models.Index(fields=["device", "ts"]),
        ]

    def __str__(self):
        return f"{self.device.name} @ {self.ts} (plot={self.plot_id})"