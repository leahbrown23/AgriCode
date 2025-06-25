from rest_framework import serializers
from .models import CustomUser, Farm, Crop
from django.contrib.auth.password_validation import validate_password

class RegisterSerializer(serializers.ModelSerializer):
    farm_name = serializers.CharField(max_length=100, write_only=True)  # Add this
    
    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'password', 'first_name', 'last_name', 'phone_number', 'farm_name']  # Add phone_number and farm_name
        extra_kwargs = {'password': {'write_only': True}}

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        # Extract farm_name before creating user
        farm_name = validated_data.pop('farm_name', '')
        
        # Create the user
        user = CustomUser.objects.create_user(**validated_data)
        
        # Create the farm if farm_name is provided
        if farm_name:
            Farm.objects.create(
                user=user,
                farm_name=farm_name,
                location='',  # You can set default values or make these optional
                crop_types=''
            )
        
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