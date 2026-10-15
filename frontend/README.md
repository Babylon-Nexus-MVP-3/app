# VouchPay app

React Native app built with Expo SDK 54 and expo-router v6. The New Architecture and the React
Compiler are both on. It ships to iOS and Android as **VouchPay**. The bundle ID and package are
`com.babylonnexus`, matching the store listings.

## Setup

```bash
npm install
cp .env.example .env.local
npx expo start
```

`EXPO_PUBLIC_API_URL` is the only variable. It defaults to `http://localhost:3229`, which works
for the iOS simulator and web. A physical phone needs your computer's LAN IP, e.g.
`http://192.168.1.20:3229`. Start the backend first (see [../backend/README.md](../backend/README.md)).

The app uses native modules that Expo Go doesn't include, such as notifications and updates.
Use a development build: `eas build --profile development`, then install it on the device or
simulator.

Log in with any `seed:dev` account, e.g. `builder@ladder.dev` / `Password123!`.

## Scripts

| Command | What it does |
|---|---|
| `npx expo start` | Dev server |
| `npm run web` | Run in the browser |
| `npm run lint` | `expo lint` |
| `npx tsc --noEmit` | Type-check (CI runs this) |
| `npx expo export --platform web` | Bundle check. Catches Metro errors that `tsc` misses. |

## Layout

```
app/                    # expo-router: every file here is a route
├── (auth)/             # sign-in, sign-up, verify email, forgot/reset password
├── (app)/              # signed-in screens
│   ├── (tabs)/         # bottom tabs: home, vouches, projects, me
│   ├── get-vouched/    # profile wizard (2 steps) + request a vouch
│   ├── give-vouch/     # find a business by ABN → pick attributes → confirm
│   └── project/        # project detail and audit log
└── (admin)/            # admin console: projects, archives
components/             # shared UI. Pieces split out of screens go here, not in app/
constants/              # colors, fonts, spacing, shared styles, API URL, trade list
context/AuthContext.tsx # session, token refresh, current user
lib/                    # hooks and helpers (ABR lookup, vouch profile, validation, push)
```

Files under `app/` become routes. Put helper components in `components/`, otherwise
they turn into stray screens.

## Conventions

- **Colors:** always use `Colors.*` from `constants/colors.ts`. Never hardcode hex values,
  and never rename tokens.
- **Text:** use `AppText` with `Fonts.*`. Reuse the shared style files in `constants/`
  (`appStyles`, `authStyles`) and `components/project/styles.ts`.
- **API calls:** go through `API_BASE_URL` from `constants/api.ts`.
- **Gates:** profile completion from `GET /vouch/profile/me` (`isComplete`) decides whether
  Give a Vouch and Vouch my Project are unlocked. Don't recompute it on the client.

## Builds and releases

Builds use EAS. Every profile in [`eas.json`](eas.json) points at the production API.

```bash
eas build --platform ios --profile production
eas build --platform android --profile production
eas submit --platform ios      # or android
```

JS-only changes can ship over the air with EAS Update (`eas update --channel production`).
The runtime version follows the app version, so an update reaches only builds with the same
`version` in `app.config.js`. Native changes need a new build and a version bump.
