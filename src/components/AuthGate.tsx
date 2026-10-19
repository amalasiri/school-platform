import React, { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import App from '../App';
import { LoginView } from './LoginView';
import { authService, AuthUser } from '../services/authService';

const LOGIN_PATH = '/login';

function replacePath(path: string) {
  if (window.location.pathname !== path) {
    window.history.replaceState(null, '', path);
  }
}

/**
 * Blocks the whole app until a director session exists.
 * The server also redirects page loads to /login and returns 401 on /api/*,
 * this component handles the in-app state (login, logout, expired session).
 */
export const AuthGate: React.FC = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  const refreshSession = useCallback(async () => {
    const current = await authService.me();
    setUser(current);
    setIsChecking(false);
    replacePath(current ? (window.location.pathname === LOGIN_PATH ? '/' : window.location.pathname) : LOGIN_PATH);
  }, []);

  useEffect(() => {
    refreshSession();
    // Re-check when the tab regains focus so an expired session drops back to login
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshSession();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refreshSession]);

  const handleLogout = async () => {
    await authService.logout();
    setUser(null);
    replacePath(LOGIN_PATH);
  };

  if (isChecking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center" dir="rtl">
        <Loader2 className="w-6 h-6 text-emerald-700 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <LoginView
        onLoggedIn={(loggedIn) => {
          setUser(loggedIn);
          replacePath('/');
        }}
      />
    );
  }

  return <App onLogout={handleLogout} />;
};
