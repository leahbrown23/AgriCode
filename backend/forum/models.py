from django.db import models
from django.conf import settings

class Topic(models.Model):
    title = models.CharField(max_length=100)

    def __str__(self):
        return self.title

class Thread(models.Model):
    topic = models.ForeignKey(Topic, on_delete=models.CASCADE, related_name='threads')
    title = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    views = models.PositiveIntegerField(default=0)

class ChatMessage(models.Model):
    thread = models.ForeignKey(Thread, on_delete=models.CASCADE, related_name='messages')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

