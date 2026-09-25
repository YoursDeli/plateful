"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ReviewForm } from "@/components/reviews/review-form";

export type ReviewCardDish = {
  id: string;
  name: string;
  imageUrl: string | null;
  context: string; // "From order #K7Q2M · 12 Sep 2026" or "Reviewed 12 Sep 2026"
};

export type ReviewCardReview = { rating: number; comment: string | null; isHidden: boolean };

// One dish on /account/reviews: waiting for a review (review = null) or
// already reviewed (shows it, with Edit).
export function ReviewCard({ dish, review }: { dish: ReviewCardDish; review: ReviewCardReview | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <li className="flex flex-col gap-3 rounded-2xl bg-white card-accent p-4 shadow-sm sm:p-5">
      <div className="flex items-start gap-3">
        <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-primary/30">
          {dish.imageUrl && <Image src={dish.imageUrl} alt="" fill sizes="64px" className="object-cover" />}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Link href={`/menu/${dish.id}`} className="font-medium text-secondary hover:underline">
            {dish.name}
          </Link>
          <span className="text-xs text-neutral-dark/65">{dish.context}</span>
          {review && (
            <span className="mt-1 text-amber-500" aria-label={`You rated it ${review.rating} out of 5`}>
              {"★".repeat(review.rating)}
              <span aria-hidden="true" className="text-neutral-dark/20">
                {"★".repeat(5 - review.rating)}
              </span>
            </span>
          )}
        </div>
      </div>

      {review?.comment && !open && (
        <p className="text-sm whitespace-pre-line text-neutral-dark/80">{review.comment}</p>
      )}
      {review?.isHidden && !open && (
        <p className="text-xs text-neutral-dark/65">This review isn&apos;t shown publicly.</p>
      )}
      {saved && !open && (
        <p role="status" className="text-sm text-green-800">
          Thanks, your review is posted.
        </p>
      )}

      {open ? (
        <ReviewForm
          menuItemId={dish.id}
          dishName={dish.name}
          initialRating={review?.rating ?? 0}
          initialComment={review?.comment ?? ""}
          onCancel={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            setSaved(true);
            router.refresh();
          }}
        />
      ) : (
        <div className="flex">
          <button
            type="button"
            onClick={() => {
              setSaved(false);
              setOpen(true);
            }}
            className={
              review
                ? "rounded-btn border border-secondary/25 px-4 py-2 text-sm font-medium text-secondary hover:bg-primary/30"
                : "rounded-btn bg-primary px-4 py-2 text-sm font-semibold text-secondary"
            }
          >
            {review ? "Edit review" : "Write a review"}
          </button>
        </div>
      )}
    </li>
  );
}
