import type { Metadata } from "next";
import Link from "next/link";
import { SideNav, type NavItem } from "@/components/layout/side-nav";
import { requireStaff } from "@/lib/auth";
import { getSiteSettings } from "@/lib/site-settings";
import { signOut } from "./actions";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin" },
  robots: { index: false, follow: false },
};

const NAV: NavItem[] = [
  { href: "/admin", label: "Overview", icon: "staff", exact: true },
  { href: "/admin/orders", label: "Orders", icon: "orders" },
  { href: "/admin/menu", label: "Food Menu", icon: "menu" },
  { href: "/admin/settings", label: "Settings", icon: "settings" },
];

// Server-side gate for the whole /(admin) group. Layouts don't re-run on
// client navigation between child pages, so each page and server action
// also calls requireStaff() itself — this is not the only check.
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const profile = await requireStaff();
  const { brand_name } = await getSiteSettings();

  const brand = (
    <Link href="/admin">
      {brand_name} <span className="font-sans text-sm font-normal text-primary/80">admin</span>
    </Link>
  );

  return (
    <div className="flex min-h-full flex-1 flex-col lg:flex-row">
      <SideNav
        variant="admin"
        heading={brand}
        mobileTitle={<span className="font-display text-lg font-semibold">{brand_name}</span>}
        items={NAV}
        footer={
          <form action={signOut} className="flex flex-col gap-2 text-sm">
            <span className="truncate text-white/70">{profile.full_name ?? profile.role}</span>
            <div className="flex flex-wrap gap-2">
              <Link href="/" className="rounded-btn border border-white/30 px-3 py-1.5 hover:bg-white/10">
                View site
              </Link>
              <button type="submit" className="rounded-btn border border-white/30 px-3 py-1.5 hover:bg-white/10">
                Sign out
              </button>
            </div>
          </form>
        }
      />
      <main className="w-full min-w-0 flex-1 px-4 py-6 sm:py-8 lg:px-8">
        <div className="mx-auto w-full max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
