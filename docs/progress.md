# Plateful — Progress Log

> **This file is the source of truth for "where are we right now."**
> Claude (in VS Code / Claude Code) must read this file at the start of every
> session, and update it at the end of every session or completed feature —
> see `CLAUDE.md` §9 for the exact workflow.

Last updated: 2026-09-25
Current phase: **Steps 0–7 verified live; 8, 9, 10 + UI changes live (awaiting user verification). Step 11 live (awaiting user verification). Next: step 13 polish.**

Live site: **https://deliciously-yours.netlify.app** (Netlify, auto-deploys
from `main`; Paystack in **test** mode).

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
- [ ] Review-aggregate trigger (keeps `menu_items.avg_rating`/`review_count` in sync) — *rewritten 2026-09-25 (visible reviews only, recomputes on edits/hide) in `20261005000000_reviews.sql` — migration applied, live — awaiting user verification*
- [ ] Review writing (buyers only) + admin Reviews (hide/show) — *built 2026-09-25 — migration applied, live — awaiting user verification*
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
- [x] Sign-in gate at checkout (account required — no guest checkout) — *verified live 2026-09-28 (order #1001)*
- [x] Checkout form — *verified live 2026-09-28 (order #1001); pickup / free-delivery / retry paths not yet exercised*
- [x] Server-side order creation with server-computed prices — *verified live 2026-09-28 (order #1001): subtotal = Σ line totals, ₦1,500 fee applied under threshold*
- [ ] Referral bonus / loyalty points redemption applied server-side (combined, capped at ₦0) — *both halves built (steps 9 + 10), awaiting verification*
- [x] Paystack initialize + redirect/inline — *verified live 2026-09-28 (order #1001) (hosted redirect, test card); ₦0 skip lands with rewards in steps 9/10*
- [x] Webhook handler + signature verification — *verified live 2026-09-28 (order #1001): forged → 401; real `charge.success` confirmed in Netlify function logs by user*
- [x] Return-URL verify fallback — *verified live 2026-09-28 (order #1001) (thank-you page, cart cleared)*
- [x] Idempotent "mark paid" logic — *verified live 2026-09-28 (order #1001): single paid transition, one email pair*
- [ ] `order_status_history` table + writes on each status transition — *create + paid verified live; staff/customer transitions built 2026-09-29, migrations applied, awaiting user verification on live*

### 7. Brevo transactional emails
- [x] Order confirmation (customer) — include loyalty points earned — *verified live 2026-09-28 (order #1001)* (points block hidden until step 10)
- [x] New order notification (vendor) — *verified live 2026-09-28 (order #1001)*
- [ ] Status update emails (phase 2, optional for MVP) — *skipped for now (optional per docs)*

### 8. Order tracking + admin order management
- [ ] `/orders/[orderId]` status timeline (per `docs/ui-components-and-styling.md` §1) — *live; delivery path verified 2026-09-29 (#68P3H → delivered). Pickup wording, customer cancel, Buy again not yet exercised*
- [ ] Admin orders view (realtime subscription) — *live; staff transitions verified 2026-09-29 (#68P3H paid → … → delivered). New-order banner, customer-cancel banner, refund tracking not yet exercised (needs a new order)*

### 8a. UI component library
- [ ] `styled-components` added, scoped to `/components/ui/` — *built 2026-09-29, awaiting user verification* (v6 + SSR registry `lib/styled-registry.tsx`, `compiler.styledComponents`; server-rendered styles verified)
- [ ] `WhatsAppButton` (order support contact) — *built 2026-09-29, awaiting user verification* (from button-1; needs whatsapp_number migration + number in admin)
- [ ] `ShareButtonCluster` (trimmed to relevant platforms) — *built 2026-09-29, awaiting user verification* (WhatsApp, X, Facebook, Copy link on dish pages)
- [ ] `LiquidButton` (primary CTA — Pay/Add to Cart) — *built 2026-09-29, awaiting user verification* (implemented as `CtaButton` from button-2)
- [ ] `UploadButton` (admin image uploads via Supabase Storage, wired to real upload state) — *built 2026-09-29, awaiting user verification* (no snippet supplied; built from description)

### 9. Referral program
- [ ] `referrals`, `referral_ledger` tables + RLS — *built 2026-09-25, migration applied, live — awaiting user verification*
- [ ] `profiles` referral columns (`referral_code`, `referred_by`, `referral_balance`, `referral_earned_total`) — *built 2026-09-25, migration applied, live — awaiting user verification*
- [ ] `site_settings.referral_bonus_amount` (admin-editable) — *built 2026-09-25, migration applied, live — awaiting user verification* (/admin/settings → Referrals)
- [ ] Referral code generation on signup + `ref` cookie capture + pending referral creation — *built 2026-09-25, migration applied, live — awaiting user verification*
- [ ] Referral completion logic on first **delivered** order (credit ledger + cached balance) — *built 2026-09-25, migration applied, live — awaiting user verification* (client: delivered, not paid)
- [ ] Checkout redemption (apply balance, server-validated, transactional) — *built 2026-09-25, migration applied, live — awaiting user verification*
- [ ] Refund-on-abandon logic hooked into stale-order cleanup — *built 2026-09-25, migration applied, live — awaiting user verification* (also on customer/restaurant cancel)
- [ ] `/account/referrals` page — 3 stat cards + shareable link — *built 2026-09-25, migration applied, live — awaiting user verification*

### 10. Loyalty points program
- [ ] `loyalty_ledger` table + RLS — *built 2026-09-25, migration applied, live — awaiting user verification*
- [ ] `profiles` loyalty columns (`loyalty_points_balance`, `loyalty_points_earned_total`) — *built 2026-09-25, migration applied, live — awaiting user verification*
- [ ] `site_settings.loyalty_enabled`, `loyalty_points_per_1000` (admin-editable) — *built 2026-09-25, migration applied, live — awaiting user verification*
- [ ] Earning logic on **delivered** transition (10 pts / ₦1,000 net spend) — *built 2026-09-25, migration applied, live — awaiting user verification* (client: delivered, not paid)
- [ ] Checkout redemption combined with referral bonus (capped at ₦0 total) — *built 2026-09-25, migration applied, live — awaiting user verification*
- [ ] Refund-on-abandon logic (shared cleanup pass with referral bonus) — *built 2026-09-25, migration applied, live — awaiting user verification*
- [ ] Admin toggle UI in `/admin/settings` — *built 2026-09-25, migration applied, live — awaiting user verification*

### 11. Static pages & Footer
- [ ] `pages` table (`about`/`terms`/`privacy`) + admin content editor (`/admin/pages`) — *built 2026-09-25, migration applied, live — awaiting user verification*
- [ ] `/about` (chef page) — *built 2026-09-25, migration applied, live — awaiting user verification*
- [ ] `/terms`, `/privacy` — *built 2026-09-25, migration applied, live — awaiting user verification*
- [ ] Site-wide `Footer` component in the storefront layout + admin "Contact & footer" settings — *built 2026-09-25, migration applied, live — awaiting user verification*
- [ ] Real Terms/Privacy copy approved by client (not shipped as placeholder text)

### 12. Image uploads (Supabase Storage)
- [x] `images` bucket + Storage RLS (`supabase/migrations/20260924000000_storage_images.sql`) — *verified 2026-09-24*
- [x] Menu item photo upload — *verified 2026-09-24*
- [x] Logo upload (admin branding settings) — *verified 2026-09-24*
- [ ] Chef photo upload (`/admin/pages/about`) — *built 2026-09-25, migration applied, live — awaiting user verification*

### 13. Polish
- [ ] Animations / transitions (reduced-motion respected) — page fade-in on every storefront page (`template.tsx`) — *done 2026-09-25, live — awaiting user verification*
- [ ] Empty states, error states — empty states already covered; added branded 404s, storefront error screen, root error fallback, loading skeletons (dashboard, checkout, admin) — *done 2026-09-25, live — awaiting user verification*
- [ ] Accessibility pass (labels, contrast, keyboard nav) — visible focus ring site-wide, skip-to-content links, grey text raised to AA contrast; icon buttons already labelled — *done 2026-09-25, live — awaiting user verification*
- [x] Security headers, RLS audit pass before launch — headers + CSP in `next.config.ts`; RLS on all 13 tables; signed-out probe: private tables/writes/RPCs all refused — *verified 2026-09-25 (DB probe + local prod server)*
- [ ] Mobile-responsiveness pass across every page, admin included — code scan: all grids mobile-first; menu cards now vertical on phones — *done 2026-09-25, live — awaiting user verification* (visual check on phone)

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
- **2026-09-25** — **Menu cards on mobile are single-column** full-width
  cards; 2/3/4-column grid from `sm`/`lg`/`xl`. *(Superseded 2026-09-25 by
  the client: cards are vertical at every size — photo on top, details below;
  the horizontal photo-left mobile variant is gone.)*
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

- **2026-09-27** — Fulfillment: **delivery and pickup** (checkout toggle;
  address required only for delivery; pickup orders skip "Out for delivery"
  in step 8's timeline).
- **2026-09-27** — Delivery fee: **flat fee + free above a threshold**, both
  admin-editable (`site_settings.delivery_fee` default ₦1,500,
  `free_delivery_threshold` default ₦15,000, blank = no threshold) in the new
  `/admin/settings` Delivery section. Closes the "delivery fee structure" open
  item in `branding-security-auth.md` §4 (zones could come later).
- **2026-09-27** — Paystack **redirect (hosted checkout)**, not Inline.
  Paystack signs webhooks with the **secret key** — there is no separate
  webhook secret, so `PAYSTACK_WEBHOOK_SECRET` and the unused
  `PAYSTACK_PUBLIC_KEY` were dropped from env/docs.
- **2026-09-27** — Order writes go only through **security-definer SQL
  functions**; clients have no insert/update grants on orders.
  `create_order()` (signed-in users) re-prices from `menu_items`, rejects
  sold-out/missing dishes, applies the delivery rule, snapshots line
  name/price into `order_items`, and logs history — all in one transaction.
  `mark_order_paid()` is **service-role only**, locks the row, checks the
  paid amount, and only does `pending_payment → paid` (repeat calls return
  `newly_paid = false`, which step 7 uses to avoid double emails). Both the
  webhook and `/checkout/verify` call it via `settlePayment()`, which always
  re-verifies with Paystack's API rather than trusting the browser or webhook
  body.
- **2026-09-27** — `order_items.menu_item_id` is `on delete set null` with
  name/price snapshots, so admins can still hard-delete dishes without
  breaking order history (supersedes the earlier "switch to soft-delete" note).
- **2026-09-27** — Orders get a friendly **`order_number`** (identity from
  1001) for receipts. Each payment attempt uses a fresh single-use Paystack
  reference (`renew_payment_reference()` for "Try payment again").
- **2026-09-27** — Checkout's Terms/Privacy links point at `/terms` and
  `/privacy`, which 404 until step 11.

- **2026-09-28** — Order emails use **Brevo dashboard templates** (HTML kept
  in `brevo/templates/`, IDs in `BREVO_TEMPLATE_ORDER_CONFIRMATION` /
  `BREVO_TEMPLATE_NEW_ORDER`). Sent from `settlePayment()` **only when
  `mark_order_paid` reports `newly_paid`**, via Next `after()` so sending never
  delays/breaks checkout; failures are logged, not retried (a resend tool can
  use the new `orders.confirmation_emailed_at` / `vendor_emailed_at`). Money
  is pre-formatted server-side; brand name is a param (rename-proof).
  `order_url`/`admin_url` point at `/account` and `/admin` until step 8 adds
  the tracking/orders pages. Brevo parses template tags inside HTML comments —
  never put bare `{% … %}` in template comments.
- **2026-09-28** — New-order alert recipient is admin-editable
  (`site_settings.order_notification_email`), falling back to
  `BREVO_SENDER_EMAIL`. Optional `SITE_URL` env overrides the request origin
  for absolute links (Paystack callback, email buttons) — set it on Netlify
  once there's a custom domain.

- **2026-09-28** — Deploying to Netlify now (ahead of the build-order's
  polish phase) so the Paystack webhook has a public URL. Node pinned to 22 LTS
  via `.nvmrc` (+ `engines >=20.9.0`, Next 16's minimum). Deploy steps in
  `README.md`.

- **2026-09-29** — **Cancellation & refund policy** (client rule):
  customers may cancel a paid order **within 30 minutes of payment**, and only
  while it is still "Confirmed" (before the kitchen starts preparing) — full
  refund. After that: no customer cancellation, no refund. The restaurant can
  always cancel (paid/preparing) if it can't fulfil, with a full refund.
  Window runs from `paid_at` (not checkout start) so a late-paid retry still
  gets 30 min. Enforced in SQL (`cancel_my_order()`), not just UI. Refunds are
  manual in Paystack; `orders.cancelled_by` / `cancelled_at` / `refunded_at`
  + a staff **"Mark refunded"** button track them ("Refund due" badge until
  then). Terms clause text is in `docs/pages-referrals-footer.md` §3 and must
  ship with the step-11 Terms page.
- **2026-09-29** — **No countdown / no announcement** of the cancel window
  (client: don't nudge customers to cancel). The customer sees only a quiet
  "Cancel order" link on the order page while it's allowed; it disappears
  silently when the window closes.
- **2026-09-29** — Staff status changes are **forward-only** via
  `set_order_status()` (staff-only, validated transitions, logged with
  `changed_by`): paid → preparing → ready → out_for_delivery (delivery only)
  → delivered; cancel from paid/preparing. No "undo" — keeps the customer's
  timeline honest. Realtime enabled on `orders` (RLS-scoped); admin board
  banners new paid orders and customer cancellations ("don't prepare").
- **2026-09-29** — Order emails' buttons now point at `/orders/<id>`
  (customer) and `/admin/orders` (restaurant); `/admin` lands on Orders.
  Status-update emails remain phase 2.
- **2026-09-29** — Header cart icon changed from a bag outline (read as a bin)
  to a shopping-cart outline (client feedback).

- **2026-09-29** — **Order codes**: customers/staff see a 5-character
  uppercase alphanumeric code (e.g. `K7Q2M`) instead of a number. Alphabet
  excludes look-alikes (0/O, 1/I/L) for phone read-outs; unique; generated by
  a BEFORE INSERT trigger (`new_order_code()`), existing orders backfilled.
  `order_number` stays as an internal sequence (not displayed). Brevo
  templates keep `{{ params.order_number }}`, which now carries the code.
- **2026-09-29** — **No emoji / decorative symbols in the UI** (client):
  delivery options, admin badges, banners and address lines are text-only;
  dishes without a photo show a plain lavender tile. Kept functional marks
  from the spec: timeline ✓ circles, ★ ratings, "× qty", cart-panel close ×.
  Email templates still contain a few emoji — pending client decision.

- **2026-09-29** — Netlify free plan blocked push-triggered builds
  ("Unrecognized Git contributor": commit author `writehenschel@gmail.com`
  isn't a verified member of the Netlify team; free plan only builds private
  repos from team members, and never org-owned private repos). **Repo made
  public for the build phase** (full history scanned 2026-09-29: no secrets
  ever committed). ⚠️ **Making it private again will block auto-deploys** —
  then either align the Netlify owner with the commit author (personal-owned
  repo only), upgrade to Pro, or deploy manually via Netlify CLI.

- **2026-09-29** — Step 8a: client supplied three snippets (saved verbatim
  in `docs/ui-snippets/`). Agreed mapping: button-1 → `WhatsAppButton`,
  button-2 → `CtaButton` (the "LiquidButton" CTA role), share-cluster →
  `ShareButtonCluster` (WhatsApp, X, Facebook, Copy link); `UploadButton`
  built from the description (no snippet). WhatsApp number is an admin
  setting (`site_settings.whatsapp_number`, digits only; local 0803… input
  normalised to 234…); button hidden until set. Dish page uses the share
  cluster; order pages don't (private — links would 404 for others).
  styled-components stays confined to `/components/ui/`.

- **2026-09-25** — **Button radius = 12px** (client), one token:
  `--btn-radius` in `globals.css` (`:root`), exposed to Tailwind as
  `rounded-btn` and used by the styled `/components/ui` buttons. Applies to
  every button, link-button, filter chip, tab and the quantity stepper; small
  tags/badges stay pill-shaped (`rounded-full`), circles stay round. Change
  the whole site's button shape by editing that one value.
- **2026-09-25** — **Dashboard side navigation** (client request): shared
  `components/layout/side-nav.tsx` — sticky sidebar at `lg+`, and below that
  a "Menu" button that opens a left slide-in drawer (native `<dialog>`: focus
  trap, Esc, backdrop tap, auto-close on navigation). **Admin**: dark Velvet
  sidebar (Orders, Menu, Settings; name, View site, Sign out) replaces the
  top bar. **Customer**: light sidebar (Overview, Orders, Favourites, Staff
  dashboard for staff; Sign out; Referrals slot for step 9) via a new
  `app/(storefront)/(dashboard)/` route group holding `account/`,
  `favorites/`, `orders/` — URLs unchanged. Removed now-redundant account
  link tiles / page sign-out button / "← Your account" link.

- **2026-09-25** — **Referral credit on first DELIVERED order** (client
  choice) instead of on payment — cancellable paid orders can't be gamed.
  Other step-9 rules (eligibility, cookie, refunds, ₦0 orders) are recorded
  in `docs/pages-referrals-footer.md` §5 "As built".
- **2026-09-25** — **Fixed latent bug**: the profile guard trigger keyed on
  the JWT role, so it would silently revert balance changes made inside
  trusted security-definer functions (where the JWT still says
  "authenticated"). It now keys on the database role (`current_user`), and
  also guards the referral columns.
- **2026-09-25** — `create_order()` gained `p_apply_referral` and returns
  `order_code` + `status`; the step-6 signature was dropped and recreated.

- **2026-09-25** — **Customer dashboard home = Orders** (client): no
  overview page; header account icon opens `/account/orders`; side menu order
  is Orders, Favourites, Refer & earn, Account. `/account` is now the
  **Account** settings page with "Your details" and "Delivery address"
  sections (one save).
- **2026-09-25** — **Admin Overview** at `/admin` (admin home, first in the
  side menu): Today / This week / This month cards with revenue + orders
  processed and growth vs the SAME elapsed point of the previous period;
  plus Active orders, Refunds due, Average order (month). "Processed" =
  paid → delivered (not cancelled/unpaid); revenue = order total (after
  referral bonus). Lagos time (fixed UTC+1), weeks start Monday. Computed in
  `lib/admin/stats.ts` from the staff session — no migration.

- **2026-09-25** — **Card "ambience bar"** (client): 4px Velvet accent down
  the left edge of info/dashboard cards via Tailwind utilities `card-accent`
  (Velvet) / `card-accent-light` (Lavender, for dark cards) in `globals.css`;
  the sign-in card uses `card-accent-bottom` (bar along the bottom, client).
  Not on dish cards or the hero glass card. New info cards should use it.
- **2026-09-25** — **"Menu" page renamed "Food Menu"** (header link, page
  titles, breadcrumb, admin side menu) — avoids confusion with the mobile
  drawer's "Menu" button. Header hides the brand name below `sm` (logo
  only; a home icon if no logo). Customer "Staff dashboard" link → `/admin`
  (Overview is the admin default).

- **2026-09-25** — **Loyalty points earned on DELIVERY** (client choice,
  consistent with referrals). Details in
  `docs/accounts-loyalty-and-images.md` §2 "As built". `create_order()`
  gained `p_apply_loyalty` (8-arg signature; 7-arg dropped).

- **2026-09-25** — **Step 11 pages/footer as built.** Page text is edited
  on its own admin page, **Admin → Pages** (`/admin/pages/[slug]`), not
  a Settings tab — the Markdown editor is too big for Settings. Content is
  Markdown rendered with `react-markdown` (no raw HTML). `{brand}` in a
  title/body is replaced with `site_settings.brand_name` when rendered.
  `pages.is_draft` shows a "being reviewed" notice; Terms/Privacy are
  seeded as drafts. Legal copy names no vendors ("payment processor",
  "email service provider", etc. — client). About text is the client's own
  story, signed by Chef Onome Joy Ebubechukwu. Footer data (tagline,
  opening hours, location, phone, email, Instagram/TikTok/Facebook/X links)
  lives on `site_settings`, edited in Settings → **Contact & footer**
  (with the WhatsApp number); blank fields are hidden. Pages are ISR (1h),
  revalidated on save. Migration `20261004000000_pages_footer.sql`.

- **2026-09-25** — **Security headers + CSP** (step 13) in `next.config.ts`,
  production only. CSP allows self + the Supabase origin (https/wss/img);
  Paystack/Google are top-level redirects so need no entry (form-action
  also allows checkout.paystack.com as a precaution). Uses
  `'unsafe-inline'` for scripts/styles — a nonce CSP would make every page
  dynamic and drop static caching. **If you add any third-party script,
  font, image host or API, add it to the CSP or it will be blocked.**
- **2026-09-25** — Text contrast floor: body grey text is at least
  `text-neutral-dark/65` (≈5:1 on cream); lighter greys only for decorative
  or disabled content. Public `reviews` table read stays open by design
  (only ids/ratings/comments; names come via `menu_item_reviews()`).
- **2026-09-25** — **Reviews (open decision closed, client):** only real
  buyers review — the customer must have an order containing the dish that
  reached `delivered`. Reviews show immediately; staff can hide any in
  **Admin → Reviews** (hidden = off the site and out of the star average).
  One review per customer per dish; re-submitting edits it. All writes via
  `submit_review()` / `set_review_hidden()` (security definer); customers
  still have no direct write rights on `reviews`. Dish page always shows a
  Reviews section ("No reviews yet" when empty) but it is **read-only** —
  reviews are written only from the customer dashboard, **Account →
  Reviews** (`/account/reviews`): "Waiting for your review" (dishes from
  delivered orders, newest first, not yet reviewed) + "Your reviews"
  (edit). Delivered order pages show a "How was your food?" card linking
  there. Menu cards still show stars only once a dish has reviews.
  (`my_review_status()` in the migration is now unused — harmless.) Dish
  page: description moved below the cart/save/share buttons (client).

---

## Open Blockers

- **Brevo template wording** (user): in the Order confirmation template,
  change the points line to "You'll earn {{ params.points_earned }} loyalty
  points when this order is delivered." (repo copy already updated).
- **Still to verify on live** (user): 8a buttons; step-8 flows not yet
  exercised (new order code, customer cancel, refund tracking, pickup);
  today's radius + side-nav changes.
- **Before re-privatising the GitHub repo**: pick a deploy path (see
  2026-09-29 Netlify decision) or deploys silently stop.
- Terms & Conditions and Privacy Policy are seeded as **drafts** — need
  client/legal sign-off, then untick "Draft" in Admin → Pages.
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
- **2026-09-27** — Committed/pushed step 5 (`c54785e`). Built step 6:
  orders/order_items/order_status_history + `create_order` /
  `renew_payment_reference` / `mark_order_paid` migration, Paystack helpers
  (initialize, verify, timing-safe webhook signature), `/checkout` (inline
  sign-in, delivery/pickup, fee rule), `/checkout/verify` (settle + confirm +
  retry), webhook route, admin Delivery settings, cart Checkout button live.
  Build/lint/tsc clean; forged-signature webhook → 401 verified.
- **2026-09-27** — User applied checkout migration + Paystack test key; no test
  order placed yet (orders table empty), so step 6 stays unverified.
  Proceeding to step 7; a single test order will verify both.
- **2026-09-28** — Committed/pushed step 6 (`bed3260`). Built step 7:
  email-tracking migration, Brevo helper, `notifyOrderPaid()` (customer
  receipt + restaurant alert) fired via `after()` on newly-paid orders,
  admin Notifications setting, two branded Brevo templates. Brevo key +
  sender verified live (read-only API check). Build/lint/tsc clean.
- **2026-09-28** — User finished Brevo template setup (IDs set, email
  migration applied; no orders yet). Pinned Node 22, added Netlify deploy
  guide to README; committing step 7 ahead of first Netlify deploy.
- **2026-09-28** — First Netlify deploy succeeded. New projects defaulted to
  restricted visitor access ("This site is private"); user set Visitor access
  to public. README deploy steps updated.
- **2026-09-28** — Live URL confirmed: https://deliciously-yours.netlify.app.
  Live smoke test passed: pages + dish page 200, Supabase Storage images via
  Netlify Image CDN 200, signed-out /admin /favorites /account
  /checkout/verify → /login, open-redirect blocked, webhook forged signature
  → 401 (GET → 405). Dashboards to point at the live URL: Netlify `SITE_URL`,
  Supabase Site URL + Redirect URLs, Paystack test webhook/callback (user).
- **2026-09-28** — User pointed Netlify `SITE_URL`, Supabase URLs, Paystack
  test webhook/callback at the live site and placed live order #1001: paid,
  server-priced (₦3,400 + ₦1,500 delivery = ₦4,900), history
  pending_payment → paid, receipt + restaurant alert both sent. Steps 6 + 7
  ticked.
- **2026-09-29** — Built step 8: `set_order_status` / `cancel_my_order` /
  `mark_order_refunded` + Realtime migration, customer tracking timeline
  (`/orders/[id]`), order history (`/account/orders`), admin orders board
  (`/admin/orders`), cancellation/refund policy per client, email links to the
  new pages, new cart icon. Build/lint/tsc clean; signed-out smoke test OK.
- **2026-09-29** — Client changes: order codes (5-char alphanumeric,
  migration `20260930000000_order_codes.sql`) replace visible order numbers;
  removed emoji/symbol decorations from the UI. Build/lint/tsc clean.
- **2026-09-29** — Both step-8 migrations applied (order codes backfilled:
  existing order → `68P3H`). Pushed step 8 to `main` → Netlify deploy.
- **2026-09-29** — Found Netlify blocking push builds (unrecognized Git
  contributor); user made the repo public. Pushing to trigger the step-8
  deploy.
- **2026-09-29** — Step 8 deployed; #68P3H walked through to delivered on
  live (staff transitions + timeline OK). Step 8a started: original button
  snippets missing from repo, user to paste them.
- **2026-09-29** — Built step 8a: styled-components + SSR registry,
  `CtaButton` (Add to cart / Order now / Pay), `WhatsAppButton` (order page,
  admin-set number), `ShareButtonCluster` (dish page), `UploadButton` (admin
  uploads, real progress), Contact settings + migration. Build/lint/tsc clean;
  SSR styles + share targets verified locally.
- **2026-09-29** — WhatsApp-number migration applied; pushed step 8a for live
  testing.
- **2026-09-29** — Session paused: step 8a pushed (`ed91516`), Netlify
  deploy slow/unconfirmed at shutdown. Working tree clean.
- **2026-09-29** — Step 8a confirmed live by user (new buttons visible).
  Feedback: buttons too rounded — adjust next session.
- **2026-09-25** — Client adjustments: 12px button radius token applied
  site-wide (46 buttons/chips/tabs); side-nav + mobile drawer for admin and
  customer dashboards (new `(dashboard)` route group). Build/lint/tsc clean.
- **2026-09-25** — Built step 9 referrals: migration (codes, referrals,
  ledger, claim/credit/refund/expiry, new create_order, profile-guard fix),
  ?ref cookie capture + claim after sign-in, checkout bonus toggle + ₦0
  orders, /account/referrals (link, share, 3 cards), admin bonus setting,
  side-menu entry. Build/lint/tsc clean. Not pushed until migration runs.
- **2026-09-25** — Referrals migration applied (verified); step 9 pushed live.
- **2026-09-25** — Client changes while testing step 9: customer dashboard
  defaults to Orders, Overview renamed Account (details + delivery address
  sections); new admin Overview with revenue/orders growth cards. Pushed live.
- **2026-09-25** — Client UI changes: left accent bar on 29 info cards,
  "Food Menu" naming, logo-only mobile header, staff link → admin Overview.
  Pushed live.
- **2026-09-25** — Built step 10 loyalty: migration (ledger, columns,
  award-on-delivery, refunds, new create_order, guard), checkout points
  toggle (after referral bonus), points on receipts/order page/email,
  points card on Orders home, admin Loyalty settings. Build/lint/tsc clean.
  Not pushed until migration runs.
- **2026-09-25** — Loyalty migration applied (verified); sign-in card accent moved to the bottom; pushed step 10 live.
- **2026-09-25** — Loyalty points card on Orders home trimmed to just the available points (client).
- **2026-09-25** — Built step 11: pages table + seeded About (client story)/Terms/Privacy drafts, /about /terms /privacy, site-wide footer, Settings → Contact & footer, Admin → Pages editor with chef photo. Build/lint/tsc clean. Not pushed until migration runs.
- **2026-09-25** — Pages/footer migration applied (verified: 3 pages seeded, footer settings set); pushed step 11 live.
- **2026-09-25** — About title split: small "Meet Chef" line over the chef's name in large type (client). Pushed live.
- **2026-09-25** — Menu cards: photo on top, details below on mobile too (client; was photo-left). Pushed live.
- **2026-09-25** — Step 13 polish: 404/error/loading screens, page fade-in, focus ring + skip links, contrast raise, security headers/CSP, RLS probe (all refused). Build/lint/tsc clean; pushed live.
- **2026-09-25** — Built reviews (buyers only, instant, staff hide) + dish page description moved below buttons. Build/lint/tsc clean. Not pushed until migration runs.
- **2026-09-25** — Reviews moved to the customer dashboard (Account → Reviews: pending + posted); dish page shows posted reviews only (client).
- **2026-09-25** — Reviews migration applied (verified: columns + functions, anon writes refused); pushed reviews live.
- **2026-09-25** — Dish page: divider lines between Save/Share and About this dish, and between About and Reviews (client). Pushed live.
- **2026-09-25** — Hero rebuilt after the client's reference video (light frosted card, spinning plate, roll-out/swing-in swap, lifted thumbnail with price tag). See `docs/hero-section-design.md` §8. Pushed live.
