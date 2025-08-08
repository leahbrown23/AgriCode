from django.db import models
from django.conf import settings

class Topic(models.Model):
    title = models.CharField(max_length=100)

    def __str__(self):
        return self.title

class Thread(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='threads',
        null=True,
        blank=True  # allow empty in forms
    )
    topic = models.ForeignKey(Topic, on_delete=models.CASCADE, related_name='threads')
    title = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    views = models.PositiveIntegerField(default=0)

    def __str__(self):
        return self.title

class ChatMessage(models.Model):
    thread = models.ForeignKey(Thread, on_delete=models.CASCADE, related_name='messages')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'forum_chatmessage'

    def __str__(self):
        return f"Message by {self.user.username}: {self.content[:50]}"