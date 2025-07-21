from django.contrib.auth.models import AbstractUser
from django.db import models
from django.conf import settings
from forum.models import Thread

# Create your models here.
class CustomUser(AbstractUser):
    favorite_threads = models.ManyToManyField(Thread, related_name="favorited_by", blank=True)
    phone_number = models.CharField(max_length=50, blank=True, null=True)  # Add this line
    
    def __str__(self):
        return self.username

# Rest of your models stay the same...
class Farm(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    farm_name = models.CharField(max_length=100)
    location = models.CharField(max_length=100)
    crop_types = models.CharField(max_length=255)
    size = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    has_livestock = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.farm_name} ({self.user.email})"
    
class Crop(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    farm = models.ForeignKey(Farm, on_delete=models.CASCADE)
    plot_number = models.CharField(max_length=100)
    crop_type = models.CharField(max_length=100)
    crop_variety = models.CharField(max_length=100)

    def __str__(self):
        return f"{self.crop_type} ({self.plot_number})"
    
class SoilSensorReading(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    plot_number = models.CharField(max_length=100)
    sensor_id = models.IntegerField()
    pH_level = models.FloatField()
    N = models.FloatField()
    P = models.FloatField()
    K = models.FloatField()
    moisture_level = models.FloatField()
    timestamp = models.DateTimeField()

    def __str__(self):
        return f"{self.plot_id} - {self.timestamp}"
    
class Plot(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    plot_id = models.CharField(max_length=50)  # Farmer's local plot number
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