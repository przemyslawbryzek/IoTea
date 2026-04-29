import React, { useState, useEffect, useRef } from 'react';
import {
  Image,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  Animated,
  Platform,
} from 'react-native';
import tw from 'twrnc';
import { bleService } from '../services/ble';
import { BleDevice } from '../services/interfaces/device.interface';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { useSwipeBack } from '../hooks/useSwipeBack';

type Step = 'scan' | 'wifi' | 'provisioning' | 'done';

interface ProvisioningScreenProps {
  navigation: any;
}

export default function ProvisioningScreen({ navigation }: ProvisioningScreenProps) {
  const { panHandlers } = useSwipeBack(() => navigation.goBack());
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
      Alert.alert('Permissions required', 'Grant Bluetooth permissions in settings.');
      return;
    }

    const btOn = await bleService.checkBluetoothState();
    if (!btOn) {
      Alert.alert('Bluetooth off', 'Turn on Bluetooth and try again.');
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
      setError('Scanning error: ' + err.message);
    }
  };

  const { refreshing, onRefresh } = usePullToRefresh(handleScan, { externalRefreshing: scanning });

  const handleSelectDevice = (device: BleDevice) => {
    setSelectedDevice(device);
    bleService.stopScan();
    setScanning(false);
    animateStep('wifi');
  };

  const handleProvision = async () => {
    if (!wifiSsid.trim()) {
      setError('Enter the WiFi network name.');
      return;
    }
    if (!deviceName.trim()) {
      setError('Enter a device name.');
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
      setError(result.error || 'Provisioning failed.');
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
      <Animated.View
        style={[
          tw`flex-1 bg-[#FFFBEF] px-6 pt-8`,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
        {...panHandlers}
      >
        <Text style={tw`mb-1.5 text-[11px] font-bold tracking-[2px] text-[#51961f]`}>
          STEP 1 / 3
        </Text>
        <Text style={tw`text-[28px] font-bold text-black`}>Find your device</Text>
        <Text style={tw`mt-2 text-[14px] text-black/55`}>
          Make sure the device is powered on and in pairing mode.
        </Text>

        <TouchableOpacity
          style={[
            tw`mt-5 items-center rounded-xl bg-[#51961f] py-3.5`,
            scanning && tw`bg-black/30`,
          ]}
          onPress={handleScan}
          disabled={scanning}
        >
          {scanning ? (
            <View style={tw`flex-row items-center`}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={tw`ml-2.5 text-[16px] font-bold text-white`}>Scanning...</Text>
            </View>
          ) : (
            <Text style={tw`text-[16px] font-bold text-white`}>Scan Bluetooth</Text>
          )}
        </TouchableOpacity>

        {error && <Text style={tw`mt-3 text-center text-[13px] text-[#e74c3c]`}>{error}</Text>}

        {devices.length === 0 && !scanning && (
          <View style={tw`mt-10 items-center`}>
            <Image source={{ uri: 'https://img.icons8.com/?size=100&id=KAfd0FxKienj&format=png&color=000000'}} 
              style={tw`h-32 w-32 opacity-50`} 
              />
            <Text style={tw`mt-3 text-[15px] text-black/45`}>No devices found yet.</Text>
          </View>
        )}

        <FlatList
          data={devices}
          keyExtractor={(item) => item.id}
          style={tw`mt-4`}
          onRefresh={onRefresh}
          refreshing={refreshing}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={tw`mb-2.5 flex-row items-center justify-between rounded-xl border border-black/10 bg-white p-4`}
              onPress={() => handleSelectDevice(item)}
            >
              <View style={tw`flex-1`}>
                <Text style={tw`text-[15px] font-semibold text-black`}>
                  {item.name || 'Unknown device'}
                </Text>
                <Text
                  style={[
                    tw`mt-1 text-[11px] text-black/45`,
                    { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
                  ]}
                >
                  {item.id}
                </Text>
              </View>
              <View style={tw`ml-3 items-end`}>
                <Text style={[tw`text-[13px] font-bold tracking-[1px]`, { color: getRssiColor(item.rssi) }]}>
                  {getRssiLabel(item.rssi)}
                </Text>
                <Text style={tw`mt-0.5 text-[10px] text-black/45`}>
                  {item.rssi ?? '?'} dBm
                </Text>
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
      <Animated.View
        style={[
          tw`flex-1 bg-[#FFFBEF] px-6 pt-8`,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
        {...panHandlers}
      >
        <Text style={tw`mb-1.5 text-[11px] font-bold tracking-[2px] text-[#51961f]`}>
          STEP 2 / 3
        </Text>
        <Text style={tw`text-[28px] font-bold text-black`}>Configuration</Text>

        <View style={tw`mt-4 self-start rounded-lg border border-[#51961f]/40 bg-[#51961f]/10 px-3 py-2`}>
          <Text style={tw`text-[13px] font-semibold text-[#3a6d17]`}>
            📟 {selectedDevice?.name || selectedDevice?.id}
          </Text>
        </View>

        <Text style={tw`mt-4 text-[12px] font-semibold tracking-[0.5px] text-black/55`}>
          Device name in the app
        </Text>
        <TextInput
          style={tw`mt-1.5 rounded-xl border border-black/15 bg-white px-4 py-3 text-[15px] text-black`}
          placeholder="e.g. Kitchen kettle"
          value={deviceName}
          onChangeText={setDeviceName}
          editable={!provisioning}
        />

        <Text style={tw`mt-4 text-[12px] font-semibold tracking-[0.5px] text-black/55`}>
          WiFi network name (SSID)
        </Text>
        <TextInput
          style={tw`mt-1.5 rounded-xl border border-black/15 bg-white px-4 py-3 text-[15px] text-black`}
          placeholder="MyWiFi"
          value={wifiSsid}
          onChangeText={setWifiSsid}
          autoCapitalize="none"
          editable={!provisioning}
        />

        <Text style={tw`mt-4 text-[12px] font-semibold tracking-[0.5px] text-black/55`}>
          WiFi password
        </Text>
        <TextInput
          style={tw`mt-1.5 rounded-xl border border-black/15 bg-white px-4 py-3 text-[15px] text-black`}
          placeholder="Network password"
          value={wifiPassword}
          onChangeText={setWifiPassword}
          secureTextEntry={true}
          editable={!provisioning}
        />

        {error && <Text style={tw`mt-3 text-center text-[13px] text-[#e74c3c]`}>{error}</Text>}

        <TouchableOpacity
          style={[
            tw`mt-5 items-center rounded-xl bg-[#51961f] py-3.5`,
            provisioning && tw`bg-black/30`,
          ]}
          onPress={handleProvision}
          disabled={Boolean(provisioning)}
        >
          <Text style={tw`text-[16px] font-bold text-white`}>⚡ Configure device</Text>
        </TouchableOpacity>

        <TouchableOpacity style={tw`mt-2 items-center py-3`} onPress={() => animateStep('scan')}>
          <Text style={tw`text-[14px] text-black/55`}>← Back to scan</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // ─── PROVISIONING STEP ────────────────────────────────────────
  if (step === 'provisioning') {
    return (
      <Animated.View
        style={[tw`flex-1 bg-[#FFFBEF] px-6 pt-8 items-center justify-center`, { opacity: fadeAnim }]}
        {...panHandlers}
      >
        <ActivityIndicator size="large" color="#51961f" />
        <Text style={tw`mt-6 text-[20px] font-bold text-black`}>Configuring device...</Text>
        <Text style={tw`mt-2 text-center text-[13px] text-black/55`}>
          Registering in the API and sending credentials over BLE.
        </Text>
        <Text
          style={[
            tw`mt-3 text-[12px] text-black/45`,
            { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
          ]}
        >
          {selectedDevice?.name || selectedDevice?.id}
        </Text>
      </Animated.View>
    );
  }

  // ─── DONE STEP ────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <Animated.View
        style={[tw`flex-1 bg-[#FFFBEF] px-6 pt-8 items-center justify-center`, { opacity: fadeAnim }]}
        {...panHandlers}
      >
        <Text style={tw`text-[64px]`}>✅</Text>
        <Text style={tw`mt-4 text-[24px] font-bold text-black`}>Device configured!</Text>
        <Text style={tw`mt-2 text-[14px] text-black/55`}>
          Device ID: <Text style={tw`font-bold text-[#51961f]`}>#{provisionedDeviceId}</Text>
        </Text>
        <Text
          style={[
            tw`mt-1 text-[12px] text-black/45`,
            { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
          ]}
        >
          {selectedDevice?.name || selectedDevice?.id}
        </Text>

        <TouchableOpacity
          style={tw`mt-8 items-center rounded-xl bg-[#51961f] py-3.5 w-full`}
          onPress={() => navigation.replace('Devices')}
        >
          <Text style={tw`text-[16px] font-bold text-white`}>Go to devices →</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={tw`mt-2 items-center py-3`}
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
          <Text style={tw`text-[14px] text-black/55`}>+ Add another device</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return null;
}