// "★★★★☆ 4.7 (258)". Renders nothing when there are no reviews — never a
// fake "0 reviews" line (docs/menu-and-product-page.md §1).
export function RatingRow({
  rating,
  count,
  className = "",
}: {
  rating: number | null;
  count: number;
  className?: string;
}) {
  if (count <= 0 || rating === null) return null;
  const rounded = Math.round(rating);
  return (
    <p
      className={`flex items-center gap-1.5 text-sm ${className}`}
      aria-label={`Rated ${rating.toFixed(1)} out of 5 from ${count} review${count === 1 ? "" : "s"}`}
    >
      <span aria-hidden="true" className="tracking-tight text-amber-500">
        {"★".repeat(rounded)}
        <span className="text-neutral-dark/20">{"★".repeat(5 - rounded)}</span>
      </span>
      <span aria-hidden="true" className="font-semibold">{rating.toFixed(1)}</span>
      <span aria-hidden="true" className="text-neutral-dark/50">({count})</span>
    </p>
  );
}
