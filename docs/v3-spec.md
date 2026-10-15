# VouchPay v3 — Original Specification (historical)

> **This is the original v3 plan, kept for context. It is not the current behaviour.**
> The app moved away from it in several places. For what the API actually does, use
> Swagger (`backend/swagger.yaml`, served at `/api-docs` locally); for setup, see the
> READMEs.
>
> Where the shipped app differs from this plan:
>
> - **Sign-in stayed email + password.** The SMS OTP sign-up/sign-in (§3) was built,
>   never adopted, and removed along with `otpModel`. Mobile is optional at sign-up and
>   verified later with Twilio Verify (`/auth/request-mobile-otp`, `/auth/verify-mobile-otp`);
>   a verified mobile is required before requesting vouches. Forgot/reset password and
>   change password were kept.
> - **Get Vouched is two steps, not three** (§6): your details (name + ABN, from sign-up)
>   and a trade licence. Each is 50% of profile strength. References are requested from a
>   separate screen and don't count towards it.
> - **There is no profile `status`.** Gates use profile completion instead: at 100%
>   (`isComplete` from `GET /vouch/profile/me`) the user can give a vouch and create a
>   project ("Vouch my Project"). See `backend/src/service/vouchProfile.service.ts`.
> - **Projects need no admin approval.** They are `Active` from creation.
> - **Vouches are `GivenVouch` records** keyed by the recipient's ABN, one per giver per ABN.
>   Attributes are the fixed list of 16 in `backend/src/utils/vouchRules.ts`.
> - **Requests aren't accepted or declined.** A reference answers by giving a vouch with the
>   request's `requestId`, or ignores it (`PATCH /vouch/requests/:id/ignore`). The sender can
>   nudge or withdraw an unanswered request.
> - **The bundle ID and package are still `com.babylonnexus`** (the store listings depend on
>   them); the display name is VouchPay.

---

## Status tracker (as shipped)

### Backend
- [x] Add `mobile`, `abn`, `businessName`, `businessTrade`, `businessState` to `userModel`
- [removed] `otpModel`, `POST /auth/request-otp`, `POST /auth/verify-otp` — built, never adopted, deleted
- [x] `GET /abr/lookup?abn=...` — ABR proxy, `ABR_GUID` kept server-side (also `GET /abr/search?name=...`)
- [x] `vouchProfileModel`, `givenVouchModel` (planned as `vouchModel`), `vouchRequestModel`
- [x] `POST /vouch/profile` — create/update the vouch profile, send requests to references
- [x] `GET /vouch/profile/me` — own profile + completion
- [x] `POST /vouch/give` — give a vouch to an ABN
- [x] `GET /vouch/received` — vouches received by the current user's ABN
- [x] `GET /vouch/pending-requests` — pending vouch requests inbox
- [changed] `POST /vouch/request/:id/accept` / `decline` — not built; answer via `POST /vouch/give` with `requestId`, or `PATCH /vouch/requests/:id/ignore`
- [x] `GET /vouch/business/:abn` — vouch count + attributes for a business
- [x] `GET /vouch/requests/sent`, `POST /vouch/requests/:requestId/nudge`, `DELETE /vouch/requests/:requestId`
- [x] `GET /projects/history` — every project the user is or has been part of
- [changed] `POST /auth/register` — mobile/ABN/business name added as optional fields; password kept
- [changed] `POST /auth/login` — stayed email + password

### Frontend
- [x] v3 design tokens in `constants/colors.ts`
- [x] Brand strings and logos updated to VouchPay
- [x] `app.config.js` name is VouchPay (slug and bundle IDs unchanged on purpose)
- [x] Sign-up and sign-in rewritten (email + password)
- [changed] `verify-email.tsx` kept as email verification; forgot/reset/change password kept
- [x] Bottom tabs: Home, Vouches, Projects, Me (`app/(app)/(tabs)/`)
- [x] `(app)/get-vouched/` wizard (two steps + request a vouch)
- [x] `(app)/give-vouch/` screens
- [x] `(app)/(tabs)/me.tsx`
- [changed] "Vouch my Project" gated on profile completion = 100%, not a profile status

---


## Original plan

Everything below is the plan as first written.

### 1. Rebrand

| Item | v2 | v3 |
|---|---|---|
| App name | Babylon Nexus | VouchPay |
| Tagline | Payment Transparency App | Trust Platform · Construction |
| Primary color | Navy `#1A1A2E` + Gold `#C9A84C` | Forest green `#1B5C38` |
| Background | Off-white `#F8F9FA` | White `#FFFFFF` |
| Logo | BabylonLogo / BabylonIcon | VouchPay logo (asset TBD) |

---

### 2. Design system

Update `constants/colors.ts` to exactly this:

```typescript
export const Colors = {
  // Brand
  green: "#1B5C38",
  greenLight: "#E8F5EE",
  greenMid: "#2D7A4F",

  // Neutrals
  white: "#FFFFFF",
  offWhite: "#F7F7F5",
  beige: "#F5EFE6",
  grey100: "#F3F3F3",
  grey300: "#D1D1D1",
  grey500: "#9B9B9B",
  grey700: "#5A5A5A",
  black: "#1A1A1A",

  // Status
  red: "#C0392B",
  redBg: "#FDF0EE",
  amber: "#D4800A",
  amberBg: "#FEF7ED",

  // Legacy — keep during transition, remove after full v3 cutover
  navy: "#1A1A2E",
  gold: "#C9A84C",
} as const;
```

UI patterns (apply consistently across all v3 screens):
- Rounded corners: 12–16px on cards, 28px on primary buttons
- Cards: white background, 1px border `#E5E5E5` or subtle shadow
- Primary button: full-width, `Colors.green` fill, white text, height 54px
- Secondary button: outline, `Colors.green` border + text
- Input fields: light border `#E5E5E5`, rounded 12px, white background
- Progress bar: thin `Colors.green` bar at top of multi-step flows
- Chip/pill selectors: outlined default, fill `Colors.green` when selected
- Locked state: `Colors.beige` background, amber "LOCKED" badge

---

### 3. Authentication overhaul

#### Sign-up flow
1. User enters: mobile number, ABN, full name, email
2. As ABN is typed, call `GET /abr/lookup?abn=...` in real time
3. Show confirmed ABR result card: company name, trade, state, years active
4. On submit → `POST /auth/request-otp` sends SMS to mobile
5. OTP verify screen: 6 individual digit inputs, resend countdown timer
6. On verify → account created, JWT issued

#### Sign-in flow
1. Enter mobile number
2. `POST /auth/request-otp` → SMS sent
3. OTP verify screen (same component as sign-up)
4. On verify → JWT issued

#### Backend — user model additions
```typescript
// Add to userModel:
mobile: string        // E.164 format: "+61412345678", required
abn: string           // 11 digits, no spaces: "53004085616", required
businessName: string
businessTrade: string
businessState: string
email?: string        // now optional
password?: string     // keep in schema, no longer required
```

#### Backend — OTP model
```typescript
OTP {
  mobile: string
  code: string        // 6-digit, store hashed
  expiresAt: Date     // 10 min TTL
  used: boolean
}
```

#### ABR lookup proxy
- Route: `GET /abr/lookup?abn=XXXXXXXXXXX`
- Proxies to ABR API using server-side `ABR_GUID` env var
- Never expose `ABR_GUID` to the client
- Returns: `{ entityName, tradingName, state, businessType, activeYears, isActive }`
- Strip spaces from ABN before querying

---

### 4. Navigation

Replace header-based navigation with a bottom tab bar with four tabs:
**Home, Vouches, Project, Me**

Restructure `(app)/_layout.tsx` to use Expo Router's tab layout.
Existing project/invoice screens move into the Project tab.

---

### 5. Home screen

Three tappable action cards. Logic:
- "Give a Vouch" card shows a badge with the count of pending vouch requests
- "Vouch my Project" card is locked (`Colors.beige` bg, amber LOCKED badge) until `vouchProfile.status === "Active"`

---

### 6. Get Vouched — 3-step wizard

#### Step 1 — Your details
Pre-filled from sign-up: name, ABN. User confirms; nothing here is editable.

> **Shipped:** trade is *not* on this step. It is asked once, on the trade
> licence step, and stored only as `User.businessTrade` — the VouchProfile
> document carries no copy. Business name is asked on sign-up, prefilled from
> the ABR but editable. See the Trade and Business name rules in `CLAUDE.md`.

#### Step 2 — Your project
**Current project** (required): name, address, suburb, state, postcode, value (private)
**Past project** (optional): name, suburb, postcode, year, approx value (private)
Values are never shown publicly — used internally only.

#### Step 3 — Two references
Per reference: name, company, mobile, email (TBD), relationship to user, which project.
Third reference optional.
On submit → SMS vouch requests sent to all references.

#### After submission
Profile status becomes `"Pending"`. Unlocks to `"Active"` once 2 references respond.

#### Backend model
```typescript
VouchProfile {
  userId: ObjectId
  name: string
  abn: string
  // No trade field — it lives on the User as businessTrade. `trade` and
  // `tradeType` both existed here once and were removed.
  currentProject: {
    name: string
    address: string
    suburb: string
    state: string
    postcode: string
    value: number         // private
  }
  pastProjects: [{
    name: string
    suburb: string
    postcode: string
    year: number
    value: number         // private
  }]
  references: [{
    name: string
    company: string
    mobile: string
    email?: string
    relationship: string
    projectName: string
  }]
  status: "Pending" | "Active"
  vouchCount: number
  completedAt?: Date
  createdAt: Date
}
```

---

### 7. Give a Vouch

#### ABN lookup behaviour
- If ABN is already on VouchPay: show existing vouch count, attributes summary, CTA to vouch
- If ABN is not on VouchPay: show "not yet on Vouch" state, CTA to vouch and invite them
- "Add manually" fallback if no ABN available

#### Attribute selection
Multi-select chips, minimum 2 required:
`Pays on time`, `Quality work`, `Professional`, `Reliable`, `Communication`, `Work with again`

Optional free-text note. Only positive attributes are public — notes are private.

#### Pending vouch requests
Incoming requests (from Get Vouched references) appear in the Vouches tab with name + timestamp.
User can accept or decline.

#### Backend models
```typescript
Vouch {
  fromUserId: ObjectId
  toAbn: string
  toBusinessName: string
  attributes: string[]
  note?: string
  projectContext?: string
  isPublic: boolean
  createdAt: Date
}

VouchRequest {
  fromUserId: ObjectId    // the person being vouched for
  toMobile: string        // reference's mobile
  toEmail?: string
  toName: string
  toCompany: string
  relationship: string
  projectName: string
  status: "Pending" | "Accepted" | "Declined"
  createdAt: Date
}
```

---

### 8. Vouch my Project (existing feature, gated)

No backend changes. The existing project/invoice infrastructure is reused as-is.

**Gate logic:** If `vouchProfile` does not exist or `status !== "Active"`, show a locked
screen explaining the feature and directing the user to complete Get Vouched first.
Amounts always stay private — only payment timing is used for the health score.

---

### 9. Me / Profile screen

Displays: name, ABN, business name, trade, Vouch profile status, vouch count received.
Settings: notification preferences, sign out.

---

### 10. Migration notes

- Existing v2 users re-authenticate via OTP on first v3 login
- `mobile` stored as E.164: `+61412345678`
- `abn` stored as 11-digit string, no spaces: `53004085616`
- `BabylonIcon`/`BabylonLogo` component names can stay internally — just swap SVG content
- `Colors.navy` and `Colors.gold` stay in the file during transition, remove after full cutover
