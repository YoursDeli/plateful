# Plateful — Food Ordering Website

> Working name. Replace throughout once the client confirms branding.

## 1. Project Overview

A single-restaurant food ordering website: customers browse the menu, build a cart,
pay online, and track their order. The vendor (restaurant) manages menu items and
incoming orders from an admin dashboard.

This is **not** a multi-vendor marketplace — one restaurant, one menu, one storefront.
If that changes later, the data model in `docs/site-sections-and-features.md` will
need revisiting (menu → vendor-scoped, orders → vendor-scoped).

## 2. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 14+ (App Router) | Server components for menu/catalog pages, client components for cart/checkout interactivity |
| Styling | Tailwind CSS + `styled-components` (isolated, for a small set of animated buttons only) | Glassmorphism + smooth transitions (see hero design doc); see `docs/ui-components-and-styling.md` for why `styled-components` is scoped to `/components/ui/` rather than used broadly |
| Database & Auth | Supabase (Postgres) | Row-level security for orders/favorites scoped to `auth.uid()` |
| Payments | Paystack | Checkout via Paystack Inline or Standard redirect; verified server-side |
| Transactional email | Brevo (formerly Sendinblue) | Order confirmations, receipts, status updates |
| Hosting | Vercel (frontend) + Supabase (backend) | |
| Image handling | Cloudinary | Menu item photos, chef photo, brand logo — signed uploads via a server route; see `docs/accounts-loyalty-and-images.md` §3 |

## 3. Folder Structure (proposed)

```
/app
  /(storefront)
    page.tsx                → home / hero + featured
    /menu                   → full menu, category filters
    /menu/[itemId]           → item detail modal or page
    /favorites               → saved items (auth required)
    /cart                    → cart review
    /checkout                → checkout + Paystack handoff
    /orders/[orderId]        → order tracking / receipt
    /account                 → profile, order history
    /account/referrals       → referral stats + link (see docs/pages-referrals-footer.md §5)
    /about                    → chef/about page (see docs/pages-referrals-footer.md §2)
    /terms                    → terms & conditions
    /privacy                  → privacy policy
    /login                     → email OTP / Google sign-in
  /(admin)
    /admin/menu               → CRUD menu items
    /admin/orders              → incoming orders, status updates
    /admin/settings             → branding, referral bonus amount, loyalty toggle/rate, pages content (about/terms/privacy)
  /api
    /paystack/webhook          → Paystack payment verification webhook
    /brevo/send                → transactional email trigger (or call Brevo API directly from server actions)
    /cloudinary/sign            → signed upload params for menu/branding/page images (see docs/accounts-loyalty-and-images.md §3)
/components
  /hero                        → HeroCard, FlavorSelector, etc. (see hero-section-design.md)
  /menu
  /cart
  /checkout
  /ui                          → WhatsAppButton, ShareButtonCluster, LiquidButton, UploadButton (see ui-components-and-styling.md)
  /layout                      → Footer, Header (see pages-referrals-footer.md §4)
/lib
  /supabase                    → client + server helpers
  /paystack                    → init + verify helpers
  /brevo                       → email template senders
  /cloudinary                   → signed-upload helpers (see docs/accounts-loyalty-and-images.md §3)
/docs
  hero-section-design.md
  site-sections-and-features.md
  cart-checkout-payment-workflow.md
  branding-security-auth.md
  ui-components-and-styling.md
  menu-and-product-page.md
  pages-referrals-footer.md
  accounts-loyalty-and-images.md
  progress.md
```

## 4. Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server-only, never exposed to client

PAYSTACK_PUBLIC_KEY=
PAYSTACK_SECRET_KEY=              # server-only
PAYSTACK_WEBHOOK_SECRET=          # used to verify webhook signatures

BREVO_API_KEY=                    # server-only
BREVO_SENDER_EMAIL=

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=            # server-only, used to sign uploads
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=  # safe to expose, used for delivery URLs
```

## 5. Core Data Model (starting point)

- `menu_items` — id, name, description, price, category, image_url, is_available, created_at, compare_at_price (nullable, for discount display), badge (nullable, admin-set), avg_rating (cached), review_count (cached, default 0)
- `categories` — id, name, sort_order
- `favorites` — user_id, menu_item_id
- `reviews` — id, menu_item_id, user_id, rating (1-5), comment (nullable), created_at — see `docs/menu-and-product-page.md` §3
- `orders` — id, user_id (**required** — account needed to checkout, see `docs/accounts-loyalty-and-images.md` §1), status, total, paystack_reference, delivery_address, created_at, referral_bonus_applied (default 0), loyalty_points_earned (default 0), loyalty_points_redeemed (default 0)
- `order_items` — order_id, menu_item_id, quantity, unit_price
- `profiles` — id (= auth.uid()), full_name, phone, default_address, role (`customer` | `staff` | `admin`, default `customer`), referral_code (unique), referred_by (nullable, self-ref), referral_balance (cached, default 0), referral_earned_total (cached, default 0), loyalty_points_balance (cached, default 0), loyalty_points_earned_total (cached, default 0)
- `site_settings` — singleton row (id = 1): brand_name (default `Plateful`), logo_url, primary_color, accent_color, referral_bonus_amount (default 200), loyalty_enabled (default true), loyalty_points_per_1000 (default 10), updated_at — powers editable branding, see `docs/branding-security-auth.md`
- `pages` — id, slug (unique: `about`/`terms`/`privacy`), title, content, chef_photo_url (nullable), updated_at — see `docs/pages-referrals-footer.md` §2–4
- `referrals` — id, referrer_id, referred_user_id (unique), status (`pending`/`completed`), reward_amount, created_at, completed_at — see `docs/pages-referrals-footer.md` §5
- `referral_ledger` — id, user_id, amount, reason (`referral_reward`/`checkout_redemption`/`redemption_refund`), reference_id (nullable), created_at — see `docs/pages-referrals-footer.md` §5
- `loyalty_ledger` — id, user_id, points, reason (`order_earned`/`checkout_redemption`/`redemption_refund`), reference_id (nullable), created_at — see `docs/accounts-loyalty-and-images.md` §2

Order `status` enum: `pending_payment → paid → preparing → ready → out_for_delivery → delivered` (or `cancelled` / `failed` at any pre-`preparing` stage).

## 5a. Branding & Authentication (locked decisions)

Full rationale and RLS/security detail lives in `docs/branding-security-auth.md`.
Summary:

- **Branding**: placeholder name "Plateful", stored in `site_settings` and
  editable from the admin dashboard — never hardcode the brand name in
  components. Default placeholder palette/fonts are specified in that doc;
  wire them as Tailwind theme tokens, not hardcoded hexes.
- **Auth**: Supabase Auth, Email OTP + Google Sign-In only — no password
  field anywhere. Browsing the menu is open to signed-out visitors, but an
  account is required to complete checkout — see
  `docs/accounts-loyalty-and-images.md` §1.
- **Admin access**: same Supabase Auth, gated by `profiles.role`. Protect
  the `/(admin)` route group server-side (middleware/layout), never by
  hiding nav links client-side. `role` must never be updatable by a user's
  own session — see RLS notes in `docs/branding-security-auth.md` §3.

## 6. Coding Conventions

- Server components by default; `"use client"` only where interactivity (cart state, animations, forms) requires it.
- Cart state: client-side (Zustand or React Context) synced to `localStorage` for signed-out browsing, merged into the session on sign-in at checkout (account required to complete checkout — see `docs/accounts-loyalty-and-images.md` §1).
- All Paystack verification happens **server-side** (webhook + a manual verify-on-return fallback) — never trust the client's "payment successful" callback alone.
- All Brevo email sends happen server-side, triggered after Paystack verification succeeds, not on client redirect.
- Money handled in the smallest currency unit (kobo) internally where Paystack is involved; format to Naira only at render time.
- **Every page is mobile-first and mobile-responsive** — admin pages included. Base Tailwind classes target the smallest breakpoint; add complexity at `sm:`/`md:`/`lg:`, not the reverse. Card grids need an explicit stacked mobile layout, not just a shrunk desktop grid. See `docs/pages-referrals-footer.md` §6.
- Referral balance and loyalty point changes (`profiles.referral_balance`, `profiles.loyalty_points_balance`) always go through a `referral_ledger`/`loyalty_ledger` insert in the same transaction — never update either cached balance alone. See `docs/pages-referrals-footer.md` §5 and `docs/accounts-loyalty-and-images.md` §2.
- Image uploads (menu photos, logo, chef photo) always go through the Cloudinary signed-upload route — never an unsigned client-side upload. See `docs/accounts-loyalty-and-images.md` §3.

## 7. Build Order (suggested)

1. Menu data model + admin CRUD (so there's real content to work with)
2. Storefront: hero + menu browse + item detail
3. Cart (client-side only, no payment yet)
4. Favorites (requires auth)
5. Auth (account required for checkout — build this before Checkout, not after)
6. Checkout + Paystack integration
7. Brevo transactional emails
8. Order tracking + admin order management
9. Referral program (data model, signup capture, checkout redemption, `/account/referrals`)
10. Loyalty points program (data model, earn/redeem, admin toggle, checkout UI)
11. Static pages: About/Chef, Terms, Privacy + site-wide Footer
12. Cloudinary image uploads (menu photos, logo, chef photo) — can be built alongside step 1/11 once the signed-upload route exists
13. Polish: animations, empty states, error states, mobile-responsiveness pass on every page

## 8. Related Docs

- `docs/hero-section-design.md` — hero section spec (flavor-swap card pattern)
- `docs/site-sections-and-features.md` — full site map and feature list
- `docs/cart-checkout-payment-workflow.md` — cart, checkout, Paystack, Brevo flow in detail
- `docs/branding-security-auth.md` — branding, authentication, and security decisions
- `docs/ui-components-and-styling.md` — order status page design, color pairing, and reusable button components
- `docs/menu-and-product-page.md` — food menu card design and single product page layout
- `docs/pages-referrals-footer.md` — full page list, About/Terms/Privacy pages, site-wide footer, referral program
- `docs/accounts-loyalty-and-images.md` — account-required checkout, loyalty points program, Cloudinary image storage
- `docs/progress.md` — current build status, checklist, session log (**read this first, every session**)

## 9. Session Workflow (required, every session and every feature)

Before writing any code, for any session or any new feature:

1. **Read `docs/progress.md`** to see what's already done, what's in
   progress, and any open blockers or decisions logged there.
2. **Write a short plan + todo list** for just this session's scope — the
   specific files/functions you expect to touch and the order you'll do it
   in. Keep it visible (a todo list in the response, or a tracked task list)
   so progress within the session is checkable, not just a mental plan.
3. If the plan surfaces a genuine ambiguity that isn't already settled in
   `CLAUDE.md` or the `docs/` files (not a stylistic choice — an actual fork
   that changes behavior, data model, or security), ask before proceeding
   rather than guessing.
4. **Implement**, checking off todo items as they're completed.
5. **Before ending the session**: update `docs/progress.md` —
   - tick any checklist items now genuinely working end-to-end,
   - add a one-line dated entry to the Session Log,
   - record any new decision under "Decisions Made During Build,"
   - add anything left blocked to "Open Blockers."

Never start writing code for a feature without doing step 1–2 first, even
for a change that feels small — the todo list is what keeps `progress.md`
accurate, and `progress.md` is what keeps the next session (or the next
person) from having to re-derive project state from the code.
