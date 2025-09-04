from django.core.management.base import BaseCommand
from api.models import SensorDevice, SensorData, SoilSensorReading
from django.utils import timezone
import time
import threading
import random
import signal
import sys

class Command(BaseCommand):
    help = 'Run live sensor data streaming simulation using existing SoilSensorReading data'

    def __init__(self):
        super().__init__()
        self.running = False
        self.thread = None

    def add_arguments(self, parser):
        parser.add_argument('--interval', type=int, default=30, help='Interval in seconds between readings (default: 30)')
        parser.add_argument('--stop', action='store_true', help='Stop any running simulation')
        parser.add_argument('--status', action='store_true', help='Check simulation status')

    def handle(self, *args, **options):
        if options['status']:
            self.check_status()
            return

        if options['stop']:
            self.stop_simulation()
            return

        interval = options['interval']
        self.start_simulation(interval)

    def check_status(self):
        """Check current simulation status"""
        active_devices = SensorDevice.objects.filter(is_active=True, data_source='existing_data')
        
        self.stdout.write(f'🔍 Simulation Status:')
        self.stdout.write(f'   • Active devices: {active_devices.count()}')
        
        if active_devices.exists():
            self.stdout.write(f'   • Device list:')
            for device in active_devices:
                last_reading = SensorData.objects.filter(device=device, source='live_sim').order_by('-ts').first()
                last_seen = last_reading.ts if last_reading else 'Never'
                sensor_id = device.linked_sensor_id or 'Unknown'
                plot_name = device.plot.plot_id if device.plot else 'No plot'
                self.stdout.write(f'     - {device.external_id} (Sensor {sensor_id}) on Plot {plot_name} - Last: {last_seen}')
        else:
            self.stdout.write(f'   • No active devices found')
            
        # Show available devices
        available_devices = SensorDevice.objects.filter(data_source='existing_data')
        if available_devices.exists():
            self.stdout.write(f'\n📋 Available devices:')
            for device in available_devices:
                status_emoji = '✅' if device.is_active else '❌'
                sensor_id = device.linked_sensor_id or 'Unknown'
                plot_name = device.plot.plot_id if device.plot else 'No plot'
                self.stdout.write(f'   {status_emoji} {device.external_id} (Sensor {sensor_id}) on Plot {plot_name}')

    def start_simulation(self, interval):
        """Start the simulation"""
        # Check if any devices are available
        available_devices = SensorDevice.objects.filter(data_source='existing_data')
        if not available_devices.exists():
            self.stdout.write(self.style.ERROR('No sensor devices found. Connect sensors through the wizard first.'))
            return

        active_devices = available_devices.filter(is_active=True)
        if not active_devices.exists():
            self.stdout.write(self.style.WARNING('No active devices found. Use the sensor wizard to activate devices.'))
            self.stdout.write('Available devices:')
            for device in available_devices:
                sensor_id = device.linked_sensor_id or 'Unknown'
                plot_name = device.plot.plot_id if device.plot else 'No plot'
                self.stdout.write(f'  • {device.external_id} (Sensor {sensor_id}) on Plot {plot_name} (inactive)')
            return

        if self.running:
            self.stdout.write(self.style.WARNING('Simulation is already running'))
            return

        # Set up signal handlers for graceful shutdown
        signal.signal(signal.SIGINT, self.signal_handler)
        signal.signal(signal.SIGTERM, self.signal_handler)

        self.running = True
        self.thread = threading.Thread(target=self.simulation_loop, args=(interval,))
        self.thread.daemon = True
        self.thread.start()

        self.stdout.write(self.style.SUCCESS(f'🚀 Started sensor simulation'))
        self.stdout.write(f'   • Interval: {interval} seconds')
        self.stdout.write(f'   • Active devices: {active_devices.count()}')
        self.stdout.write(f'   • Data source: SoilSensorReading table')
        self.stdout.write(f'   • Press Ctrl+C to stop...\n')

        try:
            # Keep the main thread alive
            while self.running:
                time.sleep(1)
        except KeyboardInterrupt:
            pass
        finally:
            self.stop_simulation()

    def stop_simulation(self):
        """Stop the simulation gracefully"""
        if not self.running:
            self.stdout.write(self.style.WARNING('No simulation is currently running'))
            return

        self.stdout.write('\n🛑 Stopping sensor simulation...')
        self.running = False
        
        if self.thread and self.thread.is_alive():
            self.thread.join(timeout=5)
        
        self.stdout.write(self.style.SUCCESS('✅ Sensor simulation stopped'))

    def signal_handler(self, signum, frame):
        """Handle shutdown signals"""
        self.stop_simulation()
        sys.exit(0)

    def simulation_loop(self, interval):
        """Main simulation loop that generates live data"""
        self.stdout.write('📡 Simulation loop started...\n')
        
        while self.running:
            try:
                active_devices = SensorDevice.objects.filter(is_active=True, data_source='existing_data')
                
                if not active_devices.exists():
                    self.stdout.write('⚠️  No active devices found, waiting...')
                    time.sleep(interval)
                    continue

                readings_generated = 0
                
                for device in active_devices:
                    try:
                        self.generate_next_reading(device)
                        readings_generated += 1
                    except Exception as e:
                        self.stdout.write(f'❌ Error generating reading for {device.external_id}: {str(e)}')

                if readings_generated > 0:
                    timestamp = timezone.now().strftime('%H:%M:%S')
                    self.stdout.write(f'📊 [{timestamp}] Generated {readings_generated} live readings')

                # Wait for next interval
                time.sleep(interval)

            except Exception as e:
                self.stdout.write(f'❌ Simulation loop error: {str(e)}')
                time.sleep(5)  # Wait before retrying

    def generate_next_reading(self, device):
        """Generate next reading using data from SoilSensorReading table"""
        try:
            if not device.linked_sensor_id:
                self.stdout.write(f'⚠️  Device {device.external_id} has no linked sensor ID')
                return

            # Get historical readings from your existing table
            historical_readings = SoilSensorReading.objects.filter(
                sensor_id=device.linked_sensor_id
            ).order_by('timestamp')

            if not historical_readings.exists():
                self.stdout.write(f'⚠️  No data found for sensor {device.linked_sensor_id}')
                return

            # Use sim_seq to cycle through historical data
            total_readings = historical_readings.count()
            current_index = device.sim_seq % total_readings
            source_reading = historical_readings[current_index]

            # Create new "live" reading with current timestamp but historical data + variation
            new_reading = SensorData.objects.create(
                device=device,
                plot=device.plot,
                ts=timezone.now(),
                ph=self.add_realistic_variation(source_reading.pH_level, 0.1, 0, 14),
                moisture=self.add_realistic_variation(source_reading.moisture_level, 2.0, 0, 100),
                n=self.add_realistic_variation(source_reading.N, 1.5, 0, None),
                p=self.add_realistic_variation(source_reading.P, 1.0, 0, None),
                k=self.add_realistic_variation(source_reading.K, 1.5, 0, None),
                source='live_sim'
            )

            # Update device sequence and last seen
            device.sim_seq = (current_index + 1) % total_readings
            device.last_seen = timezone.now()
            device.save()

            # Log with device name for better readability
            plot_name = device.plot.plot_id if device.plot else 'NoPlot'
            self.stdout.write(
                f'   🌱 S{device.linked_sensor_id:<3} {plot_name:<8} | '
                f'pH:{new_reading.ph:5.1f} | '
                f'H₂O:{new_reading.moisture:5.1f}% | '
                f'NPK:({new_reading.n:4.1f},{new_reading.p:4.1f},{new_reading.k:4.1f})'
            )

        except Exception as e:
            self.stdout.write(f'❌ Error in generate_next_reading for {device.external_id}: {str(e)}')

    def add_realistic_variation(self, value, variation_range, min_val=None, max_val=None):
        """Add realistic random variation to sensor readings"""
        if value is None:
            return None

        # Add random variation
        variation = random.uniform(-variation_range, variation_range)
        new_value = value + variation

        # Apply bounds if specified
        if min_val is not None:
            new_value = max(min_val, new_value)
        if max_val is not None:
            new_value = min(max_val, new_value)

        return round(new_value, 2)