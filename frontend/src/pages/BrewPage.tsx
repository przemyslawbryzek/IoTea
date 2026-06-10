import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { io, type Socket } from 'socket.io-client';
import { BrewProcessAnimations } from '../components/BrewProcessAnimations';
import { TeaRating } from '../components/TeaRating';
import type { BrewSummary } from '../interfaces/brew.interface';
import { getBrewHistory, getBrews, getDeviceStatus, getServerNow, setTeaRating } from '../services/api';

type BrewStage = 'starting' | 'heating' | 'pumping' | 'brewing' | 'completed' | 'error';

const WS_BASE_URL = import.meta.env.VITE_WS_URL ?? window.location.origin;

export function BrewPage() {
  const { id } = useParams();
  const [brew, setBrew] = useState<BrewSummary | null>(null);
  const [liveStatus, setLiveStatus] = useState<BrewStage | null>(null);
  const [currentTemp, setCurrentTemp] = useState<number | null>(null);
  const [currentTempUpdatedAt, setCurrentTempUpdatedAt] = useState<string | null>(null);
  const [now, setNow] = useState(() => getServerNow());
  const [statusHistory, setStatusHistory] = useState<Array<{ status: BrewStage; timestamp: number }>>([]);
  const [brewingStartedAt, setBrewingStartedAt] = useState<number | null>(null);
  const [ratingValue, setRatingValue] = useState<0 | 1 | null>(null);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [error, setError] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const brewId = useMemo(() => Number(id), [id]);
  const statusOrder = useMemo(
    () => ({
      starting: 0,
      heating: 1,
      pumping: 2,
      brewing: 3,
      completed: 4,
      error: 5,
    }),
    [],
  );

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!Number.isFinite(brewId)) {
        setError('Invalid brew ID');
        return;
      }

      try {
        const [brews, history] = await Promise.all([
          getBrews(),
          getBrewHistory(brewId),
        ]);

        if (!active) return;

        if (history.length) {
          const mapped = history
            .map((entry) => ({
              status: normalizeStage(entry.status),
              timestamp: new Date(entry.ts).getTime(),
            }))
            .sort((a, b) =>
              a.timestamp === b.timestamp
                ? statusOrder[a.status] - statusOrder[b.status]
                : a.timestamp - b.timestamp,
            );
          setStatusHistory(mapped);
          const firstBrewing = mapped.find((entry) => entry.status === 'brewing');
          if (firstBrewing) {
            setBrewingStartedAt(firstBrewing.timestamp);
          }
        }

        const match = brews.find((item) => item.id === brewId) ?? null;
        setBrew(match);
        setLiveStatus(normalizeStage(match?.status ?? null));
        setError(match ? '' : 'Brew not found');
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : 'Failed to load brew');
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [brewId]);

  useEffect(() => {
    if (!Number.isFinite(brewId)) return;

    const socket = io(`${WS_BASE_URL}/brews`, {
      transports: ['websocket'],
      query: { brewId: String(brewId) },
    });
    socketRef.current = socket;

    socket.on('brew-status', (payload: {
      brew_id: number;
      status?: string;
      timestamp?: number;
      current_temp?: number | null;
      current_temp_updated_at?: string | null;
    }) => {
      if (payload?.brew_id !== brewId) return;

      if (payload.status) {
        const nextStage = normalizeStage(payload.status);
        setLiveStatus(nextStage);
        if (payload.timestamp) {
          setStatusHistory((prev) => {
            const next = [...prev, { status: nextStage, timestamp: payload.timestamp ?? getServerNow() }]
              .sort((a, b) =>
                a.timestamp === b.timestamp
                  ? statusOrder[a.status] - statusOrder[b.status]
                  : a.timestamp - b.timestamp,
              );
            return next.slice(-20);
          });
        }
        if (nextStage === 'brewing' && payload.timestamp) {
          setBrewingStartedAt(payload.timestamp);
        }
      }

      if (typeof payload.current_temp === 'number') {
        setCurrentTemp(payload.current_temp);
      }

      if (payload.current_temp_updated_at) {
        setCurrentTempUpdatedAt(payload.current_temp_updated_at);
      }
    });

    socket.on('connect_error', (socketError: Error) => {
      console.warn('Brew socket error', socketError);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [brewId]);

  useEffect(() => {
    if (!brew?.device_id) return;

    let active = true;

    const loadStatus = async () => {
      try {
        const status = await getDeviceStatus(brew.device_id);
        if (!active) return;
        setCurrentTemp(status.currentTemp ?? null);
        setCurrentTempUpdatedAt(status.currentTempUpdatedAt ?? null);
      } catch {
        // ignore polling errors
      }
    };

    void loadStatus();
    const interval = window.setInterval(() => {
      void loadStatus();
    }, 8000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [brew?.device_id]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(getServerNow());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

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

  const stage = useMemo(() => normalizeStage(liveStatus ?? brew?.status ?? null), [brew?.status, liveStatus]);
  const targetTemp = brew?.tea_temp ?? null;

  const heatingDetail = useMemo(() => {
    if (!targetTemp && targetTemp !== 0) {
      return currentTemp !== null ? `Temp: ${currentTemp}°C` : null;
    }
    if (currentTemp === null) return `Target: ${targetTemp}°C`;
    return `${currentTemp}°C / ${targetTemp}°C`;
  }, [currentTemp, targetTemp]);

  const totalBrewSeconds = brew?.total_brew_seconds ?? null;

  const brewingDetail = useMemo(() => {
    if (!totalBrewSeconds) return null;
    if (!brewingStartedAt) return null;
    const startTime = brewingStartedAt;
    const endTime = startTime + totalBrewSeconds * 1000;
    const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
    return `${formatDuration(remaining)}`;
  }, [totalBrewSeconds, brewingStartedAt, now]);

  const completedDetail = useMemo(() => {
    if (stage !== 'completed') return null;
    return 'Rate the taste and aroma.';
  }, [stage]);

  return (
    <main className="min-h-app">
      <div className="mx-auto flex w-full max-w-7xl flex-col px-5 py-5 lg:px-8">
        <div className="flex flex-row items-center gap-2 mb-4">
          <Link to="/" className="text-sm text-black/50 mb-4">Teas</Link>
          <p className="text-sm text-black/50 mb-4">/Brew</p>
          <p className="text-sm text-black/50 mb-4">/{id}</p>
        </div>
        {error ? (
          <p className="mt-4 max-w-xl rounded-2xl border border-black/20 px-4 py-3 text-sm text-black/70">
            {error}
          </p>
        ) : null}

        <div className="mx-auto w-full mt-6 flex flex-col justify-between lg:flex-row">
          <section className="w-full mb-6 lg:mb-0 lg:max-w-lg px-6">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.35em] text-black/50 mb-3">Brew</p>
              <h1 className="text-3xl font-bold text-black">Status: {stageLabel(stage)}</h1>
              <p className="mt-3 text-sm text-black/70">Brew ID: {id}</p>
              {currentTempUpdatedAt ? (
                <p className="mt-2 text-xs text-black/50">
                  Temp updated: {new Date(currentTempUpdatedAt).toLocaleTimeString()}
                </p>
              ) : null}
            </div>
            <BrewProcessAnimations
              stage={stage}
              heatingDetail={heatingDetail}
              brewingDetail={brewingDetail}
              completedDetail={completedDetail}
            />
            {stage === 'completed' && brew?.tea_id && brew.tea_source ? (
              <TeaRating value={ratingValue} onRate={handleRate} loading={ratingLoading} />
            ) : null}
          </section>

          <aside className="w-2/5 rounded-2xl border border-black/10 bg-white/70 p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.3em] text-black/50">History</p>
              <p className="text-xs text-black/45">Latest</p>
            </div>
            <div className="mt-4 space-y-3">
              {statusHistory.length === 0 ? (
                <p className="text-sm text-black/50">Waiting for updates...</p>
              ) : (
                statusHistory
                  .slice()
                  .reverse()
                  .map((entry, index) => (
                    <div key={`${entry.status}-${entry.timestamp}-${index}`} className="rounded-xl border border-black/10 bg-white p-3">
                      <p className="text-sm font-semibold text-black">{stageLabel(entry.status)}</p>
                      <p className="text-xs text-black/60">
                        {formatTimestamp(entry.timestamp)}
                      </p>
                    </div>
                  ))
              )}
            </div>
          </aside>
        </div>
      </div>
    </main>
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
