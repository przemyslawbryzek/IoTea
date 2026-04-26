import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProfilePage() {
  const { user, loading, logout } = useAuth();
  const displayName = user?.name?.trim() || user?.email || 'Uzytkownik';

  if (loading) {
    return (
      <div className="min-h-app flex items-center justify-center bg-white">
        <div className="text-center text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-[#fe7600] px-4 py-5 sm:px-6">
      <div className="mx-auto flex min-h-app w-full max-w-md flex-col gap-4">
        <div className="p-5 flex flex-row gap-2 items-center">
          <p className='uppercase size-8 flex items-center justify-center rounded-full p-2 bg-green-300 text-emerald-800'>{displayName[0]}</p>
          <h1 className="text-3xl font-bold leading-tight text-black">{displayName}</h1>
        </div>

        <div className="grid grid-cols-2 gap-8">
          <Link to="/brews" className="rounded-2xl bg-[#FFFBEF] p-4 shadow-[0_10px_24px_rgba(0,0,0,0.1)] flex flex-col justify-center items-center hover:scale-[1.01] transition-transform">
            <img src="https://img.icons8.com/?size=100&id=273&format=png&color=000000" alt="Brews icon" className="size-8" />
            <p className="mt-2 text-lg font-semibold text-black">Brews</p>
          </Link>
          <Link to="/account" className="rounded-2xl bg-[#FFFBEF] p-4 shadow-[0_10px_24px_rgba(0,0,0,0.1)] flex flex-col justify-center items-center hover:scale-[1.01] transition-transform">
            <img src="https://img.icons8.com/?size=100&id=15265&format=png&color=000000" alt="Account icon" className="size-8" />
            <p className="mt-2 text-lg font-semibold text-black">Account</p>
          </Link>
        </div>

        <div className="rounded-4xl bg-[#FFFBEF] p-3.5 shadow-[0_14px_30px_rgba(0,0,0,0.12)]">
          <div className="overflow-hidden rounded-2xl border border-black/10 bg-[#FFFBEF]">
            <Link
              to="/myteas"
              className="flex items-center justify-between px-4 py-3.5 text-black transition-colors hover:bg-black/5"
            >
              <span className="text-base font-medium">My Teas</span>
              <span className="text-black/40">→</span>
            </Link>
            <Link
              to="/devices"
              className="flex w-full items-center justify-between border-t border-black/10 px-4 py-3.5 text-left text-black transition-colors hover:bg-black/5"
            >
              <span className="text-base font-medium">Devices</span>
              <span className="text-black/40">→</span>
            </Link>
            <button
              type="button"
              onClick={logout}
              className="flex w-full items-center justify-between border-t border-black/10 px-4 py-3.5 text-left text-black transition-colors hover:bg-black/5"
            >
              <span className="text-base font-medium">Logout</span>
              <span className="text-black/40">→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
