import { SignOutButton } from "@/components/auth/sign-out-button";
import { SideNav, type NavItem } from "@/components/layout/side-nav";
import { getCurrentProfile, isStaffRole } from "@/lib/auth";

// Customer dashboard shell: /account, /account/orders, /favorites and order
// pages share this side menu (a slide-in drawer on mobile). The route group
// doesn't change URLs. Each page still enforces sign-in itself.
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();

  // Orders is the customer's home screen (client: no overview page).
  const items: NavItem[] = [
    { href: "/account/orders", label: "Orders", icon: "orders", alsoActiveFor: ["/orders"] },
    { href: "/favorites", label: "Favourites", icon: "favorites" },
    { href: "/account/referrals", label: "Refer & earn", icon: "referrals" },
    { href: "/account", label: "Account", icon: "overview", exact: true },
    ...(isStaffRole(profile) ? [{ href: "/admin/orders", label: "Staff dashboard", icon: "staff" } as NavItem] : []),
  ];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col lg:flex-row lg:gap-6 lg:px-4">
      {profile && (
        <SideNav
          variant="account"
          heading="Your account"
          mobileTitle={<span className="text-sm text-neutral-dark/60">Your account</span>}
          items={items}
          footer={
            <SignOutButton className="w-full rounded-btn border border-secondary/25 px-4 py-2 text-sm font-medium text-secondary hover:bg-primary/30 disabled:opacity-60" />
          }
        />
      )}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
