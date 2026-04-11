# CreaseVision

CreaseVision is a cricket-themed authentication UI with wagon wheel shot animation and secure MongoDB-backed signup/login.

## Tech Stack

- Node.js
- Express
- MongoDB + Mongoose
- bcrypt password hashing
- Vanilla HTML/CSS/JS frontend

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file in the project root using `.env.example` as a reference:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/cricket_wagon_wheel
BCRYPT_SALT_ROUNDS=12
SESSION_SECRET=replace_with_a_long_random_secret
GOOGLE_CLIENT_ID=replace_with_google_client_id
GOOGLE_CLIENT_SECRET=replace_with_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/auth/google/callback
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=replace_with_sender_email
SMTP_PASS=replace_with_sender_app_password
SMTP_FROM=replace_with_sender_email
OTP_SECRET=replace_with_random_secret
OTP_TTL_MINUTES=10
```

3. Start MongoDB locally (or provide your Atlas URI in `MONGODB_URI`).

4. Run the server:

```bash
npm run dev
```

5. Open the app at:

```text
http://localhost:5000
```

## GitHub Pages Hosting

This project can run on GitHub Pages as a static site.

What works on GitHub Pages:

- Dashboard, player setup, review/wagon wheel, local shot tracking, and summaries.
- Login/Signup using browser localStorage (static fallback mode).
- Continue as Guest flow.

What does not work on GitHub Pages:

- Node/Express API routes.
- MongoDB-backed authentication.
- Google OAuth callback flow.

### Deploy Steps

1. Push this repository to GitHub.
2. In repository settings, open Pages.
3. Set source to Deploy from a branch.
4. Select your main branch and /(root) folder.
5. Save and open the published URL.

Notes:

- Static fallback mode auto-enables on github.io and file:// hosts.
- Use localhost:5000 if you want server + MongoDB authentication.

## Vercel Deployment (Recommended for Google OAuth)

This project now supports a single Vercel deployment that serves both frontend and backend together.

Why this works for OAuth:

- Frontend and backend share the same production domain.
- Session data is stored in MongoDB (not in-memory), which is required for serverless OAuth flows.
- Callback URLs and redirects stay on one host, avoiding CORS/session mismatch issues.

### 1. Deploy to Vercel

1. Push your latest code to GitHub.
2. In Vercel, click **Add New Project** and import this repository.
3. Framework preset: **Other**.
4. Root directory: project root.
5. Build command: leave empty.
6. Output directory: leave empty.
7. Deploy.

### 2. Set Environment Variables in Vercel

Set these in **Project Settings -> Environment Variables** (Production):

- `MONGODB_URI` = your MongoDB Atlas connection string
- `SESSION_SECRET` = long random secret
- `BCRYPT_SALT_ROUNDS` = `12`
- `GOOGLE_CLIENT_ID` = Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` = Google OAuth client secret
- `GOOGLE_CALLBACK_URL` = `https://<your-vercel-domain>/auth/google/callback`
- `FRONTEND_URL` = `https://<your-vercel-domain>`

Example:

- `GOOGLE_CALLBACK_URL=https://creasevision-auth.vercel.app/auth/google/callback`
- `FRONTEND_URL=https://creasevision-auth.vercel.app`

### 3. Update Google OAuth App Settings

In Google Cloud Console -> APIs & Services -> Credentials -> your OAuth 2.0 Client ID:

- Authorized redirect URIs:
	- `https://<your-vercel-domain>/auth/google/callback`
- Authorized JavaScript origins:
	- `https://<your-vercel-domain>`

Important:

- The redirect URI must match exactly, including protocol (`https`), domain, and path (`/auth/google/callback`).
- If you change Vercel domain, update both Google Console and `GOOGLE_CALLBACK_URL`.

### 4. Verify Production Health

After deployment, open:

- `https://<your-vercel-domain>/health/env`

Expected:

- `ok: true`
- `envReady: true`
- `dbReady: true`
- `missing: []`

### 5. Production Checklist

- Signup works and creates user in MongoDB.
- Login works with session cookie.
- Google login redirects to Google and returns to dashboard.
- `/auth/me` returns the authenticated user after login.
- `/auth/logout` clears session.

## API Endpoints

- `POST /signup`
	- Body: `{ "name": "...", "email": "...", "password": "..." }`
	- Validates input, hashes password, prevents duplicate email, stores user.

- `POST /login`
	- Body: `{ "email": "...", "password": "..." }`
	- Validates credentials by comparing password with stored bcrypt hash.

- `POST /auth/password/request-otp`
	- Body: `{ "email": "..." }`
	- Generates time-limited OTP and sends it to registered email.

- `POST /auth/password/verify-otp`
	- Body: `{ "email": "...", "otp": "123456" }`
	- Verifies OTP and unlocks password reset step.

- `POST /auth/password/reset`
	- Body: `{ "email": "...", "newPassword": "...", "confirmNewPassword": "..." }`
	- Applies strong password validation and saves hashed password.

- `GET /auth/google?mode=login|signup`
	- Redirects user to Google OAuth consent.

- `GET /auth/google/callback`
	- Handles Google OAuth callback and creates/logs in user.

- `GET /auth/me`
	- Returns the currently authenticated session user.

- `POST /auth/logout`
	- Clears active session.

- `GET /health/env`
	- Returns environment readiness and missing required variables for startup diagnostics.

## Notes

- Passwords are never stored in plain text.
- Frontend login/signup forms are connected directly to `/login` and `/signup`.
- Google users are stored with `name`, `email`, `googleId` and are not required to have a password.