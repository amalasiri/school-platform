export type AuthRole = 'director';

export interface AuthUser {
  username: string;
  role: AuthRole;
}

export const authService = {
  async me(): Promise<AuthUser | null> {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
      if (!res.ok) return null;
      const data = await res.json();
      return data.authenticated ? (data.user as AuthUser) : null;
    } catch {
      return null;
    }
  },

  async login(role: AuthRole, username: string, password: string): Promise<{ user?: AuthUser; error?: string }> {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        return { error: data.error || 'تعذر تسجيل الدخول، يرجى المحاولة مرة أخرى.' };
      }
      return { user: data.user as AuthUser };
    } catch {
      return { error: 'تعذر الاتصال بالخادم. تحقق من اتصالك ثم أعد المحاولة.' };
    }
  },

  async logout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    } catch {
      // Ignore network errors: the UI returns to the login screen regardless
    }
  },
};
