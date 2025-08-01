from rest_framework import serializers
from .models import CustomUser, Farm, Crop, SoilSensorReading, Plot, CustomerFavoriteThread, Harvest
from django.contrib.auth.password_validation import validate_password
from forum.models import Thread

class CustomerFavoriteThreadSerializer(serializers.ModelSerializer):
    thread_id = serializers.IntegerField(source='thread.id', read_only=True)

    class Meta:
        model = CustomerFavoriteThread
        fields = ['id', 'thread_id', 'created_at']

class FavoriteThreadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Thread
        fields = ['id', 'title', 'content', 'created_at']

class RegisterSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'email', 'password', 'first_name',
            'last_name', 'phone_number'
        ]
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        user = CustomUser.objects.create_user(**validated_data)
        return user

class FarmSerializer(serializers.ModelSerializer):
    class Meta:
        model = Farm
        fields = '__all__'
        read_only_fields = ['user']

class CropSerializer(serializers.ModelSerializer):
    class Meta:
        model = Crop
        fields = '__all__'
        read_only_fields = ['user', 'farm']

class HarvestSerializer(serializers.ModelSerializer):
    plot_number = serializers.SerializerMethodField()
    crop_type = serializers.SerializerMethodField()
    crop_variety = serializers.SerializerMethodField()

    def get_plot_number(self, obj):
        return obj.plot.plot_id if obj.plot else None

    def get_crop_type(self, obj):
        return obj.crop.crop_type if obj.crop else None

    def get_crop_variety(self, obj):
        return obj.crop.crop_variety if obj.crop else None

    class Meta:
        model = Harvest
        fields = [
            'id',
            'user',
            'plot',
            'plot_number',
            'crop',
            'crop_type',
            'crop_variety',
            'start_date',
            'end_date',
            'yield_amount',
            'comments',
        ]
        read_only_fields = ['user', 'plot', 'crop']

class SoilSensorReadingSerializer(serializers.ModelSerializer):
    class Meta:
        model = SoilSensorReading
        fields = '__all__'
        read_only_fields = ['user']

class PlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plot
        fields = '__all__'
        read_only_fields = ['user', 'unique_plot_key']
