import logging
import time
from datetime import datetime

logger = logging.getLogger(__name__)


class BrewManager:
    def __init__(self, mqtt_client):
        self.mqtt_client = mqtt_client
        self.current_brew = None
        self.brew_start_time = None

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
            brew_id = self.current_brew.get('brewId')
            brew_number = self.current_brew.get('brewNumber')

            logger.info(f"Brew #{brew_number} completed - sending brew end event")
            if brew_id:
                self.mqtt_client.publish_brew_end(brew_id)

            self.mqtt_client.publish_status('idle')

            self.current_brew = None
            self.brew_start_time = None

            logger.info(f"Brew #{brew_number} finished successfully")

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
