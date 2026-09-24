import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { getSiteSettings } from "@/lib/site-settings";
import { signOut } from "./actions";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin" },
  robots: { index: false, follow: false },
};

const NAV = [
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/menu", label: "Menu" },
  { href: "/admin/settings", label: "Settings" },
] as const;

// Server-side gate for the whole /(admin) group. Layouts don't re-run on
// client navigation between child pages, so each page and server action
// also calls requireStaff() itself — this is not the only check.
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const profile = await requireStaff();
  const { brand_name } = await getSiteSettings();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="bg-secondary text-white">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/admin/orders" className="font-display text-lg font-semibold">
            {brand_name} <span className="font-sans text-sm font-normal text-primary">admin</span>
          </Link>
          <nav className="order-3 -mx-4 flex w-full gap-1 overflow-x-auto px-4 sm:order-none sm:mx-0 sm:w-auto sm:px-0">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full px-3 py-1.5 text-sm hover:bg-white/10"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <form action={signOut} className="ml-auto flex items-center gap-3 text-sm">
            <span className="hidden text-white/70 sm:inline">{profile.full_name ?? profile.role}</span>
            <button type="submit" className="rounded-full border border-white/30 px-3 py-1.5 hover:bg-white/10">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:py-8">{children}</main>
    </div>
  );
}
