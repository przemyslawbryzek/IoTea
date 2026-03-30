import sqlite3
import json
import logging
import time

logger = logging.getLogger(__name__)

class ConfigManager:
    def __init__(self, db_path='./db/device.db', db_schema='./db/schema.sql', db_seed='./db/seed.sql'):
        self.db_path = db_path
        self.db_schema = db_schema
        self.db_seed = db_seed
        self.init_db()
    
    def init_db(self):
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()   
        with open(self.db_schema, 'r') as f:
            schema = f.read()
            c.executescript(schema)
        time.sleep(1)
        with open(self.db_seed, 'r') as f:
            seed = f.read()
            c.executescript(seed)
        conn.commit()
        conn.close()
    
    def save_config(self, key, value):
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute(
            "INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)",
            (key, json.dumps(value))
        )
        conn.commit()
        conn.close()
    
    def get_config(self, key, default=None):
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute("SELECT value FROM config WHERE key = ?", (key,))
        row = c.fetchone()
        conn.close()
        
        if row:
            return json.loads(row[0])
        return default
    
    def save_ble_config(self, data):
        self.save_config('wifi_ssid', data.get('wifi_ssid'))
        self.save_config('wifi_password', data.get('wifi_password'))
        
        self.save_config('mqtt_broker', data.get('mqtt_broker'))
        self.save_config('mqtt_username', data.get('mqtt_username'))
        self.save_config('mqtt_password', data.get('mqtt_password'))
        self.save_config('device_id', data.get('device_id'))
        
        logger.info(f"Config saved for device {data.get('device_id')}")
    
    def get_full_config(self):
        return {
            'wifi_ssid': self.get_config('wifi_ssid'),
            'wifi_password': self.get_config('wifi_password'),
            'mqtt_broker': self.get_config('mqtt_broker', 'emqx.iotea.local'),
            'mqtt_username': self.get_config('mqtt_username'),
            'mqtt_password': self.get_config('mqtt_password'),
            'device_id': self.get_config('device_id')
        }