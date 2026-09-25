# Hero Section Design

Pattern borrowed from a "Scoop" ice cream ordering concept: a single glassmorphic
card sits over a full-bleed food photo. Selecting a different item morphs the
background photo, dish photo, title, description, and price — without a hard
page cut.

## 1. Layout

- **Background**: full-bleed, softly blurred photo of the currently selected dish,
  tinted/blended so the card stays legible on top of it. Background crossfades
  (not cuts) when the selection changes.
- **Card**: frosted-glass panel (`backdrop-blur`, semi-transparent white/dark fill,
  soft rounded corners, subtle border) positioned left-aligned or centered over
  the background, containing:
  - Brand mark (small, top-left of card)
  - Item name (large, bold)
  - Short description (1–3 sentences)
  - Price
  - "Order Now" / "Add to Cart" primary button
- **Dish photo**: a large plated shot of the current item, overlapping the card's
  right edge (bleeds slightly outside the card boundary for depth).
- **Selector row**: horizontal row of circular thumbnails below the card — one per
  featured item — plus a "next" arrow. Active thumbnail is visually raised/labeled
  with name + price; others are dimmed.

## 2. Interaction

- Tapping a thumbnail (or arrow) triggers the swap:
  - Background image crossfades to the new dish's photo
  - Dish photo swaps with a soft scale/fade transition
  - Card text (name, description, price) crossfades — avoid a jarring cut
  - Active state moves to the newly selected thumbnail
- Auto-rotate optional: cycle through featured items every 4–6s, pausing on
  user interaction. Recommend **off by default** for a food ordering site —
  people are scanning to decide what to eat, not watching a showcase reel.
- "Order Now" adds the currently displayed item directly to cart (fast path for
  featured items), rather than only linking to the full menu.

## 3. Content Source

This hero should pull from a curated set, not the entire menu:
- `menu_items` flagged `is_featured = true`, or
- Top N best-sellers (if you're tracking order counts), or
- Manually curated by the admin (simplest to build first — a `featured_order`
  integer column on `menu_items`)

Recommend starting with manual curation (admin picks 4–6 items) — best-seller
logic can come later once there's order data to rank by.

## 4. Component Breakdown

```
<HeroSection>
  <HeroBackground image={active.image_url} />
  <HeroCard>
    <BrandMark />
    <h1>{active.name}</h1>
    <p>{active.description}</p>
    <Price value={active.price} />
    <AddToCartButton item={active} />
  </HeroCard>
  <HeroDishImage image={active.image_url} />
  <FeaturedSelector
    items={featuredItems}
    activeId={active.id}
    onSelect={setActiveId}
  />
</HeroSection>
```

- `active` state lives in the parent (`useState` or a small reducer) — the
  selector, background, card, and dish image are all just reading from it.
- Keep image swaps declarative (`key={active.id}` + CSS transition or a small
  animation library) rather than hand-rolled timeout logic.

## 5. Styling Notes (Tailwind)

- Card: `backdrop-blur-md bg-white/70 dark:bg-black/40 rounded-2xl border border-white/30 shadow-lg`
- Background transition: crossfade via two stacked `<Image>` layers with opacity
  transition, or a single image with a `key`-triggered fade (React + CSS
  `transition-opacity duration-500`)
- Selector thumbnails: `rounded-full` circular crops, active state gets a ring
  (`ring-2 ring-offset-2`) and a small label chip (name + price) instead of the
  plain circle other flavors got in the reference — food needs a price visible
  before tapping, unlike a portfolio showcase.

## 6. Mobile Behavior

- Card stacks above the dish image on narrow screens rather than overlapping it
  (overlap only works with the horizontal space desktop/tablet gives it).
- Selector row becomes horizontally scrollable (`overflow-x-auto`) rather than
  wrapping.
- Reduce card copy on mobile — description can truncate to 1 line with a
  "more" expand, keeping name/price/button always visible without scrolling.

## 7. Accessibility

- Selector thumbnails need accessible labels (`aria-label="View {name}, ₦{price}"`),
  not just an image.
- Respect `prefers-reduced-motion` — fall back to instant swap instead of
  crossfade/scale animation for users who've set that preference.
- Ensure text-over-image contrast meets WCAG AA even against the busiest food
  photos — this is why the glass card needs a real background fill, not just
  blur, behind the text.

## 8. As built — client video reference (2026-09-25)

The client supplied a reference video; the hero now follows it:

- **Light look**: soft blurred photo of the active dish under a white wash
  (not the earlier dark Velvet tint); one large frosted-white card holds
  everything — name, description, price,
  Order now / View details, and the thumbnail row with arrows. No brand
  mark in the card (client: the header already shows it).
- **Orbit (client, 2026-09-25)**: all featured dishes sit evenly around one
  big wheel whose centre is off to the right of the dish area; the dish
  area is a clipped window onto it, so only one plate shows. Each step turns
  the whole wheel one position (`TURN_MS` 1.1s, ease-in-out): the current
  plate curves away down-right and out through the card edge while the next
  comes down from above. The wheel's rotation is an ever-increasing step
  count, so it always turns the same way (never unwinds). Orbit radius =
  1.6 plate widths / sin(step angle), so neighbours stay outside the window.
  Only the one wheel transform animates, which is what keeps it smooth. Each
  plate also spins slowly on its own (60s/turn); its shadow sits on a
  non-spinning layer. Window: full card width above the text on phones, the
  card's right side from `md`. Plate size via `--plate` (15/18/20/24rem).
- Superseded approaches (not smooth): separate roll-out/swing-in keyframe
  animations per plate — multi-step keyframes stalled between steps and the
  incoming photo loaded mid-animation.
- **Thumbnails**: small round photos only — no name or price (client). The
  active one lifts and gets a Velvet ring. Back and next arrows either side.
- **Auto-cycle ON (client, overrides §2's "off by default")**: next dish
  rests 5s between turns, never paused by hover or taps; arrows turn the
  wheel one step either way, thumbnails take the shortest way round, and
  any manual turn restarts the rest timer. Users with reduced motion get no auto-cycle, instant swaps and no
  spin. The card text has no `aria-live` (it would announce every 5s).

