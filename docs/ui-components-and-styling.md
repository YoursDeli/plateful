# UI Components & Styling Additions

> Supplements `docs/branding-security-auth.md` (palette) and
> `docs/hero-section-design.md` (hero pattern). Covers the order-status page
> design and four reusable button components the client wants used across
> the site.

## 1. Order Status Page

Adopt the vertical-timeline pattern (referenced screenshot: a white card,
"Order Status" header, current-status line, then a dotted vertical timeline
of steps each with a filled checkmark circle, bold title, grey description,
and timestamp; footer row with a back arrow + order number/confirmed-date on
the left and a pill action button on the right).

**Map the reference's steps onto Plateful's actual `orders.status` enum**
(`docs/cart-checkout-payment-workflow.md` §6) — don't copy the reference's
step names 1:1, they're from a different product:

| Timeline step | Maps to `orders.status` | Description copy |
|---|---|---|
| Confirmed | `paid` | "We've received your order." |
| Preparing | `preparing` | "We're getting your order ready." |
| Ready | `ready` | "Your order is ready." |
| Out for delivery | `out_for_delivery` | "Handed to courier for delivery." (skip this row entirely for pickup orders) |
| Delivered | `delivered` | "Successfully delivered." (label as "Ready for pickup" copy variant if it's a pickup order) |

**States to design, not just the fully-complete one shown in the reference:**
- **Completed step**: filled dark circle + checkmark, bold title, timestamp shown.
- **Current step**: same filled circle, but consider a subtle pulse/ring or
  the `primary` (Lavender) color instead of dark, to visually distinguish
  "we are here" from "already done."
- **Future step**: outlined circle (no fill, no checkmark), greyed title, no
  timestamp — don't show a fake/blank timestamp line.
- **Cancelled order**: replace the whole timeline with a single cancelled
  state (icon + "Order cancelled" + reason if captured) rather than a
  partially-filled timeline that implies it's still progressing.

**Component shape:**

```
<OrderStatusPage>
  <OrderStatusCard>
    <h2>Order Status</h2>
    <p>Your current order status is: <strong>{currentStatusLabel}</strong></p>
    <Timeline>
      {steps.map(step => (
        <TimelineStep
          key={step.key}
          state={step.state}         // 'completed' | 'current' | 'future'
          title={step.title}
          description={step.description}
          timestamp={step.timestamp} // only rendered when state !== 'future'
        />
      ))}
    </Timeline>
  </OrderStatusCard>
  <OrderFooterBar>
    <BackLink />
    <OrderMeta orderNumber={order.id} confirmedDate={order.created_at} />
    <SecondaryButton>Buy again</SecondaryButton>
  </OrderFooterBar>
</OrderStatusPage>
```

- Steps array is derived server-side from `orders.status` + any status-change
  timestamps you decide to log (the current schema only has one
  `created_at` — if you want a timestamp per step, add an
  `order_status_history` table: `order_id, status, changed_at`, populated by
  the admin status-update action and the Paystack webhook. Worth adding now
  since the reference design assumes a timestamp per step.)
- `Buy again` reuses the same "add all items from this order to cart" logic
  already specified for `/account/orders` in `site-sections-and-features.md` §7.
- Card and page styling: white card (`bg-white` / `dark:bg-secondary/10`),
  rounded corners, soft shadow — consistent with the glass-card language
  from the hero, but solid (not blurred) since it sits on a plain background
  here, not over a photo.

## 2. Color Pairing (reference)

Client-selected pair, already wired into `site_settings` defaults in
`docs/branding-security-auth.md`:

- **Lavender** `#D3C5F6` — primary
- **Velvet** `#3B2A60` — secondary

Use as: primary buttons = Lavender fill / Velvet text; secondary buttons =
Velvet fill / light text (or Velvet outline on a light background). Checkmark
circles in the order timeline can use Velvet for completed steps and
Lavender for the current step, keeping the two brand colors doing the visual
work instead of introducing a third accent color for status.

## 3. Reusable Button Components

Four custom animated buttons were supplied as React + `styled-components`
snippets. **`styled-components` isn't in the current stack** (`CLAUDE.md`
specifies Tailwind) — add it as a dependency rather than hand-porting these
animations to Tailwind/CSS, since the animations (liquid filter, staggered
radial-menu, SVG stroke-dasharray progress) are non-trivial to reproduce as
utility classes. Keep them isolated in `/components/ui/` as self-contained
styled-components so they don't fight with the Tailwind design tokens
elsewhere; theme them (fill colors) to Lavender/Velvet where the component
currently hardcodes an unrelated color.

| Component | Source | Recommended placement | Notes |
|---|---|---|---|
| **`WhatsAppButton`** | "Button" (WhatsApp icon, neumorphic style, teal hover) | Order confirmation & order-tracking page — "Message us about this order" / support contact; also a good fit for a floating support-chat entry point site-wide | Hover color is currently teal (`#009087`) — fine as-is since it's WhatsApp-branded, no need to force Lavender/Velvet here |
| **`ShareButtonCluster`** | "Button" (expanding radial menu: Discord/Twitter/Reddit/Messenger/Pinterest/Instagram/Snapchat/WhatsApp) | Trim to the platforms actually relevant to a food ordering site before shipping — likely just WhatsApp + Instagram + "copy link," not all eight. Use on the order-tracking page ("share your order") and/or individual menu-item detail views ("share this dish") | As supplied it's a lot of icons for a food-ordering context; recommend cutting the list down rather than using all eight, but keep the interaction pattern (expanding cluster on hover/tap) |
| **`LiquidButton`** ("Button 1") | Liquid-blur press effect, currently labeled "Liquid" | Primary checkout CTA ("Pay with Paystack") or "Add to Cart" — the animated press feedback fits a single, high-emphasis action | Relabel the text per instance; recolor `loader-bg`/drop fills to Velvet (dark) with Lavender text, or keep black/white and reserve Lavender/Velvet for simpler buttons — designer's call, but don't ship it still saying "Liquid" |
| **`UploadButton`** ("Button 4") | SVG stroke-progress border + checkmark completion animation, labeled "Upload" | Admin: menu-item photo upload, branding logo upload (`site_settings.logo_url`) — the progress-border + done-checkmark sequence maps well onto an actual file upload's pending → success states | Wire `:focus`-triggered CSS animation to real upload state (`useState` for `idle | uploading | done`) instead of relying on the `:focus` pseudo-class, so it reflects the actual network request rather than just click focus |

**As built (2026-09-29, step 8a)** — originals saved verbatim in
`docs/ui-snippets/`. Only three snippets existed; the mapping was agreed with
the client:

| Component (`/components/ui/`) | From | Where it's used | Adaptations |
|---|---|---|---|
| `WhatsAppButton` | `button-1.jsx` (neumorphic, teal liquid rise) | Order tracking page — "Message us" (hidden until `site_settings.whatsapp_number` is set in /admin/settings → Contact) | WhatsApp icon + label, rendered as a `wa.me` link with a pre-filled message quoting the order code; teal kept |
| `CtaButton` (the doc's "LiquidButton" role) | `button-2.jsx` (centre fill, press-in) | Add to cart (cards, hero "Order now", dish page), Pay at checkout | Lavender face / Velvet fill via CSS vars (admin colours apply), press scale 80% → 94%, disabled + focus styles |
| `ShareButtonCluster` | `share-cluster.jsx` (csozi) | Dish page ("Share {dish}") | Trimmed to WhatsApp, X, Facebook, Copy link; half-circle fan to the right; no padding growth; tap/keyboard/Esc support |
| `UploadButton` | *No snippet* — built from the description | Admin photo/logo uploads | Border drawn by real XHR upload progress, checkmark on success, "Try again" on error |

The order page doesn't get a share cluster: order pages are private (RLS),
so a shared link would 404 for anyone else.

**Button shape (2026-09-25):** all buttons use a 12px radius from one token,
`--btn-radius` (Tailwind `rounded-btn`); tags/badges stay pills.

**General note on all four:** they were supplied as generic/example
components (unrelated placeholder colors, hardcoded English text). Before
using "anywhere needed" site-wide, each instance should get: (a) its label
text set to the actual action, (b) its color recolored to the Lavender/Velvet
pair unless brand-specific (WhatsApp green/teal is fine to keep), and (c) an
accessible `aria-label` where the button is icon-only.
