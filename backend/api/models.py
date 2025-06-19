from django.contrib.auth.models import AbstractUser
from django.db import models
from django.conf import settings
from forum.models import Thread

# Create your models here.
class CustomUser(AbstractUser):
    favorite_threads = models.ManyToManyField(Thread, related_name="favorited_by", blank=True)
    def __str__(self):
        return self.username
    


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
