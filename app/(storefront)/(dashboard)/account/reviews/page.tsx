import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ReviewCard } from "./review-card";

export const metadata: Metadata = { title: "Reviews", robots: { index: false } };

const date = (iso: string) =>
  new Date(iso).toLocaleDateString("en-NG", { timeZone: "Africa/Lagos", day: "numeric", month: "short", year: "numeric" });

// Customer reviews live here, not on the dish page (client): dishes from
// delivered orders waiting for a review, then the reviews already posted.
// Reads use the customer's own session (RLS: own orders, items, reviews).
export default async function MyReviewsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account/reviews");

  const supabase = await createClient();
  const [{ data: orders }, { data: mine }] = await Promise.all([
    supabase
      .from("orders")
      .select("id, order_code, created_at")
      .eq("user_id", user.id)
      .eq("status", "delivered")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("reviews")
      .select("menu_item_id, rating, comment, is_hidden, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false }),
  ]);

  const orderIds = (orders ?? []).map((o) => o.id);
  const { data: lines } = orderIds.length
    ? await supabase.from("order_items").select("order_id, menu_item_id").in("order_id", orderIds)
    : { data: [] };

  // Each delivered dish once, from its most recent order (orders are newest first).
  const reviewed = new Set((mine ?? []).map((r) => r.menu_item_id));
  const pending = new Map<string, { orderCode: string; orderedAt: string }>();
  for (const order of orders ?? []) {
    for (const line of lines ?? []) {
      if (line.order_id !== order.id || !line.menu_item_id) continue;
      if (reviewed.has(line.menu_item_id) || pending.has(line.menu_item_id)) continue;
      pending.set(line.menu_item_id, { orderCode: order.order_code, orderedAt: order.created_at });
    }
  }

  const dishIds = [...new Set([...pending.keys(), ...reviewed])];
  const { data: dishes } = dishIds.length
    ? await supabase.from("menu_items").select("id, name, image_url").in("id", dishIds)
    : { data: [] };
  const dishById = new Map((dishes ?? []).map((d) => [d.id, d]));

  const waiting = [...pending].flatMap(([id, from]) => {
    const dish = dishById.get(id);
    return dish ? [{ dish, from }] : [];
  });
  const posted = (mine ?? []).flatMap((review) => {
    const dish = dishById.get(review.menu_item_id);
    return dish ? [{ dish, review }] : [];
  });

  const heading = "text-sm font-semibold tracking-wider text-neutral-dark/70 uppercase";

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-8 sm:py-12">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-semibold text-secondary sm:text-4xl">Reviews</h1>
        <p className="text-sm text-neutral-dark/70">Rate the dishes you&apos;ve received. Your reviews help other customers choose.</p>
      </div>

      <section aria-labelledby="waiting-heading" className="flex flex-col gap-3">
        <h2 id="waiting-heading" className={heading}>
          Waiting for your review
        </h2>
        {waiting.length === 0 ? (
          <p className="rounded-2xl bg-white card-accent p-5 text-sm text-neutral-dark/70 shadow-sm">
            {posted.length > 0 ? (
              "You're all caught up."
            ) : (
              <>
                Dishes from your delivered orders will appear here for you to rate.{" "}
                <Link href="/menu" className="font-medium text-secondary underline underline-offset-4">
                  Browse the Food Menu
                </Link>
              </>
            )}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {waiting.map(({ dish, from }) => (
              <ReviewCard
                key={dish.id}
                dish={{
                  id: dish.id,
                  name: dish.name,
                  imageUrl: dish.image_url,
                  context: `From order #${from.orderCode} · ${date(from.orderedAt)}`,
                }}
                review={null}
              />
            ))}
          </ul>
        )}
      </section>

      {posted.length > 0 && (
        <section aria-labelledby="posted-heading" className="flex flex-col gap-3">
          <h2 id="posted-heading" className={heading}>
            Your reviews
          </h2>
          <ul className="flex flex-col gap-3">
            {posted.map(({ dish, review }) => (
              <ReviewCard
                key={dish.id}
                dish={{
                  id: dish.id,
                  name: dish.name,
                  imageUrl: dish.image_url,
                  context: `Reviewed ${date(review.updated_at)}`,
                }}
                review={{ rating: review.rating, comment: review.comment, isHidden: review.is_hidden }}
              />
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
