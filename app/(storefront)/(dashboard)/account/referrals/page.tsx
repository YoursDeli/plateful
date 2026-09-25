import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { formatNaira } from "@/lib/money";
import { requestOrigin } from "@/lib/request-origin";
import { getSiteSettings } from "@/lib/site-settings";
import { createClient } from "@/lib/supabase/server";
import { ReferralLinkBox } from "./referral-link-box";

export const metadata: Metadata = { title: "Refer & earn", robots: { index: false } };

// Start of the current month in Lagos time, as an ISO timestamp.
function startOfMonthLagos() {
  const now = new Date();
  const lagos = new Date(now.toLocaleString("en-US", { timeZone: "Africa/Lagos" }));
  const offsetMs = lagos.getTime() - now.getTime();
  return new Date(Date.UTC(lagos.getFullYear(), lagos.getMonth(), 1) - offsetMs).toISOString();
}

// docs/pages-referrals-footer.md §5 — link + 3 stat cards.
export default async function ReferralsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?next=/account/referrals");

  const supabase = await createClient();
  const [settings, origin, monthly, allTime, pending] = await Promise.all([
    getSiteSettings(),
    requestOrigin(),
    supabase
      .from("referrals")
      .select("id", { count: "exact", head: true })
      .eq("referrer_id", profile.id)
      .eq("status", "completed")
      .gte("completed_at", startOfMonthLagos()),
    supabase
      .from("referrals")
      .select("id", { count: "exact", head: true })
      .eq("referrer_id", profile.id)
      .eq("status", "completed"),
    supabase
      .from("referrals")
      .select("id", { count: "exact", head: true })
      .eq("referrer_id", profile.id)
      .eq("status", "pending"),
  ]);

  const link = `${origin}/?ref=${profile.referral_code}`;
  const card = "flex flex-col gap-1 rounded-3xl bg-white card-accent p-5 shadow-sm";

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:py-12">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-4xl font-semibold text-secondary">Refer &amp; earn</h1>
        <p className="text-neutral-dark/70">
          Share your link. When a friend signs up with it and their first order is delivered, you get{" "}
          <strong>{formatNaira(settings.referral_bonus_amount)}</strong> to spend at checkout.
        </p>
      </header>

      <ReferralLinkBox link={link} brandName={settings.brand_name} />

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <li className={card}>
          <span className="text-sm text-neutral-dark/60">Referrals</span>
          <span className="font-display text-4xl font-semibold text-secondary tabular-nums">{monthly.count ?? 0}</span>
          <span className="text-xs text-neutral-dark/55">
            this month · {allTime.count ?? 0} all time
            {pending.count ? ` · ${pending.count} waiting for a first delivery` : ""}
          </span>
        </li>
        <li className={card}>
          <span className="text-sm text-neutral-dark/60">Available bonus</span>
          <span className="font-display text-4xl font-semibold text-secondary tabular-nums">
            {formatNaira(profile.referral_balance)}
          </span>
          <span className="text-xs text-neutral-dark/55">Usable at checkout</span>
        </li>
        <li className={card}>
          <span className="text-sm text-neutral-dark/60">Total earned</span>
          <span className="font-display text-4xl font-semibold text-secondary tabular-nums">
            {formatNaira(profile.referral_earned_total)}
          </span>
          <span className="text-xs text-neutral-dark/55">All time</span>
        </li>
      </ul>

      <p className="text-xs text-neutral-dark/55">
        Bonuses can only be used towards food at checkout — they can&apos;t be withdrawn. Only new accounts created
        with your link count, and you can&apos;t refer yourself.
      </p>
    </main>
  );
}
