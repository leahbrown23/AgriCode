from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.utils import timezone
from datetime import datetime
from forum.models import Thread

from .models import (
    CustomUser,
    Farm,
    Crop,
    SoilSensorReading,
    Plot,
    CustomerFavoriteThread,
    Harvest,
    SensorDevice,
    SensorData,
    Chemical
)

# -------------------------
# Thread / Favorites
# -------------------------
class CustomerFavoriteThreadSerializer(serializers.ModelSerializer):
    thread_id = serializers.IntegerField(source="thread.id", read_only=True)

    class Meta:
        model = CustomerFavoriteThread
        fields = ["id", "thread_id", "created_at"]


class FavoriteThreadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Thread
        fields = ["id", "title", "content", "created_at"]


# -------------------------
# Auth / Users
# -------------------------
class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ["id", "username", "email", "first_name", "last_name", "phone_number"]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])

    class Meta:
        model = CustomUser
        fields = [
            "id",
            "username",
            "email",
            "password",
            "first_name",
            "last_name",
            "phone_number",
        ]
        extra_kwargs = {"password": {"write_only": True}}

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = CustomUser.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        return user


# -------------------------
# Core domain models
# -------------------------
class FarmSerializer(serializers.ModelSerializer):
    class Meta:
        model = Farm
        fields = "__all__"
        read_only_fields = ["user"]


class CropSerializer(serializers.ModelSerializer):
    expected_end_date = serializers.DateTimeField(write_only=True, required=False, allow_null=True)
    pest_month = serializers.FloatField(write_only=True, required=False, allow_null=True)
    fert_month = serializers.FloatField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = Crop
        fields = [
            "id",
            "user",
            "farm",
            "plot_number",
            "plot",
            "crop_type",
            "crop_variety",
            "soil_type",
            "status",
            "expected_end_date",  
            "pest_month",
            "fert_month",
        ]
        read_only_fields = ["user"]

    def create(self, validated_data):
        expected_end_date = validated_data.pop("expected_end_date", None)
        pest_month = validated_data.pop("pest_month", None)
        fert_month = validated_data.pop("fert_month", None)

        # make sure datetime is timezone-aware
        if isinstance(expected_end_date, datetime) and expected_end_date.tzinfo is None:
            expected_end_date = timezone.make_aware(expected_end_date)

        crop = super().create(validated_data)

        user = getattr(crop, "user", None)
        plot = getattr(crop, "plot", None)
        if user and plot:
            # Create the Harvest record
            harvest = Harvest.objects.create(
                crop_id=crop.id,
                user=user,
                plot=plot,
                crop_type=crop.crop_type or "Unknown",
                crop_variety=crop.crop_variety or "Unknown",
                start_date=timezone.now(),
                expected_end_date=expected_end_date,
                end_date=None,
                yield_amount=0,
                comments="",
            )

            # Create the Chemicals record (if pest/fert values provided)
            if pest_month is not None and fert_month is not None and expected_end_date:
                harvest_days = (expected_end_date.date() - harvest.start_date.date()).days
                pest_days = pest_month / 30
                fert_days = fert_month / 30
                Chemical.objects.create(
                    harvest=harvest,
                    pest_month=pest_month,
                    fert_month=fert_month,
                    harvest_days=harvest_days,
                    pest_days=pest_days,
                    fert_days=fert_days,
                    pest_total=pest_days * harvest_days,
                    fert_total=fert_days * harvest_days,
                )

        return crop


class HarvestSerializer(serializers.ModelSerializer):
    # Expose public plot code to make frontend joins trivial
    plot_number = serializers.SerializerMethodField()

    def get_plot_number(self, obj):
        return obj.plot.plot_id if obj.plot else None

    class Meta:
        model = Harvest
        fields = [
            "id",
            "user",
            "plot",
            "plot_number",   # public code
            "crop_type",
            "crop_variety",
            "start_date",
            "expected_end_date",
            "end_date",
            "yield_amount",
            "comments",
        ]
        read_only_fields = ["user", "plot"]


class SoilSensorReadingSerializer(serializers.ModelSerializer):
    class Meta:
        model = SoilSensorReading
        fields = "__all__"
        read_only_fields = ["user"]


class PlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plot
        fields = "__all__"
        read_only_fields = ["user", "unique_plot_key"]

    def create(self, validated_data):
        request = self.context.get("request")
        if request and request.user:
            validated_data["user"] = request.user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop("user", None)
        return super().update(instance, validated_data)


# -------------------------
# NEW Sensor Connection System
# -------------------------
class SensorValidateSerializer(serializers.Serializer):
    sensor_id = serializers.IntegerField()

    def validate(self, attrs):
        sensor_id = attrs["sensor_id"]
        qs = SoilSensorReading.objects.filter(sensor_id=sensor_id)
        if not qs.exists():
            raise serializers.ValidationError(f"No sensor data found for sensor ID: {sensor_id}")
        attrs["count"] = qs.count()
        return attrs


class SensorConnectSerializer(serializers.Serializer):
    plot_id = serializers.IntegerField()
    device_name = serializers.CharField(max_length=100)
    sensor_id = serializers.IntegerField()

    def validate(self, attrs):
        request = self.context.get("request")
        user = request.user if request else None

        # 1) plot must exist and belong to user
        try:
            plot = Plot.objects.get(pk=attrs["plot_id"], user=user)
        except Plot.DoesNotExist:
            raise serializers.ValidationError("Plot not found or does not belong to you.")

        # 2) Sensor ID must exist in your data
        sensor_id = attrs["sensor_id"]
        if not SoilSensorReading.objects.filter(sensor_id=sensor_id).exists():
            raise serializers.ValidationError(f"Sensor ID {sensor_id} not found in sensor data.")

        attrs["plot_obj"] = plot
        return attrs


class SensorDeviceSerializer(serializers.ModelSerializer):
    plot_name = serializers.CharField(source="plot.plot_id", read_only=True)

    class Meta:
        model = SensorDevice
        fields = [
            "id",
            "plot",
            "plot_name",
            "name",
            "external_id",
            "linked_sensor_id",
            "data_source",
            "is_active",
            "sim_seq",
            "last_seen",
        ]


class SensorDataSerializer(serializers.ModelSerializer):
    device_name = serializers.CharField(source="device.name", read_only=True)
    plot_name = serializers.CharField(source="plot.plot_id", read_only=True)

    class Meta:
        model = SensorData
        fields = [
            "id",
            "device",
            "device_name",
            "plot",
            "plot_name",
            "ts",
            "ph",
            "moisture",
            "n",
            "p",
            "k",
            "source",
        ]
