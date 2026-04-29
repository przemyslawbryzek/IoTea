import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { deleteDevice, getDevices } from '../services/api';
import type { DeviceSummary } from '../services/interfaces/device.interface';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { useSwipeBack } from '../hooks/useSwipeBack';
import { theme } from '../styles/theme';

type DevicesScreenProps = {
  navigation: any;
};

export default function DevicesScreen({ navigation }: DevicesScreenProps) {
  const { panHandlers } = useSwipeBack(() => navigation.goBack());
  const [devices, setDevices] = useState<DeviceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getDevices();
      setDevices(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load devices');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDelete = (device: DeviceSummary) => {
    Alert.alert('Delete device', `Delete device ${device.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setDeletingId(device.id);
            setError('');
            await deleteDevice(device.id);
            await load();
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete device');
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  const { refreshControl } = usePullToRefresh(async () => {
    await load();
  });

  const formattedDevices = useMemo(
    () =>
      devices.map((device) => ({
        ...device,
        lastSeen: device.last_seen ? new Date(device.last_seen).toLocaleString() : '-',
        createdAt: new Date(device.created_at).toLocaleString(),
      })),
    [devices],
  );

  return (
    <SafeAreaView style={tw`flex-1 bg-[#FFFBEF]`} {...panHandlers}>
      <ScrollView
        contentContainerStyle={tw`px-6 pt-6 pb-9`}
        refreshControl={refreshControl}
      >
        <View>
          <View style={tw`flex-row items-center justify-between gap-3`}>
            <Text style={tw`text-[28px] font-bold text-black`}>Devices</Text>
            <TouchableOpacity
              style={tw`rounded-full bg-[#51961f] px-4 py-2`}
              onPress={() => navigation.navigate('AddDevice')}
            >
              <Text style={tw`text-sm font-medium text-[#FFFBEF]`}>
                + Add device
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={tw`mt-1.5 text-[13px] text-black/50`}>{devices.length} items</Text>

          {error ? (
            <Text style={tw`mt-3 rounded-xl border border-black/20 bg-white/85 px-3.5 py-2.5 text-[13px] text-black`}>
              {error}
            </Text>
          ) : null}

          {loading ? (
            <View style={tw`mt-4 gap-3`}>
              {Array.from({ length: 4 }).map((_, i) => (
                <View
                  key={i}
                  style={tw`h-[84px] rounded-2xl border border-black/10 bg-black/5`}
                />
              ))}
            </View>
          ) : formattedDevices.length ? (
            <View style={tw`mt-4 gap-3`}>
              {formattedDevices.map((device) => (
                <View
                  key={device.id}
                  style={tw`rounded-2xl border border-black/15 bg-white/75 p-4`}
                >
                  <View style={tw`flex-row items-start justify-between gap-3`}>
                    <View>
                      <Text style={tw`text-[16px] font-semibold text-black`}>{device.name}</Text>
                      <Text style={tw`text-[13px] text-black/60`}>
                        Model: {device.model ?? '-'}
                      </Text>
                    </View>
                    <View style={tw`flex-row items-center gap-2`}>
                      <View
                        style={tw`rounded-full border px-3 py-1.5 ${
                          device.online ? 'border-[#51961f]/40 bg-[#51961f]/10' : 'border-black/20'
                        }`}
                      >
                        <Text
                          style={tw`text-[11px] uppercase tracking-[1.2px] ${
                            device.online ? 'text-[#3a6d17]' : 'text-black/60'
                          }`}
                        >
                          {device.online ? 'online' : 'offline'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={tw`rounded-full border border-black/25 bg-white/90 px-3 py-1.5`}
                        onPress={() => handleDelete(device)}
                        disabled={deletingId === device.id}
                      >
                        <Text style={tw`text-[12px] font-semibold text-black`}>
                          {deletingId === device.id ? 'Deleting...' : 'Delete'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={tw`mt-3 flex-row flex-wrap`}>
                    <View style={tw`w-1/2 pb-1.5`}>
                      <Text style={tw`text-[13px] text-black/70`}>
                        Firmware: {device.firmware_version ?? '-'}
                      </Text>
                    </View>
                    <View style={tw`w-1/2 pb-1.5`}>
                      <Text style={tw`text-[13px] text-black/70`}>
                        Current temp: {device.currentTemp ?? '-'} C
                      </Text>
                    </View>
                    <View style={tw`w-1/2 pb-1.5`}>
                      <Text style={tw`text-[13px] text-black/70`}>
                        Last seen: {device.lastSeen}
                      </Text>
                    </View>
                    <View style={tw`w-1/2 pb-1.5`}>
                      <Text style={tw`text-[13px] text-black/70`}>
                        Created: {device.createdAt}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={tw`mt-4 rounded-2xl border border-black/10 bg-white/70 px-4 py-6`}>
              <Text style={tw`text-[13px] text-black/60`}>No devices yet.</Text>
            </View>
          )}
        </View>

        {loading ? (
          <View style={tw`mt-3 items-center`}>
            <ActivityIndicator size="small" color={theme.colors.textMuted} />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
