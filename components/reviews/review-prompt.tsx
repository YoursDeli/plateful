"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { submitReview } from "@/app/(storefront)/menu/[itemId]/actions";
import { createClient } from "@/lib/supabase/client";
import type { MyReviewStatus } from "@/lib/supabase/types";

type State =
  | { kind: "loading" }
  | { kind: "signed-out" }
  | { kind: "not-eligible" }
  | { kind: "eligible"; mine: MyReviewStatus };

const LABELS = ["Poor", "Fair", "Good", "Very good", "Excellent"];

async function loadState(menuItemId: string): Promise<State> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { kind: "signed-out" };

  const { data, error } = await supabase.rpc("my_review_status", { p_menu_item_id: menuItemId });
  if (error) console.error("my_review_status failed:", error.message);
  const mine = data?.[0];
  return mine?.can_review ? { kind: "eligible", mine } : { kind: "not-eligible" };
}

// The dish page is statically cached, so who-may-review is looked up in the
// browser. Only customers whose order with this dish was delivered get the
// form (enforced again server-side by submit_review()).
export function ReviewPrompt({ menuItemId, dishName }: { menuItemId: string; dishName: string }) {
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    loadState(menuItemId).then((next) => {
      if (cancelled) return;
      setState(next);
      if (next.kind === "eligible") {
        setRating(next.mine.rating ?? 0);
        setComment(next.mine.comment ?? "");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [menuItemId]);

  if (state.kind === "loading") return null;

  if (state.kind === "signed-out") {
    return (
      <p className="text-sm text-neutral-dark/70">
        Ordered this dish?{" "}
        <Link
          href={`/login?next=${encodeURIComponent(`/menu/${menuItemId}`)}`}
          className="font-medium text-secondary underline underline-offset-4"
        >
          Sign in
        </Link>{" "}
        to leave a review.
      </p>
    );
  }

  if (state.kind === "not-eligible") {
    return (
      <p className="text-sm text-neutral-dark/70">
        You can review this dish once an order with it has been delivered to you.
      </p>
    );
  }

  const hasReview = state.mine.rating !== null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (rating < 1) {
      setError("Choose a star rating.");
      return;
    }
    startTransition(async () => {
      const result = await submitReview({ menuItemId, rating, comment });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setState((s) => (s.kind === "eligible" ? { ...s, mine: { ...s.mine, rating, comment } } : s));
      setSaved(true);
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <div className="flex flex-col items-start gap-2">
        {saved && (
          <p role="status" className="text-sm text-green-800">
            Thanks — your review is posted.
          </p>
        )}
        {hasReview && state.mine.is_hidden && (
          <p className="text-sm text-neutral-dark/70">Your review for this dish isn&apos;t shown publicly.</p>
        )}
        <button
          type="button"
          onClick={() => {
            setSaved(false);
            setOpen(true);
          }}
          className="rounded-btn border border-secondary/25 bg-white px-4 py-2 text-sm font-medium text-secondary hover:bg-primary/30"
        >
          {hasReview ? "Edit your review" : "Write a review"}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 rounded-2xl bg-white card-accent p-4 shadow-sm sm:p-5">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Your rating for {dishName}</legend>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer">
              <input
                type="radio"
                name="rating"
                value={n}
                checked={rating === n}
                onChange={() => setRating(n)}
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                className={`block rounded-md px-0.5 text-3xl leading-none transition peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-secondary ${
                  n <= rating ? "text-amber-500" : "text-neutral-dark/20 hover:text-amber-300"
                }`}
              >
                ★
              </span>
              <span className="sr-only">
                {n} star{n === 1 ? "" : "s"}, {LABELS[n - 1]}
              </span>
            </label>
          ))}
          {rating > 0 && <span className="ml-2 text-sm text-neutral-dark/70">{LABELS[rating - 1]}</span>}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        <span>
          Your review <span className="font-normal text-neutral-dark/65">(optional)</span>
        </span>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          maxLength={1000}
          placeholder="How was the taste, the portion, the delivery?"
          className="w-full rounded-lg border border-neutral-dark/20 bg-white px-3 py-2.5 text-base font-normal outline-none focus:border-secondary focus:ring-2 focus:ring-primary sm:text-sm"
        />
      </label>

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-btn border border-secondary/20 px-5 py-2.5 text-sm font-medium text-secondary"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-btn bg-primary px-5 py-2.5 text-sm font-semibold text-secondary disabled:opacity-60"
        >
          {pending ? "Posting…" : hasReview ? "Update review" : "Post review"}
        </button>
      </div>
    </form>
  );
}
