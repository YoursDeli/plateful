# Branding, Authentication & Security Decisions

> Status: **Locked for build purposes.** Branding is placeholder and editable
> by the admin later; auth and security choices below are final for MVP unless
> revisited explicitly.

## 1. Branding

**Name:** "Plateful" — placeholder. Not hardcoded anywhere in the UI; it is
stored data so the admin can rename the site without a redeploy or code change.

**Add to the data model** (`docs/site-sections-and-features.md` / core schema):

```
site_settings (singleton row, or keyed by a fixed id = 1)
  - id
  - brand_name          text, default 'Plateful'
  - logo_url            text, nullable
  - primary_color       text, hex, default below
  - accent_color        text, hex, default below
  - updated_at
```

- Fetched server-side (cached / revalidated) and used to render the brand
  mark in the header, hero `BrandMark`, email templates (via Brevo template
  params), and page `<title>` / metadata.
- Admin dashboard gets a "Branding" settings page: edit name, upload logo,
  pick colors. Logo upload goes through Supabase Storage like menu item
  photos.
- Only one row ever exists — enforce with a check constraint or just always
  upsert `id = 1`.

**Palette & type** (client-provided color pair; still swap via `site_settings`,
not by editing components, so the admin can adjust later):

| Token | Value | Use |
|---|---|---|
| `primary` | `#D3C5F6` ("Lavender") | primary buttons, highlights, active selector states |
| `secondary` | `#3B2A60` ("Velvet") | secondary buttons, header/footer backgrounds, dark glass card fill |
| `neutral-dark` | `#1A1A1A` | body text |
| `neutral-light` | `#FBF8F3` (warm off-white) | page background |
| Font — display | `Fraunces` or `Playfair Display` (serif, food-editorial feel) | H1/hero item name |
| Font — body | `Inter` | everything else |

Button convention: **primary** buttons (Lavender fill, Velvet text) for the
main action on a screen (Add to Cart, Pay with Paystack, Checkout);
**secondary** buttons (Velvet fill, Lavender or white text, or Velvet
outline) for secondary actions (Buy Again, Cancel, Back). See
`docs/ui-components-and-styling.md` for the concrete button components built
on this pair.

Wire these as Tailwind theme tokens (`tailwind.config.ts` `colors.primary`,
`colors.accent`, etc.) sourced from `site_settings` at build/runtime rather
than hardcoded hexes scattered through components, so an admin color change
only requires updating the one settings row (for a fully dynamic theme,
inject as CSS custom properties from a root layout that reads
`site_settings`).

## 2. Authentication

**Method:** Email OTP + Google Sign-In, via Supabase Auth. No password field
anywhere in the UI.

- **Email OTP**: `supabase.auth.signInWithOtp({ email })` → Supabase emails a
  6-digit code (type `email`, not magic-link URL, so it works well on mobile
  where switching apps to click a link is friction). User enters the code,
  client calls `verifyOtp({ email, token, type: 'email' })`.
- **Google Sign-In**: `signInWithOAuth({ provider: 'google' })`. Requires
  Google OAuth client configured in the Supabase Auth provider settings
  (client ID/secret from Google Cloud Console) and the redirect URL
  whitelisted in both Supabase and Google's console.
- Both flows land the user in `profiles` — on first sign-in, a Postgres
  trigger (`handle_new_user`) inserts a `profiles` row keyed to `auth.uid()`
  with `role = 'customer'` by default.
- **Account required at checkout** (supersedes the earlier guest-checkout
  note — see `docs/accounts-loyalty-and-images.md` §1). Browsing the menu
  stays open to signed-out visitors; auth is only enforced at the checkout
  step, needed for order tracking, stats, and the referral/loyalty reward
  programs.
- Session handling: `@supabase/ssr` package for Next.js App Router — cookie-based
  session, refreshed in middleware, so both server components and route
  handlers see the authenticated user without prop-drilling a client-only
  session.

**Admin/vendor access:** same Supabase Auth (same OTP/Google flow — no
separate login system to maintain), gated by a `role` column on `profiles`.

```
profiles
  - id (= auth.uid())
  - full_name
  - phone
  - default_address
  - referral_code (unique)
  - referred_by (nullable, self-ref)
  - referral_balance (cached, default 0)
  - referral_earned_total (cached, default 0)
  - loyalty_points_balance (cached, default 0)
  - loyalty_points_earned_total (cached, default 0)
  - role            text, enum-like: 'customer' | 'staff' | 'admin', default 'customer'
```

- `role` is set manually in the DB (or via a small internal admin-only
  "invite staff" action) — **never settable by the user themselves** through
  any public-facing update. RLS on `profiles` must block `role` changes from
  a user's own session (see §3).
- Next.js middleware protects the `/(admin)` route group: check session +
  fetch `role` from `profiles`, redirect to `/` (or a 403 page) if not
  `staff`/`admin`. Do this server-side in middleware or a layout — never
  rely on hiding admin nav links client-side as the actual gate.

## 3. Security

**Row-Level Security (Supabase/Postgres) — enable on every table, then:**

- `orders`, `order_items`, `favorites`, `profiles`: `select`/`update` scoped
  to `user_id = auth.uid()` (or via the parent order's `user_id` for
  `order_items`) for customers; `staff`/`admin` role gets a broader policy
  (all rows) via a `role`-checking policy or a `security definer` helper
  function (`is_staff()`).
- `profiles.role`: **no** user-scoped `update` policy includes the `role`
  column — either split it into a separate table, or use a Postgres
  `BEFORE UPDATE` trigger that silently preserves the old `role` unless the
  request comes from a service-role/staff context. Apply the same pattern to
  `referral_balance`, `referral_earned_total`, `loyalty_points_balance`, and
  `loyalty_points_earned_total` — these are server-maintained caches, never
  directly writable by the user's own session; all changes go through the
  `referral_ledger`/`loyalty_ledger` write paths in
  `docs/accounts-loyalty-and-images.md` §2.
- `menu_items`, `categories`, `site_settings`: public `select` (storefront
  needs to read them unauthenticated), `insert`/`update`/`delete` restricted
  to `staff`/`admin`.
- `orders.user_id` is now `NOT NULL` — checkout requires an account (see
  `docs/accounts-loyalty-and-images.md` §1), so the standard
  `user_id = auth.uid()` policy covers every order; no guest-order carve-out
  needed.

**Payments:**
- `PAYSTACK_SECRET_KEY` and `PAYSTACK_WEBHOOK_SECRET` are server-only env
  vars, never referenced in any `"use client"` file or exposed API response.
- Webhook handler verifies the `x-paystack-signature` header (HMAC SHA512 of
  the raw body using `PAYSTACK_WEBHOOK_SECRET`) **before** parsing/trusting
  the payload — reject with 401 on mismatch.
- Order totals are always server-computed from `menu_items` at
  order-creation time (already specified in `cart-checkout-payment-workflow.md`
  §3) — this is the main line of defense against price tampering.

**Auth-specific hardening:**
- Rely on Supabase Auth's built-in OTP rate limiting (throttles repeated
  `signInWithOtp` requests per email/IP); don't disable it.
- Add a lightweight client-side cooldown on the "resend code" button (e.g.
  30–60s) so the UI itself doesn't invite hammering the endpoint.
- OTP codes: keep Supabase's default short expiry (do not extend it) and
  treat a code as single-use — Supabase invalidates it after successful
  verification.

**General app security:**
- Validate all form input (checkout, menu CRUD, settings) server-side with
  `zod` schemas, not just client-side — client validation is UX only.
- Image uploads (menu items, logo, chef photo): restrict format and max file
  size at the Cloudinary signed-upload route, not just the `<input accept>`
  attribute — see `docs/accounts-loyalty-and-images.md` §3.
- Standard Next.js security headers (`Content-Security-Policy`,
  `X-Frame-Options`, `Referrer-Policy`) set via `next.config.js` headers or
  middleware.
- Never log full request bodies for the Paystack webhook or auth routes
  (may contain tokens/PII) — log event type + order id/reference only.
- `SUPABASE_SERVICE_ROLE_KEY` used only in trusted server contexts (webhook
  handler, admin bulk actions) — never in any client bundle or edge function
  exposed to the browser.
- Image upload validation (menu photos, logo, chef photo) now goes through
  Cloudinary's signed-upload route — see `docs/accounts-loyalty-and-images.md`
  §3 for the allow-list/size constraints enforced there.

## 4. Open Items (still need client/business input, not blocking build start)

- Real brand name, logo, and final color direction (site ships with the
  placeholder palette above until then).
- Whether Google Sign-In requires a verified Google Cloud OAuth consent
  screen before going live (needed once real users sign in, not for local
  dev).
- Delivery area / fee structure (affects checkout total calc, not auth or
  security).
