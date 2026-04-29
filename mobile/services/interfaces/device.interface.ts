export interface DeviceStatus {
  online: boolean;
  currentTemp: number | null;
  status: string;
  lastSeen: string;
}

export interface DeviceSummary {
  id: number;
  name: string;
  model: string | null;
  firmware_version: string | null;
  last_seen: string | null;
  created_at: string;
  online: boolean;
  currentTemp: number | null;
  currentTempUpdatedAt: string | null;
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
  device_id: string;
  wifi_ssid: string;
  wifi_password: string;
  mqtt_broker: string;
  mqtt_username: string;
  mqtt_password: string;
}