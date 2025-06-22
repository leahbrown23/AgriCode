from rest_framework import serializers
from .models import Topic, Thread, ChatMessage

class TopicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Topic
        fields = ['id', 'title']

class ThreadSerializer(serializers.ModelSerializer):
    message_count = serializers.SerializerMethodField()
    replies_count = serializers.SerializerMethodField()
    views_count = serializers.SerializerMethodField()
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = Thread
        fields = [
            'id', 'title', 'topic', 'created_at',
            'views', 'views_count', 'message_count',
            'replies_count', 'username'
        ]
        read_only_fields = [
            'id', 'created_at', 'views',
            'message_count', 'replies_count',
            'views_count', 'username'
        ]

    def get_message_count(self, obj):
        return obj.messages.count()

    def get_replies_count(self, obj):
        return obj.messages.count()

    def get_views_count(self, obj):
        return obj.views if obj.views is not None else 0

    def create(self, validated_data):
        return Thread.objects.create(**validated_data)

class ChatMessageSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField()  # returns username

    class Meta:
        model = ChatMessage
        fields = ['id', 'thread', 'user', 'content', 'created_at']
