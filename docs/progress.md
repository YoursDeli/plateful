# Plateful — Progress Log

> **This file is the source of truth for "where are we right now."**
> Claude (in VS Code / Claude Code) must read this file at the start of every
> session, and update it at the end of every session or completed feature —
> see `CLAUDE.md` §9 for the exact workflow.

Last updated: 2026-09-23
Current phase: **Build Order 0–1 code written; waiting on Supabase/Cloudinary credentials to verify end-to-end.**

---

## How to update this file

- Tick a box only when the feature is actually working end-to-end (built +
  manually verified), not when a first draft exists.
- Add a dated one-line entry to the **Session Log** every time a session ends,
  however small the change.
- If a decision gets made mid-build that isn't already captured in
  `docs/branding-security-auth.md` or the other docs, record it under
  **Decisions Made During Build** so it isn't re-litigated later.
- If something is blocked (waiting on client input, a missing credential,
  etc.), add it to **Open Blockers** instead of leaving it silently undone.

---

## Build Checklist (mirrors CLAUDE.md §7 build order)

### 0. Project setup
- [x] Next.js 14+ App Router project scaffolded (Next 16.3 — builds, lints, serves; see Decisions)
- [ ] Tailwind configured with `site_settings`-sourced theme tokens — *built; fallback defaults verified rendering, DB-sourced path unverified*
- [ ] Supabase project created, env vars set locally (`.env.local`, not committed) — *`.env.example` + gitignored `.env.local` template done; keys pending (see Open Blockers)*
- [ ] Supabase client/server helpers (`/lib/supabase`) — *built 2026-09-23, awaiting verification against a live Supabase project*

### 1. Menu data model + admin CRUD
- [ ] `menu_items`, `categories`, `site_settings`, `profiles`, `reviews` tables + RLS policies — *built 2026-09-23, awaiting verification against a live Supabase project* (`supabase/migrations/20260923000000_core_schema.sql`)
- [ ] `handle_new_user` trigger (creates `profiles` row on signup) — *built 2026-09-23, awaiting verification against a live Supabase project*
- [ ] Review-aggregate trigger (keeps `menu_items.avg_rating`/`review_count` in sync) — *built 2026-09-23, awaiting verification against a live Supabase project*
- [ ] Admin menu CRUD UI (`/admin/menu`) — including `compare_at_price`, `badge`, Cloudinary photo upload — *built 2026-09-23, awaiting verification (needs Supabase + Cloudinary keys)* (items + categories add/rename/reorder/delete, availability toggle)
- [ ] Admin branding settings page (edit `site_settings`, Cloudinary logo upload) — *built 2026-09-23, awaiting verification (needs Supabase + Cloudinary keys)*

### 2. Storefront: hero + menu browse + item detail
- [ ] Hero section (flavor-swap pattern, `docs/hero-section-design.md`)
- [ ] Menu page — rich cards with badge/rating/discount (`docs/menu-and-product-page.md` §1)
- [ ] Item detail page — gallery, quantity, share, reviews (`docs/menu-and-product-page.md` §2)

### 3. Cart
- [ ] Client-side cart (Zustand/Context) + `localStorage` persistence
- [ ] Cart slide-over panel

### 4. Favorites
- [ ] Auth required — heart icon on cards, `/favorites` page

### 5. Auth
- [ ] Email OTP flow (request + verify) — *minimal version pulled forward 2026-09-23 (`/login`), unverified; Google + cart merge + polish still step 5*
- [ ] Google OAuth flow
- [ ] Session middleware (`@supabase/ssr`) — *built as `proxy.ts` (Next 16 rename), unverified*
- [ ] Admin route protection (role check in middleware) — *built: optimistic redirect in `proxy.ts`, real role check in `/(admin)` layout + every page/server action + RLS. Signed-out redirect verified; role check unverified*

### 6. Checkout + Paystack
- [ ] Sign-in gate at checkout (account required — no guest checkout)
- [ ] Checkout form
- [ ] Server-side order creation with server-computed prices
- [ ] Referral bonus / loyalty points redemption applied server-side (combined, capped at ₦0)
- [ ] Paystack initialize + redirect/inline (skip entirely when total is ₦0 from rewards)
- [ ] Webhook handler + signature verification
- [ ] Return-URL verify fallback
- [ ] Idempotent "mark paid" logic
- [ ] `order_status_history` table + writes on each status transition

### 7. Brevo transactional emails
- [ ] Order confirmation (customer) — include loyalty points earned
- [ ] New order notification (vendor)
- [ ] Status update emails (phase 2, optional for MVP)

### 8. Order tracking + admin order management
- [ ] `/orders/[orderId]` status timeline (per `docs/ui-components-and-styling.md` §1)
- [ ] Admin orders view (realtime subscription)

### 8a. UI component library
- [ ] `styled-components` added, scoped to `/components/ui/`
- [ ] `WhatsAppButton` (order support contact)
- [ ] `ShareButtonCluster` (trimmed to relevant platforms)
- [ ] `LiquidButton` (primary CTA — Pay/Add to Cart)
- [ ] `UploadButton` (admin image uploads via Cloudinary signed uploads, wired to real upload state)

### 9. Referral program
- [ ] `referrals`, `referral_ledger` tables + RLS
- [ ] `profiles` referral columns (`referral_code`, `referred_by`, `referral_balance`, `referral_earned_total`)
- [ ] `site_settings.referral_bonus_amount` (admin-editable)
- [ ] Referral code generation on signup + `ref` cookie capture + pending referral creation
- [ ] Referral completion logic on first paid order (credit ledger + cached balance)
- [ ] Checkout redemption (apply balance, server-validated, transactional)
- [ ] Refund-on-abandon logic hooked into stale-order cleanup
- [ ] `/account/referrals` page — 3 stat cards + shareable link

### 10. Loyalty points program
- [ ] `loyalty_ledger` table + RLS
- [ ] `profiles` loyalty columns (`loyalty_points_balance`, `loyalty_points_earned_total`)
- [ ] `site_settings.loyalty_enabled`, `loyalty_points_per_1000` (admin-editable)
- [ ] Earning logic on first paid-order transition (10 pts / ₦1,000 net spend)
- [ ] Checkout redemption combined with referral bonus (capped at ₦0 total)
- [ ] Refund-on-abandon logic (shared cleanup pass with referral bonus)
- [ ] Admin toggle UI in `/admin/settings`

### 11. Static pages & Footer
- [ ] `pages` table (`about`/`terms`/`privacy`) + admin content editor
- [ ] `/about` (chef page)
- [ ] `/terms`, `/privacy`
- [ ] Site-wide `Footer` component in root layout
- [ ] Real Terms/Privacy copy approved by client (not shipped as placeholder text)

### 12. Cloudinary image uploads
- [ ] `/api/cloudinary/sign` signed-upload route (folder/format/size constraints) — *built; 401 when signed out verified; signing unverified (no Cloudinary creds). Size can't be signed — see Decisions*
- [ ] Menu item photo upload wired to Cloudinary — *built 2026-09-23, awaiting verification (needs Supabase + Cloudinary keys)*
- [ ] Logo upload (admin branding settings) wired to Cloudinary — *built 2026-09-23, awaiting verification (needs Supabase + Cloudinary keys)*
- [ ] Chef photo upload (`/admin/settings` Pages tab) wired to Cloudinary

### 13. Polish
- [ ] Animations / transitions (reduced-motion respected)
- [ ] Empty states, error states
- [ ] Accessibility pass (labels, contrast, keyboard nav)
- [ ] Security headers, RLS audit pass before launch
- [ ] Mobile-responsiveness pass across every page, admin included

---

## Decisions Made During Build

- **2026-09-23** — Color pair locked: Lavender `#D3C5F6` (primary) / Velvet
  `#3B2A60` (secondary), replacing the earlier placeholder palette. Updated
  in `docs/branding-security-auth.md` `site_settings` defaults.
- **2026-09-23** — Order status page adopts a vertical-timeline design
  (mapped to the `orders.status` enum) — see `docs/ui-components-and-styling.md` §1.
  Requires adding an `order_status_history` table (`order_id, status,
  changed_at`) to get a real timestamp per step.
- **2026-09-23** — Four custom animated button components (WhatsApp contact
  button, expanding social-share cluster, liquid-press CTA button, upload
  progress button) added to the design, built with `styled-components`
  scoped to `/components/ui/` — see `docs/ui-components-and-styling.md` §3
  for placement and required theming per instance.
- **2026-09-23** — Menu cards get badges, ratings, and discount pricing;
  single product page gets gallery/quantity/share/reviews. Ratings/reviews
  moved from Phase 2 into MVP scope (`reviews` table + cached
  `avg_rating`/`review_count` on `menu_items`, plus `compare_at_price` and
  `badge` columns). See `docs/menu-and-product-page.md`. Still open: whether
  review-writing is restricted to users who actually ordered the item, or
  any signed-in user — pick one before building the review insert flow.
- **2026-09-23** — Full page list locked at 17 routes (14 storefront + 3
  admin), including new About/Chef, Terms, Privacy, and Referrals pages, plus
  a site-wide Footer. See `docs/pages-referrals-footer.md`.
- **2026-09-23** — Referral program: ₦200 per successful referral (admin-
  editable via `site_settings.referral_bonus_amount`), credited when the
  referred user's first order is paid, redeemable only at checkout (never
  withdrawable). New tables: `referrals`, `referral_ledger`; new `profiles`
  columns for code/balance/earned-total. See `docs/pages-referrals-footer.md`
  §5 for the full credit/redeem/refund flow.
- **2026-09-23** — Mobile responsiveness is a standing requirement for every
  page, including admin — added to `CLAUDE.md` §6 Coding Conventions rather
  than treated as a one-off feature.
- **2026-09-23** — **Reversed earlier guest-checkout decision**: an account
  (Email OTP/Google) is now required to complete checkout, needed for
  tracking, stats, and the reward programs. Browsing/cart still don't
  require sign-in. `orders.user_id` is now `NOT NULL`. See
  `docs/accounts-loyalty-and-images.md` §1.
- **2026-09-23** — Loyalty points program: 10 points per ₦1,000 of net
  spend, 1 point = ₦1, redeemable only at checkout, combinable with the
  referral bonus (capped so total never goes below ₦0). Rate and on/off
  state both admin-editable via `site_settings`. New `loyalty_ledger` table
  mirrors `referral_ledger`. See `docs/accounts-loyalty-and-images.md` §2.
- **2026-09-23** — Cloudinary chosen for all image storage (menu photos,
  logo, chef photo), via a signed-upload server route rather than unsigned
  client uploads. See `docs/accounts-loyalty-and-images.md` §3.

- **2026-09-23** — Scaffolded on **Next.js 16.3** (CLAUDE.md allows "14+").
  Next 16 renames middleware to **`proxy.ts`** and makes `cookies()`/`params`
  async-only. `AGENTS.md` (Next's agent-rules file) is kept on purpose: without
  it, `next dev` appends its block to `CLAUDE.md`.
- **2026-09-23** — **Tailwind v4** (CSS-first config): theme tokens live in
  `app/globals.css` `@theme` (`primary`, `secondary`, `accent` = secondary,
  `neutral-dark`, `neutral-light`, `font-display`/`font-sans`) instead of a
  `tailwind.config.ts`. `primary`/`secondary` resolve to `--brand-primary`/
  `--brand-secondary`, injected by the root layout from
  `site_settings.primary_color`/`accent_color`. Fonts: Fraunces (display) +
  Inter (body) via `next/font`.
- **2026-09-23** — A **minimal Email OTP `/login` was pulled forward** from
  step 5 (user-approved) so the admin CRUD is reachable. Google Sign-In,
  checkout cart merge, and styling polish remain step 5.
- **2026-09-23** — Money: `menu_items.price`/`compare_at_price` stored in
  **naira** as `numeric(12,2)` (matching `referral_bonus_amount default 200`);
  converted to kobo only at the Paystack boundary (`lib/money.ts` `nairaToKobo`).
- **2026-09-23** — `menu_items.category` implemented as `category_id` FK to
  `categories.id` (`on delete set null`, item becomes "Uncategorised").
  `badge` constrained to `'New' | 'Bestseller'` per the data model (the
  "Spicy" example in a card comment reads as a tag, not a badge).
- **2026-09-23** — Referral/loyalty columns on `profiles`/`site_settings` are
  **not** in the step-1 migration; they get their own migrations in steps 9/10.
  The `profiles` guard trigger (`protect_profile_privileged_columns`) must be
  extended to cover those cached balance columns then.
- **2026-09-23** — `profiles.role` can only change via the service role or the
  Supabase SQL editor — not from any user session, including staff. A future
  "invite staff" action must check `admin` and then use the service-role client.
- **2026-09-23** — `reviews` ships with public read and **no write policies**
  until the open "purchaser-only vs any signed-in user" decision is made. No
  unique (user, item) constraint yet either; decide both together.
- **2026-09-23** — Cloudinary has **no signable max-file-size parameter**
  (contrary to `docs/accounts-loyalty-and-images.md` §3). Enforced instead:
  signed `allowed_formats` (jpg/jpeg/png/webp/avif) + a signed incoming
  `c_limit,w_2000,h_2000` transformation (caps stored size), a 5 MB client-side
  check (UX only), and a server-side check that saved URLs belong to our own
  cloud + `plateful/<folder>/`. Delivery uses a `CloudinaryImage` wrapper
  (`next/image` + Cloudinary loader, `f_auto,q_auto,w_<n>`) — no `next-cloudinary`
  dependency.
- **2026-09-23** — Admin writes use the **user's session client** (RLS applies),
  not the service-role client, so `is_staff()` RLS is a second gate behind
  `requireStaff()`. Menu items are **hard-deleted** for now; once `order_items`
  references `menu_items` (step 6), switch to "mark unavailable" / soft-delete.
- **2026-09-23** — Hero `featured_order` column deferred to step 2 (hero build).

---

## Open Blockers

- Real Terms & Conditions and Privacy Policy copy needs client/legal
  sign-off before launch — dev can seed the admin editor with a generic
  draft in the meantime (see `docs/pages-referrals-footer.md` §3).
- **Supabase project + keys** (user to provide): fill `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`,
  run `supabase/migrations/20260923000000_core_schema.sql` in the SQL Editor,
  add `{{ .Token }}` to the "Confirm signup" + "Magic Link" email templates, sign in once at
  `/login`, then set own `profiles.role = 'admin'` (SQL in `README.md`). Every
  "built, awaiting verification" item in steps 0/1 is blocked on this.
- **Cloudinary credentials** (user to provide): `CLOUDINARY_CLOUD_NAME`,
  `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
  in `.env.local` — needed to verify menu photo + logo uploads.
- **TS types are hand-written** (`lib/supabase/types.ts`) since the Supabase CLI
  isn't installed — regenerate with `npx supabase gen types` once a project exists.

---

## Session Log

- **2026-09-23** — Planning/docs phase: finalized branding placeholder
  (Plateful, editable via admin), auth (Email OTP + Google Sign-In via
  Supabase Auth), and security decisions. See `docs/branding-security-auth.md`.
  No code written yet.
- **2026-09-23** — Added order-status timeline design, locked Lavender/Velvet
  color pair, and specced four reusable button components. See
  `docs/ui-components-and-styling.md`. Still no code written.
- **2026-09-23** — Specced richer menu cards and a trimmed single-product
  page; moved reviews into MVP scope. See `docs/menu-and-product-page.md`.
  Still no code written.
- **2026-09-23** — Locked the full page list (17 routes), specced About/
  Terms/Privacy pages, a site-wide footer, and the full referral program
  (₦200/referral, admin-editable, checkout-only redemption, 3-card
  `/account/referrals` page). See `docs/pages-referrals-footer.md`. Still no
  code written.
- **2026-09-23** — Reversed guest checkout to account-required, added the
  loyalty points program, and settled on Cloudinary for image storage. See
  `docs/accounts-loyalty-and-images.md`. Still no code written.
- **2026-09-23** — Build Order 0–1 code written: Next 16 scaffold, Supabase
  helpers + `proxy.ts`, core schema migration (5 tables, RLS, triggers), admin
  gate, minimal OTP `/login`, `/admin/menu` CRUD, `/admin/settings` branding,
  Cloudinary sign route. Build + lint clean; DB-dependent items unverified
  pending Supabase/Cloudinary keys (see Open Blockers).
