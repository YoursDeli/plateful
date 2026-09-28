import type { Metadata } from "next";
import Link from "next/link";
import { SignInPanel } from "@/components/auth/sign-in-panel";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth";
import { getSiteSettings } from "@/lib/site-settings";
import { CateringForm } from "./catering-form";

export const metadata: Metadata = {
  title: "Events & Catering",
  description: "Request a quote for weddings, birthdays, corporate events and more.",
};

// Catering / event quote requests (client, 2026-09-28): a form instead of a
// purchase. Signed-in customers only — sign-in happens inline, like checkout.
export default async function CateringPage() {
  const [user, profile, settings] = await Promise.all([getCurrentUser(), getCurrentProfile(), getSiteSettings()]);
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" }); // yyyy-mm-dd

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:py-14">
      <header className="flex flex-col gap-3">
        <p className="text-sm font-semibold tracking-wider text-secondary/80 uppercase">Events &amp; Catering</p>
        <h1 className="font-display text-4xl font-semibold text-secondary sm:text-5xl">Let us cook for your event</h1>
        <p className="text-neutral-dark/75">
          Weddings, birthdays, office parties, church programmes, family gatherings — {settings.brand_name} can cater
          it. Tell us about your event and we&apos;ll get back to you with a quote. There&apos;s no payment now.
        </p>
      </header>

      {user ? (
        <>
          <CateringForm
            name={profile?.full_name ?? ""}
            phone={profile?.phone ?? ""}
            email={user.email ?? null}
            minDate={today}
          />
          <p className="text-sm text-neutral-dark/70">
            Sent a request before?{" "}
            <Link href="/account/catering" className="font-medium text-secondary underline underline-offset-4">
              See your event requests
            </Link>
          </p>
        </>
      ) : (
        <section className="rounded-3xl bg-white card-accent p-5 shadow-sm sm:p-8">
          <h2 className="font-display text-2xl font-semibold text-secondary">Sign in to request a quote</h2>
          <p className="mt-1 mb-6 text-sm text-neutral-dark/70">
            A quick sign-in lets us reply to you and lets you see your requests in your account.
          </p>
          <SignInPanel next="/catering" />
        </section>
      )}
    </main>
  );
}
