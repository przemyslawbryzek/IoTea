import logging
import threading
import time

from screen_manager import ScreenState

logger = logging.getLogger(__name__)


class BrewManager:
    def __init__(
        self,
        mqtt_client,
        config_manager=None,
        screen_manager=None,
        temperature_sensor=None,
        heater_manager=None,
        pump_manager=None,
    ):
        self.mqtt_client = mqtt_client
        self.config_manager = config_manager
        self.screen_manager = screen_manager
        self.temperature_sensor = temperature_sensor
        self.heater_manager = heater_manager
        self.pump_manager = pump_manager
        self.current_brew = None
        self.brew_start_time = None
        self.selected_tea = None
        self.selected_instructions = None
        self._brew_thread = None
        self._stop_event = threading.Event()
        self._brew_lock = threading.Lock()

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
                'startTime': None
            }
            self.brew_start_time = None
            self.mqtt_client.publish_status(f'brewing_{brew_number}')
            if brew_id:
                self.mqtt_client.publish_brew_ack(brew_id, "starting")

            self._start_brew_pipeline()

        except Exception as e:
            logger.error(f"Error handling brew start: {e}")
            self.mqtt_client.publish_status('error')

    def handle_brew_stop(self, command):
        try:
            logger.info("Stopping brew")
            self._stop_brew_pipeline()
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

            self._stop_brew_pipeline()

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
            brew_temperature_celsius = instructions.get('temperature_c')
            volume_ml = instructions.get('volume_ml')
            
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
                'brewTemperatureCelsius': brew_temperature_celsius,
                'volumeMl': volume_ml,
                'source': 'local'
            }
            self.brew_start_time = None
            
            logger.info(f"Starting local brew: {tea['name']} ({instructions['style']}) - {duration}s")
            self.mqtt_client.publish_status(f"brewing_{tea['name']}")
            
            if self.screen_manager:
                self.screen_manager.set_brewing(True, 0)

            self._start_brew_pipeline()
            
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

    def _start_brew_pipeline(self):
        if self._brew_thread and self._brew_thread.is_alive():
            logger.warning("Brew pipeline already running")
            return

        self._stop_event.clear()
        self._brew_thread = threading.Thread(target=self._run_brew_pipeline, daemon=True)
        self._brew_thread.start()

    def _stop_brew_pipeline(self):
        self._stop_event.set()
        self._stop_hardware()

    def _run_brew_pipeline(self):
        with self._brew_lock:
            brew = dict(self.current_brew) if self.current_brew else None

        if not brew:
            return

        target_temp, volume_ml = self._resolve_brew_targets(brew)
        brew_id = brew.get('brewId')

        try:
            if target_temp is not None and self.heater_manager and self.temperature_sensor:
                self._publish_brew_stage(brew_id, "heating")
                self._set_screen_state(ScreenState.HEATING, f"Heating to {target_temp}C")
                self._heat_to_target(target_temp)

            if self._stop_event.is_set():
                return

            if volume_ml is not None and self.pump_manager:
                self._publish_brew_stage(brew_id, "pumping")
                self._set_screen_state(ScreenState.PUMPING, f"Dispensing {volume_ml}ml")
                self._pump_volume(volume_ml)

            if self._stop_event.is_set():
                return

            self._publish_brew_stage(brew_id, "brewing")
            self._set_screen_state(ScreenState.BREWING, None)
            with self._brew_lock:
                if self.current_brew:
                    self.brew_start_time = time.time()
                    self.current_brew['startTime'] = self.brew_start_time

        except Exception as e:
            logger.error(f"Brew pipeline error: {e}")
            self.mqtt_client.publish_status('error')
            self._stop_hardware()

    def _resolve_brew_targets(self, brew):
        target_temp = brew.get('brewTemperatureCelsius')
        if target_temp is None:
            target_temp = brew.get('brew_temperature_celsius')
        if target_temp is None:
            target_temp = brew.get('temperature_c')

        volume_ml = brew.get('volumeMl')
        if volume_ml is None:
            volume_ml = brew.get('volume_ml')

        target_temp = self._to_float(target_temp)
        volume_ml = self._to_float(volume_ml)

        return target_temp, volume_ml

    def _to_float(self, value):
        if value is None:
            return None
        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    def _heat_to_target(
        self,
        target_celsius,
        tolerance_celsius: float = 0.5,
        max_seconds: float = 1200,
        poll_interval: float = 1.0,
    ):
        start_time = time.time()

        self.heater_manager.on()
        try:
            while not self._stop_event.is_set():
                if time.time() - start_time >= max_seconds:
                    raise TimeoutError(
                        f"Max heating time exceeded ({max_seconds}s) before reaching target"
                    )

                try:
                    current_temp = self.temperature_sensor.get_temperature()
                except Exception as error:
                    logger.warning("Temperature read failed: %s", error)
                    time.sleep(poll_interval)
                    continue

                if current_temp >= target_celsius - tolerance_celsius:
                    return
                time.sleep(poll_interval)
        finally:
            self.heater_manager.off()

    def _pump_volume(self, volume_ml):
        if volume_ml <= 0:
            return
        if self.pump_manager.flow_lpm <= 0:
            raise ValueError("flow_lpm must be > 0")

        ml_per_second = (self.pump_manager.flow_lpm * 1000.0) / 60.0
        total_seconds = volume_ml / ml_per_second

        self.pump_manager.on()
        start_time = time.time()
        try:
            while not self._stop_event.is_set() and (time.time() - start_time) < total_seconds:
                time.sleep(0.1)
        finally:
            self.pump_manager.off()

    def _stop_hardware(self):
        if self.heater_manager:
            try:
                self.heater_manager.off()
            except Exception:
                pass

        if self.pump_manager:
            try:
                self.pump_manager.off()
            except Exception:
                pass

        self._set_screen_state(ScreenState.STARTUP, None)

    def _set_custom_message(self, message):
        if not self.screen_manager:
            return

        if message:
            self.screen_manager.set_custom_message(message)
        else:
            self.screen_manager.clear_custom_message()

    def _publish_brew_stage(self, brew_id, status):
        if not brew_id or not self.mqtt_client:
            return
        try:
            self.mqtt_client.publish_brew_ack(brew_id, status)
        except Exception as error:
            logger.warning("Failed to publish brew stage %s: %s", status, error)

    def _set_screen_state(self, state, message):
        if not self.screen_manager:
            return

        if message:
            self.screen_manager.set_custom_message(message)
        else:
            self.screen_manager.clear_custom_message()

        if state == ScreenState.BREWING:
            self.screen_manager.set_brewing(True, 0)
        else:
            self.screen_manager.set_brewing(False)

        self.screen_manager.set_state(state)
