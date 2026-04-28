import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  StyleSheet,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { getDevices, getMyTeaById, getTeaById, startBrew } from '../services/api';
import type { Tea } from '../services/interfaces/tea.interface';
import { useSwipeBack } from '../hooks/useSwipeBack';
import { theme } from '../styles/theme';

type TeaDetailInstruction = {
  id: number;
  style: { name: string };
  grams_per_100ml: number;
  first_infusion_seconds: number;
  increment_seconds: number;
  max_infusions: number;
};

type TeaDetailTea = Tea & {
  category: Tea['category'] & { icon_url?: string | null };
  instructions?: TeaDetailInstruction[];
};

type TeaDetailsScreenProps = {
  navigation: any;
  route: {
    params?: {
      id?: number;
      source?: 'base' | 'user';
      brewNumber?: number;
    };
  };
};

const fallbackImage = 'https://images.unsplash.com/photo-1602943543714-cf535b048440?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxncmVlbiUyMHRlYSUyMGxlYXZlc3xlbnwxfHx8fDE3NzMyMTk0NzJ8MA&ixlib=rb-4.1.0&q=80&w=1080';
const fallbackCategoryIcon = 'https://img.icons8.com/?size=100&id=rCUgZeMLbaAM&format=png&color=000000';

type StepperInputProps = {
  value: number;
  onChange: (nextValue: number) => void;
  step: number;
  min: number;
  max: number;
};

function StepperInput({ value, onChange, step, min, max }: StepperInputProps) {
  return (
    <View style={tw`mt-2 flex-row items-center overflow-hidden rounded-full border border-black/25 bg-white`}>
      <Pressable
        onPress={() => onChange(Math.max(min, value - step))}
        style={tw`h-11 w-11 items-center justify-center border-r border-black/10`}
      >
        <Text style={tw`text-lg font-semibold text-black`}>-</Text>
      </Pressable>

      <TextInput
        value={String(value)}
        onChangeText={(nextValue) => {
          const parsed = Number(nextValue || '0');
          onChange(Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : min);
        }}
        keyboardType="number-pad"
        style={tw`min-w-0 flex-1 px-4 py-2 text-sm text-black`}
      />

      <Pressable
        onPress={() => onChange(Math.min(max, value + step))}
        style={tw`h-11 w-11 items-center justify-center border-l border-black/10`}
      >
        <Text style={tw`text-lg font-semibold text-black`}>+</Text>
      </Pressable>
    </View>
  );
}

const screenStyles = StyleSheet.create({
  headerRow: {
    position: 'absolute',
    top: 12,
    left: 16,
    right: 16,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconButton: {
    height: 36,
    width: 36,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: '#fff',
    backgroundColor: '#fff',
    padding: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconImage: {
    height: 20,
    width: 20,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    backgroundColor: '#fff',
    padding: 24,
  },
});

export default function TeaDetailsScreen({ navigation, route }: TeaDetailsScreenProps) {
  const { panHandlers } = useSwipeBack(() => navigation.goBack());
  const teaId = route.params?.id;
  const source = route.params?.source ?? 'base';

  const [tea, setTea] = useState<TeaDetailTea | null>(null);
  const [devices, setDevices] = useState<Array<{ id: number; name: string; online: boolean }>>([]);
  const [selectedDevice, setSelectedDevice] = useState<number | null>(null);
  const [selectedInstruction, setSelectedInstruction] = useState<TeaDetailInstruction | null>(null);
  const [waterAmount, setWaterAmount] = useState<number>(250);
  const [brewNumber, setBrewNumber] = useState<number>(1);
  const [isBrewing, setIsBrewing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const fetchData = async () => {
      try {
        setLoading(true);

        if (!teaId) return;

        const teaData = source === 'user' ? await getMyTeaById(Number(teaId)) : await getTeaById(Number(teaId));
        const normalizedTea: TeaDetailTea = {
          ...teaData,
          source: teaData.source ?? source,
          instructions: (teaData.instructions ?? []).map((instruction) => ({
            id: instruction.id,
            style: { name: instruction.style.name },
            grams_per_100ml: Number(instruction.grams_per_100ml),
            first_infusion_seconds: instruction.first_infusion_seconds,
            increment_seconds: instruction.increment_seconds,
            max_infusions: instruction.max_infusions,
          })),
        };

        if (!active) return;

        setTea(normalizedTea);
        setSelectedInstruction(normalizedTea.instructions?.[0] ?? null);

        const brewNumberParam = Number(route.params?.brewNumber || '1');
        setBrewNumber(Number.isFinite(brewNumberParam) && brewNumberParam > 0 ? brewNumberParam : 1);

        const devicesData = await getDevices();
        if (!active) return;
        const onlineDevices = devicesData.filter((device) => device.online).map((device) => ({
          id: device.id,
          name: device.name,
          online: device.online,
        }));
        setDevices(onlineDevices);
        setSelectedDevice(onlineDevices[0]?.id ?? null);
      } catch (error) {
        console.error('Error fetching tea details:', error);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void fetchData();

    return () => {
      active = false;
    };
  }, [route.params?.brewNumber, source, teaId]);

  useEffect(() => {
    if (!selectedInstruction) return;
    setBrewNumber((current) => Math.min(Math.max(current, 1), selectedInstruction.max_infusions));
  }, [selectedInstruction]);

  const teaAmount = selectedInstruction ? (waterAmount * selectedInstruction.grams_per_100ml) / 100 : 0;
  const maxBrewNumber = selectedInstruction?.max_infusions ?? 10;

  const handleStartBrew = async () => {
    if (!selectedDevice || !selectedInstruction) return;

    try {
      setIsBrewing(true);
      const brew = await startBrew({
        deviceId: selectedDevice,
        instructionId: selectedInstruction.id,
        volumeMl: waterAmount,
        brewNumber,
      });
      Alert.alert('Brew started', `Brew #${brew.id} started`);
      setBrewNumber((current) => current + 1);
    } catch (error) {
      console.error('Error starting brew:', error);
    } finally {
      setIsBrewing(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={tw`flex-1`} {...panHandlers}>
        <View style={[tw`flex-1 items-center justify-center`, { backgroundColor: theme.colors.background }]}>
          <Text style={tw`text-sm text-black/60`}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={tw`flex-1`} {...panHandlers}>
      <ScrollView style={[tw`flex-1`, { backgroundColor: theme.colors.background }]} contentContainerStyle={tw`pb-10`}>
        <View>
          <View style={tw`relative`}>
            <Image
              source={{ uri: tea?.image_url || fallbackImage }}
              resizeMode="cover"
              style={tw`h-32 w-full`}
            />
            <View style={screenStyles.headerRow}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={screenStyles.headerIconButton}>
                <Image
                  source={{ uri: 'https://img.icons8.com/?size=100&id=40217&format=png&color=000000' }}
                  resizeMode="contain"
                  style={screenStyles.headerIconImage}
                />
              </TouchableOpacity>
              <View style={screenStyles.headerRight}>
                <TouchableOpacity onPress={() => setShowModal(true)} style={screenStyles.headerIconButton}>
                  <Image
                    source={{ uri: 'https://img.icons8.com/?size=100&id=85038&format=png&color=000000' }}
                    resizeMode="contain"
                    style={screenStyles.headerIconImage}
                  />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowModal(true)} style={screenStyles.headerIconButton}>
                  <Image
                    source={{ uri: 'https://img.icons8.com/?size=100&id=sYKZOhn95Ako&format=png&color=000000' }}
                    resizeMode="contain"
                    style={screenStyles.headerIconImage}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <Text style={tw`px-5 mt-2 text-3xl font-bold text-black`}>{tea?.name}</Text>

          <View style={tw`mt-2 w-full`}>
            <View style={tw`mt-2 rounded px-5`}>
              <View style={tw`gap-3`}>
                <View>
                  <Text style={tw`mb-2 text-xs uppercase text-black/50`}>Device</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`gap-2 pr-2`}>
                    {devices.map((device) => {
                      const isActive = device.id === selectedDevice;

                      return (
                        <Pressable
                          key={device.id}
                          onPress={() => setSelectedDevice(device.id)}
                          style={[
                            tw`rounded-full border px-4 py-2`,
                            {
                              backgroundColor: isActive ? '#eee' : '#fff',
                              borderColor: isActive ? 'grey' : '#ead9c8',
                            },
                          ]}
                        >
                          <Text style={tw`text-sm font-medium`}>{device.name}</Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>

                <View>
                  <Text style={tw`mb-2 text-xs uppercase text-black/50`}>Brew Style</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`gap-2 pr-2`}>
                    {tea?.instructions?.map((instruction) => {
                      const isActive = selectedInstruction?.id === instruction.id;

                      return (
                        <Pressable
                          key={instruction.id}
                          onPress={() => setSelectedInstruction(instruction)}
                          style={[
                            tw`rounded-full border px-4 py-2`,
                            {
                              backgroundColor: isActive ? '#eee' : '#fff',
                              borderColor: isActive ? 'grey' : '#ead9c8',
                            },
                          ]}
                        >
                          <Text style={tw`text-sm font-medium`}>{instruction.style.name}</Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>

                <View>
                  <View style={tw`flex-row items-baseline justify-between`}>
                    <Text style={tw`text-xs uppercase text-black/50`}>Water Amount</Text>
                    <Text style={tw`text-sm font-medium text-black`}>{waterAmount}ml</Text>
                  </View>
                  <StepperInput value={waterAmount} onChange={setWaterAmount} step={25} min={50} max={500} />
                </View>

                <View>
                  <Text style={tw`mb-2 text-xs uppercase text-black/50`}>Brew Number</Text>
                  <StepperInput value={brewNumber} onChange={setBrewNumber} step={1} min={1} max={maxBrewNumber} />
                </View>

                <View style={tw`rounded border border-black/25 p-3`}>
                  {selectedInstruction ? (
                    <>
                      <Text style={tw`text-xs text-black/70`}>
                        Prepare amount: <Text style={tw`font-medium text-black`}>{teaAmount.toFixed(1)}g</Text>
                      </Text>
                      <Text style={tw`mt-1 text-xs text-black/50`}>
                        ({selectedInstruction.grams_per_100ml}g per 100ml)
                      </Text>
                    </>
                  ) : (
                    <Text style={tw`text-xs text-black/50`}>Select brew style to calculate amount.</Text>
                  )}
                </View>

                <View style={tw`rounded border border-black/25 p-3`}>
                  <Text style={tw`mb-2 text-xs uppercase text-black/50`}>Instructions</Text>
                  {selectedInstruction ? (
                    <View>
                      <Text style={tw`text-xs text-black/70`}>
                        First Brew: <Text style={tw`font-medium text-black`}>{selectedInstruction.first_infusion_seconds}s</Text>
                      </Text>
                      <Text style={tw`mt-1 text-xs text-black/70`}>
                        Increment: <Text style={tw`font-medium text-black`}>+{selectedInstruction.increment_seconds}s</Text> per infusion
                      </Text>
                      <Text style={tw`mt-1 text-xs text-black/70`}>
                        Max Infusions: <Text style={tw`font-medium text-black`}>{selectedInstruction.max_infusions}</Text>
                      </Text>
                    </View>
                  ) : (
                    <Text style={tw`text-xs text-black/50`}>Select brew style to see instructions.</Text>
                  )}
                </View>
              </View>

              <View style={tw`mt-3 w-full flex-row justify-center`}>
                <TouchableOpacity
                  onPress={handleStartBrew}
                  disabled={!selectedDevice || !selectedInstruction || isBrewing}
                  style={tw`rounded bg-[#51961f] px-4 py-2`}
                >
                  <Text style={tw`text-sm font-medium text-[#FFFBEF]`}>Start Brew</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {showModal ? (
          <View style={screenStyles.modalOverlay}>
            <View style={screenStyles.modalCard}>
              <TouchableOpacity onPress={() => setShowModal(false)} style={tw`absolute right-4 top-4`}>
                <Text style={tw`text-gray-500`}>✕</Text>
              </TouchableOpacity>
              <Text style={tw`mb-4 text-2xl font-bold text-black`}>{tea?.name}</Text>
              <Text style={tw`text-base leading-relaxed text-gray-700`}>{tea?.description}</Text>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}