# Frontend — Shop Billing + Management Portal

Modern, responsive web frontend for the **Shop Billing + Inventory + Management System**, built with Next.js (App Router), React 19, Material-UI (MUI), Redux Toolkit, and React Hook Form with Zod validation.

---

## 1. Overview & Architecture

- **Framework**: Next.js 16 (App Router with Turbopack)
- **UI Library**: Material UI (MUI v6/v9) with Emotion styling engine
- **State Management**: Redux Toolkit (`@reduxjs/toolkit` and `react-redux`) with client-side `StoreProvider`
- **Form Handling**: `react-hook-form` with `@hookform/resolvers/zod`
- **Schema Validation**: `zod`
- **HTTP Client**: Typed fetch wrapper (`src/services/api.ts`) with Bearer token injection, session storage, and friendly error propagation
- **Routing**:
  - `/login`: User authentication with remember-me and error banner
  - `/register`: Multi-field shop and owner registration
  - `/forgot-password`: Generates secure password reset link / token
  - `/reset-password`: Consumes single-use reset token and sets new password
  - `/dashboard`: Authenticated landing page displaying current shop, active role, and system modules

---

## 2. Prerequisites

Ensure you have installed:
- **Node.js**: v20 or higher (v20+ LTS recommended, tested on v24)
- **npm**: v10+
- **Backend API**: Running on `http://localhost:8000` (refer to `Backend-Product Management/README.md`)

---

## 3. Environment Configuration

Create a `.env.local` file inside the `Frontend-Product Management` directory (a template is provided in `.env.example`):

```bash
cp .env.example .env.local
```

Ensure `.env.local` contains the backend API base URL:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

> **Note**: The backend also provides backward-compatible routing under `/api` in addition to `/api/v1`.

---

## 4. How to Run the Frontend

### Step 1: Install Dependencies
Open a terminal in the `Frontend-Product Management` directory and run:

```bash
npm install
```

### Step 2: Start the Development Server
```bash
npm run dev
```

The application will start on **[http://localhost:3000](http://localhost:3000)**.

### Step 3: Access the Application
- Open your browser at `http://localhost:3000`.
- The root route `/` automatically redirects to `/login`.

---

## 5. Demo Credentials

If you have seeded the backend database using `npm run db:seed:demo`, you can log in immediately with:

- **Email**: `owner@example.com`
- **Password**: `Password123!`
- **Shop**: Metro General Store (Role: `Owner`)

Alternatively, click **"Create an account"** on the login page to register a new shop with your own custom credentials.

---

## 6. Build and Production Run

To test a production-optimized build:

```bash
# 1. Typecheck
npx tsc --noEmit

# 2. Build production assets
npm run build

# 3. Start production server
npm run start
```

---

## 7. Authentication Implementation Details

### How Login Works
1. **User Input**: User enters email, password, and optionally toggles "Remember me" on `/login`.
2. **Client Validation**: Zod schema verifies valid email format and minimum password length.
3. **API Request**: `authService.login()` sends a `POST` request to `${NEXT_PUBLIC_API_URL}/auth/login` with credentials.
4. **Error Handling**: If authentication fails (e.g., incorrect credentials or deactivated account), the API response error message is surfaced in a Material-UI `<Alert severity="error">` banner.
5. **Session & Token Storage**:
   - On HTTP 200, the returned JWT `token` and `user` payload are saved to `localStorage` (if remember-me is checked) or `sessionStorage`.
   - `setAuthSession(token, user, rememberMe)` in `src/services/api.ts` manages this persistence.
6. **Redux State**:
   - `loginSuccess({ user, token })` is dispatched to the Redux store (`authSlice`).
   - `StoreProvider` rehydrates auth state automatically on browser refreshes.
7. **Redirect**: Router navigates to `/dashboard`, where the authenticated user profile and active shop details are displayed.
8. **Sign Out**: The `/dashboard` header includes a "Sign out" button that notifies the backend (`POST /auth/logout`), clears local credentials, resets Redux, and redirects back to `/login`.

---

## 8. Troubleshooting

- **CORS Errors**: Verify that `Backend-Product Management/.env` has `CORS_ORIGIN=http://localhost:3000`.
- **API Connection Failed**: Ensure the backend server is running on `http://localhost:8000` (`npm run dev` in `Backend-Product Management`). You can verify backend readiness by opening `http://localhost:8000/api/v1/health` in your browser.
- **Port Conflict**: If port 3000 is occupied, run `npm run dev -- -p 3001` and add `http://localhost:3001` to `CORS_ORIGIN` in backend `.env`.
