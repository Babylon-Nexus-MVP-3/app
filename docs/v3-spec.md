# VouchPay v3 — Full Specification

This document is the source of truth for all v3 changes.
Agents working on v3 features should read this in full before starting.
UI layout and screen designs are provided as screenshots — not described here.

**Golden rule: never break working v2 features.** The invoice/project tracking core
must remain functional throughout the migration.

---

## Status tracker

Use this to mark work done. Update as you complete each item.

### Backend
- [ ] Add `mobile`, `abn`, `businessName`, `businessTrade`, `businessState` to `userModel`
- [ ] Create `otpModel` for SMS OTP storage
- [ ] `POST /auth/request-otp` — send OTP to mobile via Twilio
- [ ] `POST /auth/verify-otp` — verify OTP, return JWT
- [ ] `GET /abr/lookup?abn=...` — proxy ABR lookup (keep `ABR_GUID` server-side)
- [ ] Create `vouchProfileModel`
- [ ] Create `vouchModel`
- [ ] Create `vouchRequestModel`
- [ ] `POST /vouch/profile` — create/update Vouch profile
- [ ] `GET /vouch/profile/me` — own profile + status
- [ ] `POST /vouch/give` — give a vouch to an ABN
- [ ] `GET /vouch/received` — vouches received by current user's ABN
- [ ] `GET /vouch/pending-requests` — pending vouch requests inbox
- [ ] `POST /vouch/request/:id/accept`
- [ ] `POST /vouch/request/:id/decline`
- [ ] `GET /vouch/business/:abn` — public profile (vouch count + attributes only)
- [ ] Modify `POST /auth/register` — add mobile/ABN fields, remove password requirement
- [ ] Modify `POST /auth/login` — change to OTP-based flow

### Frontend
- [ ] Update `constants/colors.ts` to v3 design tokens
- [ ] Replace `BabylonLogo.tsx` and `BabylonIcon.tsx` SVG content
- [ ] Update all "BABYLON NEXUS" / "Babylon" brand strings
- [ ] Update `app.config.js` (app name, slug, bundle IDs)
- [ ] Rewrite `(auth)/sign-up.tsx`
- [ ] Rewrite `(auth)/sign-in.tsx`
- [ ] Rewrite `(auth)/verify-email.tsx` → OTP verify screen
- [ ] Delete `(auth)/forgot-password.tsx`
- [ ] Delete `(auth)/reset-password.tsx`
- [ ] Delete `(app)/change-password.tsx`
- [ ] Restructure `(app)/_layout.tsx` to bottom tab navigator (Home, Vouches, Project, Me)
- [ ] Create `(app)/home.tsx`
- [ ] Create `(app)/vouches/` screens
- [ ] Create `(app)/get-vouched/` 3-step wizard screens
- [ ] Create `(app)/give-vouch/` screens
- [ ] Create `(app)/me.tsx`
- [ ] Gate "Vouch my Project" tab behind `vouchProfile.status === "Active"`

---

## 1. Rebrand

| Item | v2 | v3 |
|---|---|---|
| App name | Babylon Nexus | VouchPay |
| Tagline | Payment Transparency App | Trust Platform · Construction |
| Primary color | Navy `#1A1A2E` + Gold `#C9A84C` | Forest green `#1B5C38` |
| Background | Off-white `#F8F9FA` | White `#FFFFFF` |
| Logo | BabylonLogo / BabylonIcon | VouchPay logo (asset TBD) |

---

## 2. Design system

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

## 3. Authentication overhaul

### Sign-up flow
1. User enters: mobile number, ABN, full name, email
2. As ABN is typed, call `GET /abr/lookup?abn=...` in real time
3. Show confirmed ABR result card: company name, trade, state, years active
4. On submit → `POST /auth/request-otp` sends SMS to mobile
5. OTP verify screen: 6 individual digit inputs, resend countdown timer
6. On verify → account created, JWT issued

### Sign-in flow
1. Enter mobile number
2. `POST /auth/request-otp` → SMS sent
3. OTP verify screen (same component as sign-up)
4. On verify → JWT issued

### Backend — user model additions
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

### Backend — OTP model
```typescript
OTP {
  mobile: string
  code: string        // 6-digit, store hashed
  expiresAt: Date     // 10 min TTL
  used: boolean
}
```

### ABR lookup proxy
- Route: `GET /abr/lookup?abn=XXXXXXXXXXX`
- Proxies to ABR API using server-side `ABR_GUID` env var
- Never expose `ABR_GUID` to the client
- Returns: `{ entityName, tradingName, state, businessType, activeYears, isActive }`
- Strip spaces from ABN before querying

---

## 4. Navigation

Replace header-based navigation with a bottom tab bar with four tabs:
**Home, Vouches, Project, Me**

Restructure `(app)/_layout.tsx` to use Expo Router's tab layout.
Existing project/invoice screens move into the Project tab.

---

## 5. Home screen

Three tappable action cards. Logic:
- "Give a Vouch" card shows a badge with the count of pending vouch requests
- "Vouch my Project" card is locked (`Colors.beige` bg, amber LOCKED badge) until `vouchProfile.status === "Active"`

---

## 6. Get Vouched — 3-step wizard

### Step 1 — Your details
Pre-filled from sign-up: name, ABN, trade. User confirms or edits.

### Step 2 — Your project
**Current project** (required): name, address, suburb, state, postcode, value (private)
**Past project** (optional): name, suburb, postcode, year, approx value (private)
Values are never shown publicly — used internally only.

### Step 3 — Two references
Per reference: name, company, mobile, email (TBD), relationship to user, which project.
Third reference optional.
On submit → SMS vouch requests sent to all references.

### After submission
Profile status becomes `"Pending"`. Unlocks to `"Active"` once 2 references respond.

### Backend model
```typescript
VouchProfile {
  userId: ObjectId
  name: string
  abn: string
  trade: string
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

## 7. Give a Vouch

### ABN lookup behaviour
- If ABN is already on VouchPay: show existing vouch count, attributes summary, CTA to vouch
- If ABN is not on VouchPay: show "not yet on Vouch" state, CTA to vouch and invite them
- "Add manually" fallback if no ABN available

### Attribute selection
Multi-select chips, minimum 2 required:
`Pays on time`, `Quality work`, `Professional`, `Reliable`, `Communication`, `Work with again`

Optional free-text note. Only positive attributes are public — notes are private.

### Pending vouch requests
Incoming requests (from Get Vouched references) appear in the Vouches tab with name + timestamp.
User can accept or decline.

### Backend models
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

## 8. Vouch my Project (existing feature, gated)

No backend changes. The existing project/invoice infrastructure is reused as-is.

**Gate logic:** If `vouchProfile` does not exist or `status !== "Active"`, show a locked
screen explaining the feature and directing the user to complete Get Vouched first.
Amounts always stay private — only payment timing is used for the health score.

---

## 9. Me / Profile screen

Displays: name, ABN, business name, trade, Vouch profile status, vouch count received.
Settings: notification preferences, sign out.

---

## 10. Migration notes

- Existing v2 users re-authenticate via OTP on first v3 login
- `mobile` stored as E.164: `+61412345678`
- `abn` stored as 11-digit string, no spaces: `53004085616`
- `BabylonIcon`/`BabylonLogo` component names can stay internally — just swap SVG content
- `Colors.navy` and `Colors.gold` stay in the file during transition, remove after full cutover
