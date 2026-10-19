# Architecture

## Stack
- **Frontend:** React 19, TypeScript, Tailwind CSS v4 (via `@tailwindcss/vite`), `lucide-react` icons, `recharts`, `motion`.
- **Server:** Express 4 in [server.ts](../server.ts), run with `tsx`. In dev it mounts Vite in middleware mode; in production (`NODE_ENV=production`) it serves `dist/` with an SPA fallback.
- **Persistence:** mostly client side:
  - `localStorage` holds settings, domains/criteria/indicators, tasks and audit logs ([src/services/storageService.ts](../src/services/storageService.ts)).
  - IndexedDB holds file blobs.
  - Firebase Realtime Database (optional, `VITE_FIREBASE_*`) shares indicators/evidence and the teacher deadline across browsers ([src/services/firebaseService.ts](../src/services/firebaseService.ts)). The browser talks to Firebase **directly**, not through Express.
  - Server disk: `uploads/` (local evidence copies) and `data/deadline.json`.
  - Google Drive via a Google Apps Script web app ([scripts/google-apps-script-code.js](../scripts/google-apps-script-code.js)). Express forwards uploads with `GOOGLE_DRIVE_API_SECRET`.

## Layout
```
server.ts                 Express app: API routes, static files, Vite/SPA
server/auth.ts            Director auth: login/logout/me routes + global guard
src/main.tsx              Entry → <AuthGate/>
src/components/AuthGate.tsx   Session check; renders LoginView or App
src/components/LoginView.tsx  Login page (director tab works, teacher tab = placeholder)
src/App.tsx               Main shell: Header, Sidebar, active view, modals
src/components/*View.tsx  Feature views (only dashboard, evaluation, teachers are unlocked)
src/services/             storageService (local + server API), firebaseService, authService
src/data/initialData.ts   Default domains/criteria/indicators (official evaluation taxonomy)
src/data/trustedStaff.ts  Hard-coded authorized teachers/admins (used by server upload checks)
src/types/index.ts        Shared types (UserRole, Indicator, EvidenceFile, SystemSettings…)
```

## Request pipeline (server.ts order matters)
1. `express.json` / `urlencoded` (50 MB limit for base64 uploads)
2. `express.static(public/)`: **public**; the logo is needed on the login page
3. `registerAuthRoutes(app)`: `/api/auth/*` (public)
4. `app.use(requireAuth)`: everything after this line needs a director session
5. `/uploads` static, all other `/api/*` routes, then Vite / `dist` SPA fallback

Any new route must be registered **after** `requireAuth` unless it is meant to be public.

## Server API (all require a session except `/api/auth/*`)
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/login` | `{role:'director', username, password}` → sets session cookie |
| POST | `/api/auth/logout` | clears cookie |
| GET | `/api/auth/me` | `{authenticated, user}` or 401 |
| GET | `/api/teachers` | authorized teachers list |
| GET | `/api/drive/status` | Drive integration diagnostics |
| POST | `/api/upload-drive`, `/api/upload` | evidence upload (base64 JSON) |
| GET | `/api/uploads` | list local uploads |
| GET/POST | `/api/deadline` | teacher submission deadline |
| GET | `/api/firebase-config` | Firebase readiness |

## UI conventions
- Root container: `min-h-screen bg-slate-50 … font-sans` with `dir="rtl"`.
- Brand: emerald (`emerald-700/800/900`) for primary actions/active states, slate neutrals, amber for "future feature / locked", rose for errors.
- Cards: `bg-white rounded-2xl border border-slate-200 shadow-xs`. Buttons: `rounded-xl`, `font-bold`, `bg-emerald-800 hover:bg-emerald-900`.
- Header shows ministry / education dept / school name (3 lines with emerald right border) and the MoE logo (`/moe-logo.svg`). The footer always shows «مديرة المدرسة/ {principalName}». Keep these on any new full-page screen.
- Locked sidebar sections show the amber "ميزة مستقبلية" modal; only `dashboard`, `evaluation`, `teachers` are unlocked.
- Comments in components are often Arabic; match surrounding style.

## Roles
`UserRole` = `principal | vice_principal | teacher | admin_staff`. The header still has a **role simulator** `<select>` (pre-existing, UI only). Authentication is separate: only a `director` session exists today, and the app opens with `currentRole = 'principal'`.

## Gotchas
- `.env*` is gitignored except `.env.example`. Server reads `.env` via `dotenv`; real env vars take precedence.
- Vite only exposes `VITE_*` vars to the browser. Never put secrets in `VITE_*`.
- `vite.config.ts` HMR/watch is controlled by `DISABLE_HMR` (AI Studio heritage). Do not change it.
- `untitled.tsx` at the root is an empty stray file.
