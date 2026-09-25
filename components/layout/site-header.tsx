import Image from "next/image";
import Link from "next/link";
import { CartButton } from "@/components/cart/cart-button";
import type { SiteSettings } from "@/lib/supabase/types";
import { AuthLink } from "./auth-link";

export function BrandMark({
  settings,
  className = "",
  hideNameOnMobile = false,
}: {
  settings: Pick<SiteSettings, "brand_name" | "logo_url">;
  className?: string;
  hideNameOnMobile?: boolean; // header: logo only on small screens (space)
}) {
  return (
    <span className={`flex min-w-0 items-center gap-2 ${className}`}>
      {hideNameOnMobile && !settings.logo_url && (
        // No logo uploaded: a home icon keeps the link visible on mobile.
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6 shrink-0 sm:hidden" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 11.5 12 4l9 7.5" />
          <path d="M5.5 10v9.5h13V10" />
        </svg>
      )}
      {settings.logo_url && (
        <Image
          src={settings.logo_url}
          alt=""
          width={36}
          height={36}
          className="size-9 shrink-0 rounded-full object-cover"
        />
      )}
      <span
        className={`truncate font-display text-lg font-semibold sm:text-xl ${hideNameOnMobile ? "hidden sm:inline" : ""}`}
      >
        {settings.brand_name}
      </span>
    </span>
  );
}

export function SiteHeader({ settings }: { settings: SiteSettings }) {
  return (
    <header className="sticky top-0 z-30 border-b border-secondary/10 bg-neutral-light/85 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-4 py-3">
        <Link href="/" className="min-w-0 text-secondary" aria-label={`${settings.brand_name} home`}>
          <BrandMark settings={settings} hideNameOnMobile />
        </Link>
        <nav aria-label="Main" className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
          <Link
            href="/menu"
            className="rounded-btn px-3 py-2 text-sm font-medium text-secondary hover:bg-primary/40"
          >
            Food Menu
          </Link>
          <AuthLink />
          <CartButton />
        </nav>
      </div>
    </header>
  );
}
