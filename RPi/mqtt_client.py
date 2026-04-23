import json
import logging
import time
import threading
from typing import Optional, Dict, List
import paho.mqtt.client as mqtt

logger = logging.getLogger(__name__)

class MQTTClient:
    def __init__(self, broker: str, username: str, password: str, device_id: str, port: int = 1883):
        if broker.startswith('mqtt://'):
            broker = broker.replace('mqtt://', '')
        if ':' in broker:
            host, port_str = broker.rsplit(':', 1)
            self.broker = host
            self.port = int(port_str)
        else:
            self.broker = broker
            self.port = port
        self.device_id = device_id
        self.connected = False
        self._connected_lock = threading.Lock()
        self.client = mqtt.Client()
        self.client.username_pw_set(username, password)
        self.client.on_connect = self._on_connect
        self.client.on_message = self._on_message
        self._commands = []
        self._commands_lock = threading.Lock()
    
    def _on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            logger.info(f"MQTT connected")
            with self._connected_lock:
                self.connected = True
            self.client.subscribe(f"cmd/{self.device_id}/#")
        else:
            logger.error(f"MQTT connection failed: {rc}")
            with self._connected_lock:
                self.connected = False
    
    def _on_message(self, client, userdata, msg):
        try:
            payload = json.loads(msg.payload)
            logger.info(f"Command: {payload}")
            with self._commands_lock:
                self._commands.append(payload)
        except Exception as e:
            logger.error(f"Error parsing command: {e}")
    
    def connect(self) -> bool:
        try:
            self.client.connect(self.broker, self.port, 60)
            self.client.loop_start()
            for _ in range(10):
                if self.connected:
                    return True
                time.sleep(0.5)
            return False
        except Exception as e:
            logger.error(f"MQTT connect error: {e}")
            return False
    
    def disconnect(self):
        self.client.loop_stop()
        self.client.disconnect()
        with self._connected_lock:
            self.connected = False
        logger.info("MQTT disconnected")
    
    def reconnect(self, max_retries: int = 5) -> bool:
        """CRITICAL FIX: Reconnect with retry mechanism instead of permanent disconnection"""
        for attempt in range(1, max_retries + 1):
            try:
                logger.info(f"MQTT reconnection attempt {attempt}/{max_retries}...")
                if self.client.reconnect() == 0:
                    logger.info(f"MQTT reconnected successfully on attempt {attempt}")
                    if not hasattr(self, '_loop_running') or not self._loop_running:
                        self.client.loop_start()
                    return True
            except Exception as e:
                logger.warning(f"MQTT reconnect attempt {attempt} failed: {e}")
                if attempt < max_retries:
                    time.sleep(2 ** attempt)  # Exponential backoff: 2s, 4s, 8s, 16s, 32s
        
        logger.error(f"MQTT reconnection failed after {max_retries} attempts")
        return False
    
    def is_connected(self) -> bool:
        with self._connected_lock:
            return self.connected
    
    def publish_telemetry(self, temp: float):
        if not self.connected:
            return False        
        payload = {
            "device_id": self.device_id,
            "temperature": temp,
            "timestamp": time.time()
        }
        self.client.publish(f"telemetry/{self.device_id}/temp", 
                           json.dumps(payload), qos=1)
        logger.debug(f"Published: {temp}°C")
        return True
    
    def publish_status(self, status: str):
        if not self.connected:
            logger.info(f"Cannot publish status, MQTT not connected")
            return False
        payload = {
            "device_id": self.device_id,
            "status": status,
            "timestamp": time.time()
        }
        self.client.publish(f"device/{self.device_id}/status", 
                           json.dumps(payload), qos=1, retain=True)
        return True
    
    def get_commands(self) -> List[Dict]:
        """Thread-safe retrieval of pending commands"""
        with self._commands_lock:
            cmds = self._commands.copy()
            self._commands.clear()
        return cmds
    
    def publish_command_ack(self, command_id: str, result: str):
        if not self.connected:
            logger.warning(f"Cannot publish ACK, MQTT not connected")
            return False
        payload = {
            "device_id": self.device_id,
            "command_id": command_id,
            "result": result,
            "timestamp": time.time()
        }
        self.client.publish(f"ack/{self.device_id}/{command_id}", 
                           json.dumps(payload), qos=1)
        logger.info(f"Published ACK: {result}")
        return True

    def publish_brew_ack(self, brew_id: int, status: str = "brewing"):
        if not self.connected:
            logger.warning(f"Cannot publish brew ACK, MQTT not connected")
            return False
        payload = {
            "device_id": self.device_id,
            "brew_id": brew_id,
            "status": status,
            "timestamp": time.time()
        }
        self.client.publish(f"device/{self.device_id}/brew/ack", 
                           json.dumps(payload), qos=1)
        logger.info(f"Published brew ACK: brew_id={brew_id}, status={status}")
        return True

    def publish_brew_end(self, brew_id: int):
        if not self.connected:
            logger.warning(f"Cannot publish brew end, MQTT not connected")
            return False
        payload = {
            "device_id": self.device_id,
            "brew_id": brew_id,
            "status": "completed",
            "timestamp": time.time()
        }
        self.client.publish(f"device/{self.device_id}/brew/end", 
                           json.dumps(payload), qos=1)
        logger.info(f"Published brew end: brew_id={brew_id}")
        return True