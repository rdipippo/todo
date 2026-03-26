# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

### Backend (Express + TypeScript)
```bash
cd backend
npm install          # Install dependencies
npm run dev          # Development server with hot reload (port 5000)
npm run build        # Compile TypeScript to dist/
npm start            # Run production build
npm run lint         # Run ESLint
```

### Frontend (React + Vite + Capacitor)
```bash
cd frontend
npm install          # Install dependencies
npm run dev          # Development server (port 3000, proxies /api to :5000)
npm run build        # Production build (tsc + vite)
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run cap:sync     # Sync Capacitor native projects
npm run cap:android  # Open Android Studio
npm run cap:ios      # Open Xcode
```

### Database Setup
```bash
mysql -u root -p < backend/database/schema.sql
```

**No test framework is configured in either project.** There are no test files, test dependencies, or test scripts.

## Architecture

Monorepo with two independent npm projects (`backend/` and `frontend/`). No shared root package.json or workspaces.

### Backend (`backend/src/`)
- **app.ts** — Express app with middleware stack in order: helmet → cors (locked to APP_URL) → json/urlencoded → cookieParser → generalLimiter → routes → 404 handler → global error handler
- **routes/** — Mounts `/api/health`, `/api/auth/*`, and `/api/admin/*`
- **controllers/** — `auth.controller.ts` (all auth endpoints), `admin.controller.ts` (user management)
- **middleware/** — Auth (JWT + DB user lookup per request), admin/superAdmin role guards, validation (express-validator arrays ending with `handleValidationErrors`), rate limiting
- **models/** — `UserModel` and `TokenModel` with parameterized `pool.execute()` queries. `UserModel.toPublic()` strips `password_hash` and `updated_at` from responses.
- **services/** — `token.service.ts` (JWT + crypto token generation/verification with SHA-256 hashing), `email.service.ts` (nodemailer SMTP), `password.service.ts` (bcrypt cost factor 12)
- **config/** — `index.ts` (config object from env vars), `database.ts` (MySQL connection pool)
- **database/schema.sql** — MySQL 8 schema with tables: `users`, `email_verification_tokens`, `password_reset_tokens`, `refresh_tokens`. Migration `001_add_role_and_enabled.sql` adds role/enabled columns.

### Frontend (`frontend/src/`)
- **App.tsx** — React Router with three inline route guards: `ProtectedRoute` (requires auth), `PublicRoute` (redirects if authenticated), `AdminRoute` (requires admin/super_admin role)
- **context/AuthContext.tsx** — Auth state provider exposing `useAuth()` hook. Checks localStorage for `accessToken` on mount, calls `/auth/me` to hydrate user. Includes `useInactivityLogout` hook (30min timeout).
- **screens/** — Login, Register, Home, ForgotPassword, ResetPassword, VerifyEmail, ChangePassword, Admin
- **components/** — Button, Input, PasswordInput, Checkbox, Alert, Spinner, HamburgerMenu (barrel-exported from `components/index.ts`)
- **services/api.ts** — Axios instance with request interceptor (injects Bearer token from localStorage) and response interceptor (automatic token refresh with request queuing on 401)
- **services/auth.service.ts** — Type-safe auth API wrapper. Stores both `accessToken` and `refreshToken` in localStorage.
- **services/admin.service.ts** — Admin API wrapper (list users, toggle enabled, reset password, change role)
- **i18n/** — i18next with English (`en.json`) and Spanish (`es.json`). Auto-detects browser language, persists choice to localStorage.
- **styles/** — Plain CSS with custom properties in `variables.css` (`--color-*`, `--spacing-*`, `--radius-*`, `--shadow-*`, `--font-*`). Mobile safe area insets supported. Dark mode CSS stub exists but is not activated.

### Auth Flow
1. Register → bcrypt hash → create user → send verification email (24h token)
2. Login → verify email confirmed + account enabled → generate JWT access token (15min) + refresh token (7d, SHA-256 hashed in DB)
3. Protected routes: Bearer token in Authorization header → JWT verify → DB lookup to check `enabled` status
4. Token refresh: old refresh token revoked, new access+refresh pair issued (rotation)
5. Password change/reset: all user refresh tokens revoked
6. Refresh tokens delivered in both response body (for Capacitor/mobile) and HTTP-only cookie (for web)

### Rate Limits
- General: 100 requests / 15 min
- Auth endpoints: 10 requests / 15 min
- Password reset: 5 requests / 1 hour

## Key Configuration

- Backend env vars: see `README.md` for reference config (no `.env.example` file exists)
- Frontend uses Vite proxy (`/api` → `localhost:5000`) in dev; set `VITE_API_URL` for production
- TypeScript strict mode in both projects
- Frontend: `noUnusedLocals` and `noUnusedParameters` enabled
- Path alias `@/*` maps to `frontend/src/*` (configured in both tsconfig.json and vite.config.ts)

## API Endpoints

Auth (`/api/auth/`): register, login, logout, refresh, forgot-password, reset-password, verify-email/:token, resend-verification, change-password, me

Admin (`/api/admin/`): GET /users, PATCH /users/:id/enabled, POST /users/:id/reset-password, PATCH /users/:id/role (super_admin only)

Health check: `GET /api/health`

## Important Patterns

- **Validation duplication:** Password rules are enforced in both `validation.middleware.ts` (express-validator) and `password.service.ts` (regex) — these must be kept in sync
- **Auth middleware enrichment:** `auth.middleware.ts` attaches `req.userId`, `req.userEmail`, `req.userRole` via the `AuthRequest` interface
- **Token hashing:** All tokens (refresh, email verification, password reset) are stored as SHA-256 hashes, never plaintext
- **Email enumeration protection:** forgot-password and resend-verification always return success regardless of whether email exists
- **Frontend token refresh queuing:** On 401, concurrent requests are queued while refresh completes, then retried with the new token
