# Cart → Checkout → Payment → Email Workflow

## 1. Cart State

- Cart lives client-side first (React Context or Zustand), persisted to
  `localStorage` so it survives a refresh for guests.
- Shape: `{ items: [{ menuItemId, name, unitPrice, quantity, imageUrl }], updatedAt }`
- On login, merge any existing localStorage cart into the user's session
  (simple union by `menuItemId`, sum quantities on conflict).
- Cart total is always recomputed client-side for display, but **never trusted**
  for the actual charge amount — see step 4.

## 2. Checkout Form

**Account required before this form renders** — if the visitor is signed
out, show Email OTP / Google Sign-In inline first (see
`docs/accounts-loyalty-and-images.md` §1), merge their `localStorage` cart
into the session, then continue straight into the form below.

1. Contact info: name, email, phone (pre-filled from `profiles`)
2. Delivery or pickup selection
3. Delivery address (if delivery) — free text is fine for MVP; Google Places
   autocomplete is a later polish item
4. Order notes (optional — allergies, delivery instructions)
5. Referral bonus / loyalty points "apply" toggles, if the customer has a
   balance — see `docs/accounts-loyalty-and-images.md` §2
6. Review order summary (items, subtotal, delivery fee, rewards applied, total)
7. "Pay with Paystack" button (skip straight to a `paid` order with no
   Paystack call if rewards bring the total to exactly ₦0 — see
   `docs/accounts-loyalty-and-images.md` §2 step 3)

## 3. Creating the Order Record

Before touching Paystack:

1. Server action creates an `orders` row with `status = 'pending_payment'`,
   `user_id` set (required — checkout requires an account, see
   `docs/accounts-loyalty-and-images.md` §1) and the associated `order_items`
   rows, using **server-side prices looked up from the `menu_items` table** —
   not the prices sent from the client cart. This is the key integrity check:
   a tampered client request can't pay less than the real menu price.
2. Server computes the authoritative subtotal from those looked-up prices +
   delivery fee, then applies any referral bonus / loyalty points redemption
   server-side (re-validated against the customer's actual current balances,
   never trusted from the client) to reach the final total — see
   `docs/accounts-loyalty-and-images.md` §2 for the combined-redemption logic
   and the same-transaction ledger writes this step must include.
3. This order's `id` becomes the `reference` (or is embedded in the reference)
   passed to Paystack.

## 4. Paystack Integration

**Initialize:**
- Server-side call to Paystack's `transaction/initialize` endpoint with the
  server-computed amount (in kobo), customer email, and `reference` (your
  order id or a derived value), plus a `callback_url` back to your
  `/orders/[orderId]` or a `/checkout/complete` page.
- Redirect the browser to the returned `authorization_url` (or use Paystack
  Inline JS if you want an in-page modal instead of a redirect).

**Verify (do both, not just one):**
1. **Webhook** (`/api/paystack/webhook`) — Paystack POSTs `charge.success`
   events here. Verify the request signature using `PAYSTACK_SECRET_KEY`
   before trusting it. On success, mark the order `paid`, trigger the Brevo
   confirmation email, and this is your **source of truth**.
2. **Return-URL fallback** — when the customer lands back on your
   `callback_url`, call Paystack's `transaction/verify/{reference}` server-side
   to confirm status immediately, so the UI doesn't sit on "pending" if the
   webhook is delayed. If already marked paid by the webhook, this is a no-op;
   if not yet, this call itself can trigger the same "mark paid + send email"
   logic (idempotent — see below).

**Idempotency:** both the webhook and the verify-on-return path can fire the
"mark order paid" logic. Guard it with a check: only transition
`pending_payment → paid` and only send the email if the order isn't already
`paid`. Otherwise a slow webhook + fast return-page check can double-send the
confirmation email.

**Failure/abandonment:** if the customer never completes payment, the order
stays `pending_payment`. A scheduled cleanup (or simply excluding
`pending_payment` orders older than, say, 24h from the admin dashboard) keeps
stale orders from cluttering the vendor's view. If the order had a referral
bonus and/or loyalty points applied, this same cleanup must also refund those
back to the customer's balances — see `docs/accounts-loyalty-and-images.md`
§2 step 4.

## 5. Brevo Email Integration

Trigger point: **only after payment is verified paid**, server-side (inside
the webhook handler / verify-on-return handler) — never from the client
redirect alone, since that can be spoofed or skipped.

**Emails to send:**
1. **Order confirmation / receipt** — to the customer, immediately on payment
   success. Items, quantities, total, order tracking link, estimated
   prep/delivery time if known, and loyalty points earned on this order (see
   `docs/accounts-loyalty-and-images.md` §2).
2. **New order notification** — to the vendor/admin email, so they see it
   without needing to watch the dashboard constantly.
3. **Status update emails** (optional, phase 2) — "Your order is out for
   delivery," "Your order has been delivered" — triggered from the admin
   dashboard's status-change actions.

**Implementation:**
- Use Brevo's transactional email API (`POST /v3/smtp/email`) from a server
  action or API route — never call it from the client (would expose the API
  key).
- Use Brevo templates (built in their dashboard) referenced by `templateId`
  with dynamic params, rather than hand-building HTML in code — easier for
  the client to tweak wording later without a redeploy.
- Wrap the send in a try/catch that **doesn't block the order-success
  response** to the user — if Brevo fails, the order is still paid and valid;
  log the failure and consider a retry queue rather than making email
  delivery a hard dependency of checkout success.

## 6. Order Status Lifecycle

```
pending_payment → paid → preparing → ready → out_for_delivery → delivered
                              ↘ cancelled (from paid or preparing, admin-initiated)
pending_payment → failed (payment failed/abandoned)
```

- Only `pending_payment → paid` is payment-triggered (webhook/verify).
- All later transitions (`preparing`, `ready`, `out_for_delivery`, `delivered`,
  `cancelled`) are admin-triggered from the dashboard, each optionally firing
  a status update email.

## 7. Edge Cases to Handle Explicitly

- **Price drift**: menu item price changes between "add to cart" and
  "checkout" — always re-fetch current prices at order-creation time (step 3),
  and consider showing the customer a "prices updated" notice if it changed
  from what they saw in the cart.
- **Item goes unavailable mid-cart**: check `is_available` at order-creation
  time; reject or prompt removal before proceeding to payment.
- **Duplicate submissions**: disable the "Pay" button on click and rely on the
  server-side order creation being the single source of truth, not multiple
  client-triggered order rows for one checkout attempt.
- **Currency**: confirm with the client whether Paystack is set up for NGN
  only or needs multi-currency — affects amount formatting throughout.
