from django.shortcuts import render
from rest_framework import viewsets
from .models import Topic, Thread, ChatMessage
from .serializers import TopicSerializer, ThreadSerializer, ChatMessageSerializer
from rest_framework.permissions import IsAuthenticated


class TopicViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Topic.objects.all()
    serializer_class = TopicSerializer
    permission_classes = [IsAuthenticated]

class ThreadViewSet(viewsets.ModelViewSet):
    queryset = Thread.objects.all() 
    serializer_class = ThreadSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        topic_id = self.request.query_params.get('topic')
        queryset = Thread.objects.all()
        if topic_id:
            queryset = queryset.filter(topic_id=topic_id)

        sort_by = self.request.query_params.get('sort')
        if sort_by == 'new':
            queryset = queryset.order_by('-created_at')
        elif sort_by == 'trending':
            queryset = queryset.order_by('-views')
        elif sort_by == 'popular':
            queryset = sorted(queryset, key=lambda t: t.messages.count(), reverse=True)

        return queryset

class ChatMessageViewSet(viewsets.ModelViewSet):
    queryset = ChatMessage.objects.all()
    serializer_class = ChatMessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        thread_id = self.request.query_params.get('thread')
        if thread_id:
            return ChatMessage.objects.filter(thread_id=thread_id).order_by('-created_at')
        return ChatMessage.objects.none()

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

# Create your views here.
