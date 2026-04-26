import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function AccountPage() {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setName(user?.name ?? '');
  }, [user?.name]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError('Name must have at least 2 characters.');
      setMessage('');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setMessage('');
      await updateProfile(trimmed);
      setMessage('Name updated successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update name');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-app">
      <div className="mx-auto flex w-full max-w-7xl flex-col px-5 py-5 lg:px-8">
        <div className="flex items-center gap-2">
          <Link to="/profile" className="text-sm text-black/50">Profile</Link>
          <p className="text-sm text-black/50">/Account</p>
        </div>

        <section className="mt-4 w-full max-w-xl rounded-3xl border border-black/15 bg-[#FFFBEF] p-6">
          <h1 className="text-3xl font-bold text-black">Account</h1>
          <p className="mt-1 text-sm text-black/60">Change your display name.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block space-y-2 text-sm font-medium text-black">
              <span>Name</span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="h-11 w-full rounded-full border border-black/25 bg-white px-4 text-sm outline-none"
                placeholder="Your name"
              />
            </label>

            <label className="block space-y-2 text-sm font-medium text-black/70">
              <span>Email</span>
              <input
                type="text"
                value={user?.email ?? ''}
                disabled
                className="h-11 w-full rounded-full border border-black/20 bg-black/5 px-4 text-sm text-black/60"
              />
            </label>

            {error ? <p className="rounded-xl border border-black/20 px-4 py-3 text-sm text-black">{error}</p> : null}
            {message ? <p className="rounded-xl border border-[#51961f]/40 bg-[#51961f]/10 px-4 py-3 text-sm text-[#2f5b12]">{message}</p> : null}

            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-[#51961f] px-5 py-2.5 text-sm font-medium text-[#FFFBEF] hover:bg-[#51961f]/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
