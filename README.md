# VouchPay

Mobile-first trust and reputation platform for Australian construction (formerly Babylon Nexus).
Businesses get vouched for by people they've worked with, vouch for others by ABN, and track
project invoices from submission to payment.

Live on the [App Store](https://apps.apple.com/au/app/vouchpay/id6754034788) and
[Google Play](https://play.google.com/store/apps/details?id=com.babylonnexus).

## Repository

| Folder | What it is | Docs |
|---|---|---|
| [`backend/`](backend) | Node.js + Express 5 + TypeScript API, MongoDB via Mongoose | [backend/README.md](backend/README.md) |
| [`frontend/`](frontend) | React Native app — Expo SDK 54, expo-router | [frontend/README.md](frontend/README.md) |
| [`docs/`](docs) | [`v3-spec.md`](docs/v3-spec.md) — the original v3 plan, kept for history | |
| [`.github/workflows/ci.yml`](.github/workflows/ci.yml) | CI for every PR to `main` | |

## Quick start

You need Node.js 20 and a MongoDB database — either a local
[MongoDB Community Server](https://www.mongodb.com/try/download/community) or your own
Atlas cluster. Never point local development at the production cluster.

```bash
# 1. Backend — http://localhost:3229
cd backend
npm install
cp .env.example .env        # set MONGODB_URI to your local database
npm run seed:admin          # first admin account (from ADMIN_SEED_EMAIL / ADMIN_SEED_PASSWORD)
npm run seed:dev            # dev accounts and sample projects (password: Password123!)
npm run dev

# 2. App — in a second terminal
cd frontend
npm install
cp .env.example .env.local  # EXPO_PUBLIC_API_URL — use your LAN IP on a physical phone
npx expo start
```

API docs (Swagger) are at **http://localhost:3229/api-docs** while the backend runs in
development. They're turned off in production.

## How it fits together

```
Expo app ──HTTPS──▶ Nginx ──▶ Express API (PM2, one process) ──▶ MongoDB Atlas
   │                              │
   └── Expo push / EAS Update     ├── AWS SES (email)
                                  ├── Twilio Verify (mobile OTP)
                                  └── ABR web services (ABN lookups)
```

- **Production API:** `https://api.babylon-nexus.com`, on AWS EC2 (Sydney) behind Nginx,
  run by PM2 with [`backend/ecosystem.config.js`](backend/ecosystem.config.js). Database:
  MongoDB Atlas (Sydney).
- **Auth:** email + password. Short-lived JWT access tokens (10 min) and refresh tokens
  stored in Mongo (1 day).
- **Mobile builds:** EAS Build and EAS Update. See the frontend README.

## CI

[`ci.yml`](.github/workflows/ci.yml) runs on every PR to `main`:

- frontend: `expo lint`, `tsc --noEmit`
- backend: `eslint .`, `tsc --noEmit`, then the Jest suite against a test database
  (`MONGODB_TEST_URI` secret)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md): conventional commits (`type(scope): description`),
one branch per change (`frontend/…` or `backend/…`), and PRs into `main`.
