import sys
import time
import signal
import logging
import threading
from enum import Enum
from datetime import datetime

from config_manager import ConfigManager
from wifi_manager import WiFiManager
from mqtt_client import MQTTClient
from ble_server import BLEServer
from brew import BrewManager
from screen_manager import ScreenManager, ScreenState
from menus import MenuManager
from encoder import EncoderController
from DS18B20 import DS18B20Sensor
from heater_manager import HeaterManager
from pump_manager import PumpManager

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class NullMQTTClient:
    def __init__(self, device_id: str = 'offline'):
        self.device_id = device_id

    def connect(self):
        return False

    def disconnect(self):
        return None

    def reconnect(self, max_retries: int = 5):
        return False

    def is_connected(self):
        return False

    def get_commands(self):
        return []

    def publish_status(self, status: str):
        return False
    def publish_telemetry(self, temperature: float):
        return False

    def publish_command_ack(self, command_id: str, result: str):
        return False

    def publish_brew_ack(self, brew_id: int, status: str = 'brewing'):
        return False

    def publish_brew_end(self, brew_id: int):
        return False

class DeviceState(Enum):
    STARTUP = "startup"
    CHECKING_CONFIG = "checking_config"
    OFFLINE_MODE = "offline_mode"
    BLE_PAIRING = "ble_pairing"
    CONFIGURING = "configuring"
    ONLINE_MODE = "online_mode"
    CONNECTING_WIFI = "connecting_wifi"
    CONNECTING_MQTT = "connecting_mqtt"
    OPERATIONAL = "operational"
    RECONNECTING = "reconnecting"
    SHUTDOWN = "shutdown"

class TeaDevice:
    def __init__(self):
        self.state = DeviceState.STARTUP
        self.config_manager = ConfigManager()
        self.wifi_manager = WiFiManager()
        self.mqtt_client = NullMQTTClient()
        self.ble_server = None
        self.brew_manager = None
        self.temperature_sensor = DS18B20Sensor()
        self.heater_manager = HeaterManager(pin=12, active_high=True)
        self.pump_manager = PumpManager(pin=13, active_high=True)
        self.screen_manager = ScreenManager(self.temperature_sensor)
        self.menu_manager = None
        self.encoder_controller = None
        self.running = True
        self.online = False
        self._last_status_publish = 0
        self._status_interval = 30
        self._ble_start_time = 0
        self._ble_timeout = 300
        signal.signal(signal.SIGINT, self.shutdown)
        signal.signal(signal.SIGTERM, self.shutdown)

    def run(self):
        logger.info(f"Starting IoT Tea Device - State: {self.state.value}")
        self.screen_manager.start()
        self._update_screen_state()
        while self.running:
            try:
                if self.state == DeviceState.STARTUP:
                    self._handle_startup()

                elif self.state == DeviceState.CHECKING_CONFIG:
                    self._handle_check_config()

                elif self.state == DeviceState.OFFLINE_MODE:
                    self._handle_offline_mode()

                elif self.state == DeviceState.BLE_PAIRING:
                    self._handle_ble_pairing()

                elif self.state == DeviceState.CONFIGURING:
                    self._handle_configuring()

                elif self.state == DeviceState.ONLINE_MODE:
                    self._handle_online_mode()

                elif self.state == DeviceState.CONNECTING_WIFI:
                    self._handle_connecting_wifi()

                elif self.state == DeviceState.CONNECTING_MQTT:
                    self._handle_connecting_mqtt()

                elif self.state == DeviceState.OPERATIONAL:
                    self._handle_operational()

                elif self.state == DeviceState.RECONNECTING:
                    self._handle_reconnecting()

                elif self.state == DeviceState.SHUTDOWN:
                    break

                time.sleep(0.1)

            except Exception as e:
                logger.error(f"Error in state {self.state.value}: {e}")
                self._enter_local_operation("Recovering in local mode after error")

    def _update_screen_state(self):
        loading_states = {
            DeviceState.STARTUP, DeviceState.CHECKING_CONFIG,
            DeviceState.ONLINE_MODE, DeviceState.CONNECTING_WIFI,
            DeviceState.CONNECTING_MQTT, DeviceState.RECONNECTING
        }
        
        if self.state in loading_states:
            screen_state = ScreenState.STARTUP
        elif self.state == DeviceState.BLE_PAIRING:
            screen_state = ScreenState.BLE_PAIRING
        else:
            screen_state = ScreenState.STARTUP
        
        self.screen_manager.set_state(screen_state)
        
        config = self.config_manager.get_full_config()
        if config.get('device_id'):
            self.screen_manager.set_device_id(config['device_id'])

    def _handle_startup(self):
        logger.info("Initializing device...")
        self.config_manager.init_db()
        self.state = DeviceState.CHECKING_CONFIG
        self._update_screen_state()

    def _handle_check_config(self):
        config = self.config_manager.get_full_config()
        has_wifi = config.get('wifi_ssid') and config.get('wifi_password')
        has_mqtt = config.get('mqtt_username') and config.get('mqtt_password')

        if has_wifi and has_mqtt:
            logger.info("Full configuration found - starting online mode")
            self.state = DeviceState.ONLINE_MODE
        else:
            logger.info("No full configuration - starting local offline brewing mode")
            self._enter_local_operation("No full configuration available")

    def _handle_offline_mode(self):
        logger.info("Offline mode - keeping local brewing available")
        self._enter_local_operation("Offline fallback")

    def _handle_ble_pairing(self):
        if not self.ble_server:
            logger.info("Starting BLE server from settings")
            self._start_ble_pairing_mode()
            return

        config_data = self.ble_server.get_received_config()

        if config_data:
            logger.info(f"Received config from BLE: {config_data['device_id']}")
            self.ble_server.stop()
            self.ble_server = None
            self.config_manager.save_ble_config(config_data)
            self.state = DeviceState.CONFIGURING
            self._update_screen_state()
        elif time.time() - self._ble_start_time > self._ble_timeout:
            logger.warning(f"BLE pairing timeout after {self._ble_timeout}s")
            if self.ble_server:
                self.ble_server.stop()
                self.ble_server = None
            self._enter_local_operation("BLE pairing timeout")

    def _handle_configuring(self):
        config = self.config_manager.get_full_config()
        if config.get('wifi_ssid'):
            self.wifi_manager.save_config(
                config['wifi_ssid'],
                config['wifi_password']
            )
        self.state = DeviceState.ONLINE_MODE
        self._update_screen_state()

    def _handle_online_mode(self):
        logger.info("Online mode - connecting to network")
        self.state = DeviceState.CONNECTING_WIFI
        self._update_screen_state()

    def _handle_connecting_wifi(self):
        config = self.config_manager.get_full_config()
        if self.wifi_manager.connect(config['wifi_ssid'], config['wifi_password']):
            logger.info("WiFi connected successfully")
            self.state = DeviceState.CONNECTING_MQTT
        else:
            logger.error("WiFi connection failed")
            self._enter_local_operation("WiFi connection failed")
            return
        self._update_screen_state()

    def _handle_connecting_mqtt(self):
        config = self.config_manager.get_full_config()
        self.mqtt_client = MQTTClient(
            broker=config['mqtt_broker'],
            username=config['mqtt_username'],
            password=config['mqtt_password'],
            device_id=config['device_id']
        )
        if self.mqtt_client.connect():
            logger.info("MQTT connected successfully")
            self.online = True
            self.mqtt_client.publish_status('online')
            self._last_status_publish = time.time()
            if not self.brew_manager:
                self.brew_manager = BrewManager(
                    self.mqtt_client,
                    self.config_manager,
                    self.screen_manager,
                    temperature_sensor=self.temperature_sensor,
                    heater_manager=self.heater_manager,
                    pump_manager=self.pump_manager,
                )
            else:
                self.brew_manager.mqtt_client = self.mqtt_client
                self.brew_manager.temperature_sensor = self.temperature_sensor
                self.brew_manager.heater_manager = self.heater_manager
                self.brew_manager.pump_manager = self.pump_manager
            self.state = DeviceState.OPERATIONAL
        else:
            logger.error("MQTT connection failed")
            self._enter_local_operation("MQTT connection failed")
            return
        self._update_screen_state()

    def _handle_operational(self):
        mqtt_connected = self.mqtt_client.is_connected() if self.mqtt_client else False
        if isinstance(self.mqtt_client, MQTTClient) and not mqtt_connected:
            logger.warning("MQTT connection lost")
            self.state = DeviceState.RECONNECTING
            self._update_screen_state()
            return
        if not self.encoder_controller:
            self.encoder_controller = EncoderController()
            self.encoder_controller.start()

        if not self.menu_manager:
            self.menu_manager = MenuManager(
                self.config_manager,
                self.brew_manager,
                self.screen_manager,
                input_provider=self.encoder_controller,
                on_ble_pairing=self._start_ble_pairing_mode,
            )
        else:
            self.menu_manager.brew_manager = self.brew_manager
            self.menu_manager.screen_manager = self.screen_manager

        now = time.time()
        if now - self._last_status_publish >= self._status_interval:
            self.mqtt_client.publish_status('online')
            self.mqtt_client.publish_telemetry(self.temperature_sensor.get_temperature())
            self._last_status_publish = now
            logger.debug("Status published: online")

        self.screen_manager.set_mqtt_connected(mqtt_connected)

        commands = self.mqtt_client.get_commands()
        if commands:
            for cmd in commands:
                try:
                    self._execute_command(cmd)
                except Exception as e:
                    logger.error(f"Error processing command: {e}", exc_info=True)

        if self.brew_manager and self.brew_manager.is_brewing():
            progress = self.brew_manager.get_brew_progress()
            if progress:
                self.screen_manager.set_brewing(True, progress.get('progress_percent', 0))
                remaining = progress.get('remaining', -1)
                if remaining is not None and remaining <= 0:
                    logger.info(f"Brew time elapsed - ending brew")
                    self.brew_manager.handle_brew_end()
                    self.screen_manager.set_brewing(False)
        else:
            self.screen_manager.set_brewing(False)
            if self.menu_manager:
                menu_state = self.menu_manager.get_menu_state()
                if not menu_state['menu_mode'] and not self.menu_manager.is_manual_brew_active():
                    self.menu_manager.open_main_menu()
                else:
                    self.menu_manager.set_menu_display()

        time.sleep(1)

    def _handle_reconnecting(self):
        logger.info("Attempting to reconnect...")
        if self.mqtt_client and self.mqtt_client.reconnect():
            logger.info("MQTT reconnected successfully")
            self.mqtt_client.publish_status('online')
            self._last_status_publish = time.time()
            self.state = DeviceState.OPERATIONAL
        else:
            logger.error("Reconnection failed - entering offline mode")
            self._enter_local_operation("Reconnection failed")
            return
        self._update_screen_state()

    def _execute_command(self, command):
        cmd_type = command.get('type')
        logger.info(f"Executing command: {cmd_type}")

        if cmd_type == 'brew_start':
            self._handle_brew_start(command)

        elif cmd_type == 'brew_stop':
            self._handle_brew_stop(command)

        elif cmd_type == 'ping':
            self.mqtt_client.publish_status('pong')

    def _handle_brew_start(self, command):
        if self.brew_manager:
            self.brew_manager.handle_brew_start(command)
            self.screen_manager.set_brewing(True, 0)
        else:
            logger.error("Brew manager not initialized")

    def _handle_brew_stop(self, command):
        if self.brew_manager:
            self.brew_manager.handle_brew_stop(command)
            self.screen_manager.set_brewing(False)
        else:
            logger.error("Brew manager not initialized")

    def _enter_local_operation(self, reason: str = None):
        if reason:
            logger.info(reason)

        device_id = self.config_manager.get_config('device_id', 'offline')
        self.mqtt_client = NullMQTTClient(device_id=device_id)
        self.online = False

        if not self.brew_manager:
            self.brew_manager = BrewManager(
                self.mqtt_client,
                self.config_manager,
                self.screen_manager,
                temperature_sensor=self.temperature_sensor,
                heater_manager=self.heater_manager,
                pump_manager=self.pump_manager,
            )
        else:
            self.brew_manager.mqtt_client = self.mqtt_client
            self.brew_manager.temperature_sensor = self.temperature_sensor
            self.brew_manager.heater_manager = self.heater_manager
            self.brew_manager.pump_manager = self.pump_manager

        if not self.encoder_controller:
            self.encoder_controller = EncoderController()
            self.encoder_controller.start()

        if not self.menu_manager:
            self.menu_manager = MenuManager(
                self.config_manager,
                self.brew_manager,
                self.screen_manager,
                input_provider=self.encoder_controller,
                on_ble_pairing=self._start_ble_pairing_mode,
            )
        else:
            self.menu_manager.brew_manager = self.brew_manager
            self.menu_manager.screen_manager = self.screen_manager

        self.screen_manager.set_mqtt_connected(False)
        self.state = DeviceState.OPERATIONAL
        self._update_screen_state()

    def _start_ble_pairing_mode(self):
        logger.info("Starting BLE pairing mode from settings")

        if self.ble_server:
            self.ble_server.stop()

        self.ble_server = BLEServer()
        self.ble_server.start()
        self._ble_start_time = time.time()
        self.state = DeviceState.BLE_PAIRING
        self._update_screen_state()


    def shutdown(self, signum, frame):
        logger.info("Shutting down...")
        self.running = False

        if self.menu_manager:
            self.menu_manager.shutdown()

        if self.encoder_controller:
            self.encoder_controller.stop()
            self.encoder_controller = None

        if self.mqtt_client:
            self.mqtt_client.publish_status('offline')
            time.sleep(0.5)
            self.mqtt_client.disconnect()

        if self.ble_server:
            self.ble_server.stop()

        if self.screen_manager:
            self.screen_manager.stop()

        if self.heater_manager:
            self.heater_manager.cleanup()

        if self.pump_manager:
            self.pump_manager.cleanup()

        logger.info("Shutdown complete")


if __name__ == "__main__":
    device = TeaDevice()
    device.run()