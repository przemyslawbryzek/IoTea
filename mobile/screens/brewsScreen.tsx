import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { getBrews } from '../services/api';
import type { BrewSummary } from '../services/interfaces/brew.interface';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { useSwipeBack } from '../hooks/useSwipeBack';
import { theme } from '../styles/theme';

type BrewsScreenProps = {
  navigation: any;
};

function formatDate(value: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

export default function BrewsScreen({ navigation }: BrewsScreenProps) {
  const { panHandlers } = useSwipeBack(() => navigation.goBack());
  const [brews, setBrews] = useState<BrewSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getBrews();
      setBrews(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load brews');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const { refreshControl } = usePullToRefresh(async () => {
    await load();
  });

  const formattedBrews = useMemo(
    () =>
      brews.map((brew) => ({
        ...brew,
        startTime: formatDate(brew.start_time),
        endTime: formatDate(brew.end_time),
      })),
    [brews],
  );

  return (
    <SafeAreaView style={tw`flex-1 bg-[#FFFBEF]`} {...panHandlers}>
      <ScrollView
        contentContainerStyle={tw`px-6 pt-6 pb-9`}
        refreshControl={refreshControl}
      >
        <View>
          <View style={tw`flex-row items-center justify-between gap-3`}>
            <Text style={tw`text-[28px] font-bold text-black`}>Brews</Text>
            <Text style={tw`text-[13px] text-black/50`}>{brews.length} items</Text>
          </View>

          {error ? (
            <Text style={tw`mt-3 rounded-xl border border-black/20 bg-white/85 px-3.5 py-2.5 text-[13px] text-black`}>
              {error}
            </Text>
          ) : null}

          {loading ? (
            <View style={tw`mt-4 gap-3`}>
              {Array.from({ length: 4 }).map((_, i) => (
                <View key={i} style={tw`h-[90px] rounded-2xl border border-black/10 bg-black/5`} />
              ))}
            </View>
          ) : formattedBrews.length ? (
            <View style={tw`mt-4 gap-3`}>
              {formattedBrews.map((brew) => (
                <TouchableOpacity
                  key={brew.id}
                  onPress={() => navigation.navigate('Brew', { id: brew.id })}
                  style={tw`rounded-2xl border border-black/15 bg-white/75 p-4`}
                >
                  <View style={tw`flex-row items-center justify-between gap-2`}>
                    <Text style={tw`text-[16px] font-semibold text-black`}>Brew #{brew.id}</Text>
                    <View style={tw`rounded-full border border-black/20 px-3 py-1`}
                    >
                      <Text style={tw`text-[11px] uppercase tracking-[1.2px] text-black/70`}>
                        {brew.status}
                      </Text>
                    </View>
                  </View>

                  <View style={tw`mt-2 flex-row flex-wrap`}>
                    <View style={tw`w-1/2 pb-1.5`}>
                      <Text style={tw`text-[13px] text-black/70`}>Device: {brew.device_id}</Text>
                    </View>
                    <View style={tw`w-1/2 pb-1.5`}>
                      <Text style={tw`text-[13px] text-black/70`}>Instruction: {brew.instruction_id}</Text>
                    </View>
                    <View style={tw`w-1/2 pb-1.5`}>
                      <Text style={tw`text-[13px] text-black/70`}>Volume: {brew.volume_ml}ml</Text>
                    </View>
                    <View style={tw`w-1/2 pb-1.5`}>
                      <Text style={tw`text-[13px] text-black/70`}>Infusion: #{brew.brew_number}</Text>
                    </View>
                    <View style={tw`w-1/2 pb-1.5`}>
                      <Text style={tw`text-[13px] text-black/70`}>Start: {brew.startTime}</Text>
                    </View>
                    <View style={tw`w-1/2 pb-1.5`}>
                      <Text style={tw`text-[13px] text-black/70`}>End: {brew.endTime}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={tw`mt-4 rounded-2xl border border-black/10 bg-white/70 px-4 py-6`}>
              <Text style={tw`text-[13px] text-black/60`}>No brews yet.</Text>
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
