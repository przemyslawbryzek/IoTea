type RatingValue = 0 | 1 | null;

type TeaRatingProps = {
  value: RatingValue;
  onRate: (value: 0 | 1) => void;
  loading?: boolean;
};

const likeIcon = 'https://img.icons8.com/?size=100&id=82788&format=png&color=000000';
const dislikeIcon = 'https://img.icons8.com/?size=100&id=87695&format=png&color=000000';

export function TeaRating({ value, onRate, loading = false }: TeaRatingProps) {
  const likeActive = value === 1;
  const dislikeActive = value === 0;

  const baseButton = 'flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium';
  const activeButton = 'border-black/40 bg-black/5';
  const inactiveButton = 'border-black/20 bg-white';

  return (
    <div className="mt-6 w-full max-w-xl p-4">
      <p className="text-xs uppercase tracking-[0.35em] text-black/50">Rate the tea</p>
      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => onRate(1)}
          disabled={loading}
          className={`${baseButton} ${likeActive ? activeButton : inactiveButton}`}
        >
          <img src={likeIcon} alt="Like" className="h-5 w-5" />
          Like
        </button>
        <button
          type="button"
          onClick={() => onRate(0)}
          disabled={loading}
          className={`${baseButton} ${dislikeActive ? activeButton : inactiveButton}`}
        >
          <img src={dislikeIcon} alt="Dislike" className="h-5 w-5" />
          Dont like
        </button>
      </div>
      {loading ? <p className="mt-3 text-xs text-black/50">Saving rating...</p> : null}
    </div>
  );
}
