from django.contrib.auth.models import AbstractUser
from django.db import models
from django.conf import settings

# Create your models here.
class CustomUser(AbstractUser):
    farm_name = models.CharField(max_length=100, blank=True)

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
