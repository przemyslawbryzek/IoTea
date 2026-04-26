import { Link, useParams } from 'react-router-dom';
import { BrewProcessAnimations } from '../components/BrewProcessAnimations';

export function BrewPage() {
  const { id } = useParams();

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

        <BrewProcessAnimations />
      </div>
    </main>
  );
}
