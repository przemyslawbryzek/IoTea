import asyncio
import json
import threading
import logging
from bless import BlessServer, BlessGATTCharacteristic, GATTCharacteristicProperties, GATTAttributePermissions

logger = logging.getLogger(__name__)

SERVICE_UUID = "0000fff0-0000-1000-8000-00805f9b34fb"
CONFIG_CHAR_UUID = "0000fff1-0000-1000-8000-00805f9b34fb"
STATUS_CHAR_UUID = "0000fff2-0000-1000-8000-00805f9b34fb"


class BLEServer:
    def __init__(self, device_name: str = "IoT Tea Device"):
        self.device_name = device_name
        self.server = None
        self.config_data = None
        self._loop = None
        self._thread = None
        self._started_event = threading.Event()

    def start(self):
        if self._thread and self._thread.is_alive():
            logger.warning("BLE server already running")
            return

        self._started_event.clear()
        self._thread = threading.Thread(target=self._run_loop, daemon=True)
        self._thread.start()

        if not self._started_event.wait(timeout=10):
            logger.error("BLE server failed to start within timeout")

    def stop(self):
        if self._loop and self._loop.is_running():
            future = asyncio.run_coroutine_threadsafe(self._stop_async(), self._loop)
            try:
                future.result(timeout=5)
            except Exception as e:
                logger.error(f"BLE stop error: {e}")

        if self._thread:
            self._thread.join(timeout=3)
            self._thread = None

        logger.info("BLE server stopped")

    def get_received_config(self):
        data = self.config_data
        self.config_data = None
        return data

    def _run_loop(self):
        self._loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self._loop)
        try:
            self._loop.run_until_complete(self._start_async())
            self._loop.run_forever()
        except Exception as e:
            logger.error(f"BLE loop error: {e}")
        finally:
            self._loop.close()

    async def _start_async(self):
        self.server = BlessServer(name=self.device_name, loop=self._loop)
        self.server.read_request_func = self._read_request
        self.server.write_request_func = self._write_request

        await self.server.add_new_service(SERVICE_UUID)

        await self.server.add_new_characteristic(
            SERVICE_UUID,
            CONFIG_CHAR_UUID,
            GATTCharacteristicProperties.write,
            None,
            GATTAttributePermissions.writeable
        )

        await self.server.add_new_characteristic(
            SERVICE_UUID,
            STATUS_CHAR_UUID,
            GATTCharacteristicProperties.notify | GATTCharacteristicProperties.read,
            bytearray(b'READY'),
            GATTAttributePermissions.readable
        )

        await self.server.start()
        logger.info(f"BLE server started as '{self.device_name}'")
        self._started_event.set()

    async def _stop_async(self):
        if self.server:
            await self.server.stop()
        if self._loop:
            self._loop.call_soon_threadsafe(self._loop.stop)

    def _write_request(self, characteristic: BlessGATTCharacteristic, value: bytearray):
        try:
            message = value.decode('utf-8')
            logger.info(f"BLE received: {message}")

            if message.startswith("CONFIG:"):
                try:
                    # CRITICAL FIX: Check bounds before slicing
                    if len(message) < 7:
                        logger.error(f"BLE message too short: '{message}' (len={len(message)})")
                        return
                        
                    config_str = message[7:].strip()
                    if not config_str:
                        logger.error("Empty config payload after 'CONFIG:' prefix")
                        return
                        
                    config_data = json.loads(config_str)
                    
                    # CRITICAL FIX: Validate required fields
                    required_fields = ['device_id', 'wifi_ssid', 'wifi_password', 'mqtt_broker', 'mqtt_username', 'mqtt_password']
                    missing_fields = [f for f in required_fields if f not in config_data]
                    if missing_fields:
                        logger.error(f"BLE config missing required fields: {missing_fields}")
                        return
                    
                    # Validate field types
                    if not all(isinstance(config_data[f], str) for f in required_fields):
                        logger.error("BLE config fields must be strings")
                        return
                    
                    # Validate field lengths
                    if len(config_data['device_id']) == 0 or len(config_data['device_id']) > 50:
                        logger.error(f"Invalid device_id length: {len(config_data['device_id'])}")
                        return
                    
                    self.config_data = config_data
                    logger.info(f"Config saved, device_id={self.config_data.get('device_id')}")

                    status_char = self.server.get_characteristic(STATUS_CHAR_UUID)
                    if status_char:
                        status_char.value = bytearray(b'OK')
                        self.server.update_value(SERVICE_UUID, STATUS_CHAR_UUID)
                except json.JSONDecodeError as e:
                    logger.error(f"Invalid JSON in BLE config payload: {e}")
        except UnicodeDecodeError:
            logger.error("BLE message is not valid UTF-8")
        except Exception as e:
            logger.error(f"BLE write_request error: {e}", exc_info=True)

    def _read_request(self, characteristic: BlessGATTCharacteristic, **kwargs):
        return characteristic.value