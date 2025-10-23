from rest_framework import serializers
from .models import Recommendation

class RecommendationSerializer(serializers.ModelSerializer):
    harvest_id = serializers.IntegerField(source="harvest.id", read_only=True)
    user_id = serializers.IntegerField(source="user.id", read_only=True)

    class Meta:
        model = Recommendation
        fields = [
            "id",
            "user_id",
            "harvest_id",
            "input_data",
            "output_data",
            "status",
            "created_at",
        ]
        read_only_fields = ["id", "user_id", "harvest_id", "created_at"]
