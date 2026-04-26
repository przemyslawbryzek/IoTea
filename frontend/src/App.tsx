import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, Link, useLocation } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { HomePage } from './pages/HomePage';
import { ProfilePage } from './pages/ProfilePage';
import { TeaPage } from './pages/TeaPage';
import { BrewPage } from './pages/BrewPage';
import { MyTeasPage } from './pages/MyTeasPage';
import { BrewsPage } from './pages/BrewsPage';
import { DevicesPage } from './pages/DevicesPage';
import { AccountPage } from './pages/AccountPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import logo from './assets/logo.png';

function Navigation() {
  const location = useLocation();
  const isProfileRoute = location.pathname === '/profile';
  const { authenticated, user } = useAuth();
  const displayName = user?.name?.trim() || user?.email || 'Uzytkownik';
  const [detached, setDetached] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setDetached(window.scrollY > 24);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className={`sticky top-0 z-50 transition-all ${isProfileRoute ? 'bg-[#fe7600]' : ''}`}>
      <nav
        className={`px-5 py-4 w-full max-w-7xl mx-auto flex flex-row justify-between items-center transition-all duration-300 ${detached ? (isProfileRoute ? 'bg-[#fe7600]/95 backdrop-blur' : 'bg-[#FFFBEF]/95 backdrop-blur') : ''}`}
      >
        <Link to="/">
          <img src={logo} alt="IoTea Logo" className="size-12" />
        </Link>
        {authenticated ? (
          <Link to="/profile" className="rounded-4xl px-4 py-2 flex flex-row items-center bg-[#FFFBEF] border border-black/25">
            <img src="https://img.icons8.com/?size=100&id=15265&format=png&color=000000" alt={displayName} className="size-8 rounded-full" />
            {displayName}
          </Link>
        ) : (
          <Link to="/login" className="rounded border border-black px-4 py-2">
            Login
          </Link>
        )}
      </nav>
    </div>
  );
}

function AppContent() {
  const { authenticated, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen">
        <Navigation />
        <Routes>
          {authenticated ? (
            <>
              <Route path="/" element={<HomePage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/myteas" element={<MyTeasPage />} />
              <Route path="/brews" element={<BrewsPage />} />
              <Route path="/devices" element={<DevicesPage />} />
              <Route path="/account" element={<AccountPage />} />
              <Route path="/login" element={<Navigate to="/" replace />} />
              <Route path="/register" element={<Navigate to="/" replace />} />
              <Route path="/tea/:source/:id" element={<TeaPage />} />
              <Route path="/tea/:id" element={<TeaPage />} />
              <Route path="/brew/:id" element={<BrewPage />} />
            </>
          ) : (
            <>
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </>
          )}
          <Route path="*" element={<Navigate to={authenticated ? '/' : '/login'} replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
