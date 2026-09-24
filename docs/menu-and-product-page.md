# Menu Listing & Single Product Page

> Supplements `docs/site-sections-and-features.md` §2 (Menu Page) and §5
> (Checkout). Two reference screenshots: a rich product-card layout (image +
> badge + title + tags), and a full marketplace product page — only some of
> the second one applies here, see §2 for what to leave out.

## 1. Food Menu — Card Design

Richer than the current plain card spec: photo, badge, title, short
description, category/tag chips, rating, and price (with discount shown when
applicable).

```
<MenuItemCard>
  <CardImage src={item.image_url} alt={item.name} />
  {item.badge && <Badge>{item.badge}</Badge>}      {/* "New", "Bestseller", "Spicy" — admin-set, optional */}
  <CardBody>
    <h3>{item.name}</h3>
    <RatingRow rating={item.avg_rating} count={item.review_count} />
    <p className="truncate">{item.description}</p>
    <TagRow tags={item.tags} />                     {/* category + dietary tags, chip style like the reference */}
    <PriceRow>
      {item.compare_at_price && (
        <>
          <s>{formatNaira(item.compare_at_price)}</s>
          <DiscountBadge>{discountPercent(item)}% off</DiscountBadge>
        </>
      )}
      <strong>{formatNaira(item.price)}</strong>
    </PriceRow>
    <AddToCartControl item={item} />                 {/* button, becomes a qty stepper once added — per site-sections-and-features.md §2 */}
  </CardBody>
</MenuItemCard>
```

- **Badge** (top-left or top-right over the image, pink/solid chip like the
  reference): optional, admin-set per item — `New`, `Bestseller`, or leave
  unset. Don't auto-generate this from order data yet; keep it manual like
  `is_featured` on the hero.
- **Rating row**: star icons + numeric average + review count in parentheses,
  e.g. `★★★★☆ 4.7 (258)`. Only render if `review_count > 0` — an item with no
  reviews yet shows no rating row at all rather than a fake "0 reviews" line.
- **Discount badge**: only renders when `compare_at_price` is set and greater
  than `price` — this is admin-controlled per item, not automatic.
- **Image background**: unlike the reference's flat brand-color background,
  use the actual dish photo full-bleed in the image slot (food needs to look
  like food) — keep the card's rounded corners and drop shadow, not the
  colored-background treatment.
- Card grid: responsive grid (2 cols mobile, 3–4 desktop), consistent card
  height regardless of description length (truncate description to ~2 lines).

## 2. Single Product (Item Detail) Page

Trimmed down from the reference marketplace screenshot to what a
single-restaurant food site actually needs — **deliberately excluding**:
seller info/star-seller badge, "sold by," courier company logos, "credit for
delay," multi-tier order guarantees, and quantity-in-stock capacity
selectors. None of that applies to a single restaurant's own menu.

**Include:**

```
<ProductDetailPage>
  <ProductGallery images={item.gallery_urls ?? [item.image_url]} />
  <ProductInfo>
    <h1>{item.name}</h1>
    <RatingRow rating={item.avg_rating} count={item.review_count} />
    <PriceRow>
      {item.compare_at_price && <s>{formatNaira(item.compare_at_price)}</s>}
      <strong>{formatNaira(item.price)}</strong>
      {item.compare_at_price && <DiscountBadge>{discountPercent(item)}% off</DiscountBadge>}
    </PriceRow>
    <p>{item.long_description}</p>
    {item.customizations && <CustomizationOptions options={item.customizations} />}  {/* size, add-ons, spice level — only if the item has any; most won't */}
    <QuantityStepper value={qty} onChange={setQty} />
    <AddToCartButton item={item} quantity={qty} />   {/* use the LiquidButton component from docs/ui-components-and-styling.md */}
    <ShareRow>
      <WhatsAppButton />                              {/* "Share this dish" — reuse from docs/ui-components-and-styling.md §3 */}
    </ShareRow>
  </ProductInfo>
  {item.review_count > 0 && <ReviewsList itemId={item.id} />}
</ProductDetailPage>
```

- **Gallery**: single large image is fine for most items; support multiple
  photos per item only if the client actually supplies more than one shot
  per dish (`menu_items` would need a `gallery_urls text[]` column, or a
  separate `menu_item_images` table if you want per-image ordering/alt text
  — add only when there's real multi-photo content, don't build it against
  empty data).
- **Reviews**: a simple list below the fold (reviewer name/initial, star
  rating, comment, date) — no review photos, no "verified purchase" badges,
  no vote-helpfulness UI. Keep it to what an actual review needs.
- **Share**: one `WhatsAppButton`, not the full 8-platform cluster — the
  cluster is a reasonable fit for the order-tracking page (per
  `docs/ui-components-and-styling.md` §3) but is overkill on every single
  item page.
- Skip: seller ratings (there's one vendor, not a marketplace of sellers),
  delivery-date ranges shown per-item (delivery timing belongs to checkout,
  not the product page), "safe payments" trust badges (Paystack's own
  checkout page already communicates this).

## 3. Data Model Additions

```
menu_items  (add to existing table)
  + compare_at_price   numeric, nullable   -- set > price to show a discount
  + badge              text, nullable      -- 'New' | 'Bestseller' | null, admin-set
  + avg_rating         numeric, nullable   -- cached, recomputed on new review
  + review_count        int, default 0     -- cached, recomputed on new review

reviews  (new table)
  - id
  - menu_item_id      references menu_items
  - user_id           references profiles (reviews require an account — no guest reviews)
  - rating             int, 1-5
  - comment             text, nullable
  - created_at
```

- `avg_rating`/`review_count` on `menu_items` are a cache, kept in sync by a
  Postgres trigger on `reviews` insert/update/delete (`AFTER ... FOR EACH
  ROW`, recompute `AVG(rating)`/`COUNT(*)` for that `menu_item_id`) — cheaper
  than aggregating on every menu-page read.
- RLS: `reviews` insert restricted to authenticated users, and ideally only
  users who actually ordered that item (`EXISTS` check against `order_items`
  joined to their own `orders`) — decide whether to enforce that at MVP or
  relax it to "any signed-in user" for launch and tighten later; either is
  reasonable, just pick one and note it in `docs/progress.md` once decided.
- This moves "Ratings/reviews per item" out of the Phase 2 nice-to-haves
  list in `docs/site-sections-and-features.md` §9 — it's now part of the MVP
  menu/product page. Update that doc's checklist accordingly.
