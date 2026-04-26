import { PermissionsAndroid, Platform } from 'react-native';
import BleManager, { BleManagerDidUpdateValueForCharacteristicEvent } from 'react-native-ble-manager';
import { NativeEventEmitter, NativeModules, DeviceEventEmitter } from 'react-native';
import { DeviceConfig, BleDevice } from './interfaces/device.interface';
import { registerDevice } from './api';

const SERVICE_UUID = '0000fff0-0000-1000-8000-00805f9b34fb';
const CONFIG_CHAR_UUID = '0000fff1-0000-1000-8000-00805f9b34fb';
const STATUS_CHAR_UUID = '0000fff2-0000-1000-8000-00805f9b34fb';

class BLEService {
  private isScanning = false;
  private devices: Map<string, BleDevice> = new Map();
  private scanCallbacks: ((device: BleDevice) => void)[] = [];
  private notificationListeners: Map<string, any> = new Map();
  private scanTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    BleManager.start({ showAlert: false }).then(() => {
      console.log('BleManager initialized');
    }).catch((err) => {
      console.error('BleManager init error:', err);
    });
  }

  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);

        const allGranted = Object.values(granted).every(
          (status) => status === PermissionsAndroid.RESULTS.GRANTED
        );

        if (!allGranted) {
          console.warn('BLE permissions denied');
          return false;
        }
        return true;
      } catch (err) {
        console.error('Permission error:', err);
        return false;
      }
    }
    return true;
  }

  async checkBluetoothState(): Promise<boolean> {
    try {
      const state = await BleManager.checkState();
      return state === 'on';
    } catch (error) {
      console.error('Error checking Bluetooth state:', error);
      return false;
    }
  }

  async startScan(callback: (device: BleDevice) => void): Promise<void> {
    if (this.isScanning) {
      console.log('Already scanning');
      return;
    }

    this.scanCallbacks.push(callback);
    this.isScanning = true;
    this.devices.clear();

    const existingListener = this.notificationListeners.get('scan');
    if (existingListener) existingListener.remove();

    const scanListener = DeviceEventEmitter.addListener(
      'BleManagerDiscoverPeripheral',
      (peripheral) => {
        const device: BleDevice = {
          id: peripheral.id,
          name: peripheral.name || 'Unknown Device',
          rssi: peripheral.rssi,
        };

        if (!this.devices.has(device.id)) {
          this.devices.set(device.id, device);
        }

        this.scanCallbacks.forEach((cb) => cb(device));
      }
    );

    this.notificationListeners.set('scan', scanListener);

    try {
      await BleManager.scan([], 10, true);
      console.log('BLE scan started');
    } catch (error) {
      console.error('Scan error:', error);
      this.isScanning = false;
      scanListener.remove();
      throw error;
    }

    if (this.scanTimeout) clearTimeout(this.scanTimeout);
    this.scanTimeout = setTimeout(() => this.stopScan(), 10000);
  }

  async stopScan(): Promise<void> {
    if (!this.isScanning) return;

    try {
      await BleManager.stopScan();
      this.isScanning = false;
      this.scanCallbacks = [];

      const scanListener = this.notificationListeners.get('scan');
      if (scanListener) {
        scanListener.remove();
        this.notificationListeners.delete('scan');
      }

      if (this.scanTimeout) {
        clearTimeout(this.scanTimeout);
        this.scanTimeout = null;
      }

      console.log('BLE scan stopped');
    } catch (error) {
      console.error('Stop scan error:', error);
    }
  }

  async connect(deviceId: string): Promise<boolean> {
    try {
      await BleManager.connect(deviceId);
      console.log(`Connected to ${deviceId}`);
      return true;
    } catch (error) {
      console.error(`Connect error to ${deviceId}:`, error);
      return false;
    }
  }

  async disconnect(deviceId: string): Promise<void> {
    try {
      await this.stopNotifications(deviceId);
      await BleManager.disconnect(deviceId);
      console.log(`Disconnected from ${deviceId}`);
    } catch (error) {
      console.error(`Disconnect error: ${error}`);
    }
  }

  async getServices(deviceId: string): Promise<any> {
    try {
      const services = await BleManager.retrieveServices(deviceId);
      return services;
    } catch (error) {
      console.error('Get services error:', error);
      return null;
    }
  }
  
  async provisionDevice(
    bleDeviceId: string,
    deviceName: string,
    wifiSsid: string,
    wifiPassword: string,
    deviceModel?: string
  ): Promise<{ success: boolean; deviceId?: number; error?: string }> {
    try {
      console.log(`[BLE] Connecting to ${bleDeviceId}...`);
      const connected = await this.connect(bleDeviceId);
      if (!connected) {
        return { success: false, error: 'Nie udało się połączyć przez BLE' };
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));

      console.log(`[API] Registering device "${deviceName}"...`);
      const registration = await registerDevice(deviceName, deviceModel);
      console.log('[API] Full response:', JSON.stringify(registration));
      console.log(`[API] Registered: id=${registration.id}, broker=${registration.mqtt_broker}`);

      const config: DeviceConfig = {
        device_id: String(registration.id),
        wifi_ssid: wifiSsid,
        wifi_password: wifiPassword,
        mqtt_broker: registration.mqtt_broker,
        mqtt_username: registration.mqtt_username,
        mqtt_password: registration.mqtt_password,
      };
      console.log(`[BLE] Sending config to device...`);
      const sent = await this.sendConfig(bleDeviceId, config);
      if (!sent) {
        return { success: false, error: 'Nie udało się wysłać konfiguracji przez BLE' };
      }

      console.log(`[BLE] Provisioning complete, device id=${registration.id}`);
      return { success: true, deviceId: registration.id };
    } catch (error: any) {
      console.error('Provisioning error:', error);
      return { success: false, error: error.message || 'Nieznany błąd podczas provisioningu' };
    }
  }

  private async sendConfig(deviceId: string, config: DeviceConfig): Promise<boolean> {
    try {
      const services = await this.getServices(deviceId);
       console.log('[BLE] Services:', JSON.stringify(services));
      if (!services) {
        console.error('Failed to retrieve services');
        return false;
      }

      const configChar = this.findCharacteristic(services, CONFIG_CHAR_UUID);
      if (!configChar) {
        console.error('Config characteristic not found');
        return false;
      }

      const message = `CONFIG:${JSON.stringify(config)}`;
      const data = Array.from(
        new TextEncoder().encode(message)
      );

      await BleManager.write(
        deviceId,
        configChar.service,
        configChar.characteristic,
        data,
        512
      );

      console.log(`Config sent to ${deviceId}`);
      return true;
    } catch (error) {
      console.error('Send config error:', error);
      return false;
    }
  }

private findCharacteristic(
  services: any,
  uuid: string
): { service: string; characteristic: string } | null {
  if (!services || !services.characteristics) return null;

  const shortUuid = uuid.replace('0000', '').replace('-0000-1000-8000-00805f9b34fb', '').toLowerCase();

  for (const char of services.characteristics) {
    const charUuid = char.characteristic?.toLowerCase();
    if (charUuid === uuid.toLowerCase() || charUuid === shortUuid) {
      return {
        service: char.service,
        characteristic: char.characteristic,
      };
    }
  }
  return null;
}

  async startNotifications(deviceId: string, onData: (data: string) => void): Promise<void> {
    try {
      const services = await this.getServices(deviceId);
      if (!services) {
        console.error('Failed to retrieve services');
        return;
      }

      const statusChar = this.findCharacteristic(services, STATUS_CHAR_UUID);
      if (!statusChar) {
        console.error('Status characteristic not found');
        return;
      }

      await BleManager.startNotification(
        deviceId,
        statusChar.service,
        statusChar.characteristic
      );

      const existingListener = this.notificationListeners.get(`notify_${deviceId}`);
      if (existingListener) existingListener.remove();

      const listener = DeviceEventEmitter.addListener(
        'BleManagerDidUpdateValueForCharacteristic',
        (event: BleManagerDidUpdateValueForCharacteristicEvent) => {
          if (event.peripheral === deviceId) {
            const message = new TextDecoder().decode(new Uint8Array(event.value));
            onData(message);
          }
        }
      );

      this.notificationListeners.set(`notify_${deviceId}`, listener);
      console.log(`Notifications started for ${deviceId}`);
    } catch (error) {
      console.error('Start notifications error:', error);
    }
  }

  async stopNotifications(deviceId: string): Promise<void> {
    try {
      const services = await this.getServices(deviceId);
      if (!services) return;

      const statusChar = this.findCharacteristic(services, STATUS_CHAR_UUID);
      if (statusChar) {
        await BleManager.stopNotification(
          deviceId,
          statusChar.service,
          statusChar.characteristic
        );
      }

      const listener = this.notificationListeners.get(`notify_${deviceId}`);
      if (listener) {
        listener.remove();
        this.notificationListeners.delete(`notify_${deviceId}`);
      }

      console.log(`Notifications stopped for ${deviceId}`);
    } catch (error) {
      console.error('Stop notifications error:', error);
    }
  }

  removeAllListeners(): void {
    this.notificationListeners.forEach((listener) => listener.remove());
    this.notificationListeners.clear();
  }

  getIsScanning(): boolean {
    return this.isScanning;
  }

  getDevices(): BleDevice[] {
    return Array.from(this.devices.values());
  }

  clearDevices(): void {
    this.devices.clear();
  }
}

export const bleService = new BLEService();