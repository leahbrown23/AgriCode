from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ("api", "0010_chemical"),
    ]

    operations = [
        migrations.AlterField(
            model_name='soilsensorreading',
            name='Humidity',
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='soilsensorreading',
            name='Rainfall',
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='soilsensorreading',
            name='Temperature',
            field=models.FloatField(blank=True, null=True),
        ),
    ]