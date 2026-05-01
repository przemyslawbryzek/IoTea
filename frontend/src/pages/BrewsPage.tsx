import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getBrews } from '../services/api';
import type { BrewSummary } from '../interfaces/brew.interface';

export function BrewsPage() {
  const [brews, setBrews] = useState<BrewSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
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
    };

    void load();
  }, []);

  return (
    <main className="min-h-app">
      <div className="mx-auto flex w-full max-w-7xl flex-col px-5 py-5 lg:px-8">
        <div className="flex items-center gap-2">
          <Link to="/profile" className="text-sm text-black/50">Profile</Link>
          <p className="text-sm text-black/50">/Brews</p>
        </div>

        <div className="mt-4 bg-[#FFFBEF] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-3xl font-bold text-black">Brews</h1>
            <span className="text-sm text-black/50">{brews.length} items</span>
          </div>

          {error ? <p className="rounded-xl border border-black/20 px-4 py-3 text-sm text-black">{error}</p> : null}

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-2xl border border-black/10 bg-black/5" />
              ))}
            </div>
          ) : brews.length ? (
            <div className="space-y-2">
              {brews.map((brew) => (
                <Link to={`/brew/${brew.id}`} key={brew.id}>
                  <div className="rounded-2xl border border-black/15 bg-white/75 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-base font-semibold text-black">Brew #{brew.id}</p>
                      <span className="rounded-full border border-black/20 px-3 py-1 text-xs uppercase tracking-[0.12em] text-black/70">
                        {brew.status}
                      </span>
                    </div>
                    <div className="mt-2 grid gap-1 text-sm text-black/70 md:grid-cols-2">
                      <p>Device: {brew.device_id}</p>
                      <p>Instruction: {brew.instruction_id}</p>
                      <p>Volume: {brew.volume_ml}ml</p>
                      <p>Infusion: #{brew.brew_number}</p>
                      <p>Start: {new Date(brew.start_time).toLocaleString()}</p>
                      <p>End: {brew.end_time ? new Date(brew.end_time).toLocaleString() : '-'}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-black/10 bg-white/70 px-4 py-6 text-sm text-black/60">
              No brews yet.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
