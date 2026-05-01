import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BrewProcessAnimations } from '../components/BrewProcessAnimations';
import { TeaRating } from '../components/TeaRating';
import type { BrewSummary } from '../interfaces/brew.interface';
import { getBrews, setTeaRating } from '../services/api';

export function BrewPage() {
  const { id } = useParams();
  const [brew, setBrew] = useState<BrewSummary | null>(null);
  const [ratingValue, setRatingValue] = useState<0 | 1 | null>(null);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [error, setError] = useState('');

  const brewId = useMemo(() => Number(id), [id]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!Number.isFinite(brewId)) {
        setError('Nieprawidlowe ID parzenia');
        return;
      }

      try {
        const brews = await getBrews();
        if (!active) return;
        const match = brews.find((item) => item.id === brewId) ?? null;
        setBrew(match);
        setError(match ? '' : 'Nie znaleziono parzenia');
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : 'Nie udalo sie zaladowac parzenia');
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [brewId]);

  const handleRate = async (value: 0 | 1) => {
    if (!brew?.tea_id || !brew.tea_source) return;

    try {
      setRatingLoading(true);
      await setTeaRating(brew.tea_id, brew.tea_source, value);
      setRatingValue(value);
      setError('');
    } catch (ratingError) {
      setError(ratingError instanceof Error ? ratingError.message : 'Nie udalo sie zapisac oceny');
    } finally {
      setRatingLoading(false);
    }
  };

  return (
    <main className="min-h-app">
      <div className="mx-auto flex w-full max-w-7xl flex-col px-5 py-5 lg:px-8">
        <div className="flex flex-row items-center gap-2 mb-4">
          <Link to="/" className="text-sm text-black/50 mb-4">Teas</Link>
          <p className="text-sm text-black/50 mb-4">/Brew</p>
          <p className="text-sm text-black/50 mb-4">/{id}</p>
        </div>

        <div className="border border-black/25 rounded p-6 max-w-xl">
          <p className="text-xs uppercase tracking-[0.35em] text-black/50 mb-3">Brew</p>
          <h1 className="text-3xl font-bold text-black">Parzenie rozpoczęte</h1>
          <p className="mt-3 text-sm text-black/70">ID parzenia: {id}</p>
          <p className="mt-2 text-sm text-black/70">
            Strona parzenia jest gotowa pod ścieżką /brew/:id i możesz tu dodać live status.
          </p>
        </div>

        {error ? (
          <p className="mt-4 max-w-xl rounded-2xl border border-black/20 px-4 py-3 text-sm text-black/70">
            {error}
          </p>
        ) : null}

        {brew?.tea_id && brew.tea_source ? (
          <TeaRating value={ratingValue} onRate={handleRate} loading={ratingLoading} />
        ) : null}

        <BrewProcessAnimations />
      </div>
    </main>
  );
}
