import { getSiteSettings } from "@/lib/site-settings";

// Placeholder until Build Order step 2 (hero + menu browse).
export default async function HomePage() {
  const { brand_name } = await getSiteSettings();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="font-display text-4xl font-semibold text-secondary sm:text-5xl">
        {brand_name}
      </h1>
      <p className="text-neutral-dark/70">The storefront is coming soon.</p>
    </main>
  );
}
