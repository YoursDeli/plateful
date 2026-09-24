import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { getCurrentProfile, getCurrentUser, isStaffRole } from "@/lib/auth";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Your account", robots: { index: false } };

// docs/site-sections-and-features.md §7. Referrals (step 9) join this page
// in their own build step.
export default async function AccountPage() {
  const [profile, user] = await Promise.all([getCurrentProfile(), getCurrentUser()]);
  if (!profile) redirect("/login?next=/account");

  const tile =
    "flex items-center justify-between rounded-2xl bg-white px-5 py-4 font-medium text-secondary shadow-sm ring-1 ring-secondary/5 transition hover:bg-primary/30";

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-8 sm:py-12">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-4xl font-semibold text-secondary">
          {profile.full_name ? `Hi, ${profile.full_name.split(" ")[0]}` : "Your account"}
        </h1>
        <p className="text-sm text-neutral-dark/60">Signed in as {user?.email}</p>
      </header>

      <nav aria-label="Account" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link href="/favorites" className={tile}>
          Your favourites <span aria-hidden="true">→</span>
        </Link>
        <Link href="/account/orders" className={tile}>
          Your orders <span aria-hidden="true">→</span>
        </Link>
        {isStaffRole(profile) && (
          <Link href="/admin/menu" className={tile}>
            Staff dashboard <span aria-hidden="true">→</span>
          </Link>
        )}
      </nav>

      <section aria-labelledby="profile-heading" className="flex flex-col gap-4 rounded-3xl bg-white p-5 shadow-sm sm:p-7">
        <h2 id="profile-heading" className="font-display text-2xl font-semibold text-secondary">
          Your details
        </h2>
        <ProfileForm profile={profile} />
      </section>

      <SignOutButton className="self-start rounded-full border border-secondary/30 px-5 py-2.5 text-sm font-medium text-secondary hover:bg-primary/30 disabled:opacity-60" />
    </main>
  );
}
