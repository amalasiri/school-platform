import crypto from 'node:crypto';
import type { NextFunction, Request, Response, Express } from 'express';

// ==============================================================================
// Director-only authentication (credentials come from .env)
// Stateless HMAC-signed session cookie: no DB, no extra dependencies.
// ==============================================================================

export type AuthRole = 'director';

interface SessionPayload {
  sub: string;
  role: AuthRole;
  exp: number; // epoch ms
}

const COOKIE_NAME = 'sp_session';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

// Brute-force protection: max failed attempts per IP within the window
const MAX_FAILED_ATTEMPTS = 5;
const FAILED_WINDOW_MS = 15 * 60 * 1000;
const failedAttempts = new Map<string, { count: number; firstAt: number }>();

function getSessionSecret(): string {
  const fromEnv = process.env.SESSION_SECRET;
  if (fromEnv && fromEnv.trim().length >= 16 && !fromEnv.includes('CHANGE_ME')) {
    return fromEnv;
  }
  return FALLBACK_SECRET;
}

// Random per-process secret when SESSION_SECRET is missing: sessions are invalidated on restart
const FALLBACK_SECRET = crypto.randomBytes(32).toString('hex');

function getDirectorCredentials(): { username: string; password: string } | null {
  const username = process.env.DIRECTOR_USERNAME?.trim();
  const password = process.env.DIRECTOR_PASSWORD;
  if (!username || !password || password.includes('CHANGE_ME')) return null;
  return { username, password };
}

export function logAuthConfigWarnings(): void {
  if (!getDirectorCredentials()) {
    console.warn(
      '[auth] DIRECTOR_USERNAME / DIRECTOR_PASSWORD are not set in .env — nobody can log in until they are configured.'
    );
  }
  if (getSessionSecret() === FALLBACK_SECRET) {
    console.warn(
      '[auth] SESSION_SECRET is missing or too short (min 16 chars) — using a random secret; sessions will reset on every server restart.'
    );
  }
}

function safeEqual(a: string, b: string): boolean {
  // Hash both sides so lengths match and comparison time does not leak content
  const ha = crypto.createHash('sha256').update(a, 'utf8').digest();
  const hb = crypto.createHash('sha256').update(b, 'utf8').digest();
  return crypto.timingSafeEqual(ha, hb);
}

function sign(data: string): string {
  return crypto.createHmac('sha256', getSessionSecret()).update(data).digest('base64url');
}

function createToken(payload: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `${body}.${sign(body)}`;
}

function verifyToken(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const [body, signature] = token.split('.');
  if (!body || !signature || !safeEqual(signature, sign(body))) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload;
    if (payload.role !== 'director' || typeof payload.exp !== 'number' || payload.exp < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) {
      return decodeURIComponent(part.slice(idx + 1).trim());
    }
  }
  return undefined;
}

function setSessionCookie(res: Response, token: string, maxAgeMs: number): void {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: maxAgeMs,
  });
}

export function getSession(req: Request): SessionPayload | null {
  return verifyToken(readCookie(req, COOKIE_NAME));
}

function clientIp(req: Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

function isRateLimited(ip: string): boolean {
  const entry = failedAttempts.get(ip);
  if (!entry) return false;
  if (Date.now() - entry.firstAt > FAILED_WINDOW_MS) {
    failedAttempts.delete(ip);
    return false;
  }
  return entry.count >= MAX_FAILED_ATTEMPTS;
}

function recordFailure(ip: string): void {
  const entry = failedAttempts.get(ip);
  if (!entry || Date.now() - entry.firstAt > FAILED_WINDOW_MS) {
    failedAttempts.set(ip, { count: 1, firstAt: Date.now() });
  } else {
    entry.count += 1;
  }
}

/** Registers /api/auth/login, /api/auth/logout and /api/auth/me (all public). */
export function registerAuthRoutes(app: Express): void {
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const ip = clientIp(req);
    if (isRateLimited(ip)) {
      return res.status(429).json({
        success: false,
        error: 'تم تجاوز عدد محاولات الدخول المسموح بها. يرجى المحاولة بعد 15 دقيقة.',
      });
    }

    const { role, username, password } = req.body || {};

    if (role !== 'director') {
      return res.status(403).json({
        success: false,
        error: 'الدخول متاح حالياً لمديرة المدرسة فقط. بوابة المعلمات قيد التطوير.',
      });
    }

    const creds = getDirectorCredentials();
    if (!creds) {
      return res.status(503).json({
        success: false,
        error: 'لم يتم إعداد بيانات دخول المديرة على الخادم بعد (DIRECTOR_USERNAME / DIRECTOR_PASSWORD).',
      });
    }

    const userOk = typeof username === 'string' && safeEqual(username.trim(), creds.username);
    const passOk = typeof password === 'string' && safeEqual(password, creds.password);
    if (!userOk || !passOk) {
      recordFailure(ip);
      return res.status(401).json({ success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة.' });
    }

    failedAttempts.delete(ip);
    const payload: SessionPayload = { sub: creds.username, role: 'director', exp: Date.now() + SESSION_TTL_MS };
    setSessionCookie(res, createToken(payload), SESSION_TTL_MS);
    return res.json({ success: true, user: { username: payload.sub, role: payload.role } });
  });

  app.post('/api/auth/logout', (_req: Request, res: Response) => {
    res.clearCookie(COOKIE_NAME, { path: '/' });
    return res.json({ success: true });
  });

  app.get('/api/auth/me', (req: Request, res: Response) => {
    const session = getSession(req);
    if (!session) {
      return res.status(401).json({ authenticated: false });
    }
    return res.json({ authenticated: true, user: { username: session.sub, role: session.role } });
  });
}

/**
 * Global guard. Must be mounted after registerAuthRoutes and before every
 * protected route, /uploads static files and the Vite/SPA handler.
 * - /api/* without a session -> 401 JSON
 * - /uploads/* without a session -> 401
 * - HTML page navigations without a session -> 302 /login
 * - /login with a valid session -> 302 /
 * Static assets / JS modules pass through (they hold no data); the SPA itself
 * also renders the login screen when /api/auth/me returns 401.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const session = getSession(req);
  const urlPath = req.path;

  if (urlPath.startsWith('/api/auth/')) return next();

  if (urlPath.startsWith('/api/') || urlPath.startsWith('/uploads/')) {
    if (!session) {
      res.status(401).json({ success: false, error: 'غير مصرح: يرجى تسجيل الدخول أولاً.' });
      return;
    }
    return next();
  }

  const isPageNavigation =
    req.method === 'GET' &&
    (req.headers.accept || '').includes('text/html') &&
    !/\.[a-zA-Z0-9]+$/.test(urlPath);

  if (isPageNavigation) {
    if (urlPath === '/login') {
      if (session) return res.redirect(302, '/');
      return next();
    }
    if (!session) return res.redirect(302, '/login');
  }

  return next();
}
