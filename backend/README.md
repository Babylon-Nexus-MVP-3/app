# VouchPay backend

Express 5 + TypeScript API on MongoDB (Mongoose). Serves the VouchPay app: auth, projects and
invoices, vouching, ABN lookups, notifications, and admin project management.

## Setup

Requires Node.js 20 and a MongoDB database. Use a local
[MongoDB Community Server](https://www.mongodb.com/try/download/community) or your own Atlas
cluster, never the production one.

```bash
npm install
cp .env.example .env
npm run dev          # http://localhost:3229, Swagger at /api-docs
```

Every variable is described in [`.env.example`](.env.example). For local work you only need
`MONGODB_URI`; the rest have development fallbacks:

| Missing | What happens in development |
|---|---|
| `JWT_ACCESS_SECRET` | A fixed dev secret is used. **Outside development/test the server refuses to start.** |
| `ABR_GUID` | `/abr/lookup` returns 503; `/abr/search` returns sample businesses |
| `TWILIO_*` | No SMS is sent and any OTP code is accepted |
| AWS credentials / `EMAIL_USER` | Emails aren't sent. Use the seeded accounts, which are already verified, or configure SES. |

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Run from source with `ts-node` (`NODE_ENV=development`) |
| `npm run build` | Compile to `dist/` and copy `src/assets` |
| `npm start` | Build, then run `dist/server.js` with `NODE_ENV=production` |
| `npm test` | Jest suite, serially, against `MONGODB_TEST_URI` |
| `npm run lint` / `lint-fix` | ESLint on `src/` |
| `npm run seed:admin` | Create the first admin from `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD` |
| `npm run seed:dev` | Dev accounts (`*@ladder.dev`, password `Password123!`) and sample projects. Re-runnable. |
| `npm run seed:demo` / `seed:demo:clear` | Demo accounts (`@vouchpay.demo`) covering every vouch-flow state, or remove them |
| `npm run seed:reset` | **Wipes every collection** and reseeds. Refuses to run unless `MONGODB_URI` is localhost. |
| `npm run migrate:split-names` / `migrate:merge-trade` | One-off data migrations (already run in production) |

Each script's header comment lists exactly what it creates. Seeds write to whatever
`MONGODB_URI` points at, so check it before running one.

[`scripts/findVouchDuplicates.ts`](scripts/findVouchDuplicates.ts) is a read-only report.
Run it against a database before deploying the unique vouch indexes:
`npx ts-node -T scripts/findVouchDuplicates.ts`.

## Tests

```bash
MONGODB_TEST_URI=mongodb://localhost:27017/babylon-nexus-test npm test
```

Suites share one database and clear it between tests, so give tests their own database.
`maxWorkers: 1` keeps suites from racing. CI runs the same suite against a dedicated Atlas
test cluster.

## Layout

```
src/
├── server.ts        # connects to Mongo, starts the HTTP server and the escalation scheduler
├── app.ts           # Express app: middleware, CORS, Swagger, route mounting
├── config.ts        # JWT secret and token TTLs, Twilio config
├── middleware.ts    # requireAuth, requireRole, requireProjectRole, rate limiters
├── routes/          # one router per area: auth, project(s), vouch, abr, notifications, admin
├── controllers/     # request validation and response shaping
├── service/         # business logic and database work (email, SMS, push, ABR, …)
├── models/          # Mongoose schemas
├── utils/           # shared helpers, e.g. vouchRules.ts (trade list, the 16 vouch attributes)
└── tests/           # Jest + Supertest, grouped by area
scripts/             # seeds, migrations and one-off reports (run with ts-node, not deployed)
swagger.yaml         # API reference served at /api-docs
```

Requests flow routes → controllers → services.

## Key rules

- **Profile completion** ([`service/vouchProfile.service.ts`](src/service/vouchProfile.service.ts))
  is the single gate for giving a vouch and creating a project. There are two steps worth 50%
  each: first name + ABN on the account, and a trade licence on the vouch profile.
- **Projects** are `Active` from creation. There is no admin approval step.
- **Invoices** go `Pending → Approved → Paid → Received`. `Rejected` is only possible from
  `Pending`. The approver role is resolved when the invoice is submitted.
- **Vouches** are `GivenVouch` records keyed by the recipient's ABN, with a unique index on
  `{fromUserId, toAbn}`. Attributes come from the fixed list in `utils/vouchRules.ts`.
- **Overdue escalations** run in-process once a day from 08:00 Sydney time. That's why PM2 runs a single instance.

## Deployment

Production runs on AWS EC2 (Sydney) behind Nginx, managed by PM2 with
[`ecosystem.config.js`](ecosystem.config.js) (one fork-mode process, `NODE_ENV=production`).
The database is MongoDB Atlas (Sydney). To deploy on the server:

```bash
git pull origin main
npm ci
npm run build
pm2 restart ecosystem.config.js
```

Production must set at least `MONGODB_URI`, `JWT_ACCESS_SECRET`, `CORS_ORIGINS` (if any browser
clients), `EMAIL_USER`, `ABR_GUID` and the `TWILIO_*` variables. SES uses the instance's IAM role.
A [`Dockerfile`](Dockerfile) is also provided.
