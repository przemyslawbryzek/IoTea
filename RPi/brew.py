import logging
import time
from datetime import datetime

logger = logging.getLogger(__name__)


class BrewManager:
    def __init__(self, mqtt_client, config_manager=None, screen_manager=None):
        self.mqtt_client = mqtt_client
        self.config_manager = config_manager
        self.screen_manager = screen_manager
        self.current_brew = None
        self.brew_start_time = None
        self.selected_tea = None
        self.selected_instructions = None

    def handle_brew_start(self, command):
        try:
            brew_id = command.get('brewId')
            brew_number = command.get('brewNumber')
            total_brew_seconds = command.get('totalBrewSeconds')
            brew_temperature_celsius = command.get('brewTemperatureCelsius')
            volume_ml = command.get('volumeMl')
            timestamp = command.get('timestamp')

            logger.info(
                f"Starting brew #{brew_number}: {volume_ml}ml, "
                f"duration={total_brew_seconds}s, "
                f"temperature={brew_temperature_celsius}°C, "
                f"brew_id={brew_id}"
            )

            self.current_brew = {
                'brewId': brew_id,
                'brewNumber': brew_number,
                'totalBrewSeconds': total_brew_seconds,
                'brewTemperatureCelsius': brew_temperature_celsius,
                'volumeMl': volume_ml,
                'timestamp': timestamp,
                'startTime': time.time()
            }
            self.brew_start_time = time.time()
            self.mqtt_client.publish_status(f'brewing_{brew_number}')
            if brew_id:
                self.mqtt_client.publish_brew_ack(brew_id, "brewing")

        except Exception as e:
            logger.error(f"Error handling brew start: {e}")
            self.mqtt_client.publish_status('error')

    def handle_brew_stop(self, command):
        try:
            logger.info("Stopping brew")
            self.mqtt_client.publish_status('idle')
            self.current_brew = None
            self.brew_start_time = None
        except Exception as e:
            logger.error(f"Error handling brew stop: {e}")
            self.mqtt_client.publish_status('error')

    def handle_brew_end(self):
        if not self.current_brew:
            logger.warning("No active brew to end")
            return

        try:
            tea_name = self.current_brew.get('tea_name', 'Unknown')
            brew_number = self.current_brew.get('brewNumber', 'local')
            infusion = self.current_brew.get('infusion_number', 1)

            logger.info(f"{tea_name} #{infusion} completed")
            
            if self.current_brew.get('source') == 'local':
                self.save_brew_to_history()
            
            if self.current_brew.get('brewId'):
                self.mqtt_client.publish_brew_end(self.current_brew['brewId'])

            self.mqtt_client.publish_status('idle')

            if self.screen_manager:
                self.screen_manager.set_brewing(False)

            self.current_brew = None
            self.brew_start_time = None

            logger.info(f"{tea_name} finished successfully")

        except Exception as e:
            logger.error(f"Error handling brew end: {e}")
            self.mqtt_client.publish_status('error')

    def get_current_brew(self):
        return self.current_brew

    def is_brewing(self):
        return self.current_brew is not None

    def get_brew_progress(self):
        if not self.current_brew or not self.brew_start_time:
            return None

        elapsed = time.time() - self.brew_start_time
        total = self.current_brew.get('totalBrewSeconds', 0)
        remaining = max(0, total - elapsed)

        return {
            'elapsed': elapsed,
            'total': total,
            'remaining': remaining,
            'progress_percent': (elapsed / total * 100) if total > 0 else 0
        }
    
    def start_local_brew(self, tea, instructions):
        """Start a brew selected locally (not from MQTT)"""
        if not tea or not instructions:
            logger.error("Invalid tea or instructions for local brew")
            return False
        
        try:
            duration = instructions['first_infusion_seconds']
            
            self.current_brew = {
                'tea_id': tea['id'],
                'instructions_id': instructions['id'],
                'tea_name': tea['name'],
                'style': instructions['style'],
                'totalBrewSeconds': duration,
                'infusion_number': 1,
                'max_infusions': instructions['max_infusions'],
                'grams_per_100ml': instructions['grams_per_100ml'],
                'increment_seconds': instructions['increment_seconds'],
                'source': 'local'
            }
            self.brew_start_time = time.time()
            
            logger.info(f"Starting local brew: {tea['name']} ({instructions['style']}) - {duration}s")
            self.mqtt_client.publish_status(f"brewing_{tea['name']}")
            
            if self.screen_manager:
                self.screen_manager.set_brewing(True, 0)
            
            return True
        except Exception as e:
            logger.error(f"Error starting local brew: {e}")
            return False
    
    def save_brew_to_history(self):
        """Save completed brew to local history"""
        if not self.current_brew or not self.config_manager:
            return
        
        try:
            duration = time.time() - self.brew_start_time
            self.config_manager.save_brew_history(
                tea_id=self.current_brew.get('tea_id'),
                instructions_id=self.current_brew.get('instructions_id'),
                duration_seconds=int(duration),
                infusion_count=self.current_brew.get('infusion_number', 1),
                status='completed'
            )
            logger.info(f"Brew saved to history: {self.current_brew['tea_name']}")
        except Exception as e:
            logger.error(f"Error saving brew to history: {e}")
