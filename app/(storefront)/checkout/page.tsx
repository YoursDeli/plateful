import type { Metadata } from "next";
import Link from "next/link";
import { FaqList } from "@/components/content/faq-list";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth";
import { getSiteSettings } from "@/lib/site-settings";
import { getDeliveryZones, getFaqs } from "@/lib/storefront-extras";
import { CheckoutView } from "./checkout-view";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

// Account required to check out (docs/accounts-loyalty-and-images.md §1) —
// but a signed-out shopper signs in inline here instead of being bounced to
// another page, so they never lose their place or their cart.
export default async function CheckoutPage() {
  const [user, profile, settings, zones, faqs] = await Promise.all([
    getCurrentUser(),
    getCurrentProfile(),
    getSiteSettings(),
    getDeliveryZones(),
    getFaqs(),
  ]);
  const checkoutFaqs = faqs.filter((f) => f.show_on_checkout);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:py-12">
      <h1 className="font-display text-4xl font-semibold text-secondary sm:text-5xl">Checkout</h1>
      <CheckoutView
        signedIn={Boolean(user)}
        email={user?.email ?? null}
        profile={profile}
        zones={zones.map((z) => ({ id: z.id, name: z.name, fee: z.fee }))}
        pricing={{ free_delivery_threshold: settings.free_delivery_threshold }}
        loyalty={{
          loyalty_enabled: settings.loyalty_enabled,
          loyalty_points_per_1000: settings.loyalty_points_per_1000,
        }}
      />

      {checkoutFaqs.length > 0 && (
        <section
          aria-labelledby="checkout-faq-heading"
          className="flex flex-col gap-2 rounded-3xl bg-white card-accent p-5 shadow-sm sm:p-7 lg:max-w-[calc(100%-25.5rem)]"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="checkout-faq-heading" className="font-display text-2xl font-semibold text-secondary">
              Questions before you order?
            </h2>
            <Link href="/faq" className="text-sm font-medium text-secondary underline-offset-4 hover:underline">
              All FAQs
            </Link>
          </div>
          <FaqList faqs={checkoutFaqs} brandName={settings.brand_name} />
        </section>
      )}
    </main>
  );
}
