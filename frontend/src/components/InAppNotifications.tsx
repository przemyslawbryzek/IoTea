import { useEffect, useRef } from 'react';

export type InAppNotification = {
  id: string;
  title: string;
  message: string;
  href?: string;
};

type InAppNotificationsProps = {
  items: InAppNotification[];
  onDismiss: (id: string) => void;
  onOpen: (href: string) => void;
};

export function InAppNotifications({ items, onDismiss, onOpen }: InAppNotificationsProps) {
  const lastPlayedIdRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioReadyRef = useRef(false);

  useEffect(() => {
    const audio = new Audio('/notification.wav');
    audio.preload = 'auto';
    audioRef.current = audio;

    const unlockAudio = () => {
      if (audioReadyRef.current) return;
      audioReadyRef.current = true;

      audio.muted = true;
      void audio.play().then(() => {
        audio.pause();
        audio.currentTime = 0;
        audio.muted = false;
      }).catch(() => {
        audio.muted = false;
      });
    };

    window.addEventListener('pointerdown', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });

    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  useEffect(() => {
    if (!items.length) return;

    const timers = items.map((item) =>
      window.setTimeout(() => {
        onDismiss(item.id);
      }, 8000),
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [items, onDismiss]);

  useEffect(() => {
    const newest = items[0];
    if (!newest || newest.id === lastPlayedIdRef.current) return;

    lastPlayedIdRef.current = newest.id;
    const audio = audioRef.current;
    if (!audio || !audioReadyRef.current) return;

    audio.currentTime = 0;
    void audio.play().catch(() => {
      // Ignore autoplay restrictions.
    });
  }, [items]);

  if (items.length === 0) return null;

  return (
    <div className="fixed right-4 top-4 z-50 flex w-[320px] flex-col gap-2">
      {items.map((item) => (
        <div key={item.id} className="rounded-2xl border border-black/10 bg-white/95 p-4 shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-black">{item.title}</p>
              <p className="mt-1 text-xs text-black/60">{item.message}</p>
            </div>
            <button
              type="button"
              onClick={() => onDismiss(item.id)}
              className="text-xs text-black/40 hover:text-black"
            >
              Close
            </button>
          </div>
          {item.href ? (
            <button
              type="button"
              onClick={() => onOpen(item.href ?? '')}
              className="mt-3 text-xs font-semibold text-[#51961f]"
            >
              Open brew
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
