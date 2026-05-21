import { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, Link, useLocation, useNavigate } from 'react-router-dom';
import { io, type Socket } from 'socket.io-client';
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
import { InAppNotifications, type InAppNotification } from './components/InAppNotifications';
import { getAccessToken } from './services/auth';

const WS_BASE_URL = import.meta.env.VITE_WS_URL ?? window.location.origin;

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
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);

  const handleDismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handlePush = useCallback((payload: { brew_id: number; tea_name?: string | null }) => {
    setNotifications((prev) => {
      const next = [{
        id: `${payload.brew_id}-${Date.now()}`,
        title: 'Tea is ready',
        message: payload.tea_name ? `${payload.tea_name} is ready.` : 'Your tea is ready.',
        href: `/brew/${payload.brew_id}`,
      }, ...prev];
      return next.slice(0, 3);
    });
  }, []);
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
        <BrewNotifications
          authenticated={authenticated}
          onNotification={handlePush}
        />
        <NotificationHost items={notifications} onDismiss={handleDismiss} />
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

function BrewNotifications({
  authenticated,
  onNotification,
}: {
  authenticated: boolean;
  onNotification: (payload: { brew_id: number; tea_name?: string | null }) => void;
}) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!authenticated) return;
    const token = getAccessToken();
    if (!token) return;

    const socket = io(`${WS_BASE_URL}/brews`, {
      transports: ['websocket'],
      auth: { token },
    });

    socketRef.current = socket;

    socket.on('brew-complete', (payload: { brew_id: number; tea_name?: string | null }) => {
      if (!payload?.brew_id) return;
      onNotification(payload);
    });

    socket.on('connect_error', (socketError: Error) => {
      console.warn('Brew notification socket error', socketError);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [authenticated, onNotification]);

  return null;
}

function NotificationHost({
  items,
  onDismiss,
}: {
  items: InAppNotification[];
  onDismiss: (id: string) => void;
}) {
  const navigate = useNavigate();

  return (
    <InAppNotifications
      items={items}
      onDismiss={onDismiss}
      onOpen={(href) => navigate(href)}
    />
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
