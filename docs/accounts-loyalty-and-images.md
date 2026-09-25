# Account-Required Checkout, Loyalty Points & Image Storage

## 1. Account Required to Checkout (supersedes earlier guest-checkout decision)

**Change:** every earlier doc allowed guest checkout. That's now reversed —
an account is required to complete checkout, to support order tracking,
customer stats, and both reward programs (referral + loyalty). This doc is
the source of truth on this point; `site-sections-and-features.md`,
`cart-checkout-payment-workflow.md`, and `branding-security-auth.md` have
been updated to match (see their "Guest checkout allowed" bullets — now
replaced).

- **Browsing the menu is still fully open**, no account needed — only
  checkout itself is gated.
- **Cart stays client-side/`localStorage`** even for signed-out visitors
  (unchanged) — the sign-in gate sits at the *checkout* step, not on adding
  items to cart, so people aren't forced to authenticate before they've even
  decided what they want.
- At checkout, if there's no active session: show the Email OTP / Google
  Sign-In flow inline (or as a modal) before rendering the checkout form,
  then merge the existing `localStorage` cart into the session as already
  specified, and continue straight into checkout — don't bounce the person
  to a separate page and lose their place.
- `orders.user_id` is now **required** (`NOT NULL`), not nullable — drop the
  guest-order RLS carve-out from `docs/branding-security-auth.md` §3; a
  normal `user_id = auth.uid()` policy covers every order now.
- Order tracking simplifies too: no more emailed guest tracking link — every
  order belongs to a signed-in account, so `/orders/[orderId]` and
  `/account/orders` are the only paths to it (still send the confirmation
  email, just without a "track without an account" link).

## 2. Loyalty Points

**Rate:** every ₦1,000 spent earns 10 points; 1 point = ₦1 at redemption.
Applied to net amount actually paid (after any referral bonus or loyalty
points already deducted) — not the pre-discount subtotal, so points can't be
farmed by stacking discounts against themselves.

Mirroring the referral bonus pattern (`site_settings.referral_bonus_amount`
is admin-editable), the earn rate is made admin-editable too rather than
hardcoded, since it's the same mechanic — flag this if you'd rather keep it
fixed at 10/₦1,000.

**Admin can turn the whole feature on/off** from `/admin/settings` — when
off, no new points are earned and the "Apply loyalty points" control is
hidden at checkout, but existing balances are preserved (not wiped), so
switching it back on doesn't lose anyone's history.

### Data model

```
site_settings  (add)
  + loyalty_enabled              boolean, default true
  + loyalty_points_per_1000      numeric, default 10   -- points earned per ₦1,000 of net spend

profiles  (add)
  + loyalty_points_balance        numeric, default 0    -- cached: currently spendable
  + loyalty_points_earned_total   numeric, default 0    -- cached: all-time earned (never decreases)

loyalty_ledger  (new — same append-only pattern as referral_ledger)
  - id
  - user_id
  - points             numeric   -- positive = earned, negative = redeemed
  - reason             text: 'order_earned' | 'checkout_redemption' | 'redemption_refund'
  - reference_id        uuid, nullable   -- orders.id
  - created_at

orders  (add)
  + loyalty_points_earned      numeric, default 0   -- points this order generated
  + loyalty_points_redeemed    numeric, default 0   -- points spent on this order (= ₦ discount, 1:1)
```

### Flow

1. **Earning**: on the same `paid` transition that handles referral
   completion and confirmation emails, if `site_settings.loyalty_enabled`,
   compute `floor(net_amount_paid / 1000) * loyalty_points_per_1000` and:
   - insert a `loyalty_ledger` row (`+points`, reason `order_earned`,
     `reference_id = order.id`)
   - increment `loyalty_points_balance` and `loyalty_points_earned_total`
   - set `orders.loyalty_points_earned` for display on the receipt/order page
2. **Redemption at checkout**: same UI pattern as the referral bonus toggle
   — "Apply loyalty points," capped at `min(profiles.loyalty_points_balance,
   remaining subtotal after referral bonus)`. Server-side, in the same
   transaction as order creation: re-check the balance, decrement it, insert
   a `loyalty_ledger` row (negative, reason `checkout_redemption`), and set
   `orders.loyalty_points_redeemed`.
3. **Combining with referral bonus**: both can be applied on the same order.
   Apply referral bonus first, then loyalty points, against the remaining
   balance, so neither discount pushes the total below ₦0. If both bring the
   total to exactly ₦0, skip the Paystack call entirely — create the order
   already `paid` (no payment reference), since there's nothing to charge.
4. **Refund on abandon/failure**: identical to the referral bonus — if an
   order that redeemed loyalty points never reaches `paid` (abandoned/
   cancelled/failed), refund the points via a `redemption_refund` ledger row
   in the same stale-order cleanup pass. Handle both ledgers
   (referral + loyalty) together in that cleanup, not as two separate jobs.
5. **Feature toggled off mid-flow**: if `loyalty_enabled` is switched off
   while an order is `pending_payment` with loyalty points already applied,
   still honor that order's already-committed redemption (don't retroactively
   unwind it) — the toggle only gates *new* earning/redemption going forward.

### As built (2026-09-25)

- **Earned on delivery**, not on payment (client decision, same as
  referrals): `_award_loyalty_on_delivery()` runs on the Delivered/Collected
  transition. Cancelled orders never earn. The confirmation email says how
  many points *will* be earned on delivery.
- Whole points: `floor(floor(total / 1000) × loyalty_points_per_1000)`, on
  the order total actually paid (after bonus/points).
- Redemption applied after the referral bonus; together capped at the food
  subtotal. Refunded on customer/restaurant cancel and 24h expiry (same pass
  as referral refunds). Expired-then-paid orders re-take the points.
- Balance shown on the customer's Orders page (dashboard home); points
  earned/redeemed on receipts and the order page; admin switch + rate in
  /admin/settings → Loyalty points.

### Checkout UI

```
<CheckoutRewardsSection>
  {profile.referral_balance > 0 && (
    <ApplyToggle label="Apply referral bonus" available={profile.referral_balance} />
  )}
  {site_settings.loyalty_enabled && profile.loyalty_points_balance > 0 && (
    <ApplyToggle label="Apply loyalty points" available={profile.loyalty_points_balance} unit="points (₦1 each)" />
  )}
  <OrderTotalBreakdown subtotal deliveryFee referralApplied loyaltyApplied total />
</CheckoutRewardsSection>
```

- Show both balances even when small, but disable the toggle (not hide it)
  when the balance is ₦0/0 points, so customers know the program exists.
- Order confirmation email and `/orders/[orderId]` should show points
  earned on that order, not just the amount charged — the reward should be
  visible on the receipt.

## 3. Image Storage — Supabase Storage

> **Changed 2026-09-24:** Cloudinary was the earlier choice; replaced by
> Supabase Storage because total media is small (~50 MB, inside the free
> 1 GB) and it removes a separate vendor/account. See `docs/progress.md`.

All images — menu item photos, the brand logo (`site_settings.logo_url`),
and the chef photo (`pages.chef_photo_url`) — live in one **public** Supabase
Storage bucket, `images`, created by
`supabase/migrations/20260924000000_storage_images.sql`:

```
images/                    public bucket, 5 MB max, jpeg/png/webp/avif only
  menu-items/<uuid>.<ext>   → menu_items.image_url
  branding/<uuid>.<ext>     → site_settings.logo_url
  pages/<uuid>.<ext>        → pages.chef_photo_url (step 11)
```

**Upload pattern:** the admin's browser uploads directly to Storage as the
signed-in user (no server route in between). Security is enforced by
Supabase, not by the client:

- **Storage RLS** on `storage.objects`: insert/update/delete only when
  `is_staff()`, and only into the three folders above. Reads are public (it's
  a public bucket), so the storefront needs no auth to show images.
- **Bucket limits** (`file_size_limit`, `allowed_mime_types`) are enforced by
  Storage on every upload — the file picker's `accept` / 5 MB check is UX only.
- **Random file names** (`crypto.randomUUID()`), never overwriting
  (`x-upsert: false`) — replacing an image uploads a new file, so CDN caches
  never serve a stale photo.
- **Server actions only save URLs in our own bucket + expected folder**
  (`storagePathFromUrl` in `lib/storage/images.ts`), so a tampered form can't
  point `image_url` at an arbitrary external image.
- **Cleanup:** when an image is replaced/removed or its menu item deleted,
  the old file is deleted best-effort (`lib/storage/remove.ts`). Files
  uploaded on a form that's then cancelled are left behind — harmless at this
  scale.

`ImageUploadField` (`components/admin/`) uses XHR rather than
`supabase.storage.upload()` because only XHR reports upload progress — the
`UploadButton` component from `docs/ui-components-and-styling.md` §3 wires its
progress-border/checkmark animation to that same `idle → uploading → done`
lifecycle.

**Delivery:** store the public URL; render with `next/image`, which resizes
and converts formats (via Netlify Image CDN in production). Supabase's own
image transformations are a paid feature and aren't used. The bucket's public
path is allow-listed in `next.config.ts` `images.remotePatterns`.

**Env vars:** none beyond the existing `NEXT_PUBLIC_SUPABASE_URL` /
`NEXT_PUBLIC_SUPABASE_ANON_KEY`.

**Videos:** not specced yet. Decide placement (hero background? About page?)
and length before building — the bucket's `allowed_mime_types` and size limit
would need to change, and longer video may justify a video-specific service.
