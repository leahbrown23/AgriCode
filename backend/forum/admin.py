from django.contrib import admin
from .models import Topic, Thread, ChatMessage

admin.site.register(Topic)
admin.site.register(Thread)
admin.site.register(ChatMessage)


# Register your models here.
