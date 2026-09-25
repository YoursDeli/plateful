import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BrandingForm } from "./branding-form";
import { ContactForm } from "./contact-form";
import { DeliveryForm } from "./delivery-form";
import { LoyaltyForm } from "./loyalty-form";
import { NotificationsForm } from "./notifications-form";
import { ReferralsForm } from "./referrals-form";

export const metadata: Metadata = { title: "Settings" };

// Branding, Delivery, Referrals, Loyalty, Contact, Notifications. Pages
// (step 11) tabs are added to this page in their own build steps.
export default async function AdminSettingsPage() {
  await requireStaff("/admin/settings");

  const supabase = await createClient();
  const { data: settings, error } = await supabase
    .from("site_settings")
    .select("*")
    .eq("id", 1)
    .single();
  if (error) throw new Error("Couldn't load site settings.");

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold text-secondary sm:text-3xl">Settings</h1>
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-dark/60">Branding</h2>
        <BrandingForm settings={settings} />
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-dark/60">Delivery</h2>
        <DeliveryForm settings={settings} />
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-dark/60">Referrals</h2>
        <ReferralsForm amount={settings.referral_bonus_amount} />
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-dark/60">Loyalty points</h2>
        <LoyaltyForm enabled={settings.loyalty_enabled} rate={settings.loyalty_points_per_1000} />
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-dark/60">Contact</h2>
        <ContactForm whatsapp={settings.whatsapp_number} />
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-dark/60">Notifications</h2>
        <NotificationsForm email={settings.order_notification_email} />
      </section>
    </div>
  );
}
