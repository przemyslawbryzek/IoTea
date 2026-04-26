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

export interface DeviceStatus {
  device_id: number;
  online: boolean;
  status?: string;
  last_seen: string | null;
  currentTemp: number | null;
  currentTempUpdatedAt: string | null;
}