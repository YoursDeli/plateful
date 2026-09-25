import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Your account", robots: { index: false } };

// Account overview (docs/site-sections-and-features.md §7). Navigation to
// orders / favourites / sign out lives in the dashboard side menu.
export default async function AccountPage() {
  const [profile, user] = await Promise.all([getCurrentProfile(), getCurrentUser()]);
  if (!profile) redirect("/login?next=/account");

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-8 sm:py-12">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-4xl font-semibold text-secondary">
          {profile.full_name ? `Hi, ${profile.full_name.split(" ")[0]}` : "Your account"}
        </h1>
        <p className="text-sm text-neutral-dark/60">Signed in as {user?.email}</p>
      </header>

      <section aria-labelledby="profile-heading" className="flex flex-col gap-4 rounded-3xl bg-white p-5 shadow-sm sm:p-7">
        <h2 id="profile-heading" className="font-display text-2xl font-semibold text-secondary">
          Your details
        </h2>
        <ProfileForm profile={profile} />
      </section>
    </main>
  );
}
