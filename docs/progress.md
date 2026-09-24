# Plateful — Progress Log

> **This file is the source of truth for "where are we right now."**
> Claude (in VS Code / Claude Code) must read this file at the start of every
> session, and update it at the end of every session or completed feature —
> see `CLAUDE.md` §9 for the exact workflow.

Last updated: 2026-09-24
Current phase: **Build Order 0–5 done and verified. Starting step 6 (Checkout + Paystack).**

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
- [x] Tailwind configured with `site_settings`-sourced theme tokens — *verified 2026-09-24: admin color change re-themes the site*
- [x] Supabase project created, env vars set locally (`.env.local`, not committed) — *verified 2026-09-24: keys set, core migration applied, live REST reads work*
- [x] Supabase client/server helpers (`/lib/supabase`) — *verified 2026-09-24*

### 1. Menu data model + admin CRUD
- [x] `menu_items`, `categories`, `site_settings`, `profiles`, `reviews` tables + RLS policies — *verified 2026-09-24: anon probes + staff CRUD* (`supabase/migrations/20260923000000_core_schema.sql`)
- [x] `handle_new_user` trigger (creates `profiles` row on signup) — *verified 2026-09-24*
- [ ] Review-aggregate trigger (keeps `menu_items.avg_rating`/`review_count` in sync) — *built; untestable until a review insert flow exists (policy decision still open)*
- [x] Admin menu CRUD UI (`/admin/menu`) — including `compare_at_price`, `badge`, photo upload (Supabase Storage) — *verified 2026-09-24* (items + categories add/rename/reorder/delete, availability toggle, validation keeps typed values)
- [x] Admin branding settings page (edit `site_settings`, logo upload via Supabase Storage) — *verified 2026-09-24*

### 2. Storefront: hero + menu browse + item detail
- [x] Hero section (flavor-swap pattern, `docs/hero-section-design.md`) — *verified 2026-09-25 by user* (admin "Hero position"; brand intro when none featured)
- [x] Menu page — rich cards with badge/rating/discount (`docs/menu-and-product-page.md` §1) — *verified 2026-09-25 by user* (category chips + search, `?category=` deep links)
- [x] Item detail page — gallery, quantity, share, reviews (`docs/menu-and-product-page.md` §2) — *verified 2026-09-25 by user* (reviews list renders once reviews exist)

### 3. Cart
- [x] Client-side cart (Zustand/Context) + `localStorage` persistence — *verified 2026-09-25 by user* (cross-tab sync, live price/availability refresh)
- [x] Cart slide-over panel — *verified 2026-09-25 by user* (plus `/cart` fallback; Checkout disabled until step 6)

### 4. Favorites
- [x] Auth required — heart icon on cards, `/favorites` page — *verified 2026-09-26 by user* (hearts on cards + dish page, guest → sign-in → auto-save, home "Your favourites" row, header ♥ link)

### 5. Auth
- [x] Email OTP flow (request + verify) — *reusable `SignInPanel` (auto-submit at 6 digits), verified 2026-09-26 by user*
- [x] Google OAuth flow — *verified 2026-09-26 by user* (`SignInPanel` + `/auth/callback` PKCE exchange, sanitised `next`; same-email accounts link automatically)
- [x] Session middleware (`@supabase/ssr`) — *`proxy.ts` (Next 16 rename), verified 2026-09-24*
- [x] Admin route protection (role check) — *verified 2026-09-24: optimistic redirect in `proxy.ts`, role check in `/(admin)` layout + every page/server action + RLS*

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
- [ ] `UploadButton` (admin image uploads via Supabase Storage, wired to `ImageUploadField`'s real upload state)

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

### 12. Image uploads (Supabase Storage)
- [x] `images` bucket + Storage RLS (`supabase/migrations/20260924000000_storage_images.sql`) — *verified 2026-09-24*
- [x] Menu item photo upload — *verified 2026-09-24*
- [x] Logo upload (admin branding settings) — *verified 2026-09-24*
- [ ] Chef photo upload (`/admin/settings` Pages tab) — lands with step 11

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
- **2026-09-23** — *(Superseded 2026-09-24 → Supabase Storage.)* Cloudinary chosen for all image storage (menu photos,
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
- **2026-09-23** — *(Moot since 2026-09-24 — Cloudinary removed.)* Cloudinary has **no signable max-file-size parameter**
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
- **2026-09-24** — Supabase project security: Data API **on**, "Automatically
  expose new tables" **off**, "Enable automatic RLS" **on**. Because tables
  aren't auto-exposed, **every migration must include explicit `grant`s** for
  `anon`/`authenticated`/`service_role` (see the "Data API privileges" section
  at the end of the core schema migration). `profiles` updates use a
  column-level grant (`full_name, phone, default_address` only), so `role` and
  future cached balances aren't updatable from a user session at all.
- **2026-09-24** — **Reversed: Supabase Storage replaces Cloudinary** for all
  images (menu photos, logo, chef photo). Reason: total media is small
  (~50 MB, well inside Supabase's free 1 GB) and it removes a vendor/account.
  Plan: public bucket(s) with storage RLS allowing upload/update/delete only
  when `is_staff()`; server-side check that saved URLs point at our own bucket;
  resizing/WebP via `next/image` (Supabase's own image transforms are paid-only).
  **Done 2026-09-24:** Cloudinary route/helpers/wrapper and `CLOUDINARY_*`
  env vars removed; `ImageUploadField` uploads via XHR (for progress) to
  `images/<folder>/<uuid>.<ext>` as the signed-in user; server actions accept
  only our own bucket URLs (`lib/storage/images.ts`) and best-effort delete
  replaced/removed images (`lib/storage/remove.ts`); `next.config.ts`
  allow-lists the bucket's public path. Docs updated (CLAUDE.md,
  `accounts-loyalty-and-images.md` §3, `branding-security-auth.md`, README). The Cloudinary "no signable max size" decision
  above becomes moot (Supabase buckets enforce `file_size_limit` and
  `allowed_mime_types` server-side). **Videos** were mentioned but aren't
  specced anywhere yet — spec placement/length before building anything.
- **2026-09-24** — **Hosting: Netlify replaces Vercel** (hobby /
  non-commercial build; user's choice to try Netlify). Checked against
  Netlify's Next.js docs: Next 13.5+ supported via the auto-detected OpenNext
  adapter (don't pin its version), server actions + on-demand revalidation
  fully supported, `next/image` served via Netlify Image CDN. Constraints to
  respect: `proxy.ts` runs as an Edge Function — **no `fs` / native addons in
  proxy code**; Netlify evaluates headers/redirects *after* proxy. When
  deploying: set the same env vars in Netlify's UI, set Supabase Auth
  "Site URL" to the Netlify URL, and optionally
  `NETLIFY_NEXT_SKEW_PROTECTION=true`. Any image domains (the Supabase Storage
  URL) must be allowed in `next.config.ts` `images.remotePatterns`.

- **2026-09-24** — **Auth emails go through Brevo SMTP** (Supabase → Auth →
  SMTP Settings, `smtp-relay.brevo.com:587`, Brevo SMTP key — never stored in
  the repo or `.env.local`). This lifts Supabase's built-in "team members
  only, few per hour" limit. Branded code-only templates are versioned in
  `supabase/templates/` (`confirm-signup.html` = first sign-in,
  `magic-link.html` = returning users) and pasted into the dashboard; brand
  name is hardcoded there (templates can't read `site_settings`). Code is
  deliberately **not** in the subject line (lock-screen exposure). Email OTP
  length set to **6** (Supabase minimum; project default was 8).
  `BREVO_API_KEY` / `BREVO_SENDER_EMAIL` in `.env.local` are for step 7
  order emails; Brevo's "Authorised IPs" block will likely need disabling for
  that key since Netlify functions have no fixed IPs.

- **2026-09-25** — **Steps 2 and 3 built together** (user's choice): the
  storefront's Add-to-cart buttons need a real cart to be testable.
- **2026-09-25** — Hero curation via **`menu_items.featured_order`**
  (nullable 1–99, "Hero position" field in `/admin/menu`). Hero shows
  available featured dishes in that order; home falls back to a brand intro
  when none are featured. Home "Popular" row = available `Bestseller`-badged
  dishes, else the first available dishes.
- **2026-09-25** — **Menu cards on mobile are single-column horizontal cards**
  (photo left, details right); 2/3/4-column grid from `sm`/`lg`/`xl`.
  `menu-and-product-page.md` §1 said "2 cols mobile", but CLAUDE.md §6 +
  `pages-referrals-footer.md` §6 (stacked mobile) take precedence.
- **2026-09-25** — Public reviews are read through the
  **`menu_item_reviews()` security-definer function**, exposing only the
  reviewer's first name (profiles stay private under RLS).
- **2026-09-25** — Storefront pages are **statically cached** (cookie-less
  public client, `revalidate = 3600` safety net) and refreshed immediately by
  admin edits (`revalidatePath("/", "layout")`). Dish pages render on first
  visit (empty `generateStaticParams`). Header sign-in state is a client
  component so pages stay static.
- **2026-09-25** — Cart: **Zustand + `persist`** (`localStorage` key
  `plateful-cart`, `skipHydration` + `<CartHydrator />` to avoid hydration
  mismatch, cross-tab `storage` sync). Opening the cart re-checks live
  prices/availability and flags changed / sold-out / removed dishes
  (display only — checkout re-prices server-side). Max 50 per line. Delivery
  fee shown as "applied at checkout" (fee structure still an open business
  item). Slide-over uses native `<dialog>` for focus-trap/Esc.
- **2026-09-25** — Left out on purpose for now: dietary tags and item
  customizations (no data model; add only if the client needs them), multi-
  photo gallery, favorites heart (step 4). WhatsApp share and all buttons are
  plain Tailwind until the styled components land in step 8a.

- **2026-09-25** — Brand name is now **"Deliciously Yours"** (set in
  `site_settings` by the user). Auth email templates in `supabase/templates/`
  synced to that name to match the Supabase dashboard.

- **2026-09-26** — Favorites: `favorites` table (PK `user_id, menu_item_id`,
  cascades on user/dish delete), RLS own-rows-only select/insert/delete, no
  update grant. Client Zustand store (not persisted) synced to auth via
  `onAuthStateChange`; optimistic toggle with rollback. **A guest tapping ♥ is
  sent to `/login?next=<page>` and the dish is auto-saved after sign-in**
  (pending id in `sessionStorage`). `/favorites` is server-rendered per
  request (session + RLS); the home "Your favourites" row and all hearts are
  client-side so cached pages stay static. Header shows a ♥ link when signed
  in; long brand names truncate on narrow screens.

- **2026-09-26** — Sign-in UI is a **reusable `SignInPanel`**
  (`components/auth/`): Google button + email-code flow, `onSignedIn` callback
  so step 6's checkout can embed it inline without navigating away. Code
  input auto-submits at **6 digits** (assumes Supabase "Email OTP Length" = 6;
  longer codes still work via the button). `/login` skips straight to `next`
  when already signed in.
- **2026-09-26** — Google OAuth uses Supabase's PKCE flow with a server
  `/auth/callback` route; `next` goes through `safeNextPath` (open-redirect
  attempt `//evil.com` verified collapsing to `/`). Every app origin used for
  sign-in (localhost, LAN IP, later Netlify URL) must be in Supabase Auth →
  URL Configuration → Redirect URLs.
- **2026-09-26** — **Cart "merge on login" is a no-op by design**: the cart
  lives in `localStorage` and survives sign-in unchanged; there's no
  server-side cart in the data model to merge into.
- **2026-09-26** — **Sign-out is this-device-only** (`scope: "local"`) and
  runs in the browser so client state (header, hearts) updates instantly.
  Header shows ♥ + account icon when signed in; Sign out moved to `/account`.
- **2026-09-26** — **Minimal `/account` pulled into step 5**: edit name,
  phone (lenient NG format check), default address — used to pre-fill
  checkout (step 6) and for reviewer first names. Staff see a dashboard link.
  Order history (step 8) and referrals (step 9) join later.

---

## Open Blockers

- Real Terms & Conditions and Privacy Policy copy needs client/legal
  sign-off before launch — dev can seed the admin editor with a generic
  draft in the meantime (see `docs/pages-referrals-footer.md` §3).
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
- **2026-09-24** — Supabase project set up by user (Data API on, auto-expose
  off, auto-RLS on); added explicit grants to the core migration. Hosting →
  Netlify. Image storage switched Cloudinary → Supabase Storage (new bucket
  migration, upload field, URL checks, cleanup, docs). Verified live: core
  migration applied, anon RLS behaves correctly; storage migration not yet run.
  Build + lint + tsc clean.
- **2026-09-24** — Brevo account + custom SMTP configured for Supabase Auth;
  branded OTP email templates added (`supabase/templates/`) and confirmed
  sending a code (not a link).
- **2026-09-24** — User verified Build Order 0–1 end-to-end (admin sign-in,
  menu + category CRUD, photo/logo uploads, branding colors, validation).
  Storage migration applied. Steps 0, 1, 12 (bar chef photo) ticked.
- **2026-09-25** — Built steps 2 + 3: storefront layout/header, hero,
  home categories + popular row, menu browser (filter/search), dish page
  (quantity, WhatsApp share, reviews), Zustand cart + slide-over + `/cart`;
  `featured_order` + `menu_item_reviews()` migration; admin Hero position
  field. Build/lint/tsc clean; smoke-tested pages against live DB (menu
  currently has no dishes, so cards/hero/cart await user verification).
- **2026-09-25** — User ran the storefront migration and verified steps 2 + 3
  (hero, menu, dish page, cart incl. price/availability refresh). Updated
  Supabase email templates to "Deliciously Yours"; repo copies synced.
- **2026-09-26** — Committed/pushed steps 2–3 (`b969329`). Built step 4
  Favorites: migration, store + sync, HeartButton (cards, dish page),
  `/favorites`, home favourites row, header link. Build/lint/tsc clean;
  signed-out smoke test OK (redirect, hearts render). Migration not yet run.
- **2026-09-26** — Committed/pushed step 4 (`f66f541`). Built step 5 Auth:
  reusable `SignInPanel` (Google + email code), `/auth/callback`, redesigned
  `/login`, minimal `/account` profile page, header account icon, local
  client-side sign-out. Build/lint/tsc clean; smoke-tested (login render,
  account redirect, callback error path, open-redirect blocked).
- **2026-09-26** — User configured Google OAuth (Google Cloud client +
  Supabase provider + redirect URLs) and verified steps 4 + 5 end-to-end.
