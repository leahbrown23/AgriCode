from django.contrib.auth.models import AbstractUser
from django.db import models
from django.conf import settings
from forum.models import Thread

class CustomUser(AbstractUser):
    phone_number = models.CharField(max_length=50, blank=True, null=True)
    
    def __str__(self):
        return self.username

# Add this new model for the favorites functionality
class CustomerFavoriteThread(models.Model):
    customer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='customer_favorites')
    thread = models.ForeignKey(Thread, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'api_customer_favorite_threads'  # This will use your Supabase table name
        unique_together = ['customer', 'thread']  # Prevent duplicate favorites
    
    def __str__(self):
        return f"{self.customer.username} - {self.thread.title}"

# Rest of your existing models...
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
    plot = models.ForeignKey(Plot, to_field='unique_plot_key', on_delete=models.CASCADE, null=True)
    crop_type = models.CharField(max_length=100)
    crop_variety = models.CharField(max_length=100)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="planting")

    def __str__(self):
        return f"{self.crop_type} ({self.plot_number})"


class Harvest(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    plot = models.ForeignKey(Plot, on_delete=models.CASCADE)
    crop_type = models.CharField(max_length=100, default="Unknown")
    crop_variety = models.CharField(max_length=100, default="Unknown")
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    yield_amount = models.FloatField()
    comments = models.TextField(default="", blank=True)

    def __str__(self):
        return f"Harvest {self.crop_type} on {self.plot} ({self.end_date})"


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
        return f"{self.plot_number} - {self.timestamp}"