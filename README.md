# Gym Coach — Frontend

React 19 + Vite + TypeScript app for the gym-coach product. Pairs with the [backend](../backend/README.md) over a cookie-session JSON API.

## Quick start

```bash
# 1. Install deps
npm install

# 2. Copy and fill in environment
cp .env.example .env
# edit .env — VITE_API_URL must point at the backend (default :3000)

# 3. Run dev server (Vite, with React Compiler enabled)
npm run dev
```

App is at `http://localhost:5173`. Make sure the backend (`../backend && npm run dev`) is running first — otherwise every request 503s or stalls.

## Stack

- **React 19** + the React Compiler (`babel-plugin-react-compiler`) — memo-free re-renders
- **Vite 8** for dev server + bundling
- **TypeScript** strict
- **Tailwind CSS v4** via `@tailwindcss/vite`. Custom styles live in `src/index.css`; the `@theme` block + tailwind-animate-css extend the defaults.
- **React Router v7** — declarative routes, layered with auth / onboarding / verification gates
- **Zustand** for global stores (auth, profile, session, toast, confirm)
- **Zod** for client-side form + response validation
- **Axios** as the HTTP client (`withCredentials: true` so the session cookie travels)

## Project structure

```
frontend/
├── index.html
├── public/                       # favicon + static assets
└── src/
    ├── main.tsx                  # mounts <App /> inside <BrowserRouter />
    ├── App.tsx                   # one <Routes>; runs auth bootstrap once
    ├── index.css                 # @import tailwindcss + theme + keyframes
    ├── routes/                   # route gates + route arrays
    │   ├── PublicRoutes.tsx
    │   ├── PrivateRoutes.tsx
    │   ├── ProtectedRoute.tsx    # gated by auth (cookie + /auth/me)
    │   ├── PublicOnlyRoute.tsx   # bounces logged-in users away from /login etc.
    │   ├── OnboardingGate.tsx    # forces /onboarding until profile completed
    │   └── EmailVerifiedGate.tsx # blocks dashboard+ until email verified
    ├── pages/                    # one folder per route group
    │   ├── auth/                 # Login, Register, ForgotPassword, …
    │   ├── onboarding/           # multi-step wizard
    │   ├── workouts/             # Plan, Today, Day, Session
    │   ├── exercises/            # Catalog, MyExercises, Detail
    │   ├── gallery/              # Instagram-style exercise feed
    │   ├── diet/                 # 7-day AI meal plan
    │   ├── coach/                # AI chat
    │   ├── progress/
    │   └── profile/
    ├── components/
    │   ├── BottomNav.tsx         # mobile tab bar
    │   ├── ui/                   # PageLoader, Spinner, Skeleton, ConfirmDialog, ToastViewport, Button
    │   └── auth/                 # GoogleSignInButton
    ├── stores/                   # Zustand stores (auth, profile, session, toast, confirm, coach)
    ├── hooks/
    │   ├── useQuery.ts           # promise → { data, loading, error } wrapper
    │   ├── useCachedQuery.ts     # same + in-memory TTL cache
    │   └── useAuthBootstrap.ts   # one-shot /auth/me on app mount
    ├── lib/
    │   ├── api.ts                # axios wrapper, ApiError, onUnauthorized
    │   ├── cache.ts              # tiny TTL cache with prefix invalidation
    │   ├── cloudinary.ts         # client-side unsigned upload
    │   ├── google.ts             # Google Identity Services loader
    │   └── endpoints/            # one file per backend feature, typed API client
    └── schemas/                  # zod schemas mirrored from the backend
```

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | `tsc -b` then production Vite build to `dist/` |
| `npm run preview` | Serve the production build locally for smoke testing |
| `npm run lint` | ESLint with React + TS rules |

## Environment variables

See [.env.example](./.env.example). Required:

- `VITE_API_URL` — backend base URL including `/api/v1`

Optional (features degrade if missing):
- `VITE_GOOGLE_CLIENT_ID` — Google sign-in button stays hidden if unset
- `VITE_CLOUDINARY_CLOUD_NAME` + `VITE_CLOUDINARY_UPLOAD_PRESET` — camera button in the coach composer stays disabled

> Only variables prefixed with `VITE_` are exposed to the browser bundle. Everything else stays server-side. Never put secrets here — anything `VITE_*` ships to every user.

## Architecture notes

### Routing & gating

Three layered gates sit in front of every authenticated route:

```
ProtectedRoute       → user authenticated? (server-validated via /auth/me)
  OnboardingGate     → profile completed?
    /onboarding      → exempt (this is where they go to complete it)
    EmailVerifiedGate → email verified?
      → /dashboard, /diet, /workouts/*, /coach, /gallery, /progress, /profile
```

`useAuthBootstrap` runs once at the app root and calls `/auth/me` to validate the persisted user against the server. Stale localStorage from a previous user **cannot** authenticate this browser — the persisted user is treated as a UX hint only.

### Email verification gate

Unverified users see `VerifyEmailRequired` — a full-page screen styled like a modal. It's not an overlay; the dashboard is never rendered behind it, so it can't be bypassed via CSS. Polls `/auth/me` every 8 seconds to detect verification done in another tab.

### State

- **Zustand stores** for cross-component state (auth, profile, current session, toasts, confirm dialogs)
- **`useQuery` / `useCachedQuery`** hooks for async API calls (loading/error state, optional TTL cache + prefix-invalidation)
- Forms are local `useState` with zod validation on submit — no react-hook-form

### API client

- `axios.request` with `withCredentials: true` so the `gc_session` cookie travels
- 401 responses fire `onUnauthorized` → `clearAllUserState()` → next render bounces to `/login`
- Network errors throw `ApiError({ statusCode: -1 })` so callers can distinguish from "we got a 4xx/5xx back"
- `api.get / post / put / patch / delete` are thin typed helpers

### Styling

- Dark mode is wired (`@custom-variant dark`) but the app ships light-only
- Custom CSS lives in `src/index.css` (Inter font import, theme variables, two custom keyframes)
- Mobile-first; `lg:` breakpoint switches to a desktop-friendly layout (e.g., header links replace the bottom nav)

## Deployment notes

- `npm run build` produces a static SPA in `dist/` — host on Vercel, Netlify, Cloudflare Pages, etc.
- Configure SPA fallback (every unknown path → `index.html`) so React Router can take over
- `VITE_API_URL` must point at the **deployed** backend, not localhost
- Make sure the backend's `FRONTEND_URL` env matches your deployed frontend origin exactly — CORS rejects on mismatch
- Cookies are cross-origin in production; both the frontend's `withCredentials: true` and the backend's `cors({ origin, credentials: true })` are already set up
