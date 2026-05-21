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
import { getBrewHistory, getBrews, getDeviceStatus, getServerNow, setTeaRating } from '../services/api';
import type { BrewSummary } from '../services/interfaces/brew.interface';
import { BrewProcessAnimations } from '../components/BrewProcessAnimations';
import { useSwipeBack } from '../hooks/useSwipeBack';
import { theme } from '../styles/theme';

type BrewStage = 'starting' | 'heating' | 'pumping' | 'brewing' | 'completed' | 'error';

type BrewScreenProps = {
  navigation: any;
  route: {
    params?: {
      id?: number;
    };
  };
};

type StatusEntry = {
  status: BrewStage;
  timestamp: number;
};

const stageOrder: Record<BrewStage, number> = {
  starting: 0,
  heating: 1,
  pumping: 2,
  brewing: 3,
  completed: 4,
  error: 5,
};

export default function BrewScreen({ navigation, route }: BrewScreenProps) {
  const { panHandlers } = useSwipeBack(() => navigation.goBack());
  const brewId = Number(route.params?.id);
  const [brew, setBrew] = useState<BrewSummary | null>(null);
  const [statusHistory, setStatusHistory] = useState<StatusEntry[]>([]);
  const [liveStatus, setLiveStatus] = useState<BrewStage | null>(null);
  const [currentTemp, setCurrentTemp] = useState<number | null>(null);
  const [currentTempUpdatedAt, setCurrentTempUpdatedAt] = useState<string | null>(null);
  const [brewingStartedAt, setBrewingStartedAt] = useState<number | null>(null);
  const [ratingValue, setRatingValue] = useState<0 | 1 | null>(null);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [now, setNow] = useState(() => getServerNow());

  const load = useCallback(async () => {
    if (!Number.isFinite(brewId)) {
      setError('Invalid brew ID');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      const [brews, history] = await Promise.all([getBrews(), getBrewHistory(brewId)]);
      const match = brews.find((item) => item.id === brewId) ?? null;
      setBrew(match);

      const mapped = history
        .map((entry) => ({
          status: normalizeStage(entry.status),
          timestamp: new Date(entry.ts).getTime(),
          currentTemp: entry.current_temp ?? null,
        }))
        .sort((a, b) =>
          a.timestamp === b.timestamp
            ? stageOrder[a.status] - stageOrder[b.status]
            : a.timestamp - b.timestamp,
        );

      setStatusHistory(mapped.map(({ status, timestamp }) => ({ status, timestamp })));
      const lastStatus = mapped[mapped.length - 1];
      setLiveStatus(lastStatus?.status ?? normalizeStage(match?.status ?? null));

      const lastTemp = [...mapped].reverse().find((entry) => entry.currentTemp !== null);
      if (lastTemp?.currentTemp !== null && lastTemp?.currentTemp !== undefined) {
        setCurrentTemp(lastTemp.currentTemp);
      }

      if (match?.device_id) {
        const deviceStatus = await getDeviceStatus(match.device_id);
        setCurrentTemp(deviceStatus.currentTemp ?? null);
        setCurrentTempUpdatedAt(deviceStatus.currentTempUpdatedAt ?? null);
      }

      const firstBrewing = mapped.find((entry) => entry.status === 'brewing');
      setBrewingStartedAt(firstBrewing?.timestamp ?? null);

      setError(match ? '' : 'Brew not found');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load brew');
    } finally {
      setLoading(false);
    }
  }, [brewId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!Number.isFinite(brewId)) return;
    let active = true;

    const refreshHistory = async () => {
      try {
        const history = await getBrewHistory(brewId);
        if (!active) return;
        const mapped = history
          .map((entry) => ({
            status: normalizeStage(entry.status),
            timestamp: new Date(entry.ts).getTime(),
          }))
          .sort((a, b) =>
            a.timestamp === b.timestamp
              ? stageOrder[a.status] - stageOrder[b.status]
              : a.timestamp - b.timestamp,
          );
        setStatusHistory(mapped);
        const lastStatus = mapped[mapped.length - 1];
        setLiveStatus(lastStatus?.status ?? null);
        const firstBrewing = mapped.find((entry) => entry.status === 'brewing');
        setBrewingStartedAt(firstBrewing?.timestamp ?? null);
      } catch {
        // ignore refresh errors
      }
    };

    const interval = setInterval(refreshHistory, 8000);
    void refreshHistory();

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [brewId]);

  useEffect(() => {
    if (!brew?.device_id) return;
    let active = true;

    const refreshStatus = async () => {
      try {
        const status = await getDeviceStatus(brew.device_id);
        if (!active) return;
        setCurrentTemp(status.currentTemp ?? null);
        setCurrentTempUpdatedAt(status.currentTempUpdatedAt ?? null);
      } catch {
        // ignore polling errors
      }
    };

    const interval = setInterval(refreshStatus, 8000);
    void refreshStatus();

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [brew?.device_id]);

  useEffect(() => {
    const interval = setInterval(() => setNow(getServerNow()), 1000);
    return () => clearInterval(interval);
  }, []);

  const stage = useMemo(
    () => normalizeStage(liveStatus ?? brew?.status ?? null),
    [brew?.status, liveStatus],
  );

  const targetTemp = brew?.tea_temp ?? null;

  const heatingDetail = useMemo(() => {
    if (targetTemp === null || targetTemp === undefined) {
      return currentTemp !== null ? `Temp: ${currentTemp}C` : null;
    }
    if (currentTemp === null) return `Target: ${targetTemp}C`;
    return `${currentTemp}C / ${targetTemp}C`;
  }, [currentTemp, targetTemp]);

  const totalBrewSeconds = brew?.total_brew_seconds ?? null;

  const brewingDetail = useMemo(() => {
    if (!totalBrewSeconds || !brewingStartedAt) return null;
    const endTime = brewingStartedAt + totalBrewSeconds * 1000;
    const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
    return formatDuration(remaining);
  }, [brewingStartedAt, now, totalBrewSeconds]);

  const completedDetail = useMemo(() => {
    if (stage !== 'completed') return null;
    return 'Rate the taste and aroma.';
  }, [stage]);

  const handleRate = async (value: 0 | 1) => {
    if (!brew?.tea_id || !brew.tea_source) return;

    try {
      setRatingLoading(true);
      await setTeaRating(brew.tea_id, brew.tea_source, value);
      setRatingValue(value);
      setError('');
    } catch (ratingError) {
      setError(ratingError instanceof Error ? ratingError.message : 'Failed to submit rating');
    } finally {
      setRatingLoading(false);
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-[#FFFBEF]`} {...panHandlers}>
      <ScrollView contentContainerStyle={tw`px-6 pt-6 pb-9`}>
        <View style={tw`flex-row items-center justify-between`}>
          <Text style={tw`text-[26px] font-bold text-black`}>Brew</Text>
          <Text style={tw`text-[13px] text-black/50`}>#{brewId || '-'}</Text>
        </View>

        {error ? (
          <Text style={tw`mt-3 rounded-xl border border-black/20 bg-white/85 px-3.5 py-2.5 text-[13px] text-black`}>
            {error}
          </Text>
        ) : null}

        {loading ? (
          <View style={tw`mt-6 items-center`}>
            <ActivityIndicator size="small" color={theme.colors.textMuted} />
          </View>
        ) : (
          <View style={tw`mt-4 gap-4`}>
            <View style={tw`rounded-2xl border border-black/15 bg-white/85 p-4`}>
              <Text style={tw`text-[12px] uppercase tracking-[2.2px] text-black/40`}>
                Status
              </Text>
              <Text style={tw`mt-2 text-[22px] font-semibold text-black`}>
                {stageLabel(stage)}
              </Text>
              {currentTempUpdatedAt ? (
                <Text style={tw`mt-2 text-[12px] text-black/50`}>
                  Temp updated: {new Date(currentTempUpdatedAt).toLocaleTimeString()}
                </Text>
              ) : null}
              {heatingDetail ? (
                <Text style={tw`mt-2 text-[14px] text-black/70`}>
                  {stage === 'heating' ? heatingDetail : `Temp: ${currentTemp ?? '-'}`}
                </Text>
              ) : null}
              {brewingDetail ? (
                <Text style={tw`mt-1 text-[14px] text-black/70`}>
                  Remaining: {brewingDetail}
                </Text>
              ) : null}
            </View>

            <BrewProcessAnimations
              stage={stage}
              heatingDetail={heatingDetail}
              brewingDetail={brewingDetail}
              completedDetail={completedDetail}
            />

            <View style={tw`rounded-2xl border border-black/10 bg-white/80 p-4`}>
              <Text style={tw`text-[12px] uppercase tracking-[2.2px] text-black/40`}>
                Details
              </Text>
              <View style={tw`mt-3 flex-row flex-wrap`}>
                <View style={tw`w-1/2 pb-2`}>
                  <Text style={tw`text-[13px] text-black/70`}>Device: {brew?.device_id ?? '-'}</Text>
                </View>
                <View style={tw`w-1/2 pb-2`}>
                  <Text style={tw`text-[13px] text-black/70`}>Instruction: {brew?.instruction_id ?? '-'}</Text>
                </View>
                <View style={tw`w-1/2 pb-2`}>
                  <Text style={tw`text-[13px] text-black/70`}>Volume: {brew?.volume_ml ?? '-'}ml</Text>
                </View>
                <View style={tw`w-1/2 pb-2`}>
                  <Text style={tw`text-[13px] text-black/70`}>Infusion: #{brew?.brew_number ?? '-'}</Text>
                </View>
                <View style={tw`w-1/2 pb-2`}>
                  <Text style={tw`text-[13px] text-black/70`}>
                    Start: {brew?.start_time ? new Date(brew.start_time).toLocaleString() : '-'}
                  </Text>
                </View>
                <View style={tw`w-1/2 pb-2`}>
                  <Text style={tw`text-[13px] text-black/70`}>
                    End: {brew?.end_time ? new Date(brew.end_time).toLocaleString() : '-'}
                  </Text>
                </View>
              </View>
            </View>

            {stage === 'completed' && brew?.tea_id && brew.tea_source ? (
              <View style={tw`rounded-2xl border border-black/10 bg-white/85 p-4`}>
                <Text style={tw`text-[12px] uppercase tracking-[2.2px] text-black/40`}>
                  Rate
                </Text>
                <Text style={tw`mt-2 text-[14px] text-black/70`}>
                  Rate the taste and aroma.
                </Text>
                <View style={tw`mt-3 flex-row gap-3`}>
                  <TouchableOpacity
                    style={tw`flex-1 rounded-full border border-black/20 bg-white px-4 py-2`}
                    onPress={() => handleRate(0)}
                    disabled={ratingLoading}
                  >
                    <Text style={tw`text-center text-[13px] font-semibold text-black`}>
                      {ratingValue === 0 ? 'Rated: Meh' : 'Not for me'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={tw`flex-1 rounded-full bg-[#51961f] px-4 py-2`}
                    onPress={() => handleRate(1)}
                    disabled={ratingLoading}
                  >
                    <Text style={tw`text-center text-[13px] font-semibold text-[#FFFBEF]`}>
                      {ratingValue === 1 ? 'Rated: Loved' : 'Loved it'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            <View style={tw`rounded-2xl border border-black/10 bg-white/80 p-4`}>
              <View style={tw`flex-row items-center justify-between`}>
                <Text style={tw`text-[12px] uppercase tracking-[2.2px] text-black/40`}>
                  History
                </Text>
                <Text style={tw`text-[12px] text-black/40`}>Latest</Text>
              </View>
              <View style={tw`mt-3 gap-2`}>
                {statusHistory.length === 0 ? (
                  <Text style={tw`text-[13px] text-black/50`}>Waiting for updates...</Text>
                ) : (
                  statusHistory
                    .slice()
                    .reverse()
                    .map((entry, index) => (
                      <View
                        key={`${entry.status}-${entry.timestamp}-${index}`}
                        style={tw`rounded-xl border border-black/10 bg-white p-3`}
                      >
                        <Text style={tw`text-[13px] font-semibold text-black`}>
                          {stageLabel(entry.status)}
                        </Text>
                        <Text style={tw`text-[12px] text-black/60`}>
                          {formatTimestamp(entry.timestamp)}
                        </Text>
                      </View>
                    ))
                )}
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function normalizeStage(value: string | null): BrewStage {
  if (!value) return 'starting';
  const normalized = value.toLowerCase();
  if (
    normalized === 'heating' ||
    normalized === 'pumping' ||
    normalized === 'brewing' ||
    normalized === 'completed' ||
    normalized === 'error' ||
    normalized === 'starting'
  ) {
    return normalized;
  }
  return 'starting';
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function stageLabel(stage: BrewStage): string {
  switch (stage) {
    case 'heating':
      return 'Heating';
    case 'pumping':
      return 'Pumping';
    case 'brewing':
      return 'Brewing';
    case 'completed':
      return 'Completed';
    case 'error':
      return 'Error';
    default:
      return 'Starting';
  }
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const ms = date.getMilliseconds().toString().padStart(3, '0');
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}.${ms}`;
}
