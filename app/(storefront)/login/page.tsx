import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignInPanel } from "@/components/auth/sign-in-panel";
import { getCurrentProfile } from "@/lib/auth";
import { safeNextPath } from "@/lib/safe-redirect";
import { getSiteSettings } from "@/lib/site-settings";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next: rawNext, error } = await searchParams;
  const next = safeNextPath(rawNext);

  // Already signed in → carry on to where they were going.
  if (await getCurrentProfile()) redirect(next);

  const { brand_name } = await getSiteSettings();

  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-12">
      {/* Soft brand backdrop */}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/60 via-neutral-light to-neutral-light" />
      <div aria-hidden="true" className="absolute -top-24 -right-24 -z-10 size-72 rounded-full bg-secondary/10 blur-3xl" />

      <div className="w-full max-w-sm animate-rise-in rounded-3xl border border-white/60 bg-white/85 p-6 shadow-xl backdrop-blur-md sm:p-8">
        <div className="mb-6 flex flex-col gap-1.5 text-center">
          <h1 className="font-display text-3xl font-semibold text-secondary">Welcome</h1>
          <p className="text-sm text-neutral-dark/65">
            Sign in to {brand_name} to save favourites and check out.
          </p>
        </div>
        <SignInPanel next={next} initialError={typeof error === "string" ? error : null} />
      </div>
    </main>
  );
}
