import type { Metadata } from "next";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth";
import { getSiteSettings } from "@/lib/site-settings";
import { CheckoutView } from "./checkout-view";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

// Account required to check out (docs/accounts-loyalty-and-images.md §1) —
// but a signed-out shopper signs in inline here instead of being bounced to
// another page, so they never lose their place or their cart.
export default async function CheckoutPage() {
  const [user, profile, settings] = await Promise.all([
    getCurrentUser(),
    getCurrentProfile(),
    getSiteSettings(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:py-12">
      <h1 className="font-display text-4xl font-semibold text-secondary sm:text-5xl">Checkout</h1>
      <CheckoutView
        signedIn={Boolean(user)}
        email={user?.email ?? null}
        profile={profile}
        pricing={{
          delivery_fee: settings.delivery_fee,
          free_delivery_threshold: settings.free_delivery_threshold,
        }}
      />
    </main>
  );
}
