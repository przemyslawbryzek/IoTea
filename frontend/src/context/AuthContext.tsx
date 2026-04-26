import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import * as authService from '../services/auth';
import * as api from '../services/api';
import type { CurrentUser } from '../interfaces/user.interface';

type AuthContextType = {
  authenticated: boolean;
  user: CurrentUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  updateProfile: (name: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshTimerRef = useRef<number | null>(null);

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current !== null) {
      window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const logoutInternal = useCallback(() => {
    clearRefreshTimer();
    authService.clearTokens();
    setAuthenticated(false);
    setUser(null);
  }, [clearRefreshTimer]);

  const refreshAccessToken = useCallback(async () => {
    const refreshToken = authService.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token');
    }

    const response = await api.refreshAccessToken(refreshToken);
    authService.setTokens(response.access_token, refreshToken);
    return response.access_token;
  }, []);

  const scheduleTokenRefresh = useCallback(
    (accessToken: string) => {
      const armTimer = (token: string) => {
        clearRefreshTimer();

        const expiresAt = authService.getTokenExpiresAt(token);
        if (!expiresAt) return;

        const refreshLeadTimeMs = 60_000;
        const delay = Math.max(1_000, expiresAt - Date.now() - refreshLeadTimeMs);

        refreshTimerRef.current = window.setTimeout(async () => {
          try {
            const refreshedAccessToken = await refreshAccessToken();
            armTimer(refreshedAccessToken);
          } catch {
            logoutInternal();
          }
        }, delay);
      };

      armTimer(accessToken);
    },
    [clearRefreshTimer, logoutInternal, refreshAccessToken],
  );

  useEffect(() => {
    const bootstrapAuth = async () => {
      const accessToken = authService.getAccessToken();
      const refreshToken = authService.getRefreshToken();

      if (!accessToken && !refreshToken) {
        setAuthenticated(false);
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        if (!accessToken && refreshToken) {
          const refreshedAccessToken = await refreshAccessToken();
          scheduleTokenRefresh(refreshedAccessToken);

          const me = await api.getCurrentUser();
          setAuthenticated(true);
          setUser(me);
          return;
        }

        if (!accessToken) {
          logoutInternal();
          return;
        }

        scheduleTokenRefresh(accessToken);

        try {
          const me = await api.getCurrentUser();
          setAuthenticated(true);
          setUser(me);
          return;
        } catch {
          if (!refreshToken) {
            logoutInternal();
            return;
          }

          const refreshedAccessToken = await refreshAccessToken();
          scheduleTokenRefresh(refreshedAccessToken);

          const me = await api.getCurrentUser();
          setAuthenticated(true);
          setUser(me);
        }
      } catch {
        logoutInternal();
      } finally {
        setLoading(false);
      }
    };

    void bootstrapAuth();
    return () => clearRefreshTimer();
  }, [clearRefreshTimer, logoutInternal, refreshAccessToken, scheduleTokenRefresh]);

  const login = async (email: string, password: string) => {
    const response = await api.login(email, password);
    authService.setTokens(response.access_token, response.refresh_token);
    scheduleTokenRefresh(response.access_token);

    try {
      const me = await api.getCurrentUser();
      setAuthenticated(true);
      setUser(me);
    } catch (error) {
      logoutInternal();
      throw error;
    }
  };

  const register = async (email: string, password: string, name: string) => {
    await api.register(email, password, name);
    await login(email, password);
  };

  const updateProfile = async (name: string) => {
    const updated = await api.updateCurrentUser({ name });
    setUser(updated);
  };

  const logout = () => {
    logoutInternal();
  };

  return (
    <AuthContext.Provider value={{ authenticated, user, loading, login, register, updateProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
