import os
import sys
import logging
import threading
import time
from enum import Enum
from datetime import datetime
from PIL import Image, ImageDraw, ImageFont

picdir = os.path.join(os.path.dirname(os.path.realpath(__file__)), 'pic')
libdir = os.path.join(os.path.dirname(os.path.realpath(__file__)), 'lib')
if os.path.exists(libdir):
    sys.path.insert(0, libdir)

from waveshare_OLED import OLED_1in3

logger = logging.getLogger(__name__)

class ScreenState(Enum):
    STARTUP = "startup"
    OFFLINE_MODE = "offline_mode"
    BLE_PAIRING = "ble_pairing"
    CONNECTING_WIFI = "connecting_wifi"
    CONNECTING_MQTT = "connecting_mqtt"
    OPERATIONAL = "operational"
    BREWING = "brewing"
    ERROR = "error"


class ScreenManager:    
    def __init__(self):
        self.display = None
        self.current_state = ScreenState.STARTUP
        self.running = False
        self.lock = threading.Lock()
        self.refresh_interval = 1.0
        self.last_refresh = 0
        
        self.device_id = None
        self.signal_strength = 0
        self.mqtt_connected = False
        self.is_brewing = False
        self.brew_progress = 0
        self.error_message = None
        self.custom_message = None
        self.menu_mode = None
        self.menu_items = []
        self.menu_index = 0
        
        self.font_small = None
        self.font_medium = None
        self.font_large = None
        
        self._init_display()
        self._load_fonts()
    
    def _init_display(self):
        try:
            self.display = OLED_1in3.OLED_1in3()
            self.display.Init()
            self.display.clear()
            logger.info("OLED display initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize OLED display: {e}")
            self.display = None
    
    def _load_fonts(self):
        try:
            font_path = os.path.join(picdir, 'Font.ttc')
            if os.path.exists(font_path):
                self.font_small = ImageFont.truetype(font_path, 12)
                self.font_medium = ImageFont.truetype(font_path, 16)
                self.font_large = ImageFont.truetype(font_path, 20)
            else:
                logger.warning(f"Font file not found at {font_path}, using default font")
                self.font_small = ImageFont.load_default()
                self.font_medium = ImageFont.load_default()
                self.font_large = ImageFont.load_default()
        except Exception as e:
            logger.error(f"Failed to load fonts: {e}")
            self.font_small = ImageFont.load_default()
            self.font_medium = ImageFont.load_default()
            self.font_large = ImageFont.load_default()
    
    def start(self):
        if not self.display:
            logger.warning("Display not initialized, screen manager disabled")
            return
        
        self.running = True
        self.thread = threading.Thread(target=self._refresh_loop, daemon=True)
        self.thread.start()
        logger.info("Screen manager started")
    
    def stop(self):
        self.running = False
        if hasattr(self, 'thread'):
            self.thread.join(timeout=2)
        if self.display:
            try:
                self.display.clear()
                self.display.module_exit()
            except Exception as e:
                logger.error(f"Error closing display: {e}")
        logger.info("Screen manager stopped")
    
    def set_state(self, state: ScreenState):
        with self.lock:
            self.current_state = state
            self.last_refresh = 0
    
    def set_device_id(self, device_id: str):
        with self.lock:
            self.device_id = device_id
    
    def set_signal_strength(self, strength: int):
        with self.lock:
            self.signal_strength = max(0, min(3, strength))
    
    def set_mqtt_connected(self, connected: bool):
        with self.lock:
            self.mqtt_connected = connected
    
    def set_brewing(self, is_brewing: bool, progress: int = 0):
        with self.lock:
            self.is_brewing = is_brewing
            self.brew_progress = max(0, min(100, progress))
    
    def set_error(self, error_message: str = None):
        with self.lock:
            self.error_message = error_message
            if error_message:
                self.current_state = ScreenState.ERROR
    
    def set_custom_message(self, message: str):
        with self.lock:
            self.custom_message = message
    
    def set_menu(self, menu_mode: str, items: list, current_index: int = 0):
        """Set menu display (tea_selection or style_selection)"""
        with self.lock:
            self.menu_mode = menu_mode
            self.menu_items = items
            self.menu_index = max(0, min(current_index, len(items) - 1) if items else 0)
    
    def _refresh_loop(self):
        while self.running:
            try:
                now = time.time()
                if now - self.last_refresh >= self.refresh_interval:
                    self._render_screen()
                    self.last_refresh = now
                time.sleep(0.1)
            except Exception as e:
                logger.error(f"Error in screen refresh loop: {e}")
                time.sleep(1)
    
    def _render_screen(self):
        if not self.display:
            return
        
        try:
            with self.lock:
                state = self.current_state
                device_id = self.device_id
                signal = self.signal_strength
                mqtt = self.mqtt_connected
                brewing = self.is_brewing
                progress = self.brew_progress
                error = self.error_message
                message = self.custom_message
                menu_mode = self.menu_mode
                menu_items = list(self.menu_items)
                menu_index = self.menu_index
            
            image = Image.new('1', (self.display.width, self.display.height), 'WHITE')
            draw = ImageDraw.Draw(image)
            
            if brewing:
                self._draw_brewing(draw, progress)
            elif message:
                # Custom message has priority - show it regardless of state
                self._draw_operational(draw, device_id, signal, mqtt, message)
            elif menu_mode:
                self._draw_menu(draw, menu_mode, menu_items, menu_index, signal, mqtt)
            elif state == ScreenState.STARTUP:
                self._draw_startup(draw)
            elif state == ScreenState.OFFLINE_MODE:
                self._draw_offline(draw, device_id)
            elif state == ScreenState.BLE_PAIRING:
                self._draw_ble_pairing(draw)
            elif state == ScreenState.CONNECTING_WIFI:
                self._draw_connecting_wifi(draw)
            elif state == ScreenState.CONNECTING_MQTT:
                self._draw_connecting_mqtt(draw)
            elif state == ScreenState.OPERATIONAL:
                self._draw_operational(draw, device_id, signal, mqtt, message)
            elif state == ScreenState.ERROR:
                self._draw_error(draw, error)
            
            self.display.ShowImage(self.display.getbuffer(image))
            
        except Exception as e:
            logger.error(f"Error rendering screen: {e}")
    
    def _draw_startup(self, draw):
        draw.text((25, 15), "IoT Tea", font=self.font_large, fill=0)
        draw.text((10, 40), "Starting...", font=self.font_medium, fill=0)
        time_val = int(time.time()) % 3
        draw.text((75, 40), "." * time_val, font=self.font_medium, fill=0)
    
    def _draw_offline(self, draw, device_id):
        draw.text((10, 5), "NO CONNECTION", font=self.font_medium, fill=0)
        draw.rectangle([(0, 20), (128, 21)], fill=0)
        draw.text((10, 25), "Brewing still works", font=self.font_small, fill=0)
        device_id_str = str(device_id) if device_id else '?'
        draw.text((10, 37), f"ID: {device_id_str[:12]}", 
                 font=self.font_small, fill=0)
        draw.text((10, 49), "BLE in settings", font=self.font_small, fill=0)
    
    def _draw_ble_pairing(self, draw):
        draw.text((18, 5), "BLE SERVER", font=self.font_medium, fill=0)
        draw.rectangle([(0, 20), (128, 21)], fill=0)
        draw.text((10, 25), "Start from", font=self.font_small, fill=0)
        draw.text((10, 35), "settings only", font=self.font_small, fill=0)
        time_val = int(time.time()) % 3
        draw.text((50, 50), "." * time_val, font=self.font_large, fill=0)
    
    def _draw_connecting_wifi(self, draw):
        draw.text((15, 10), "CONNECTING WiFi", font=self.font_medium, fill=0)
        draw.rectangle([(0, 25), (128, 26)], fill=0)
        draw.text((20, 35), "Establishing", font=self.font_small, fill=0)
        draw.text((20, 45), "connection...", font=self.font_small, fill=0)
        time_val = int((time.time() * 2) % 128)
        draw.rectangle([(0, 55), (time_val, 60)], fill=0)
    
    def _draw_connecting_mqtt(self, draw):
        draw.text((15, 10), "CONNECTING MQTT", font=self.font_medium, fill=0)
        draw.rectangle([(0, 25), (128, 26)], fill=0)
        draw.text((20, 35), "Establishing", font=self.font_small, fill=0)
        draw.text((20, 45), "connection...", font=self.font_small, fill=0)
        time_val = int((time.time() * 2) % 128)
        draw.rectangle([(0, 55), (time_val, 60)], fill=0)
    
    def _draw_operational(self, draw, device_id, signal, mqtt_connected, custom_message=None):
        # Status bar at top
        status_line = ""
        if signal > 0:
            status_line += "W:" + ("▓" * signal) + "░" * (3 - signal)
        else:
            status_line += "W:---"
        if mqtt_connected:
            status_line += " M:OK"
        else:
            status_line += " M:--"
        
        draw.text((5, 0), status_line, font=self.font_small, fill=0)
        draw.rectangle([(0, 10), (128, 11)], fill=0)
        
        draw.text((10, 15), "READY", font=self.font_medium, fill=0)
        draw.rectangle([(0, 30), (128, 31)], fill=0)
        
        if custom_message:
            lines = self._wrap_text(custom_message, 20)
            y_pos = 36
            for line in lines[:2]:
                draw.text((10, y_pos), line, font=self.font_small, fill=0)
                y_pos += 12
        else:
            device_id_str = str(device_id) if device_id else '?'
            draw.text((10, 36), f"ID: {device_id_str[:16]}", 
                     font=self.font_small, fill=0)
            draw.text((10, 48), "MQTT listening", font=self.font_small, fill=0)
            draw.text((10, 58), "ACK for menu", font=self.font_small, fill=0)
    
    
    def _draw_brewing(self, draw, progress):
        draw.text((25, 5), "BREWING", font=self.font_large, fill=0)
        draw.rectangle([(0, 25), (128, 26)], fill=0)
        
        if progress is None:
            progress = 0
        progress = max(0, min(100, progress))
        
        draw.rectangle([(4, 35), (124, 50)], outline=0)
        
        bar_width = int((progress / 100) * 120)
        if bar_width > 0:
            draw.rectangle([(4, 35), (4 + bar_width, 50)], fill=0)
        
        draw.text((45, 55), f"{int(progress)}%", font=self.font_medium, fill=0)
    
    def _draw_menu(self, draw, menu_mode, items, current_index, signal=0, mqtt_connected=False):
        """Draw menu for tea, style or main selection with status bar"""
        # Draw status bar at top
        status_line = ""
        if signal > 0:
            status_line += "W:" + ("▓" * signal) + "░" * (3 - signal)
        else:
            status_line += "W:---"
        if mqtt_connected:
            status_line += " M:OK"
        else:
            status_line += " M:--"
        
        draw.text((5, 0), status_line, font=self.font_small, fill=0)
        draw.rectangle([(0, 10), (128, 11)], fill=0)
        
        if not items:
            draw.text((10, 20), "No items available", font=self.font_medium, fill=0)
            return
        
        current_item = items[current_index] if current_index < len(items) else None
        if not current_item:
            return
        
        if menu_mode == 'main':
            # Main menu - Brew, Custom Brew, Settings, Continue Brew
            draw.text((20, 15), "MAIN MENU", font=self.font_medium, fill=0)
            draw.rectangle([(0, 28), (128, 29)], fill=0)
            item_name = current_item.get('name', 'Unknown')
            draw.text((10, 36), item_name[:20], font=self.font_medium, fill=0)
            position_text = f"({current_index + 1}/{len(items)})"
            draw.text((10, 54), position_text, font=self.font_small, fill=0)
        elif menu_mode == 'tea_selection':
            # Tea selection menu
            draw.text((15, 15), "SELECT TEA", font=self.font_medium, fill=0)
            draw.rectangle([(0, 28), (128, 29)], fill=0)
            item_name = current_item.get('name', 'Unknown')
            item_detail = current_item.get('category', '')
            draw.text((10, 36), item_name[:20], font=self.font_medium, fill=0)
            if item_detail:
                draw.text((10, 46), item_detail[:20], font=self.font_small, fill=0)
            position_text = f"({current_index + 1}/{len(items)})"
            draw.text((10, 54), position_text, font=self.font_small, fill=0)
        elif menu_mode == 'style_selection':
            # Style selection menu
            draw.text((15, 15), "SELECT STYLE", font=self.font_medium, fill=0)
            draw.rectangle([(0, 28), (128, 29)], fill=0)
            item_name = current_item.get('style', 'Unknown')
            item_detail = f"{current_item.get('grams_per_100ml', 0)}g/100ml" if not current_item.get('is_back') else ""
            draw.text((10, 36), item_name[:20], font=self.font_medium, fill=0)
            if item_detail:
                draw.text((10, 46), item_detail[:20], font=self.font_small, fill=0)
            position_text = f"({current_index + 1}/{len(items)})"
            draw.text((10, 54), position_text, font=self.font_small, fill=0)
        elif menu_mode == 'settings':
            # Settings menu
            draw.text((20, 15), "SETTINGS", font=self.font_medium, fill=0)
            draw.rectangle([(0, 28), (128, 29)], fill=0)
            item_name = current_item.get('name', 'Unknown')
            draw.text((10, 36), item_name[:20], font=self.font_medium, fill=0)
            position_text = f"({current_index + 1}/{len(items)})"
            draw.text((10, 54), position_text, font=self.font_small, fill=0)
    
    def _draw_error(self, draw, error_message):
        draw.text((25, 5), "ERROR", font=self.font_medium, fill=0)
        draw.rectangle([(0, 20), (128, 21)], fill=0)
        
        if error_message:
            lines = self._wrap_text(error_message, 18)
            y_pos = 25
            for line in lines[:3]:
                draw.text((5, y_pos), line, font=self.font_small, fill=0)
                y_pos += 10
    
    def _wrap_text(self, text, char_limit):
        lines = []
        current_line = ""
        for word in text.split():
            if len(current_line) + len(word) + 1 <= char_limit:
                current_line += word + " "
            else:
                if current_line:
                    lines.append(current_line.strip())
                current_line = word + " "
        if current_line:
            lines.append(current_line.strip())
        return lines
