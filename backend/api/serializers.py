from rest_framework import serializers
from .models import CustomUser, Farm, Crop, SoilSensorReading, Plot
from django.contrib.auth.password_validation import validate_password

class RegisterSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'password', 'first_name', 'last_name', 'phone_number']
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
    plot = serializers.SlugRelatedField(
        slug_field='unique_plot_key',
        queryset=Plot.objects.all()
    )

    class Meta:
        model = Crop
        fields = '__all__'
        read_only_fields = ['user', 'farm']

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
