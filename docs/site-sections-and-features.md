# Site Sections & Features

## 1. Home Page

1. **Hero** — flavor-swap featured item card (see `hero-section-design.md`)
2. **Categories strip** — quick-jump chips (Starters, Mains, Drinks, Desserts, etc.)
3. **Popular / Best sellers** — grid of cards, "Add to cart" on each without
   leaving the page
4. **Favorites** (only shown if logged in and has favorites) — "Order again"
   style row of previously favorited items
5. **Promo banner** (optional) — discount codes, new item announcements
6. **Testimonials / ratings** (optional, phase 2) — social proof
7. **Footer** — hours, location/delivery area, contact, socials

## 2. Menu Page

- Full item list, filterable by category and dietary tags (vegetarian, spicy,
  etc. — only if the client actually needs these; don't over-build)
- Search bar (simple client-side filter is enough at small menu sizes)
- Each item card: photo, name, badge (New/Bestseller, admin-set), rating
  stars + review count, short description, category/tag chips, price (with
  strikethrough original price + discount % badge when the item has a
  `compare_at_price`), "Add to cart" (with quantity stepper appearing once
  added) — see `docs/menu-and-product-page.md` §1 for the full card layout
- Item detail (modal or dedicated page): gallery, rating, price/discount,
  full description, customization options if applicable (size, add-ons,
  spice level), quantity stepper, "Add to cart," share button, and a reviews
  list — see `docs/menu-and-product-page.md` §2 for the full layout and what
  to deliberately leave out of it

## 3. Favorites

- Heart/save icon on every item card and detail view
- Requires auth — prompt sign-in/sign-up if a guest taps it
- Dedicated `/favorites` page listing saved items with quick "Add to cart"

## 4. Cart

- Slide-over panel (accessible from a persistent cart icon in the header) is
  usually better UX than a full page for a food site — lets people keep
  browsing while reviewing
- Line items with quantity adjust / remove
- Subtotal, delivery fee (if applicable), any discount code field, total
- "Checkout" button → checkout flow

## 5. Checkout

- **Account required** (Email OTP / Google Sign-In) — needed for order
  tracking, customer stats, and the referral/loyalty reward programs; see
  `docs/accounts-loyalty-and-images.md` §1. Browsing the menu and building a
  cart stays fully open to signed-out visitors — the sign-in gate sits at
  checkout, not before.
- If arriving at checkout signed out, sign in inline (OTP/Google) then
  continue straight into the checkout form with the cart already merged.
- Delivery vs. pickup toggle, if both are offered
- Address input (manual, or map-based if you want to add Google Places
  autocomplete later)
- Order summary recap
- Referral bonus / loyalty points "apply" toggles, if the customer has a
  balance — see `docs/accounts-loyalty-and-images.md` §2
- Payment via Paystack (see `cart-checkout-payment-workflow.md`)
- Order confirmation screen + confirmation email (Brevo)

## 6. Order Tracking

- `/orders/[orderId]` — status timeline (Paid → Preparing → Ready/Out for
  delivery → Delivered)
- Every order belongs to a signed-in account (no guest checkout) — reached
  via `/account/orders` or the direct order link in the confirmation email

## 7. Account

- Profile: name, phone, saved delivery addresses
- Order history with reorder ("Add all items from this order to cart")
- Favorites (linked from here too)

## 8. Admin / Vendor Dashboard

- Menu management: add/edit/remove items, mark items unavailable (86'd for
  the day), reorder categories, set featured items for the hero
- Orders view: incoming orders in real time (Supabase realtime subscription is
  a natural fit here), update status, view customer contact/delivery info
- Basic sales overview (orders today, revenue today) — nice-to-have, not MVP

## 9. Nice-to-Haves (phase 2+, don't build first)

- Discount/promo codes
- Loyalty points / repeat-customer rewards
- SMS notifications alongside email (would need a separate SMS provider —
  Brevo also supports transactional SMS if you want to keep one vendor)
- Delivery rider assignment / live location (a much bigger scope — only if
  the client is running their own delivery fleet rather than a third party)
- Multi-language support (only relevant if the client's customer base needs it)

## 10. What to Deliberately Leave Out at MVP

- Multi-vendor/marketplace logic — not needed for a single restaurant
- Complex inventory/stock deduction — an `is_available` boolean per item is
  enough until proven otherwise
- In-house delivery logistics — most single-restaurant sites just capture the
  delivery address and let staff coordinate delivery manually or via a
  third-party rider service
