import type { Metadata } from "next";
import Link from "next/link";
import { FaqList } from "@/components/content/faq-list";
import { getSiteSettings } from "@/lib/site-settings";
import { getFaqs } from "@/lib/storefront-extras";

export const revalidate = 3600;
export const metadata: Metadata = { title: "FAQ" };

// Frequently asked questions — edited in Admin → Pages → FAQ.
export default async function FaqPage() {
  const [faqs, settings] = await Promise.all([getFaqs(), getSiteSettings()]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:py-14">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-4xl font-semibold text-secondary sm:text-5xl">Frequently asked questions</h1>
        <p className="text-neutral-dark/70">Quick answers about ordering, delivery and payment.</p>
      </header>
      {faqs.length === 0 ? (
        <p className="rounded-3xl bg-white card-accent p-6 text-sm text-neutral-dark/70 shadow-sm">
          Questions and answers are coming soon.
        </p>
      ) : (
        <section className="rounded-3xl bg-white card-accent px-5 py-2 shadow-sm sm:px-8">
          <FaqList faqs={faqs} brandName={settings.brand_name} />
        </section>
      )}
      <p className="text-sm text-neutral-dark/70">
        Still have a question? Reach us using the contact details below, or{" "}
        <Link href="/menu" className="font-medium text-secondary underline underline-offset-4">
          browse the Food Menu
        </Link>
        .
      </p>
    </main>
  );
}
