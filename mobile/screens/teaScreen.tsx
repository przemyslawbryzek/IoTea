import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { getBrews, getDeviceStatus, getDevices, getTeas } from '../services/api';
import type { BrewSummary } from '../services/interfaces/brew.interface';
import type { DeviceStatus } from '../services/interfaces/device.interface';
import type { Tea } from '../services/interfaces/tea.interface';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { useSwipeBack } from '../hooks/useSwipeBack';
import { theme } from '../styles/theme';

type SortOption = 'Name A-Z' | 'Name Z-A' | 'Temp Low-High' | 'Temp High-Low';

interface TeaScreenProps {
  navigation: any;
}

const fallbackImage = 'https://images.unsplash.com/photo-1602943543714-cf535b048440?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxncmVlbiUyMHRlYSUyMGxlYXZlc3xlbnwxfHx8fDE3NzMyMTk0NzJ8MA&ixlib=rb-4.1.0&q=80&w=1080';
const fallbackCategoryIcon = 'https://img.icons8.com/?size=100&id=rCUgZeMLbaAM&format=png&color=000000';
const myTeasIcon = 'https://img.icons8.com/?size=100&id=15265&format=png&color=000000';
const tempIcon = 'https://img.icons8.com/?size=100&id=EdMznDNT8gPX&format=png&color=000000';
const collapseIcon = 'https://img.icons8.com/?size=100&id=40025&format=png&color=000000';
const expandIcon = 'https://img.icons8.com/?size=100&id=40021&format=png&color=000000';

export default function TeaScreen({ navigation }: TeaScreenProps) {
  const { panHandlers } = useSwipeBack(() => navigation.goBack());
  const [teas, setTeas] = useState<Tea[]>([]);
  const [devices, setDevices] = useState<Array<{
    id: number;
    name: string;
    model: string | null;
    firmware_version: string | null;
    last_seen: string | null;
    created_at: string;
    online: boolean;
    currentTemp: number | null;
    currentTempUpdatedAt: string | null;
  }>>([]);
  const [brews, setBrews] = useState<BrewSummary[]>([]);
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  const [myTeasOnly, setMyTeasOnly] = useState(false);
  const [showSortFilter, setShowSortFilter] = useState(false);
  const [tempMin, setTempMin] = useState('0');
  const [tempMax, setTempMax] = useState('100');
  const [sortBy, setSortBy] = useState<SortOption>('Name A-Z');
  const [loading, setLoading] = useState(true);
  const [deviceLoading, setDeviceLoading] = useState(false);
  const [showDeviceDetails, setShowDeviceDetails] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        const [teaData, deviceData, brewsData] = await Promise.all([getTeas(), getDevices(), getBrews()]);

        if (!active) return;

        setTeas(teaData);
        setDevices(deviceData);
        setBrews(brewsData);

        if (deviceData.length > 0) {
          const firstDeviceId = deviceData[0].id;
          setSelectedDeviceId(firstDeviceId);
          setDeviceLoading(true);
          const status = await getDeviceStatus(firstDeviceId);
          if (!active) return;
          setDeviceStatus(status);
        }

        setError('');
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : 'Nie udało się załadować herbat');
      } finally {
        if (active) {
          setLoading(false);
          setDeviceLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  const categories = useMemo(() => {
    const map = new Map<number, Tea['category']>();

    for (const tea of teas) {
      if (!map.has(tea.category.id)) {
        map.set(tea.category.id, tea.category);
      }
    }

    return Array.from(map.values());
  }, [teas]);

  const filteredTeas = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const minTemp = Number(tempMin);
    const maxTemp = Number(tempMax);

    return teas.filter((tea) => {
      const matchesCategory = activeCategoryId === null || tea.category.id === activeCategoryId;
      const matchesSource = !myTeasOnly || tea.source === 'user';
      const matchesTemp = tea.brew_temp >= minTemp && tea.brew_temp <= maxTemp;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        tea.name.toLowerCase().includes(normalizedQuery) ||
        tea.category.name.toLowerCase().includes(normalizedQuery);

      return matchesCategory && matchesSource && matchesTemp && matchesQuery;
    });
  }, [activeCategoryId, myTeasOnly, searchQuery, teas, tempMax, tempMin]);

  const visibleTeas = useMemo(() => {
    const sorted = [...filteredTeas];

    sorted.sort((firstTea, secondTea) => {
      if (sortBy === 'Name A-Z') return firstTea.name.localeCompare(secondTea.name);
      if (sortBy === 'Name Z-A') return secondTea.name.localeCompare(firstTea.name);
      if (sortBy === 'Temp Low-High') return firstTea.brew_temp - secondTea.brew_temp;
      return secondTea.brew_temp - firstTea.brew_temp;
    });

    return sorted;
  }, [filteredTeas, sortBy]);

  const unfinishedBrews = useMemo(() => {
    return brews
      .filter((brew) => {
        if (!brew.max_brew || brew.max_brew <= 0) return false;
        if (!brew.tea_id || !brew.tea_source) return false;
        return brew.brew_number < brew.max_brew;
      })
      .slice(0, 4);
  }, [brews]);

  const cycleSort = () => {
    const order: SortOption[] = ['Name A-Z', 'Name Z-A', 'Temp Low-High', 'Temp High-Low'];
    const nextIndex = (order.indexOf(sortBy) + 1) % order.length;
    setSortBy(order[nextIndex]);
  };

  const handleCategoryClick = (categoryId: number) => {
    setActiveCategoryId((current) => (current === categoryId ? null : categoryId));
  };

  const handleSelectDevice = async (deviceId: number) => {
    setSelectedDeviceId(deviceId);
    setDeviceLoading(true);

    try {
      const status = await getDeviceStatus(deviceId);
      setDeviceStatus(status);
    } catch (deviceError) {
      setError(deviceError instanceof Error ? deviceError.message : 'Nie udało się pobrać statusu urządzenia');
    } finally {
      setDeviceLoading(false);
    }
  };

  const refreshAction = useCallback(async () => {
    setError('');
    const [teaData, deviceData, brewsData] = await Promise.all([getTeas(), getDevices(), getBrews()]);
    setTeas(teaData);
    setDevices(deviceData);
    setBrews(brewsData);

    const nextDeviceId = selectedDeviceId ?? deviceData[0]?.id ?? null;
    setSelectedDeviceId(nextDeviceId);
    if (nextDeviceId) {
      const status = await getDeviceStatus(nextDeviceId);
      setDeviceStatus(status);
    } else {
      setDeviceStatus(null);
    }
  }, [selectedDeviceId]);

  const { refreshControl } = usePullToRefresh(async () => {
    try {
      await refreshAction();
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Nie udało się załadować herbat');
    }
  });

  useEffect(() => {
    if (!selectedDeviceId) return;
    let active = true;

    const refreshStatus = async () => {
      try {
        const status = await getDeviceStatus(selectedDeviceId);
        if (active) setDeviceStatus(status);
      } catch (deviceError) {
        console.error('Error refreshing device status:', deviceError);
      }
    };

    const intervalId = setInterval(refreshStatus, 15000);
    void refreshStatus();

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [selectedDeviceId]);

  const selectedDevice = devices.find((device) => device.id === selectedDeviceId) ?? null;
  const powerState = deviceStatus?.online ?? selectedDevice?.online ?? false;
  const temperature = deviceStatus?.currentTemp ?? selectedDevice?.currentTemp;
  const deviceLabel = deviceStatus?.status ?? (powerState ? 'Online' : 'Offline');
  const sectionLabelStyle = { letterSpacing: 2.8 };
  const filterLabelStyle = { letterSpacing: 2.2 };

  return (
    <SafeAreaView style={tw`flex-1`} {...panHandlers}>
      <ScrollView
        style={[tw`flex-1`, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={tw`pb-10`}
        refreshControl={refreshControl}
      >
        <View style={tw`px-5 pt-4`}>
          <Image source={require('../assets/logo_nobg.png')} resizeMode="contain" style={tw`h-14 w-14 self-center`} />

          {devices.length > 0 ? (
            <View style={tw`mt-5 w-full py-4 flex justify-center`}>
              <Pressable
                onPress={() => setShowDeviceDetails((current) => !current)}
                style={tw`flex-row items-center justify-between`}
              >
                <Text style={[tw`text-xs uppercase`, sectionLabelStyle, { color: theme.colors.textMuted }]}>Device</Text>
                <Image
                  source={{ uri: showDeviceDetails ? collapseIcon : expandIcon }}
                  resizeMode="contain"
                  style={tw`h-4 w-4 opacity-70`}
                />
              </Pressable>

              {showDeviceDetails ? (
                <>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`mt-3 gap-2 pr-2`}>
                    {devices.map((device) => {
                      const isActive = device.id === selectedDeviceId;

                      return (
                        <Pressable
                          key={device.id}
                          onPress={() => handleSelectDevice(device.id)}
                          style={[
                            tw`rounded-full border px-4 py-2`,
                            {
                              backgroundColor: isActive ? '#eee' : '#fff',
                              borderColor: isActive ? 'grey' : '#ead9c8',
                            },
                          ]}
                        >
                          <Text style={[tw`text-sm font-medium`]}>
                            {device.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>

                  <View style={tw`mt-4 flex-col gap-2`}>
                    <View style={tw`flex-1 flex-row items-center justify-between rounded-full border border-black/20 px-4 py-3`}>
                      <Text style={tw`text-sm`}>On/Off</Text>
                      <Text style={tw`mt-1 text-sm font-medium`}>{powerState ? 'On' : 'Off'}</Text>
                    </View>
                    <View style={tw`flex-1 flex-row items-center justify-between rounded-full border border-black/20 px-4 py-3`}>
                      <Text style={tw`text-sm`}>Temperature</Text>
                      <Text style={tw`mt-1 text-sm font-medium`}>{temperature ?? '—'}°C</Text>
                    </View>
                    <View style={tw`flex-1 flex-row items-center justify-between rounded-full border border-black/20 px-4 py-3`}>
                      <Text style={tw`text-sm`}>Status</Text>
                      <Text style={tw`mt-1 text-sm font-medium`}>{deviceLabel}</Text>
                    </View>
                  </View>
                </>
              ) : (
                <View style={tw`mt-3 flex-row items-center justify-between rounded-full border border-black/20 px-4 py-3`}>
                  <Text style={tw`text-sm font-medium`}>{selectedDevice?.name ?? '—'}</Text>
                  <Text style={tw`text-sm font-medium`}>{powerState ? 'On' : 'Off'}</Text>
                </View>
              )}

              {deviceLoading ? <Text style={tw`mt-3 text-sm text-black/60`}>Loading status...</Text> : null}
            </View>
          ) : (
            <View style={tw`mt-5 rounded-3xl border px-4 py-4`}>
              <Text style={tw`text-sm`}>Log in to view devices</Text>
            </View>
          )}

          {error ? <Text style={tw`mt-4 rounded-2xl border border-black/20 px-4 py-3 text-sm`}>{error}</Text> : null}

            <View style={tw`mt-5 w-full`}>
            <Text style={[tw`text-xs uppercase`, sectionLabelStyle, { color: theme.colors.textMuted }]}>Teas</Text>
            <View style={tw`mt-3 flex-row gap-2`}>
              <TextInput
                placeholder="Search teas..."
                placeholderTextColor={theme.colors.placeholder}
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={[
                  tw`flex-1 rounded-full border border-black/20 px-4 py-3 text-sm`
                ]}
              />
              <TouchableOpacity
                onPress={() => setShowSortFilter((current) => !current)}
                style={tw`shrink-0 rounded-full border border-black/20 px-4 py-3`}
              >
                <Text style={tw`text-sm font-medium`}>Sort & Filter</Text>
              </TouchableOpacity>
            </View>

            {showSortFilter ? (
              <View style={tw`mt-3 w-full py-4`}>
                <Text style={[tw`text-xs uppercase text-black/55`, filterLabelStyle]}>Sort</Text>
                <TouchableOpacity onPress={cycleSort} style={tw`mt-2 rounded-2xl border border-black/15 px-4 py-3`}>
                  <Text style={tw`text-sm font-medium`}>{sortBy}</Text>
                </TouchableOpacity>

                <Text style={[tw`mt-4 text-xs uppercase text-black/55`, filterLabelStyle]}>Temperature Range (°C)</Text>
                <View style={tw`mt-2 flex-row gap-2`}>
                  <TextInput
                    value={tempMin}
                    onChangeText={setTempMin}
                    keyboardType="number-pad"
                    placeholder="Min"
                    placeholderTextColor={theme.colors.placeholder}
                    style={[
                      tw`flex-1 rounded-2xl border border-black/20 px-4 py-3 text-sm`
                    ]}
                  />
                  <TextInput
                    value={tempMax}
                    onChangeText={setTempMax}
                    keyboardType="number-pad"
                    placeholder="Max"
                    placeholderTextColor={theme.colors.placeholder}
                    style={[
                      tw`flex-1 rounded-2xl border border-black/20 px-4 py-3 text-sm`
                    ]}
                  />
                </View>
              </View>
            ) : null}

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`mt-3 gap-2 pr-2`}>
              <TouchableOpacity
                onPress={() => setMyTeasOnly((current) => !current)}
                style={tw`items-center px-2 py-1.5`}
              >
                <View
                  style={[
                    tw`h-11 w-11 items-center justify-center rounded-full border`,
                    { backgroundColor: myTeasOnly ? '#eee' : '#fff', borderColor: myTeasOnly ? 'grey' : '#ead9c8' },
                  ]}
                >
                  <Image source={{ uri: myTeasIcon }} resizeMode="contain" style={tw`h-5 w-5`} />
                </View>
                <Text style={tw`mt-2 text-sm`}>My Teas</Text>
              </TouchableOpacity>

              {categories.map((category) => {
                const isActive = activeCategoryId === category.id;

                return (
                  <TouchableOpacity key={category.id} onPress={() => handleCategoryClick(category.id)} style={tw`items-center px-2 py-1.5`}>
                    <View
                      style={[
                        tw`h-11 w-11 items-center justify-center rounded-full border`,
                        { backgroundColor: isActive ? '#eee' : '#fff', borderColor: isActive ? 'grey' : '#ead9c8' },
                      ]}
                    >
                      <Image source={{ uri: category.icon_url ?? fallbackCategoryIcon }} resizeMode="contain" style={tw`h-5 w-5`} />
                    </View>
                    <Text style={tw`mt-2 text-sm`}>{category.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {unfinishedBrews.length ? (
              <View style={tw`mt-5 w-full`}>
                <View style={tw`mb-2 flex-row items-center justify-between`}>
                  <Text style={[tw`text-xs uppercase`, filterLabelStyle]}>Continue brews</Text>
                  <Text style={tw`text-xs text-black/50`}>view all</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`gap-3 pr-2`}>
                  {unfinishedBrews.map((brew) => (
                    <TouchableOpacity
                      key={brew.id}
                      onPress={() => {
                        if (!brew.tea_id || !brew.tea_source) return;

                        navigation.navigate('TeaDetails', {
                          id: brew.tea_id,
                          source: brew.tea_source,
                          brewNumber: Math.min((brew.brew_number ?? 1) + 1, brew.max_brew ?? 1),
                        });
                      }}
                      style={tw`w-32 py-1.5`}
                    >
                      <View style={[tw`w-full overflow-hidden rounded-2xl`, { aspectRatio: 5 / 3 }]}>
                        <Image
                          source={{ uri: brew.tea_image_url || fallbackImage }}
                          resizeMode="cover"
                          style={tw`h-full w-full`}
                        />
                      </View>
                      <Text numberOfLines={1} style={tw`mt-2 text-sm font-medium`}>
                        {brew.tea_name || `Brew #${brew.id}`}
                      </Text>
                      <View style={tw`mt-1 flex-row items-center gap-2`}>
                        <View style={tw`flex-row items-center gap-1.5`}>
                          <Image source={{ uri: tempIcon }} resizeMode="contain" style={tw`h-3.5 w-3.5`} />
                          <Text style={tw`text-xs text-black/70`}>{brew.tea_temp ?? '-'}°C</Text>
                        </View>
                        <View style={tw`flex-row items-center gap-1.5`}>
                          <Image source={{ uri: 'https://img.icons8.com/?size=100&id=273&format=png&color=000000' }} resizeMode="contain" style={tw`h-3.5 w-3.5`} />
                          <Text style={tw`text-xs text-black/70`}>
                            {brew.brew_number} / {brew.max_brew}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            <View style={tw`mt-4 w-full`}>
              {loading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <View key={index} style={tw`mt-3 rounded-3xl border px-4 py-4`}>
                    <View style={tw`h-4 w-20 rounded-full bg-black/10`} />
                    <View style={tw`mt-4 h-6 w-3/4 rounded-full bg-black/10`} />
                    <View style={tw`mt-4 h-44 rounded-2xl bg-black/10`} />
                  </View>
                ))
              ) : visibleTeas.length ? (
                visibleTeas.map((tea) => (
                  <TouchableOpacity
                    key={`${tea.source ?? 'base'}-${tea.id}`}
                    onPress={() => navigation.navigate('TeaDetails', { id: tea.id, source: tea.source ?? 'base' })}
                    style={tw`mt-3 w-full py-4`}
                    activeOpacity={0.9}
                  >
                    <View style={tw`overflow-hidden rounded-2xl`}>
                      <Image source={{ uri: tea.image_url || fallbackImage }} resizeMode="cover" style={tw`h-44 w-full`} />
                    </View>
                    <Text style={tw`mt-4 text-lg font-medium`}>{tea.name}</Text>
                    <View style={tw`mt-1 flex-row items-center`}>
                      <Image source={{ uri: tempIcon }} resizeMode="contain" style={tw`mr-1 h-4 w-4`} />
                      <Text style={tw`text-sm text-black/70`}>{tea.brew_temp}°C</Text>
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={tw`mt-3 px-4 py-4`}>
                  <Text style={tw`text-sm text-black/60`}>Teas not found.</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}