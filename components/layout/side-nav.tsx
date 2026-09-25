"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

// Dashboard side navigation (admin + customer account). Desktop (lg+): a
// sticky sidebar. Mobile/tablet: a "Menu" button that slides the same nav in
// from the left as a drawer. Native <dialog> gives focus trapping, Esc to
// close and an inert page behind it; it also closes on backdrop tap and on
// navigation. Purely navigation — access control stays server-side.

export type NavIcon = "orders" | "menu" | "settings" | "overview" | "favorites" | "staff" | "referrals" | "pages";

export type NavItem = {
  href: string;
  label: string;
  icon: NavIcon;
  // Extra path prefixes that should also highlight this item.
  alsoActiveFor?: string[];
  exact?: boolean;
};

const ICON_PATHS: Record<NavIcon, React.ReactNode> = {
  orders: (
    <>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
      <path d="M9 8h6M9 12h6" />
    </>
  ),
  menu: (
    <>
      <path d="M4 5h16M4 12h16M4 19h10" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </>
  ),
  overview: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" />
    </>
  ),
  favorites: (
    <path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.4 4.5 7 4.5c2 0 3.4 1.1 5 3 1.6-1.9 3-3 5-3 3.6 0 5.6 3.5 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2Z" />
  ),
  staff: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </>
  ),
  referrals: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c1-3.2 3.4-5 6.5-5s5.5 1.8 6.5 5" />
      <path d="M17 8v6M14 11h6" />
    </>
  ),
  pages: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </>
  ),
};

function Icon({ name }: { name: NavIcon }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {ICON_PATHS[name]}
    </svg>
  );
}

const THEMES = {
  admin: {
    panel: "bg-secondary text-white",
    heading: "text-primary",
    link: "text-white/80 hover:bg-white/10 hover:text-white",
    active: "bg-primary text-secondary",
    divider: "border-white/15",
    trigger: "bg-secondary text-white",
    triggerButton: "border-white/30 text-white hover:bg-white/10",
  },
  account: {
    panel: "bg-white text-neutral-dark",
    heading: "text-secondary",
    link: "text-neutral-dark/75 hover:bg-primary/30 hover:text-secondary",
    active: "bg-primary text-secondary",
    divider: "border-secondary/10",
    trigger: "bg-transparent text-secondary",
    triggerButton: "border-secondary/25 text-secondary hover:bg-primary/30",
  },
} as const;

function NavList({
  items,
  theme,
  onNavigate,
}: {
  items: NavItem[];
  theme: (typeof THEMES)[keyof typeof THEMES];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const isActive = (item: NavItem) =>
    item.exact
      ? pathname === item.href
      : [item.href, ...(item.alsoActiveFor ?? [])].some((p) => pathname === p || pathname.startsWith(`${p}/`));

  return (
    <ul className="flex flex-col gap-1">
      {items.map((item) => {
        const active = isActive(item);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-btn px-3 py-2.5 text-sm font-medium transition ${
                active ? theme.active : theme.link
              }`}
            >
              <Icon name={item.icon} />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function SideNav({
  variant,
  heading,
  items,
  footer,
  mobileTitle,
}: {
  variant: keyof typeof THEMES;
  heading: React.ReactNode; // brand (admin) or "Your account"
  items: NavItem[];
  footer?: React.ReactNode; // e.g. signed-in name + sign out
  mobileTitle?: React.ReactNode; // shown beside the Menu button on small screens
}) {
  const theme = THEMES[variant];
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();

  // Close the drawer whenever the route changes.
  useEffect(() => {
    dialogRef.current?.close();
  }, [pathname]);

  const close = () => dialogRef.current?.close();

  return (
    <>
      {/* Mobile / tablet: Menu button bar */}
      <div className={`flex items-center gap-3 px-4 py-3 lg:hidden ${theme.trigger}`}>
        <button
          type="button"
          onClick={() => dialogRef.current?.showModal()}
          aria-haspopup="dialog"
          className={`flex items-center gap-2 rounded-btn border px-3 py-2 text-sm font-medium ${theme.triggerButton}`}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          Menu
        </button>
        {mobileTitle && <div className="min-w-0 truncate">{mobileTitle}</div>}
      </div>

      {/* Mobile / tablet: slide-in drawer */}
      <dialog
        ref={dialogRef}
        aria-label="Navigation"
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
        className={`fixed inset-y-0 right-auto left-0 m-0 h-dvh max-h-dvh w-[85%] max-w-xs p-0 shadow-2xl backdrop:bg-secondary/40 backdrop:backdrop-blur-sm open:animate-slide-in-left lg:hidden ${theme.panel}`}
      >
        <div className="flex h-full flex-col">
          <div className={`flex items-center justify-between gap-3 border-b px-4 py-4 ${theme.divider}`}>
            <div className={`min-w-0 truncate font-display text-lg font-semibold ${theme.heading}`}>{heading}</div>
            <button
              type="button"
              onClick={close}
              aria-label="Close menu"
              className="flex size-9 shrink-0 items-center justify-center rounded-full opacity-80 hover:opacity-100"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
          <nav aria-label={variant === "admin" ? "Admin" : "Account"} className="flex-1 overflow-y-auto px-3 py-4">
            <NavList items={items} theme={theme} onNavigate={close} />
          </nav>
          {footer && <div className={`border-t px-4 py-4 ${theme.divider}`}>{footer}</div>}
        </div>
      </dialog>

      {/* Desktop: sticky sidebar */}
      <aside
        className={`hidden w-60 shrink-0 lg:block ${variant === "admin" ? "lg:min-h-dvh" : "lg:pt-8"}`}
      >
        <div
          className={`flex flex-col lg:sticky ${
            variant === "admin" ? `top-0 min-h-dvh ${theme.panel}` : `top-24 rounded-2xl p-3 shadow-sm ${theme.panel}`
          }`}
        >
          <div className={`px-4 py-5 font-display text-lg font-semibold ${theme.heading}`}>{heading}</div>
          <nav aria-label={variant === "admin" ? "Admin" : "Account"} className="flex-1 px-3">
            <NavList items={items} theme={theme} />
          </nav>
          {footer && <div className={`mt-4 border-t px-4 py-4 ${theme.divider}`}>{footer}</div>}
        </div>
      </aside>
    </>
  );
}
