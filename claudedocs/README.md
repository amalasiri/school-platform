# claudedocs — working notes for Claude

Engineering notes for working on this codebase. Read these before changing anything non-trivial.
Keep them current: when you change behaviour documented here, update the matching file in the same change.

| File | What it covers |
|------|----------------|
| [architecture.md](architecture.md) | Stack, folder layout, data flow, server routes, conventions |
| [authentication.md](authentication.md) | Director login, session cookie, route guard, how to extend to teachers |

## Quick facts
- Arabic, RTL, official Saudi MoE branding. All user-facing strings are Arabic.
- `pnpm dev` / `npm run dev` → `tsx server.ts` (Express + Vite middleware, port `PORT` or 3000).
- `npm run lint` = `tsc --noEmit`. There are no tests yet.
- Whole app is gated behind a director login (credentials in `.env`). See [authentication.md](authentication.md).
- Teachers' login is a placeholder tab only. Do not build the teacher view until the user asks.
