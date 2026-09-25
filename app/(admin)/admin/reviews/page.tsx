import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { setReviewHidden } from "./actions";

export const metadata: Metadata = { title: "Reviews" };

const date = (iso: string) =>
  new Date(iso).toLocaleDateString("en-NG", { timeZone: "Africa/Lagos", day: "numeric", month: "short", year: "numeric" });

// Reviews appear on the dish page straight away (client decision); staff can
// hide any of them here. Newest first.
export default async function AdminReviewsPage() {
  await requireStaff("/admin/reviews");

  const supabase = await createClient();
  const { data: reviews, error } = await supabase.rpc("admin_reviews", { p_limit: 200 });
  if (error) throw new Error("Couldn't load reviews.");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-semibold text-secondary sm:text-3xl">Reviews</h1>
        <p className="text-sm text-neutral-dark/70">
          Only customers who received a dish can review it. Hidden reviews don&apos;t appear on the site or count
          towards the star rating.
        </p>
      </div>

      {reviews.length === 0 ? (
        <p className="rounded-xl bg-white card-accent p-6 text-center text-sm text-neutral-dark/70 shadow-sm">
          No reviews yet. They&apos;ll appear here as customers rate their delivered dishes.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {reviews.map((r) => (
            <li
              key={r.id}
              className={`flex flex-col gap-3 rounded-xl bg-white card-accent p-4 shadow-sm sm:p-5 ${r.is_hidden ? "opacity-70" : ""}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <Link href={`/menu/${r.menu_item_id}#reviews`} className="font-medium text-secondary hover:underline">
                    {r.dish_name}
                  </Link>
                  <span className="text-xs text-neutral-dark/65">
                    {r.reviewer_name} · {date(r.created_at)}
                  </span>
                </div>
                <span className="text-amber-500" aria-label={`${r.rating} out of 5`}>
                  {"★".repeat(r.rating)}
                  <span aria-hidden="true" className="text-neutral-dark/20">
                    {"★".repeat(5 - r.rating)}
                  </span>
                </span>
              </div>
              {r.comment && <p className="text-sm whitespace-pre-line text-neutral-dark/80">{r.comment}</p>}
              <form action={setReviewHidden} className="flex items-center justify-between gap-3">
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="hidden" value={r.is_hidden ? "false" : "true"} />
                {r.is_hidden ? (
                  <span className="rounded-full bg-neutral-dark/10 px-2.5 py-0.5 text-xs font-medium text-neutral-dark/80">
                    Hidden
                  </span>
                ) : (
                  <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-900">
                    Visible
                  </span>
                )}
                <button
                  type="submit"
                  className="rounded-btn border border-secondary/25 px-3 py-1.5 text-sm font-medium text-secondary hover:bg-primary/30"
                >
                  {r.is_hidden ? "Show on site" : "Hide"}
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
