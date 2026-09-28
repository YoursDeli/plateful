import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { formatEventDate } from "@/lib/catering/format";
import { CATERING_STATUS } from "@/lib/catering/status";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Event requests", robots: { index: false } };

// The customer's catering / event quote requests (RLS: own rows only).
export default async function MyCateringPage({ searchParams }: PageProps<"/account/catering">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account/catering");
  const { sent } = await searchParams;

  const supabase = await createClient();
  const { data: requests, error } = await supabase
    .from("catering_requests")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw new Error("Couldn't load your event requests.");

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:py-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-3xl font-semibold text-secondary sm:text-4xl">Event requests</h1>
        <Link href="/catering" className="rounded-btn bg-primary px-4 py-2 text-sm font-semibold text-secondary">
          New request
        </Link>
      </div>

      {sent === "1" && (
        <p role="status" className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-900">
          Thanks — your request is in. We&apos;ll get back to you with a quote soon.
        </p>
      )}

      {requests.length === 0 ? (
        <p className="rounded-2xl bg-white card-accent p-6 text-sm text-neutral-dark/70 shadow-sm">
          Planning an event?{" "}
          <Link href="/catering" className="font-medium text-secondary underline underline-offset-4">
            Request a catering quote
          </Link>{" "}
          and it will show up here.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {requests.map((r) => {
            const status = CATERING_STATUS[r.status];
            return (
              <li key={r.id} className="flex flex-col gap-2 rounded-2xl bg-white card-accent p-4 shadow-sm sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="font-medium text-secondary">{r.event_type}</span>
                    <span className="text-sm text-neutral-dark/70">
                      {formatEventDate(r.event_date)} · {r.guest_count} guests
                    </span>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${status.chip}`}>{status.customer}</span>
                </div>
                {r.food_types.length > 0 && <p className="text-sm text-neutral-dark/75">{r.food_types.join(", ")}</p>}
                {r.notes && <p className="text-sm whitespace-pre-line text-neutral-dark/75">{r.notes}</p>}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
