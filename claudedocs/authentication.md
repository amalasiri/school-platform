# Authentication

Only the **director** (مديرة المدرسة) can log in for now. Nobody can use the app or the API without logging in first.

## Configuration (`.env`)
```
DIRECTOR_USERNAME="..."
DIRECTOR_PASSWORD="..."
SESSION_SECRET="..."   # >= 16 chars, random; signs session cookies
```
- If username/password are missing (or still `CHANGE_ME…`), login returns 503 and **nobody** can log in. This is fail-closed on purpose.
- If `SESSION_SECRET` is missing or short, a random per-process secret is used, so sessions reset on every restart. A warning is logged at startup.
- `.env` is only read on server start. Restart after changing it.

## Server: [server/auth.ts](../server/auth.ts)
- **Session:** stateless cookie `sp_session` = `base64url(JSON{sub, role, exp}).HMAC-SHA256`. Flags: `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` when `NODE_ENV=production`, TTL 12 h. No DB, no `cookie-parser` (manual parsing).
- **Credential check:** SHA-256 both sides + `crypto.timingSafeEqual`. Username is trimmed, password is not.
- **Rate limit:** in-memory, 5 failed attempts per IP per 15 min → 429. It resets on restart. Behind a reverse proxy, set `app.set('trust proxy', …)` or every client shares the proxy IP.
- **`requireAuth` guard** (mounted globally in `server.ts` right after the auth routes):
  - `/api/auth/*` → always passes
  - `/api/*`, `/uploads/*` without a session → `401` JSON
  - HTML page navigation (`GET`, `Accept: text/html`, no file extension) without a session → `302 /login`
  - `/login` with a valid session → `302 /`
  - Everything else (JS modules, CSS, images) passes. These are code/assets with no school data.

## Client
- [src/services/authService.ts](../src/services/authService.ts): `me()`, `login(role, u, p)`, `logout()`.
- [src/components/AuthGate.tsx](../src/components/AuthGate.tsx): root component. It calls `/api/auth/me` on load and whenever the tab becomes visible again, then renders `LoginView` or `<App onLogout/>`. It keeps the URL in sync (`/login` ↔ `/`) with `history.replaceState`. `App` (and its Firebase subscriptions) only mounts after login.
- [src/components/LoginView.tsx](../src/components/LoginView.tsx): MoE-branded login page with two tabs:
  - **مديرة المدرسة**: the working username/password form.
  - **المعلمات**: placeholder "ميزة مستقبلية" panel, no form. The server also rejects `role !== 'director'` with 403.
- Logout button lives in [src/components/Header.tsx](../src/components/Header.tsx) (`onLogout` prop).

## Known limits / not covered
- **Firebase RTDB is accessed directly from the browser**, so the Express guard does not protect it. Lock it down with Firebase security rules (or move reads/writes behind the server) if the data must be private.
- The JS bundle itself is reachable without login (standard SPA). It holds no secrets; only `VITE_*` vars are embedded.
- The header role-simulator `<select>` still exists; it is UI-only and unrelated to the session.

## Extending to teachers (later)
1. Add a teacher credential source (e.g. per-teacher passwords keyed by `AUTHORIZED_TEACHERS[].id` in [src/data/trustedStaff.ts](../src/data/trustedStaff.ts), hashed).
2. Widen `AuthRole` in `server/auth.ts` and `authService.ts`; accept `role: 'teacher'` in `/api/auth/login` and in `verifyToken`.
3. Add per-route role checks (e.g. a `requireRole('director')` middleware) where needed. Today `requireAuth` treats any session as a director.
4. Replace the placeholder in `LoginView`'s teacher tab with a form; route teachers to their own view from `AuthGate` based on `user.role`.

## Manual test checklist
```
curl -H 'Accept: text/html' -i localhost:3000/          # 302 → /login
curl -i localhost:3000/api/deadline                      # 401
curl -c jar -H 'Content-Type: application/json' \
  -d '{"role":"director","username":"U","password":"P"}' localhost:3000/api/auth/login   # 200 + cookie
curl -b jar -i localhost:3000/api/deadline               # 200
```
