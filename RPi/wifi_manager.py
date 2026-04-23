import subprocess
import time
import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)

class WiFiManager:
    def __init__(self):
        self.connected = False
        self._ssid = None
        self._password = None

    def save_config(self, ssid: str, password: str) -> None:
        self._ssid = ssid
        self._password = password
        logger.info(f"WiFi config saved for SSID: {ssid}")

    def connect(self, ssid: str, password: str) -> bool:
        logger.info(f"Connecting to SSID: {ssid}")
        
        if not ssid or not password:
            logger.error("SSID and password cannot be empty")
            return False
        
        if len(ssid) > 32 or len(password) > 63:
            logger.error("SSID or password invalid length")
            return False

        self._kill_wpa_supplicant()

        # Escape special characters in SSID and password for wpa_supplicant config format
        # wpa_supplicant expects: ssid="value" and psk="value"
        # Only need to escape backslash and double-quote characters
        ssid_escaped = ssid.replace('\\', '\\\\').replace('"', '\\"')
        password_escaped = password.replace('\\', '\\\\').replace('"', '\\"')
        
        config = f'''ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
update_config=1
country=PL

network={{
    ssid="{ssid_escaped}"
    psk="{password_escaped}"
    key_mgmt=WPA-PSK
}}
'''
        try:
            with open('/tmp/wpa.conf', 'w') as f:
                f.write(config)
            logger.debug(f"WiFi config written to /tmp/wpa.conf:\n{config}")
        except Exception as e:
            logger.error(f"Failed to write WiFi config: {e}")
            return False

        result = subprocess.run(
            ['sudo', 'wpa_supplicant', '-B', '-i', 'wlan0', '-c', '/tmp/wpa.conf'],
            capture_output=True, text=True, timeout=10
        )
        if result.returncode != 0:
            logger.error(f"wpa_supplicant failed (rc={result.returncode})")
            if result.stderr:
                logger.error(f"  stderr: {result.stderr}")
            if result.stdout:
                logger.error(f"  stdout: {result.stdout}")
            return False
        
        logger.debug("wpa_supplicant started successfully")

        # Poczekaj na asocjację
        time.sleep(3)

        # Pobierz adres IP
        try:
            subprocess.run(['sudo', 'dhclient', '-r', 'wlan0'], capture_output=True, timeout=5)
            subprocess.run(['sudo', 'dhclient', 'wlan0'], capture_output=True, timeout=15)
        except subprocess.TimeoutExpired:
            logger.error("DHCP timeout")
            return False
        time.sleep(2)

        self.connected = self._check()

        if self.connected:
            logger.info(f"WiFi connected to {ssid}, IP: {self.get_ip()}")
        else:
            logger.error(f"WiFi connection failed for {ssid}")

        return self.connected

    def _kill_wpa_supplicant(self):
        """Zatrzymuje istniejące procesy wpa_supplicant i usuwa socket."""
        subprocess.run(['sudo', 'wpa_cli', '-i', 'wlan0', 'terminate'],
                      capture_output=True)
        subprocess.run(['sudo', 'killall', 'wpa_supplicant'],
                      capture_output=True)
        subprocess.run(['sudo', 'rm', '-f', '/var/run/wpa_supplicant/wlan0'],
                      capture_output=True)
        time.sleep(1)

    def _check(self) -> bool:
        """Check internet connectivity safely"""
        try:
            result = subprocess.run(
                ['ping', '-c', '1', '-W', '2', '8.8.8.8'],
                capture_output=True, timeout=5
            )
            return result.returncode == 0
        except (subprocess.TimeoutExpired, FileNotFoundError, OSError) as e:
            logger.warning(f"Ping check failed: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error in connectivity check: {e}")
            return False

    def disconnect(self):
        self._kill_wpa_supplicant()
        self.connected = False
        logger.info("WiFi disconnected")

    def get_ip(self) -> Optional[str]:
        try:
            result = subprocess.run(['hostname', '-I'], capture_output=True, text=True)
            ips = result.stdout.strip().split()
            return ips[0] if ips else None
        except:
            return None