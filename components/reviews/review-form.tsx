"use client";

import { useState, useTransition } from "react";
import { submitReview } from "@/app/(storefront)/(dashboard)/account/reviews/actions";

const LABELS = ["Poor", "Fair", "Good", "Very good", "Excellent"];

// Star picker + optional comment. Used on /account/reviews for both new and
// edited reviews; submit_review() re-checks the dish was delivered to them.
export function ReviewForm({
  menuItemId,
  dishName,
  initialRating = 0,
  initialComment = "",
  onCancel,
  onSaved,
}: {
  menuItemId: string;
  dishName: string;
  initialRating?: number;
  initialComment?: string;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [rating, setRating] = useState(initialRating);
  const [comment, setComment] = useState(initialComment);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const editing = initialRating > 0;

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
      onSaved();
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 border-t border-secondary/10 pt-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Your rating for {dishName}</legend>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer">
              <input
                type="radio"
                name={`rating-${menuItemId}`}
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
          onClick={onCancel}
          className="rounded-btn border border-secondary/20 px-5 py-2.5 text-sm font-medium text-secondary"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-btn bg-primary px-5 py-2.5 text-sm font-semibold text-secondary disabled:opacity-60"
        >
          {pending ? "Posting…" : editing ? "Update review" : "Post review"}
        </button>
      </div>
    </form>
  );
}
