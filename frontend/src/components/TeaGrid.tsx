import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { BrewSummary } from '../interfaces/brew.interface';
import type { Tea } from '../interfaces/tea.interface';

type Props = {
  teas: Tea[];
  loading: boolean;
  continueBrews?: BrewSummary[];
};

export function TeaGrid({ teas, loading, continueBrews = [] }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  const [myTeasOnly, setMyTeasOnly] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [showSortFilter, setShowSortFilter] = useState(false);
  const [tempMin, setTempMin] = useState(0);
  const [tempMax, setTempMax] = useState(100);
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'temp-asc' | 'temp-desc'>('name-asc');

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

    return teas.filter((tea) => {
      const matchesCategory = activeCategoryId === null || tea.category.id === activeCategoryId;
      const matchesSource = !myTeasOnly || (tea.source ?? 'base') === 'user';
      const matchesFavorites = !favoritesOnly || tea.is_favorite === true;
      const matchesTemp = tea.brew_temp >= tempMin && tea.brew_temp <= tempMax;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        tea.name.toLowerCase().includes(normalizedQuery) ||
        tea.category.name.toLowerCase().includes(normalizedQuery);

      return matchesCategory && matchesSource && matchesFavorites && matchesTemp && matchesQuery;
    });
  }, [teas, activeCategoryId, myTeasOnly, favoritesOnly, searchQuery, tempMin, tempMax]);

  const visibleTeas = useMemo(() => {
    const sorted = [...filteredTeas];

    sorted.sort((a, b) => {
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
      if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
      if (sortBy === 'temp-asc') return a.brew_temp - b.brew_temp;
      return b.brew_temp - a.brew_temp;
    });

    return sorted;
  }, [filteredTeas, sortBy]);

  const handleCategoryClick = (categoryId: number) => {
    setActiveCategoryId((prev) => (prev === categoryId ? null : categoryId));
  };

  const unfinishedBrews = useMemo(() => {
    return continueBrews
      .filter((brew) => {
        if (!brew.max_brew || brew.max_brew <= 0) return false;
        if (!brew.tea_id || !brew.tea_source) return false;
        return brew.brew_number < brew.max_brew;
      })
      .slice(0, 4);
  }, [continueBrews]);

  return (
    <section className=" w-full">
      <div className="flex items-end justify-between p-5 w-full">
        <div className="w-full">
          <p className="text-xs uppercase tracking-[0.35em] text-black/50">Teas</p>
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              placeholder="Search teas..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full rounded border border-black/25 px-4 py-3 outline-none"
            />
            <button
              type="button"
              onClick={() => setShowSortFilter((prev) => !prev)}
              className="shrink-0 rounded border border-black/25 px-4 py-3 text-sm font-medium hover:bg-black/5"
            >
              Sort & Filter
            </button>
          </div>

          {showSortFilter ? (
            <div className="mt-2 grid gap-2 p-3 md:grid-cols-2">
              <label className="text-xs uppercase tracking-[0.12em] text-black/60">
                Sort
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
                  className="mt-1 h-10 w-full rounded border border-black/25 bg-white px-3 text-sm normal-case"
                >
                  <option value="name-asc">Name A-Z</option>
                  <option value="name-desc">Name Z-A</option>
                  <option value="temp-asc">Temperature Low-High</option>
                  <option value="temp-desc">Temperature High-Low</option>
                </select>
              </label>

              <label className="text-xs uppercase tracking-[0.12em] text-black/60">
                Temperature Range (°C)
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min={0}
                    max={150}
                    value={tempMin}
                    onChange={(event) => setTempMin(Number(event.target.value))}
                    className="h-10 w-full rounded border border-black/25 bg-white px-3 text-sm normal-case"
                    placeholder="Min"
                  />
                  <input
                    type="number"
                    min={0}
                    max={150}
                    value={tempMax}
                    onChange={(event) => setTempMax(Number(event.target.value))}
                    className="h-10 w-full rounded border border-black/25 bg-white px-3 text-sm normal-case"
                    placeholder="Max"
                  />
                </div>
              </label>
            </div>
          ) : null}

          <div className="mt-3 flex w-full flex-nowrap gap-2 justify-evenly overflow-x-auto">
            <button
              type="button"
              onClick={() => setMyTeasOnly((prev) => !prev)}
              className="flex flex-col items-center gap-2 px-2 py-1.5 text-sm transition-colors"
            >
              <span
                className={`flex size-11 items-center justify-center rounded-full border
                      ${myTeasOnly
                        ? 'border-black bg-black/20'
                        : 'border-black/25 hover:bg-black/5'
                    }`}
              >
                <img
                  className="size-5"
                  src="https://img.icons8.com/?size=100&id=15265&format=png&color=000000"
                  alt="My teas icon"
                />
              </span>
              <span>My Teas</span>
            </button>

            <button
              type="button"
              onClick={() => setFavoritesOnly((prev) => !prev)}
              className="flex flex-col items-center gap-2 px-2 py-1.5 text-sm transition-colors"
            >
              <span
                className={`flex size-11 items-center justify-center rounded-full border
                      ${favoritesOnly
                        ? 'border-black bg-black/20'
                        : 'border-black/25 hover:bg-black/5'
                    }`}
              >
                <img
                  className="size-5"
                  src="https://img.icons8.com/?size=100&id=85038&format=png&color=000000"
                  alt="Favorites icon"
                />
              </span>
              <span>Favorites</span>
            </button>

            {categories.map((category) => {
              const isActive = activeCategoryId === category.id;

              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => handleCategoryClick(category.id)}
                  className={"flex flex-col items-center gap-2 px-2 py-1.5 text-sm transition-colors"}
                >
                  <span
                    className={`flex size-11 items-center justify-center rounded-full border
                      ${isActive
                        ? 'border-black bg-black/20'
                        : 'border-black/25 hover:bg-black/5'
                    }`}
                  >
                    <img
                      className="size-5"
                      src={
                        category.icon_url ??
                        'https://img.icons8.com/?size=100&id=rCUgZeMLbaAM&format=png&color=000000'
                      }
                      alt={`${category.name} icon`}
                    />
                  </span>
                  <span>{category.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {unfinishedBrews.length ? (
            <div className="mt-3 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.18em]">Continue brews</p>
                <Link to="/brews" className="text-xs text-black/50 underline underline-offset-2">view all</Link>
              </div>
              <div className="flex flex-row gap-3 overflow-x-auto flex-nowrap w-full">
                {unfinishedBrews.map((brew) => (
                  <Link
                    key={brew.id}
                    to={`/tea/${brew.tea_source}/${brew.tea_id}?brewNumber=${Math.min((brew.brew_number ?? 1) + 1, brew.max_brew ?? 1)}`}
                    className="group  p-3"
                  >
                    <div className="h-auto w-32 shrink-0 overflow-hidden rounded-lg aspect-5/3">
                      <img
                        src={brew.tea_image_url || 'https://images.unsplash.com/photo-1602943543714-cf535b048440?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxncmVlbiUyMHRlYSUyMGxlYXZlc3xlbnwxfHx8fDE3NzMyMTk0NzJ8MA&ixlib=rb-4.1.0&q=80&w=1080'}
                        alt={brew.tea_name || `Brew #${brew.id}`}
                        className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
                      />
                    </div>
                    <div className="mt-2 min-w-0">
                      <p className="truncate text-sm font-medium text-black">{brew.tea_name || `Brew #${brew.id}`}</p>
                      <div className='flex flex-row gap-2 items-center'>
                        <div className="mt-1 flex  items-center gap-1.5 text-xs text-black/70">
                          <img
                            className="size-3.5"
                            src="https://img.icons8.com/?size=100&id=EdMznDNT8gPX&format=png&color=000000"
                            alt="Temperature icon"
                          />
                          <span>{brew.tea_temp ?? '-'}°C</span>
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-black/70">
                          <img
                            className="size-3.5"
                            src="https://img.icons8.com/?size=100&id=273&format=png&color=000000"
                            alt="Kettle icon"
                          />
                          <span>{brew.brew_number} / {brew.max_brew}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

      <div className="grid gap-0 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="min-h-52 border-t border-black p-5">
              <div className="h-4 w-20 animate-pulse bg-black/10" />
              <div className="mt-4 h-6 w-3/4 animate-pulse bg-black/10" />
              <div className="mt-4 h-20 animate-pulse bg-black/10" />
            </div>
          ))
        ) : visibleTeas.length ? (
          visibleTeas.map((tea) => (
            <Link
              to={`/tea/${tea.source ?? 'base'}/${tea.id}`}
              key={`${tea.source ?? 'base'}-${tea.id}`}
              className="group p-5 flex flex-col gap-4"
            >
              <div className="overflow-hidden rounded-2xl aspect-5/3">
                {tea.image_url ? (
                  <img
                    src={tea.image_url}
                    alt={tea.name}
                    className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
                  />
                ) : (
                  <img
                    src="https://images.unsplash.com/photo-1602943543714-cf535b048440?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxncmVlbiUyMHRlYSUyMGxlYXZlc3xlbnwxfHx8fDE3NzMyMTk0NzJ8MA&ixlib=rb-4.1.0&q=80&w=1080"
                    alt={tea.name}
                    className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
                  />
                )}
              </div>
              <div>
                <h3 className="text-lg font-medium">{tea.name}</h3>
                <div className="mt-1 flex flex-row items-center gap-3 text-sm text-black/70">
                  <div className="flex items-center gap-1">
                    <img
                      className="inline size-4"
                      src="https://img.icons8.com/?size=100&id=EdMznDNT8gPX&format=png&color=000000"
                      alt="Temperature icon"
                    />
                    <p>{tea.brew_temp}°C</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <img
                      className="inline size-4"
                      src="https://img.icons8.com/?size=100&id=82788&format=png&color=000000"
                      alt="Rating icon"
                    />
                    <p>
                      {tea.rating_percent === null || tea.rating_percent === undefined
                        ? '-'
                        : `${tea.rating_percent}%`}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="border-t border-black p-5 text-sm text-black/60">Teas not found.</div>
        )}
      </div>
    </section>
  );
}