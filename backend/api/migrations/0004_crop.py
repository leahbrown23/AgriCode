# Generated by Django 5.2.1 on 2025-06-19 11:28

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0003_remove_customuser_farm_name_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='Crop',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('plot_number', models.CharField(max_length=100)),
                ('crop_type', models.CharField(max_length=100)),
                ('crop_variety', models.CharField(max_length=100)),
                ('farm', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='api.farm')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]
