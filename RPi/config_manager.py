import sqlite3
import json
import logging
import time
import os

logger = logging.getLogger(__name__)

class ConfigManager:
    def __init__(self, db_path='./db/device.db', db_schema='./db/schema.sql', db_seed='./db/seed.sql'):
        self.db_path = db_path
        self.db_schema = db_schema
        self.db_seed = db_seed
        # CRITICAL FIX: Only initialize DB if it doesn't exist
        if not os.path.exists(self.db_path):
            logger.info(f"Database not found, initializing at {self.db_path}")
            self.init_db()
        else:
            logger.info(f"Database exists at {self.db_path}, skipping initialization")
    
    def init_db(self):
        """Initialize database schema and seed with error handling (one-time only)"""
        if os.path.exists(self.db_path):
            logger.warning(f"Database already exists at {self.db_path}, skipping re-initialization")
            return
            
        # Ensure db directory exists
        db_dir = os.path.dirname(self.db_path)
        if db_dir and not os.path.exists(db_dir):
            os.makedirs(db_dir, exist_ok=True)
            
        conn = sqlite3.connect(self.db_path)
        try:
            c = conn.cursor()
            with open(self.db_schema, 'r') as f:
                schema = f.read()
                c.executescript(schema)
            time.sleep(1)
            with open(self.db_seed, 'r') as f:
                seed = f.read()
                c.executescript(seed)
            conn.commit()
            logger.info("Database initialized successfully")
        except Exception as e:
            logger.error(f"Database initialization failed: {e}")
            conn.rollback()
            raise
        finally:
            conn.close()
    
    def save_config(self, key, value):
        """Save config with proper resource cleanup"""
        conn = sqlite3.connect(self.db_path)
        try:
            c = conn.cursor()
            c.execute(
                "INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)",
                (key, json.dumps(value))
            )
            conn.commit()
        finally:
            conn.close()
    
    def get_config(self, key, default=None):
        """Get config with proper resource cleanup"""
        conn = sqlite3.connect(self.db_path)
        try:
            c = conn.cursor()
            c.execute("SELECT value FROM config WHERE key = ?", (key,))
            row = c.fetchone()
            
            if row:
                return json.loads(row[0])
            return default
        finally:
            conn.close()
    
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
    
    def delete_all_config(self):
        """Delete all configuration entries from database"""
        conn = sqlite3.connect(self.db_path)
        try:
            c = conn.cursor()
            c.execute("DELETE FROM config")
            conn.commit()
            logger.info("All configuration deleted from database")
        except Exception as e:
            logger.error(f"Failed to delete configuration: {e}")
            conn.rollback()
            raise
        finally:
            conn.close()
    
    def get_all_teas(self):
        """Get all available teas with their categories"""
        conn = sqlite3.connect(self.db_path)
        try:
            conn.row_factory = sqlite3.Row
            c = conn.cursor()
            c.execute("""
                SELECT t.id, t.name, t.description, t.brew_temp, tc.name as category
                FROM tea t
                LEFT JOIN tea_category tc ON t.category_id = tc.id
                ORDER BY tc.name, t.name
            """)
            teas = [dict(row) for row in c.fetchall()]
            return teas
        finally:
            conn.close()
    
    def get_tea_instructions(self, tea_id):
        """Get all brewing instructions for a specific tea"""
        conn = sqlite3.connect(self.db_path)
        try:
            conn.row_factory = sqlite3.Row
            c = conn.cursor()
            c.execute("""
                SELECT bi.id, bi.grams_per_100ml, bi.first_infusion_seconds, 
                       bi.increment_seconds, bi.max_infusions, bs.name as style
                FROM brewing_instructions bi
                LEFT JOIN brewing_style bs ON bi.style_id = bs.id
                WHERE bi.tea_id = ?
            """, (tea_id,))
            instructions = [dict(row) for row in c.fetchall()]
            return instructions
        finally:
            conn.close()
    
    def save_brew_history(self, tea_id, instructions_id, duration_seconds, infusion_count, status='completed'):
        """Save brew history for offline tracking"""
        conn = sqlite3.connect(self.db_path)
        try:
            c = conn.cursor()
            c.execute("""
                INSERT INTO brew (tea_id, instructions_id, duration_seconds, infusion_count, status)
                VALUES (?, ?, ?, ?, ?)
            """, (tea_id, instructions_id, duration_seconds, infusion_count, status))
            conn.commit()
            logger.info(f"Brew history saved: tea_id={tea_id}, duration={duration_seconds}s")
        finally:
            conn.close()
    
    def get_brew_history(self, limit=10):
        """Get recent brew history"""
        conn = sqlite3.connect(self.db_path)
        try:
            conn.row_factory = sqlite3.Row
            c = conn.cursor()
            c.execute("""
                SELECT b.id, b.started_at, b.completed_at, b.duration_seconds, b.infusion_count,
                       t.name as tea_name, bs.name as style_name
                FROM brew b
                LEFT JOIN tea t ON b.tea_id = t.id
                LEFT JOIN brewing_instructions bi ON b.instructions_id = bi.id
                LEFT JOIN brewing_style bs ON bi.style_id = bs.id
                ORDER BY b.started_at DESC
                LIMIT ?
            """, (limit,))
            history = [dict(row) for row in c.fetchall()]
            return history
        finally:
            conn.close()