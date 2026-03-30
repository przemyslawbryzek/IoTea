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

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

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
        self.mqtt_client = None
        self.ble_server = None
        self.running = True
        self.online = False
        self._last_status_publish = 0
        self._status_interval = 30  # sekundy
        signal.signal(signal.SIGINT, self.shutdown)
        signal.signal(signal.SIGTERM, self.shutdown)

    def run(self):
        logger.info(f"Starting IoT Tea Device - State: {self.state.value}")
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
                self.state = DeviceState.OFFLINE_MODE

    def _handle_startup(self):
        logger.info("Initializing device...")
        self.config_manager.init_db()
        self.state = DeviceState.CHECKING_CONFIG

    def _handle_check_config(self):
        config = self.config_manager.get_full_config()
        has_wifi = config.get('wifi_ssid') and config.get('wifi_password')
        has_mqtt = config.get('mqtt_username') and config.get('mqtt_password')

        if has_wifi and has_mqtt:
            logger.info("Full configuration found - starting online mode")
            self.state = DeviceState.ONLINE_MODE
        else:
            logger.info("No configuration - entering offline mode")
            self.state = DeviceState.OFFLINE_MODE

    def _handle_offline_mode(self):
        logger.info("Offline mode - waiting for configuration via BLE")
        self.ble_server = BLEServer()
        self.ble_server.start()
        self.state = DeviceState.BLE_PAIRING

    def _handle_ble_pairing(self):
        config_data = self.ble_server.get_received_config()

        if config_data:
            logger.info(f"Received config from BLE: {config_data['device_id']}")
            self.ble_server.stop()
            self.config_manager.save_ble_config(config_data)
            self.state = DeviceState.CONFIGURING

    def _handle_configuring(self):
        config = self.config_manager.get_full_config()
        if config.get('wifi_ssid'):
            self.wifi_manager.save_config(
                config['wifi_ssid'],
                config['wifi_password']
            )
        self.state = DeviceState.ONLINE_MODE

    def _handle_online_mode(self):
        logger.info("Online mode - connecting to network")
        self.state = DeviceState.CONNECTING_WIFI

    def _handle_connecting_wifi(self):
        config = self.config_manager.get_full_config()
        if self.wifi_manager.connect(config['wifi_ssid'], config['wifi_password']):
            logger.info("WiFi connected successfully")
            self.online = True
            self.state = DeviceState.CONNECTING_MQTT
        else:
            logger.error("WiFi connection failed")
            self.online = False
            self.state = DeviceState.OFFLINE_MODE

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
            self.mqtt_client.publish_status('online')
            self._last_status_publish = time.time()
            self.state = DeviceState.OPERATIONAL
        else:
            logger.error("MQTT connection failed")
            self.state = DeviceState.OFFLINE_MODE

    def _handle_operational(self):
        if not self.mqtt_client.is_connected():
            logger.warning("MQTT connection lost")
            self.state = DeviceState.RECONNECTING
            return

        now = time.time()
        if now - self._last_status_publish >= self._status_interval:
            self.mqtt_client.publish_status('online')
            self._last_status_publish = now
            logger.debug("Status published: online")

        commands = self.mqtt_client.get_commands()
        for cmd in commands:
            self._execute_command(cmd)

        time.sleep(5)

    def _handle_reconnecting(self):
        logger.info("Attempting to reconnect...")
        if self.mqtt_client and self.mqtt_client.reconnect():
            logger.info("MQTT reconnected successfully")
            self.mqtt_client.publish_status('online')
            self._last_status_publish = time.time()
            self.state = DeviceState.OPERATIONAL
        else:
            logger.error("Reconnection failed - entering offline mode")
            self.state = DeviceState.OFFLINE_MODE

    def _execute_command(self, command):
        cmd_type = command.get('type')

        if cmd_type == 'brew':
            """Do smth"""

        elif cmd_type == 'stop':
            """Do smth"""

        elif cmd_type == 'ping':
            self.mqtt_client.publish_command_ack(command['id'], 'pong')

    def shutdown(self, signum, frame):
        logger.info("Shutting down...")
        self.running = False

        if self.mqtt_client:
            self.mqtt_client.publish_status('offline')
            time.sleep(0.5)
            self.mqtt_client.disconnect()

        if self.ble_server:
            self.ble_server.stop()

        logger.info("Shutdown complete")


if __name__ == "__main__":
    device = TeaDevice()
    device.run()