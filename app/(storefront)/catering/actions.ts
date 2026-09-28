"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { notifyCateringRequest } from "@/lib/catering/notify";
import { emptyToNull, formValues, type FormState } from "@/lib/form-state";
import { requestOrigin } from "@/lib/request-origin";
import { createClient } from "@/lib/supabase/server";
import { EVENT_TYPES, FOOD_TYPES } from "@/lib/supabase/types";

const schema = z.object({
  contact_name: z.string().trim().min(1, "Please enter your name").max(120),
  contact_phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9][0-9\s-]{6,18}$/, "Enter a valid phone number, e.g. 0803 123 4567"),
  event_type: z.enum(EVENT_TYPES, { error: "Choose the type of event" }),
  event_date: z.iso.date("Choose the date of the event"),
  guest_count: z
    .string()
    .trim()
    .regex(/^\d{1,5}$/, "Enter the number of guests, e.g. 150")
    .transform(Number)
    .pipe(z.number().int().min(1, "At least 1 guest").max(10000, "Up to 10,000 guests")),
  food_types: z.array(z.enum(FOOD_TYPES)).max(FOOD_TYPES.length),
  venue: z.string().trim().max(300, "Keep this under 300 characters").nullable(),
  budget: z.string().trim().max(120, "Keep this under 120 characters").nullable(),
  notes: z.string().trim().max(2000, "Keep notes under 2,000 characters").nullable(),
});

const FIELDS = ["contact_name", "contact_phone", "event_type", "event_date", "guest_count", "venue", "budget", "notes"] as const;

// Signed-in customers only (client). submit_catering_request() re-checks the
// session, the date and the daily limit, then the emails go out after the
// response.
export async function requestQuote(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in to request a quote." };

  const parsed = schema.safeParse({
    contact_name: formData.get("contact_name") ?? "",
    contact_phone: formData.get("contact_phone") ?? "",
    event_type: formData.get("event_type") ?? "",
    event_date: formData.get("event_date") ?? "",
    guest_count: formData.get("guest_count") ?? "",
    food_types: formData.getAll("food_types").map(String),
    venue: emptyToNull(formData.get("venue")),
    budget: emptyToNull(formData.get("budget")),
    notes: emptyToNull(String(formData.get("notes") ?? "").replace(/\r\n?/g, "\n")),
  });
  const values = { ...formValues(formData, FIELDS), food_types: formData.getAll("food_types").map(String).join("|") };
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }
  const f = parsed.data;

  const supabase = await createClient();
  const { data: id, error } = await supabase.rpc("submit_catering_request", {
    p_contact_name: f.contact_name,
    p_contact_phone: f.contact_phone,
    p_event_type: f.event_type,
    p_event_date: f.event_date,
    p_guest_count: f.guest_count,
    p_food_types: f.food_types,
    p_venue: f.venue,
    p_budget: f.budget,
    p_notes: f.notes,
  });
  if (error || !id) {
    // 42501 / 22023 carry our own customer-friendly messages.
    if (error && (error.code === "42501" || error.code === "22023")) return { error: error.message, values };
    console.error("submit_catering_request failed:", error?.code, error?.message);
    return { error: "Couldn't send your request. Please try again.", values };
  }

  const origin = await requestOrigin();
  after(() => notifyCateringRequest(id, origin));
  redirect("/account/catering?sent=1");
}
