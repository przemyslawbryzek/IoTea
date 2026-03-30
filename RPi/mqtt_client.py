import json
import logging
import time
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
        self.client = mqtt.Client()
        self.client.username_pw_set(username, password)
        self.client.on_connect = self._on_connect
        self.client.on_message = self._on_message
        self._commands = []
    
    def _on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            logger.info(f"MQTT connected")
            self.connected = True
            self.client.subscribe(f"cmd/{self.device_id}/#")
        else:
            logger.error(f"MQTT connection failed: {rc}")
            self.connected = False
    
    def _on_message(self, client, userdata, msg):
        try:
            payload = json.loads(msg.payload)
            logger.info(f"Command: {payload}")
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
        self.connected = False
        logger.info("MQTT disconnected")
    
    def is_connected(self) -> bool:
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
        logger.info(f"Status: {payload}")
        self.client.publish(f"device/{self.device_id}/status", 
                           json.dumps(payload), qos=1, retain=True)
        return True
    
    def get_commands(self) -> List[Dict]:
        cmds = self._commands.copy()
        self._commands.clear()
        return cmds