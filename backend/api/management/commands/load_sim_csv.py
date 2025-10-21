import csv
import os
from django.core.management.base import BaseCommand
from api.models import SensorDevice, SensorData, Plot, CustomUser
from django.utils import timezone
from datetime import timedelta

class Command(BaseCommand):
    help = 'Load sensor simulation data from CSV file into SensorDevice and SensorData models'

    def add_arguments(self, parser):
        parser.add_argument('csv_path', type=str, help='Path to CSV file')
        parser.add_argument('--user_id', type=int, default=1, help='User ID to create demo plots for')
        parser.add_argument('--clear', action='store_true', help='Clear existing data before loading')

    def handle(self, *args, **options):
        csv_path = options['csv_path']
        user_id = options['user_id']
        clear_existing = options['clear']

        if not os.path.exists(csv_path):
            self.stdout.write(self.style.ERROR(f'CSV file not found: {csv_path}'))
            return

        try:
            # Verify user exists
            try:
                user = CustomUser.objects.get(id=user_id)
                self.stdout.write(f'Loading data for user: {user.username} (ID: {user_id})')
            except CustomUser.DoesNotExist:
                self.stdout.write(self.style.ERROR(f'User with ID {user_id} does not exist'))
                return

            # Clear existing data if requested
            if clear_existing:
                SensorData.objects.filter(source='simulated').delete()
                SensorDevice.objects.filter(data_source='simulated').delete()
                self.stdout.write('Cleared existing simulation data')

            # Define sensor configurations
            sensor_configs = [
                {'external_id': 'SOIL_001', 'name': 'North Field Monitor', 'plot_id': 'DEMO_001', 'farm_section': 'North Field'},
                {'external_id': 'SOIL_002', 'name': 'South Field Monitor', 'plot_id': 'DEMO_002', 'farm_section': 'South Field'},
                {'external_id': 'SOIL_003', 'name': 'East Field Monitor', 'plot_id': 'DEMO_003', 'farm_section': 'East Field'},
                {'external_id': 'SOIL_004', 'name': 'West Field Monitor', 'plot_id': 'DEMO_004', 'farm_section': 'West Field'},
            ]

            # Read CSV and group data by external_id
            csv_data = {}
            total_rows = 0

            with open(csv_path, newline='', encoding='utf-8') as csvfile:
                reader = csv.DictReader(csvfile)
                for row in reader:
                    external_id = row.get('external_id', f'SOIL_{(total_rows // 100) + 1:03d}')
                    
                    if external_id not in csv_data:
                        csv_data[external_id] = []
                    
                    csv_data[external_id].append(row)
                    total_rows += 1

            self.stdout.write(f'Read {total_rows} rows from CSV with {len(csv_data)} sensors')

            plots_created = 0
            devices_created = 0
            readings_created = 0

            # Create devices and data for each sensor configuration
            for config in sensor_configs:
                external_id = config['external_id']
                
                # Create or get plot
                plot, plot_created = Plot.objects.get_or_create(
                    user_id=user_id,
                    plot_id=config['plot_id'],
                    defaults={
                        'description': f'Demo plot for {config["farm_section"]}',
                        'size': 10.5,
                        'location': f'{config["farm_section"]} - Demo Location',
                    }
                )

                if plot_created:
                    plots_created += 1
                    self.stdout.write(f'Created plot: {config["plot_id"]}')

                # Create or get sensor device
                device, device_created = SensorDevice.objects.get_or_create(
                    external_id=external_id,
                    defaults={
                        'plot': plot,
                        'name': config['name'],
                        'data_source': 'simulated',
                        'is_active': False,
                        'sim_seq': 0
                    }
                )

                if device_created:
                    devices_created += 1
                    self.stdout.write(f'Created device: {external_id} -> {config["name"]}')
                else:
                    device.plot = plot
                    device.save()
                    self.stdout.write(f'Updated existing device: {external_id}')

                # Get data for this sensor from CSV
                sensor_rows = csv_data.get(external_id, [])
                
                # If no specific data for this sensor, use sequential chunks
                if not sensor_rows and csv_data:
                    all_rows = []
                    for rows in csv_data.values():
                        all_rows.extend(rows)
                    
                    # Divide data evenly among sensors
                    chunk_size = len(all_rows) // len(sensor_configs)
                    sensor_index = list(sensor_configs).index(config)
                    start_idx = sensor_index * chunk_size
                    end_idx = start_idx + chunk_size if sensor_index < len(sensor_configs) - 1 else len(all_rows)
                    sensor_rows = all_rows[start_idx:end_idx]

                # Clear existing readings for this device
                existing_count = SensorData.objects.filter(device=device, source='simulated').count()
                if existing_count > 0:
                    SensorData.objects.filter(device=device, source='simulated').delete()
                    self.stdout.write(f'Cleared {existing_count} existing readings for {external_id}')

                # Create sensor readings with historical timestamps
                base_time = timezone.now() - timedelta(days=30)
                
                for idx, row in enumerate(sensor_rows):
                    reading_time = base_time + timedelta(hours=idx * 2)  # Every 2 hours
                    
                    reading = SensorData.objects.create(
                        device=device,
                        plot=plot,
                        ts=reading_time,
                        ph=self.safe_float(row.get('ph'), 7.0),
                        moisture=self.safe_float(row.get('moisture'), 50.0),
                        n=self.safe_float(row.get('n'), 50.0),
                        p=self.safe_float(row.get('p'), 30.0),
                        k=self.safe_float(row.get('k'), 40.0),
                        source='simulated'
                    )
                    readings_created += 1

                self.stdout.write(f'Loaded {len(sensor_rows)} readings for {external_id}')

            # Summary
            self.stdout.write(
                self.style.SUCCESS(
                    f'\n✅ CSV data loading complete!\n'
                    f'📊 Summary:\n'
                    f'   • {plots_created} new plots created\n'
                    f'   • {devices_created} new devices created\n'
                    f'   • {readings_created} sensor readings loaded\n'
                    f'   • Total devices available: {len(sensor_configs)}\n\n'
                    f'🚀 Available sensor IDs for wizard:\n'
                    + '\n'.join([f'   • {config["external_id"]} - {config["name"]}' for config in sensor_configs])
                )
            )

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error loading CSV data: {str(e)}'))
            import traceback
            self.stdout.write(traceback.format_exc())

    def safe_float(self, value, default):
        """Safely convert value to float"""
        if value is None or value == '':
            return default
        try:
            return float(value)
        except (ValueError, TypeError):
            return default