import subprocess
import time
import logging
import os
import shutil
import tempfile
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

        self._bring_interface_up()
        self._unblock_wifi()

        if self._configure_existing_supplicant(ssid, password):
            logger.debug("Configured existing wpa_supplicant via wpa_cli")
            return self._finish_connection(ssid)

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
            with tempfile.NamedTemporaryFile('w', prefix='wpa-', suffix='.conf', delete=False) as tmp_file:
                tmp_file.write(config)
                config_path = tmp_file.name
            logger.debug(f"WiFi config written to {config_path}:\n{config}")
        except Exception as e:
            logger.error(f"Failed to write WiFi config: {e}")
            return False

        try:
            result = subprocess.run(
                ['wpa_supplicant', '-B', '-i', 'wlan0', '-c', config_path],
                capture_output=True, text=True, timeout=10
            )
            if result.returncode != 0:
                logger.error(f"wpa_supplicant failed (rc={result.returncode})")
                if result.stderr:
                    logger.error(f"  stderr: {result.stderr}")
                if result.stdout:
                    logger.error(f"  stdout: {result.stdout}")
                if 'Failed to initialize driver interface' in (result.stderr or result.stdout or ''):
                    logger.warning("wpa_supplicant could not claim wlan0; trying existing control interface if available")
                    if self._configure_existing_supplicant(ssid, password):
                        return self._finish_connection(ssid)
                return False

            logger.debug("wpa_supplicant started successfully")
        except subprocess.TimeoutExpired:
            logger.error("wpa_supplicant timeout")
            return False
        finally:
            try:
                os.unlink(config_path)
            except FileNotFoundError:
                pass

        return self._finish_connection(ssid)

    def _finish_connection(self, ssid: str) -> bool:
        # Poczekaj na asocjację
        time.sleep(3)

        if not self._wait_for_carrier(timeout_seconds=10):
            logger.error(
                f"wlan0 has no carrier for SSID {ssid}; the hotspot is likely out of range, on an unsupported band, or not broadcasting"
            )
            return False

        # Pobierz adres IP. Raspberry Pi OS zwykle używa dhcpcd, ale fallback do dhclient.
        dhcp_prefix = ['sudo', '-n'] if hasattr(os, 'geteuid') and os.geteuid() != 0 else []
        try:
            if shutil.which('dhcpcd'):
                dhcp_result = subprocess.run(dhcp_prefix + ['dhcpcd', '-n', 'wlan0'], capture_output=True, text=True, timeout=15)
            elif shutil.which('dhclient'):
                subprocess.run(dhcp_prefix + ['dhclient', '-r', 'wlan0'], capture_output=True, text=True, timeout=5)
                dhcp_result = subprocess.run(dhcp_prefix + ['dhclient', 'wlan0'], capture_output=True, text=True, timeout=15)
            else:
                logger.error("Neither dhcpcd nor dhclient is available for DHCP on wlan0")
                return False
        except subprocess.TimeoutExpired:
            logger.error(
                "DHCP timed out while waiting for wlan0 carrier; hotspot may be incompatible or not reachable"
            )
            return False

        if dhcp_result.returncode != 0:
            logger.error(f"DHCP failed (rc={dhcp_result.returncode})")
            if dhcp_result.stderr:
                logger.error(f"  stderr: {dhcp_result.stderr}")
            if dhcp_result.stdout:
                logger.error(f"  stdout: {dhcp_result.stdout}")
            return False

        time.sleep(2)

        self.connected = self._check()

        if self.connected:
            logger.info(f"WiFi connected to {ssid}, IP: {self.get_ip()}")
        else:
            logger.error(f"WiFi connection failed for {ssid}")

        return self.connected

    def _wait_for_carrier(self, timeout_seconds: int = 10) -> bool:
        deadline = time.time() + timeout_seconds
        while time.time() < deadline:
            carrier_path = '/sys/class/net/wlan0/carrier'
            try:
                if os.path.exists(carrier_path):
                    with open(carrier_path, 'r') as carrier_file:
                        if carrier_file.read().strip() == '1':
                            return True
                else:
                    link_result = subprocess.run(
                        ['iw', 'dev', 'wlan0', 'link'],
                        capture_output=True,
                        text=True,
                        timeout=3,
                    )
                    if link_result.returncode == 0 and 'Connected to' in (link_result.stdout or ''):
                        return True
            except (FileNotFoundError, subprocess.TimeoutExpired, OSError) as e:
                logger.debug(f"Carrier check unavailable: {e}")

            time.sleep(1)

        return False

    def _kill_wpa_supplicant(self):
        """Zatrzymuje istniejące procesy wpa_supplicant i usuwa socket."""
        subprocess.run(['wpa_cli', '-i', 'wlan0', 'terminate'], capture_output=True)
        subprocess.run(['pkill', '-x', 'wpa_supplicant'], capture_output=True)
        subprocess.run(['rm', '-f', '/var/run/wpa_supplicant/wlan0'], capture_output=True)
        time.sleep(1)

    def _unblock_wifi(self):
        try:
            subprocess.run(['rfkill', 'unblock', 'wifi'], capture_output=True, timeout=5, check=False)
        except (subprocess.TimeoutExpired, FileNotFoundError, OSError) as e:
            logger.warning(f"Failed to unblock Wi-Fi: {e}")

    def _configure_existing_supplicant(self, ssid: str, password: str) -> bool:
        if not shutil.which('wpa_cli'):
            return False

        try:
            ping = subprocess.run(['wpa_cli', '-i', 'wlan0', 'ping'], capture_output=True, text=True, timeout=5)
        except (subprocess.TimeoutExpired, FileNotFoundError, OSError) as e:
            logger.debug(f"wpa_cli ping unavailable: {e}")
            return False

        if ping.returncode != 0 or 'PONG' not in (ping.stdout or ''):
            return False

        subprocess.run(['wpa_cli', '-i', 'wlan0', 'disconnect'], capture_output=True, text=True, timeout=5)

        list_networks = subprocess.run(['wpa_cli', '-i', 'wlan0', 'list_networks'], capture_output=True, text=True, timeout=5)
        if list_networks.returncode == 0 and list_networks.stdout:
            lines = list_networks.stdout.splitlines()[1:]
            for line in lines:
                network_id = line.split('\t', 1)[0].strip()
                if network_id:
                    subprocess.run(['wpa_cli', '-i', 'wlan0', 'remove_network', network_id], capture_output=True, text=True, timeout=5)

        network_id_result = subprocess.run(['wpa_cli', '-i', 'wlan0', 'add_network'], capture_output=True, text=True, timeout=5)
        if network_id_result.returncode != 0:
            return False

        network_id = network_id_result.stdout.strip()
        if not network_id:
            return False

        ssid_value = f'"{ssid.replace("\\", "\\\\").replace("\"", "\\\"")}"'
        psk_value = f'"{password.replace("\\", "\\\\").replace("\"", "\\\"")}"'

        commands = [
            ['wpa_cli', '-i', 'wlan0', 'set_network', network_id, 'ssid', ssid_value],
            ['wpa_cli', '-i', 'wlan0', 'set_network', network_id, 'psk', psk_value],
            ['wpa_cli', '-i', 'wlan0', 'set_network', network_id, 'key_mgmt', 'WPA-PSK'],
            ['wpa_cli', '-i', 'wlan0', 'enable_network', network_id],
            ['wpa_cli', '-i', 'wlan0', 'select_network', network_id],
            ['wpa_cli', '-i', 'wlan0', 'save_config'],
            ['wpa_cli', '-i', 'wlan0', 'reconfigure'],
        ]

        for command in commands:
            result = subprocess.run(command, capture_output=True, text=True, timeout=10)
            if result.returncode != 0:
                if command[-1] == 'save_config':
                    logger.warning("wpa_cli save_config failed, but the Wi-Fi session can still continue")
                    if result.stderr:
                        logger.warning(f"  stderr: {result.stderr}")
                    if result.stdout:
                        logger.warning(f"  stdout: {result.stdout}")
                    continue
                logger.error(f"wpa_cli command failed: {' '.join(command)}")
                if result.stderr:
                    logger.error(f"  stderr: {result.stderr}")
                if result.stdout:
                    logger.error(f"  stdout: {result.stdout}")
                return False

        return True

    def _bring_interface_up(self):
        try:
            subprocess.run(['ip', 'link', 'set', 'wlan0', 'up'], capture_output=True, timeout=5, check=False)
        except (subprocess.TimeoutExpired, FileNotFoundError, OSError) as e:
            logger.warning(f"Failed to bring wlan0 up: {e}")

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