import type { ReactNode } from 'react';

type BrewStage = 'starting' | 'heating' | 'pumping' | 'brewing' | 'completed' | 'error';

type StageProps = {
  title: string;
  subtitle: string;
  active: boolean;
  progressLabel: string;
  detail?: string | null;
  children: ReactNode;
};

type BrewProcessAnimationsProps = {
  stage: BrewStage;
  heatingDetail?: string | null;
  brewingDetail?: string | null;
  completedDetail?: string | null;
};

function StageCard({ subtitle, active, progressLabel, detail, children }: StageProps) {
  return (
    <article className='p-4 transition-all duration-500'>
      <div
        className={`mb-3 flex h-32 items-center justify-center ${
          active ? '' : 'brew-scene-inactive'
        }`}
      >
        {children}
      </div>
      {detail ? <p className="text-2xl text-black text-center font-bold">{detail}</p> : null}
      <p className="text-xs text-black/60">{subtitle}</p>
      <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-black/40">
        {progressLabel}
      </p>
    </article>
  );
}

function HeatingAnimation() {
  return (
    <div className="brew-scene relative h-24 w-28">
      <span className="brew-heat-wave brew-heat-wave-1" />
      <span className="brew-heat-wave brew-heat-wave-2" />
      <svg viewBox="0 0 112 96" className="h-full w-full" aria-hidden="true">
        <rect x="50" y="10" width="12" height="54" rx="6" fill="#fff" stroke="rgba(0,0,0,0.35)" strokeWidth="1.5" />
        <circle cx="56" cy="73" r="15" fill="#fff" stroke="rgba(0,0,0,0.35)" strokeWidth="1.5" />
        <rect x="53.5" y="16" width="5" height="42" rx="3" className="brew-heat-column" />
        <circle cx="56" cy="73" r="11" className="brew-heat-bulb" />
        <line x1="66" y1="18" x2="72" y2="18" stroke="rgba(0,0,0,0.25)" />
        <line x1="66" y1="28" x2="72" y2="28" stroke="rgba(0,0,0,0.25)" />
        <line x1="66" y1="38" x2="72" y2="38" stroke="rgba(0,0,0,0.25)" />
        <line x1="66" y1="48" x2="72" y2="48" stroke="rgba(0,0,0,0.25)" />
      </svg>
    </div>
  );
}

function PumpingAnimation() {
  return (
    <div className="brew-scene relative h-24 w-32">
      <div className="brew-pump-icon-wrap absolute left-1/2 top-2 -translate-x-1/2">
        <img
          src="https://img.icons8.com/?size=100&id=36251&format=png&color=000000"
          alt="Pump icon"
          className="brew-pump-icon size-14"
        />
      </div>
      <div className="brew-pump-pipe" />
      <span className="brew-pump-drop brew-pump-drop-1" />
      <span className="brew-pump-drop brew-pump-drop-2" />
      <span className="brew-pump-drop brew-pump-drop-3" />
      <span className="brew-pump-wave" />
    </div>
  );
}

function BrewingAnimation() {
  return (
    <div className="brew-scene relative h-24 w-28">
      <svg viewBox="0 0 112 96" className="h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id="brew-tea-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#5e3213" />
            <stop offset="35%" stopColor="#b96f2f" />
            <stop offset="70%" stopColor="#7f3f17" />
            <stop offset="100%" stopColor="#df9a49" />
            <animateTransform
              attributeName="gradientTransform"
              type="translate"
              values="-0.8 0; 0.8 0; -0.8 0"
              dur="2.8s"
              repeatCount="indefinite"
            />
          </linearGradient>
          <clipPath id="brew-cup-liquid-clip">
            <path d="M24 34h52v28a12 12 0 0 1-12 12H36a12 12 0 0 1-12-12z" />
          </clipPath>
        </defs>

        <ellipse cx="50" cy="81" rx="31" ry="4" className="brew-cup-shadow" />
        <ellipse cx="50" cy="34" rx="27" ry="5" className="brew-cup-rim" />
        <path d="M24 34h52v28a12 12 0 0 1-12 12H36a12 12 0 0 1-12-12z" className="brew-cup-shell" />
        <path d="M76 40h9a8 8 0 0 1 0 16h-9" className="brew-cup-handle" />

        <g clipPath="url(#brew-cup-liquid-clip)">
          <rect x="25" y="39" width="52" height="34" fill="url(#brew-tea-gradient)" className="brew-cup-liquid" />
          <ellipse cx="50" cy="44" rx="24" ry="4" className="brew-cup-foam" />
          <path d="M29 47c8-4 14 4 22 0s14 4 21 0" className="brew-cup-shine" />
        </g>
      </svg>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center -translate-x-2 translate-y-2">
        <img
          src="https://img.icons8.com/?size=100&id=m4R7gAErloIZ&format=png&color=47BA3F"
          alt="Tea leaf"
          className="h-5 w-5"
        />
      </div>
      <span className="brew-steam brew-steam-1" />
      <span className="brew-steam brew-steam-2" />
      <span className="brew-steam brew-steam-3" />
      <span className="brew-steam brew-steam-4" />
    </div>
  );
}

function CompletedAnimation() {
  return (
    <div className="brew-scene relative h-24 w-28">
      <svg viewBox="0 0 112 96" className="h-full w-full" aria-hidden="true">
        <circle cx="56" cy="48" r="26" fill="#fff" stroke="rgba(0,0,0,0.25)" strokeWidth="2" />
        <path
          d="M42 48l9 9 20-20"
          fill="none"
          stroke="#51961f"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

const STAGE_META = [
  {
    key: 'heating',
    title: 'Heating',
    subtitle: 'Bringing water to the target temperature.',
    progressLabel: 'Stage 1/4',
    render: <HeatingAnimation />,
  },
  {
    key: 'pumping',
    title: 'Pumping',
    subtitle: 'Moving hot water into the brewing chamber.',
    progressLabel: 'Stage 2/4',
    render: <PumpingAnimation />,
  },
  {
    key: 'brewing',
    title: 'Brewing',
    subtitle: 'Extracting the leaves and finishing the infusion.',
    progressLabel: 'Stage 3/4',
    render: <BrewingAnimation />,
  },
  {
    key: 'completed',
    title: 'Completed',
    subtitle: 'Tea is ready for a quick rating.',
    progressLabel: 'Stage 4/4',
    render: <CompletedAnimation />,
  },
] as const;

const STAGE_FALLBACK: BrewStage = 'brewing';

export function BrewProcessAnimations({
  stage,
  heatingDetail,
  brewingDetail,
  completedDetail,
}: BrewProcessAnimationsProps) {
  const normalizedStage: BrewStage = stage === 'starting' ? 'heating' : stage;
  const activeIndex = Math.max(
    0,
    STAGE_META.findIndex((item) => item.key === normalizedStage),
  );
  const resolvedIndex = activeIndex === -1 ? STAGE_META.findIndex((item) => item.key === STAGE_FALLBACK) : activeIndex;

  const activeStage = STAGE_META[resolvedIndex] ?? STAGE_META[0];
  const detail =
    activeStage.key === 'heating'
      ? heatingDetail
      : activeStage.key === 'brewing'
        ? brewingDetail
        : activeStage.key === 'completed'
          ? completedDetail
          : null;

  return (
    <section className="mt-6 w-full">
        <p className="text-xs uppercase tracking-[0.3em] text-black/50">Process</p>
      <StageCard
        title={activeStage.title}
        subtitle={activeStage.subtitle}
        progressLabel={activeStage.progressLabel}
        active
        detail={detail}
      >
        {activeStage.render}
      </StageCard>
    </section>
  );
}
