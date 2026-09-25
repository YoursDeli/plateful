import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Account", robots: { index: false } };

// Account settings (docs/site-sections-and-features.md §7): profile details +
// default delivery address. The dashboard's home screen is Orders; navigation
// and sign out live in the side menu.
export default async function AccountPage() {
  const [profile, user] = await Promise.all([getCurrentProfile(), getCurrentUser()]);
  if (!profile) redirect("/login?next=/account");

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-8 sm:py-12">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-4xl font-semibold text-secondary">Account</h1>
        <p className="text-sm text-neutral-dark/65">Signed in as {user?.email}</p>
      </header>

      <ProfileForm profile={profile} />
    </main>
  );
}
