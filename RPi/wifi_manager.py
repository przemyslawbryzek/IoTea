import subprocess
import time
import logging
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
        logger.info(f"Connecting to {ssid}")

        self._kill_wpa_supplicant()

        config = f'''ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
update_config=1
country=PL

network={{
    ssid="{ssid}"
    psk="{password}"
    key_mgmt=WPA-PSK
}}
'''
        with open('/tmp/wpa.conf', 'w') as f:
            f.write(config)

        result = subprocess.run(
            ['sudo', 'wpa_supplicant', '-B', '-i', 'wlan0', '-c', '/tmp/wpa.conf'],
            capture_output=True, text=True
        )
        if result.returncode != 0:
            logger.error(f"wpa_supplicant error: {result.stderr}")
            return False

        # Poczekaj na asocjację
        time.sleep(3)

        # Pobierz adres IP
        subprocess.run(['sudo', 'dhclient', '-r', 'wlan0'], capture_output=True)
        subprocess.run(['sudo', 'dhclient', 'wlan0'], capture_output=True, timeout=15)
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
        try:
            result = subprocess.run(
                ['ping', '-c', '1', '-W', '2', '8.8.8.8'],
                capture_output=True, timeout=5
            )
            return result.returncode == 0
        except:
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