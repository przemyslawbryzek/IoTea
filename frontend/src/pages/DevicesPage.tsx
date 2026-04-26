import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { deleteDevice, getDevices } from '../services/api';
import type { DeviceSummary } from '../interfaces/device.interface';

export function DevicesPage() {
  const [devices, setDevices] = useState<DeviceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = async () => {
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
  };

  useEffect(() => {
    void load();
  }, []);

  const handleDelete = async (device: DeviceSummary) => {
    const confirmed = window.confirm(`Delete device ${device.name}?`);
    if (!confirmed) return;

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
  };

  return (
    <main className="min-h-app">
      <div className="mx-auto flex w-full max-w-7xl flex-col px-5 py-5 lg:px-8">
        <div className="flex items-center gap-2">
          <Link to="/profile" className="text-sm text-black/50">Profile</Link>
          <p className="text-sm text-black/50">/Devices</p>
        </div>

        <div className="mt-4 bg-[#FFFBEF] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-3xl font-bold text-black">Devices</h1>
            <span className="text-sm text-black/50">{devices.length} items</span>
          </div>

          {error ? <p className="rounded-xl border border-black/20 px-4 py-3 text-sm text-black">{error}</p> : null}

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-2xl border border-black/10 bg-black/5" />
              ))}
            </div>
          ) : devices.length ? (
            <div className="space-y-2">
              {devices.map((device) => (
                <article key={device.id} className="rounded-2xl border border-black/15 bg-white/75 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-base font-semibold text-black">{device.name}</p>
                      <p className="text-sm text-black/60">Model: {device.model ?? '-'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.12em] ${device.online ? 'border-[#51961f]/40 bg-[#51961f]/10 text-[#3a6d17]' : 'border-black/20 text-black/60'}`}>
                        {device.online ? 'online' : 'offline'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDelete(device)}
                        disabled={deletingId === device.id}
                        className="rounded-full border border-black/25 px-3 py-1.5 text-xs font-medium text-black hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingId === device.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 grid gap-1 text-sm text-black/70 md:grid-cols-2">
                    <p>Firmware: {device.firmware_version ?? '-'}</p>
                    <p>Current temp: {device.currentTemp ?? '-'}°C</p>
                    <p>Last seen: {device.last_seen ? new Date(device.last_seen).toLocaleString() : '-'}</p>
                    <p>Created: {new Date(device.created_at).toLocaleString()}</p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-black/10 bg-white/70 px-4 py-6 text-sm text-black/60">
              No devices yet.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
