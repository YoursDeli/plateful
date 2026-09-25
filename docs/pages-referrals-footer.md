# Site Map, New Pages, Footer & Referral Program

## 1. Full Page Count

**17 pages/routes total** — 14 customer-facing, 3 admin.

| # | Page | Route | Status |
|---|---|---|---|
| 1 | Home | `/` | in `site-sections-and-features.md` §1 |
| 2 | Menu | `/menu` | in `menu-and-product-page.md` §1 |
| 3 | Menu Item Detail | `/menu/[itemId]` | in `menu-and-product-page.md` §2 |
| 4 | Cart | `/cart` (page fallback; primary UX is the slide-over panel) | in `site-sections-and-features.md` §4 |
| 5 | Checkout | `/checkout` | in `cart-checkout-payment-workflow.md` |
| 6 | Order Tracking | `/orders/[orderId]` | in `ui-components-and-styling.md` §1 |
| 7 | Account / Profile | `/account` | in `site-sections-and-features.md` §7 |
| 8 | Order History | `/account/orders` | in `site-sections-and-features.md` §7 |
| 9 | Favorites | `/favorites` | in `site-sections-and-features.md` §3 |
| 10 | Sign in (Email OTP / Google) | `/login` | in `branding-security-auth.md` §2 |
| 11 | **Referrals** | `/account/referrals` | **new — §5 below** |
| 12 | **About / Chef** | `/about` | **new — §2 below** |
| 13 | **Terms & Conditions** | `/terms` | **new — §3 below** |
| 14 | **Privacy Policy** | `/privacy` | **new — §3 below** |
| 15 | Admin Menu Management | `/admin/menu` | in `site-sections-and-features.md` §8 |
| 16 | Admin Orders | `/admin/orders` | in `site-sections-and-features.md` §8 |
| 17 | **Admin Settings** (branding + referral bonus amount) | `/admin/settings` | branding half already in `branding-security-auth.md`; referral half in §5 below |

This count excludes the cart slide-over and share/OTP modals, which aren't
standalone routes.

## 2. About / Chef Page (`/about`)

Content, not just layout, needs to be admin-editable (a chef's bio and
restaurant story is the kind of copy that changes without a redeploy) — add
a generic `pages` table (§4) rather than hardcoding this page's text in a
component.

```
<AboutPage>
  <ChefPhoto src={page.chef_photo_url} />
  <h1>{page.title}</h1>          {/* e.g. "Meet Chef [Name]" */}
  <RichText content={page.content} />   {/* story, philosophy, credentials — admin-edited markdown/rich text */}
</AboutPage>
```

- Admin edits this from `/admin/settings` (a "Pages" tab) — same editor
  pattern as Terms/Privacy below, just a different `pages.slug`.
- Keep it simple for MVP: one photo + rich text block. No team grid, no
  timeline component, unless the client specifically wants one later.

## 3. Terms & Conditions / Privacy Policy (`/terms`, `/privacy`)

Same `pages` table, different slugs (`terms`, `privacy`). Plain long-form
text rendering (headings, paragraphs, lists) — no special layout beyond
readable typography and a "Last updated" date pulled from `pages.updated_at`.

- **Content itself is a legal/business decision, not a coding one** — the
  client (or their counsel) needs to actually supply or approve this text
  before launch. Don't ship placeholder Lorem Ipsum to production; a
  generic Nigerian-consumer-e-commerce template is fine to seed the admin
  editor with for development, clearly marked as a draft.
- **Required clause — Cancellations & refunds** (business rule decided
  2026-09-29, enforced in code by `cancel_my_order()` / `set_order_status()`;
  must appear in the seeded Terms draft and the final approved copy):

  > **Cancellations and refunds.** You may cancel a paid order within 30
  > minutes of payment, as long as we have not started preparing it, using
  > the "Cancel order" option on your order page. Eligible cancellations are
  > refunded in full to your original payment method. After 30 minutes, or
  > once preparation has begun, orders can no longer be cancelled and are
  > non-refundable. If we are unable to fulfil your order, we will cancel it
  > and refund you in full.

  Don't advertise the window elsewhere (no countdowns / checkout banners) —
  the client doesn't want to nudge customers toward cancelling; the button
  simply appears on the order page while it's allowed.
- Both pages link from the footer (§4) on every page, and from the checkout
  screen ("By placing this order you agree to our Terms and Privacy Policy",
  linking both) since that's the point of sale.

## 4. Footer (site-wide, not just Home)

`site-sections-and-features.md` §1 already specced a footer for the home
page ("hours, location/delivery area, contact, socials") — promote that to
a persistent, site-wide component rendered from the root layout, and expand
it with the new pages:

```
<Footer>
  <BrandColumn>{site_settings.brand_name} / logo, one-line tagline</BrandColumn>
  <HoursColumn />          {/* opening hours */}
  <ContactColumn />        {/* location/delivery area, phone, email */}
  <LinksColumn>
    <a href="/menu">Menu</a>
    <a href="/about">About</a>
    <a href="/account/referrals">Refer & Earn</a>
  </LinksColumn>
  <LegalColumn>
    <a href="/terms">Terms & Conditions</a>
    <a href="/privacy">Privacy Policy</a>
  </LegalColumn>
  <SocialRow />            {/* reuse relevant icons from ui-components-and-styling.md §3, trimmed set */}
  <Copyright>© {year} {site_settings.brand_name}. All rights reserved.</Copyright>
</Footer>
```

New `pages` table:

```
pages
  - id
  - slug          text, unique  -- 'about' | 'terms' | 'privacy'
  - title         text
  - content       text          -- markdown or rich text
  - chef_photo_url text, nullable  -- only used by 'about'
  - updated_at
```

## 5. Referral Program

**Reward:** ₦200 per successful referral, credited when the referred
person's **first order** reaches `paid` status. Admin-editable from
`/admin/settings` (a "Referrals" tab) via `site_settings.referral_bonus_amount`.
**Redeemable only at checkout** — not withdrawable to a bank account, not
usable anywhere else.

### Data model

```
site_settings  (add)
  + referral_bonus_amount   numeric, default 200   -- ₦, admin-editable

profiles  (add)
  + referral_code            text, unique          -- short code, generated on signup
  + referred_by              uuid, nullable, references profiles(id)
  + referral_balance         numeric, default 0     -- cached: currently spendable
  + referral_earned_total    numeric, default 0     -- cached: all-time earned (never decreases)

referrals  (new)
  - id
  - referrer_id       references profiles
  - referred_user_id  references profiles, unique   -- one referral record per referred user
  - status             text: 'pending' | 'completed'
  - reward_amount      numeric                       -- locked at completion time from site_settings, for audit even if the rate later changes
  - created_at
  - completed_at        nullable

referral_ledger  (new — append-only audit trail behind the cached balances)
  - id
  - user_id
  - amount             numeric   -- positive = earned, negative = redeemed
  - reason             text: 'referral_reward' | 'checkout_redemption' | 'redemption_refund'
  - reference_id        uuid, nullable  -- referrals.id or orders.id depending on reason
  - created_at

orders  (add)
  + referral_bonus_applied   numeric, default 0     -- amount of the customer's own balance spent on this order
```

### Flow

1. **Referral link**: `https://<domain>/?ref={referral_code}`. On landing
   with a `ref` param, store the code in a short-lived cookie (not
   localStorage, so it survives the OTP/OAuth redirect) before the person
   signs up.
2. **Signup**: `handle_new_user` trigger creates the `profiles` row as
   before; a server action reads the `ref` cookie (if present and not the
   new user's own code — block self-referral) and creates a `referrals` row
   with `status = 'pending'`, `referred_by` set on the new profile.
3. **Completion**: when an order's status transitions to `paid` (webhook /
   verify-on-return, same trigger point as email sending in
   `cart-checkout-payment-workflow.md` §4), check whether this is the
   `user_id`'s first-ever paid order **and** a `pending` referral exists for
   them. If so, atomically:
   - mark the `referrals` row `completed`, set `reward_amount` from the
     current `site_settings.referral_bonus_amount`
   - insert a `referral_ledger` row (`+reward_amount`, reason
     `referral_reward`) for the **referrer**
   - increment the referrer's cached `referral_balance` and
     `referral_earned_total` by that amount
4. **Redemption at checkout**: an optional "Apply referral bonus" control on
   the checkout page, capped at `min(profiles.referral_balance, order
   subtotal)`. On server-side order creation (same step that computes
   authoritative pricing in `cart-checkout-payment-workflow.md` §3):
   - re-check the current `referral_balance` server-side (never trust a
     client-sent amount)
   - decrement `referral_balance` and insert a `referral_ledger` row
     (negative amount, reason `checkout_redemption`, `reference_id =
     order.id`) in the same transaction as order creation
   - set `orders.referral_bonus_applied` and subtract it from the total
     charged to Paystack
   - **if the order never gets paid** (abandoned `pending_payment`, or
     explicitly `cancelled`/`failed`): refund the bonus — insert a
     compensating `referral_ledger` row (`+amount`, reason
     `redemption_refund`) and restore `referral_balance`. Hook this into the
     same stale-order cleanup already noted in
     `cart-checkout-payment-workflow.md` §4, so an abandoned checkout
     doesn't permanently burn someone's bonus.

### As built (2026-09-25) — differences from the flow above

- **Credit on delivery, not payment** (client decision): the referrer is
  credited when the friend's first order reaches **Delivered/Collected**,
  because customers can cancel paid orders within 30 min for a full refund.
- **Eligibility**: only brand-new accounts (created < 24h before claiming,
  no orders, never referred) can be linked; self-referral blocked. The
  `?ref=` code lives in a 30-day httpOnly cookie set by `proxy.ts` and is
  claimed right after sign-in (email code or Google).
- **Refunds of redeemed bonus**: on customer cancel, restaurant cancel, or
  when an unpaid checkout expires after 24h (lazy `expire_stale_orders()`,
  run at checkout and on the admin board — no scheduler). If an expired order
  is paid late, the payment is honoured and the bonus re-taken.
- **₦0 orders**: if the bonus covers the whole bill, `create_order()` marks
  the order paid immediately and Paystack is skipped; emails still send.
- Referral codes: 6 characters, same look-alike-free alphabet as order codes.

### Referrals Page (`/account/referrals`) — 3 cards

```
<ReferralsPage>
  <ReferralLinkBox code={profile.referral_code} />   {/* shareable link + copy button; reuse WhatsAppButton/ShareButtonCluster from ui-components-and-styling.md */}
  <CardRow>
    <StatCard title="Referrals" primary={monthlyCount} secondary={`${allTimeCount} all time`} />
    <StatCard title="Available Bonus" primary={formatNaira(profile.referral_balance)} note="Usable at checkout" />
    <StatCard title="Total Earned" primary={formatNaira(profile.referral_earned_total)} note="All time" />
  </CardRow>
  <ReferralHistoryList />   {/* optional: list of referred signups + status, nice-to-have not MVP-blocking */}
</ReferralsPage>
```

- **Card 1 (Referrals)**: monthly count = `COUNT(*) FROM referrals WHERE
  referrer_id = me AND status = 'completed' AND completed_at >=
  date_trunc('month', now())`; all-time count = same without the date
  filter. Shown together on one card (e.g. big number for this month, small
  "X all time" underneath) rather than as two separate cards — that's the 3
  the client asked for.
- **Card 2 (Available Bonus)**: `profiles.referral_balance` — this is what
  the customer can actually spend at checkout right now.
- **Card 3 (Total Earned)**: `profiles.referral_earned_total` — never
  decreases, a lifetime-value number distinct from the spendable balance.

## 6. Mobile Responsiveness (standing requirement, not a page)

Applies to **every** page in the table above, not just the hero (which
already has a mobile section in `hero-section-design.md` §6):

- Design and build mobile-first: base Tailwind classes target the smallest
  breakpoint, `sm:`/`md:`/`lg:` add complexity up, not the reverse.
- Every card grid (menu cards, referral stat cards, admin tables) needs an
  explicit mobile layout — stacked single-column, not just a shrunk desktop
  grid.
- The footer's multi-column layout (§4) stacks vertically on mobile.
- Admin pages (`/admin/*`) are included — the vendor will likely check
  orders from a phone, so admin isn't exempt from this requirement even
  though it's not customer-facing.
- Add this as a standing item in `CLAUDE.md` coding conventions so it's not
  re-decided per feature — see the update there.
