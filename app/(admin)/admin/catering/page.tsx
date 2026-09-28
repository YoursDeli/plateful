import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { formatEventDate } from "@/lib/catering/format";
import { CATERING_STATUS } from "@/lib/catering/status";
import { createClient } from "@/lib/supabase/server";
import { RequestStatusForm } from "./request-status-form";

export const metadata: Metadata = { title: "Event requests" };

const received = (iso: string) =>
  new Date(iso).toLocaleString("en-NG", { timeZone: "Africa/Lagos", dateStyle: "medium", timeStyle: "short" });

// Catering / event quote requests, newest first. The status is what the
// customer sees in their dashboard; staff notes stay private.
export default async function AdminCateringPage() {
  await requireStaff("/admin/catering");
  const supabase = await createClient();
  const { data: requests, error } = await supabase
    .from("catering_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error("Couldn't load event requests.");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-semibold text-secondary sm:text-3xl">Event requests</h1>
        <p className="text-sm text-neutral-dark/70">
          Catering quote requests from customers. You also get an email for each new one — reply to it to answer the
          customer directly.
        </p>
      </div>

      {requests.length === 0 ? (
        <p className="rounded-xl bg-white card-accent p-6 text-center text-sm text-neutral-dark/70 shadow-sm">
          No event requests yet. They&apos;ll appear here when customers use the Events &amp; Catering form.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {requests.map((r) => (
            <li key={r.id} className="flex flex-col gap-3 rounded-xl bg-white card-accent p-4 shadow-sm sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex flex-col">
                  <span className="font-medium text-secondary">
                    {r.event_type} · {r.guest_count} guests
                  </span>
                  <span className="text-sm text-neutral-dark/75">{formatEventDate(r.event_date)}</span>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${CATERING_STATUS[r.status].chip}`}>
                  {CATERING_STATUS[r.status].label}
                </span>
              </div>

              <dl className="grid grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-[8rem_minmax(0,1fr)]">
                <dt className="text-neutral-dark/65">Customer</dt>
                <dd>{r.contact_name}</dd>
                <dt className="text-neutral-dark/65">Phone</dt>
                <dd>
                  <a href={`tel:${r.contact_phone.replace(/\s/g, "")}`} className="text-secondary underline">
                    {r.contact_phone}
                  </a>
                </dd>
                <dt className="text-neutral-dark/65">Email</dt>
                <dd className="truncate">
                  <a href={`mailto:${r.contact_email}`} className="text-secondary underline">
                    {r.contact_email}
                  </a>
                </dd>
                {r.food_types.length > 0 && (
                  <>
                    <dt className="text-neutral-dark/65">Food</dt>
                    <dd>{r.food_types.join(", ")}</dd>
                  </>
                )}
                {r.venue && (
                  <>
                    <dt className="text-neutral-dark/65">Venue / area</dt>
                    <dd>{r.venue}</dd>
                  </>
                )}
                {r.budget && (
                  <>
                    <dt className="text-neutral-dark/65">Budget</dt>
                    <dd>{r.budget}</dd>
                  </>
                )}
                {r.notes && (
                  <>
                    <dt className="text-neutral-dark/65">Notes</dt>
                    <dd className="whitespace-pre-line">{r.notes}</dd>
                  </>
                )}
                <dt className="text-neutral-dark/65">Received</dt>
                <dd>{received(r.created_at)}</dd>
              </dl>

              <RequestStatusForm id={r.id} status={r.status} staffNotes={r.staff_notes} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
