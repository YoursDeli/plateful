import type { CateringStatus } from "@/lib/supabase/types";

// Status wording + chip colours for catering requests (customer + admin).
export const CATERING_STATUS: Record<CateringStatus, { label: string; customer: string; chip: string }> = {
  new: { label: "New", customer: "Received — we'll be in touch", chip: "bg-primary/60 text-secondary" },
  contacted: { label: "Contacted", customer: "We've been in touch", chip: "bg-sky-100 text-sky-900" },
  quoted: { label: "Quote sent", customer: "Quote sent", chip: "bg-amber-100 text-amber-900" },
  booked: { label: "Booked", customer: "Booked", chip: "bg-green-100 text-green-900" },
  declined: { label: "Declined", customer: "Not available", chip: "bg-neutral-dark/10 text-neutral-dark/80" },
};
