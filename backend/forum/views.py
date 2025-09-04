from django.shortcuts import render
from rest_framework import viewsets, status
from .models import Topic, Thread, ChatMessage
from .serializers import TopicSerializer, ThreadSerializer, ChatMessageSerializer
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.pagination import LimitOffsetPagination
import requests


class ChatPagination(LimitOffsetPagination):
    default_limit = 10
    max_limit = 50

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
            # Sort threads by creation date, newest first
            queryset = queryset.order_by('-created_at')
        elif sort_by == 'trending':
            # Sort threads by number of views, highest first
            queryset = queryset.order_by('-views')
        elif sort_by == 'popular':
            # Sort threads by number of messages, highest first
            queryset = sorted(queryset, key=lambda t: t.messages.count(), reverse=True)

        return queryset
    
    def perform_create(self, serializer):
        # Save the thread first
        thread = serializer.save(user=self.request.user)
        message_content = self.request.data.get("message")
        print(">> Debug message:", message_content)
        print(">> Thread ID:", thread.id)
        if message_content:
            ChatMessage.objects.create(
                thread=thread,
                user=self.request.user,
                content=message_content
            )

class ChatMessageViewSet(viewsets.ModelViewSet):
    queryset = ChatMessage.objects.all()
    serializer_class = ChatMessageSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = ChatPagination

    def get_queryset(self):
        thread_id = self.request.query_params.get('thread')
        if thread_id:
            return ChatMessage.objects.filter(thread_id=thread_id).order_by('-created_at')
        return ChatMessage.objects.none()

    def create(self, request, *args, **kwargs):
        message = request.data.get("content", "")

        try:
            res = requests.post(
                "https://vector.profanity.dev",
                json={"message": message},
                timeout=5,
            )
            data = res.json()

            # Adjust check depending on API response format
            if data.get("isProfanity"):
                return Response(
                    {"error": "Message contains inappropriate language."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        except requests.RequestException:
            return Response(
                {"error": "Profanity check service unavailable."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user)

        return Response(serializer.data, status=status.HTTP_201_CREATED)

