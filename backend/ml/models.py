from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings
from django.utils import timezone
from api.models import Harvest

class Recommendation(models.Model):
    STATUS_CHOICES = [
        ("to_do", "To Do"),
        ("doing", "Doing"),
        ("complete", "Complete"),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    harvest = models.ForeignKey(Harvest, on_delete=models.CASCADE, related_name="recommendations")
    input_data = models.JSONField()
    output_data = models.JSONField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="to_do")
    created_at = models.DateTimeField(default=timezone.now)

    def to_dict(self):
        return {
            "id": self.id,
            "harvest_id": self.harvest.id if self.harvest else None,
            "status": self.status,
            "input_data": self.input_data,
            "output_data": self.output_data,
            "created_at": self.created_at.isoformat(),
        }
