export interface DeviceStatus {
  online: boolean;
  currentTemp: number | null;
  status: string;
  lastSeen: string;
}
export interface RegisterDeviceResponse {
  id: number;
  name: string;
  mqtt_username: string;
  mqtt_password: string;
  mqtt_broker: string;
}

export interface BleDevice {
  id: string;
  name: string | null;
  rssi: number | null;
}

export interface DeviceConfig {
  device_id: number;
  wifi_ssid: string;
  wifi_password: string;
  mqtt_broker: string;
  mqtt_username: string;
  mqtt_password: string;
}