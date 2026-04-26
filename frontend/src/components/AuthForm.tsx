import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';

type Props = {
  title: string;
  subtitle: string;
  submitLabel: string;
  switchText: string;
  switchHref: string;
  onSubmit: (data: { email: string; password: string; name?: string }) => Promise<void>;
  showName?: boolean;
  error?: string;
  loading?: boolean;
};

export function AuthForm({
  title,
  submitLabel,
  switchText,
  switchHref,
  onSubmit,
  showName = false,
  error,
  loading = false,
}: Props) {
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    await onSubmit({
      name: showName ? String(formData.get('name') ?? '') : undefined,
      email: String(formData.get('email') ?? ''),
      password: String(formData.get('password') ?? ''),
    });
  };

  return (
    <div className="min-h-app flex px-4 py-6">
      <div className="mx-auto flex w-full max-w-xl">
        <div className="w-full px-7 py-9 sm:px-10 sm:py-10">
          <section>
            <h2 className="mt-2 text-3xl font-semibold">{title}</h2>
            <form onSubmit={handleSubmit} className="mt-7 space-y-5">
              {showName && (
                <label className="block space-y-2 text-sm font-medium">
                  <span>Name</span>
                  <input
                    name="name"
                    required
                    className="w-full rounded-full border border-black/25 bg-white px-5 py-3.5 text-base outline-none"
                    placeholder="Jan Kowalski"
                  />
                </label>
              )}

              <label className="block space-y-2 text-sm font-medium">
                <span>Email</span>
                <input
                  type="email"
                  name="email"
                  required
                  className="w-full rounded-full border border-black/25 bg-white px-5 py-3.5 text-base outline-none"
                  placeholder="you@example.com"
                />
              </label>

              <label className="block space-y-2 text-sm font-medium">
                <span>Password</span>
                <input
                  type="password"
                  name="password"
                  required
                  className="w-full rounded-full border border-black/25 bg-white px-5 py-3.5 text-base outline-none"
                  placeholder="••••••••"
                />
              </label>

              {error ? (
                <p className="border border-black bg-black px-4 py-3 text-sm text-white">{error}</p>
              ) : null}

              <button
                type="submit"
                className="w-full rounded-full bg-[#51961f] px-5 py-3.5 text-base font-medium text-[#FFFBEF] transition hover:bg-[#51961f]/90 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={loading}
              >
                {loading ? 'Ładowanie...' : submitLabel}
              </button>
            </form>

            <p className="mt-7 text-base text-black/70">
              {switchText}{' '}
              <Link to={switchHref} className="font-medium underline underline-offset-4">
                go here
              </Link>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}