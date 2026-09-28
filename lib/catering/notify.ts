import "server-only";
import { isBrevoConfigured, sendHtmlEmail } from "@/lib/brevo";
import { formatEventDate } from "@/lib/catering/format";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CateringRequest } from "@/lib/supabase/types";

// Emails for a new catering / event quote request: an alert to the
// restaurant (reply goes straight to the customer) and a short "we got it"
// to the customer. Runs after the response via after(); failures are logged,
// never shown — the request is already saved and visible in admin.

const esc = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function detailsTable(r: CateringRequest) {
  const rows: [string, string | null][] = [
    ["Name", r.contact_name],
    ["Phone", r.contact_phone],
    ["Email", r.contact_email],
    ["Event", r.event_type],
    ["Date", formatEventDate(r.event_date)],
    ["Guests", String(r.guest_count)],
    ["Food", r.food_types.length ? r.food_types.join(", ") : null],
    ["Venue / area", r.venue],
    ["Budget", r.budget],
    ["Notes", r.notes],
  ];
  return `<table cellpadding="6" style="border-collapse:collapse;font-size:14px;color:#1a1a1a">${rows
    .filter(([, value]) => value)
    .map(
      ([label, value]) =>
        `<tr><td style="color:#5B5270;vertical-align:top;white-space:nowrap">${label}</td><td style="white-space:pre-line">${esc(value!)}</td></tr>`,
    )
    .join("")}</table>`;
}

function wrap(body: string) {
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#fbf8f3">${body}</div>`;
}

export async function notifyCateringRequest(requestId: string, siteUrl: string) {
  if (!isBrevoConfigured()) {
    console.warn("catering emails skipped: BREVO_API_KEY not set", requestId);
    return;
  }
  const admin = createAdminClient();
  const [{ data: request }, { data: settings }] = await Promise.all([
    admin.from("catering_requests").select("*").eq("id", requestId).single(),
    admin.from("site_settings").select("*").eq("id", 1).single(),
  ]);
  if (!request || !settings) {
    console.error("catering emails: couldn't load request", requestId);
    return;
  }
  const brand = settings.brand_name;

  const vendorEmail = settings.order_notification_email ?? process.env.BREVO_SENDER_EMAIL;
  if (vendorEmail) {
    try {
      await sendHtmlEmail({
        to: { email: vendorEmail, name: brand },
        senderName: brand,
        replyTo: { email: request.contact_email, name: request.contact_name },
        subject: `New event quote request: ${request.event_type}, ${formatEventDate(request.event_date)}`,
        html: wrap(
          `<h2 style="color:#3b2a60;margin:0 0 12px">New catering request</h2>
           <p style="font-size:14px">Reply to this email to answer ${esc(request.contact_name)} directly.</p>
           ${detailsTable(request)}
           <p style="margin-top:20px"><a href="${siteUrl}/admin/catering" style="color:#3b2a60">Open event requests</a></p>`,
        ),
        tags: ["catering-request-alert"],
      });
    } catch (e) {
      console.error("catering alert email failed:", requestId, (e as Error).message);
    }
  }

  try {
    await sendHtmlEmail({
      to: { email: request.contact_email, name: request.contact_name },
      senderName: brand,
      subject: `We've received your event request — ${brand}`,
      html: wrap(
        `<h2 style="color:#3b2a60;margin:0 0 12px">Thanks, ${esc(request.contact_name.split(" ")[0])}!</h2>
         <p style="font-size:14px">We've received your request and will get back to you with a quote soon. Here's what you sent:</p>
         ${detailsTable(request)}
         <p style="margin-top:20px;font-size:14px"><a href="${siteUrl}/account/catering" style="color:#3b2a60">See your requests</a></p>`,
      ),
      tags: ["catering-request-received"],
    });
  } catch (e) {
    console.error("catering confirmation email failed:", requestId, (e as Error).message);
  }
}
