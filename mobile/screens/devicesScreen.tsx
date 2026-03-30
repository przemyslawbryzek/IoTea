import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
  Animated,
  Platform,
} from 'react-native';
import { bleService } from '../services/ble';
import { BleDevice } from '../services/interfaces/device.interface';

type Step = 'scan' | 'wifi' | 'provisioning' | 'done';

interface ProvisioningScreenProps {
  navigation: any;
}

export default function ProvisioningScreen({ navigation }: ProvisioningScreenProps) {
  const [step, setStep] = useState<Step>('scan');
  const [devices, setDevices] = useState<BleDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<BleDevice | null>(null);
  const [scanning, setScanning] = useState(false);
  const [wifiSsid, setWifiSsid] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [provisioning, setProvisioning] = useState(false);
  const [provisionedDeviceId, setProvisionedDeviceId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [step]);

  useEffect(() => {
    return () => {
      bleService.stopScan();
      bleService.removeAllListeners();
    };
  }, []);

  const animateStep = (nextStep: Step) => {
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
    setStep(nextStep);
  };

  const handleScan = async () => {
    const hasPermissions = await bleService.requestPermissions();
    if (!hasPermissions) {
      Alert.alert('Brak uprawnień', 'Przyznaj uprawnienia Bluetooth w ustawieniach');
      return;
    }

    const btOn = await bleService.checkBluetoothState();
    if (!btOn) {
      Alert.alert('Bluetooth wyłączony', 'Włącz Bluetooth i spróbuj ponownie');
      return;
    }

    setDevices([]);
    setScanning(true);
    setError(null);

    try {
      await bleService.startScan((device) => {
        setDevices((prev) => {
          if (prev.find((d) => d.id === device.id)) return prev;
          return [...prev, device];
        });
      });

      setTimeout(() => setScanning(false), 10000);
    } catch (err: any) {
      setScanning(false);
      setError('Błąd skanowania: ' + err.message);
    }
  };

  const handleSelectDevice = (device: BleDevice) => {
    setSelectedDevice(device);
    bleService.stopScan();
    setScanning(false);
    animateStep('wifi');
  };

  const handleProvision = async () => {
    if (!wifiSsid.trim()) {
      setError('Podaj nazwę sieci WiFi');
      return;
    }
    if (!deviceName.trim()) {
      setError('Podaj nazwę urządzenia');
      return;
    }
    if (!selectedDevice) return;

    setError(null);
    setProvisioning(true);
    animateStep('provisioning');

    const result = await bleService.provisionDevice(
      selectedDevice.id,
      deviceName,
      wifiSsid,
      wifiPassword,
      selectedDevice.name || undefined
    );

    setProvisioning(false);

    if (result.success && result.deviceId) {
      setProvisionedDeviceId(result.deviceId);
      animateStep('done');
    } else {
      setError(result.error || 'Provisioning nie powiódł się');
      animateStep('wifi');
    }
  };

  const getRssiLabel = (rssi: number | null) => {
    if (rssi === null) return '?';
    if (rssi > -60) return '▂▄▆█';
    if (rssi > -75) return '▂▄▆';
    if (rssi > -85) return '▂▄';
    return '▂';
  };

  const getRssiColor = (rssi: number | null) => {
    if (rssi === null) return '#95a5a6';
    if (rssi > -60) return '#27ae60';
    if (rssi > -75) return '#f39c12';
    return '#e74c3c';
  };

  // ─── SCAN STEP ────────────────────────────────────────────────
  if (step === 'scan') {
    return (
      <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <Text style={styles.stepLabel}>KROK 1 / 3</Text>
        <Text style={styles.title}>Znajdź urządzenie</Text>
        <Text style={styles.subtitle}>Upewnij się że urządzenie jest włączone i w trybie parowania</Text>

        <TouchableOpacity
          style={[styles.primaryButton, scanning && styles.primaryButtonDisabled]}
          onPress={handleScan}
          disabled={scanning}
        >
          {scanning ? (
            <View style={styles.buttonRow}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={[styles.primaryButtonText, { marginLeft: 10 }]}>Skanowanie...</Text>
            </View>
          ) : (
            <Text style={styles.primaryButtonText}>🔍 Skanuj Bluetooth</Text>
          )}
        </TouchableOpacity>

        {error && <Text style={styles.errorText}>{error}</Text>}

        {devices.length === 0 && !scanning && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📡</Text>
            <Text style={styles.emptyText}>Brak znalezionych urządzeń</Text>
          </View>
        )}

        <FlatList
          data={devices}
          keyExtractor={(item) => item.id}
          style={styles.deviceList}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.deviceItem} onPress={() => handleSelectDevice(item)}>
              <View style={styles.deviceInfo}>
                <Text style={styles.deviceName}>{item.name || 'Nieznane urządzenie'}</Text>
                <Text style={styles.deviceId}>{item.id}</Text>
              </View>
              <View style={styles.deviceSignal}>
                <Text style={[styles.rssiBar, { color: getRssiColor(item.rssi) }]}>
                  {getRssiLabel(item.rssi)}
                </Text>
                <Text style={styles.rssiValue}>{item.rssi ?? '?'} dBm</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      </Animated.View>
    );
  }

  // ─── WIFI STEP ────────────────────────────────────────────────
  if (step === 'wifi') {
    return (
      <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <Text style={styles.stepLabel}>KROK 2 / 3</Text>
        <Text style={styles.title}>Konfiguracja</Text>

        <View style={styles.selectedDeviceBadge}>
          <Text style={styles.selectedDeviceLabel}>📟 {selectedDevice?.name || selectedDevice?.id}</Text>
        </View>

        <Text style={styles.fieldLabel}>Nazwa urządzenia w systemie</Text>
        <TextInput
          style={styles.input}
          placeholder="np. Czajnik w kuchni"
          value={deviceName}
          onChangeText={setDeviceName}
          editable={!provisioning}
        />

        <Text style={styles.fieldLabel}>Nazwa sieci WiFi (SSID)</Text>
        <TextInput
          style={styles.input}
          placeholder="NazwaWifi"
          value={wifiSsid}
          onChangeText={setWifiSsid}
          autoCapitalize="none"
          editable={!provisioning}
        />

        <Text style={styles.fieldLabel}>Hasło WiFi</Text>
        <TextInput
          style={styles.input}
          placeholder="Hasło sieci"
          value={wifiPassword}
          onChangeText={setWifiPassword}
          secureTextEntry={true}
          editable={!provisioning}
        />

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity
          style={[styles.primaryButton, provisioning && styles.primaryButtonDisabled]}
          onPress={handleProvision}
          disabled={Boolean(provisioning)}
        >
          <Text style={styles.primaryButtonText}>⚡ Skonfiguruj urządzenie</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={() => animateStep('scan')}>
          <Text style={styles.secondaryButtonText}>← Wróć do skanowania</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // ─── PROVISIONING STEP ────────────────────────────────────────
  if (step === 'provisioning') {
    return (
      <Animated.View style={[styles.container, styles.centeredContainer, { opacity: fadeAnim }]}>
        <ActivityIndicator size="large" color="#27ae60" />
        <Text style={styles.provisioningTitle}>Konfigurowanie urządzenia...</Text>
        <Text style={styles.provisioningSubtitle}>Rejestracja w API i wysyłanie danych przez BLE</Text>
        <Text style={styles.provisioningDevice}>{selectedDevice?.name || selectedDevice?.id}</Text>
      </Animated.View>
    );
  }

  // ─── DONE STEP ────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <Animated.View style={[styles.container, styles.centeredContainer, { opacity: fadeAnim }]}>
        <Text style={styles.doneIcon}>✅</Text>
        <Text style={styles.doneTitle}>Urządzenie skonfigurowane!</Text>
        <Text style={styles.doneSubtitle}>
          ID urządzenia: <Text style={styles.doneId}>#{provisionedDeviceId}</Text>
        </Text>
        <Text style={styles.doneDevice}>{selectedDevice?.name || selectedDevice?.id}</Text>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.replace('Devices')}
        >
          <Text style={styles.primaryButtonText}>Przejdź do urządzeń →</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => {
            setDevices([]);
            setSelectedDevice(null);
            setWifiSsid('');
            setWifiPassword('');
            setDeviceName('');
            setProvisionedDeviceId(null);
            animateStep('scan');
          }}
        >
          <Text style={styles.secondaryButtonText}>+ Dodaj kolejne urządzenie</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  centeredContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#27ae60',
    letterSpacing: 2,
    marginBottom: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7f8c8d',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
    color: '#2c3e50',
  },
  primaryButton: {
    backgroundColor: '#27ae60',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  primaryButtonDisabled: {
    backgroundColor: '#95a5a6',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  secondaryButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  secondaryButtonText: {
    color: '#7f8c8d',
    fontSize: 14,
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 13,
    marginTop: 10,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 48,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    color: '#95a5a6',
    fontSize: 15,
  },
  deviceList: {
    marginTop: 16,
  },
  deviceItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  deviceId: {
    fontSize: 11,
    color: '#95a5a6',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  deviceSignal: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  rssiBar: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
  },
  rssiValue: {
    fontSize: 10,
    color: '#95a5a6',
    marginTop: 2,
  },
  selectedDeviceBadge: {
    backgroundColor: '#eafaf1',
    borderWidth: 1,
    borderColor: '#27ae60',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  selectedDeviceLabel: {
    color: '#27ae60',
    fontWeight: '600',
    fontSize: 13,
  },
  provisioningTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2c3e50',
    marginTop: 24,
    marginBottom: 8,
  },
  provisioningSubtitle: {
    fontSize: 13,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 12,
  },
  provisioningDevice: {
    fontSize: 12,
    color: '#95a5a6',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  doneIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  doneTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 8,
  },
  doneSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  doneId: {
    color: '#27ae60',
    fontWeight: '700',
  },
  doneDevice: {
    fontSize: 12,
    color: '#95a5a6',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 32,
  },
});