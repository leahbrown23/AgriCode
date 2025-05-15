from rest_framework import serializers
from .models import Topic, Thread, ChatMessage

class TopicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Topic
        fields = ['id', 'title']

class ThreadSerializer(serializers.ModelSerializer):
    message_count = serializers.SerializerMethodField()

    class Meta:
        model = Thread
        fields = ['id', 'title', 'topic', 'created_at', 'views', 'message_count']

    def get_message_count(self, obj):
        return obj.messages.count()

class ChatMessageSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField()  # returns username

    class Meta:
        model = ChatMessage
        fields = ['id', 'thread', 'user', 'content', 'created_at']
