# Cricket-Wagon-Wheel

Cricket-themed authentication UI with wagon wheel shot animation and secure MongoDB-backed signup/login.

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

## API Endpoints

- `POST /signup`
	- Body: `{ "name": "...", "email": "...", "password": "..." }`
	- Validates input, hashes password, prevents duplicate email, stores user.

- `POST /login`
	- Body: `{ "email": "...", "password": "..." }`
	- Validates credentials by comparing password with stored bcrypt hash.

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