import Image from "next/image";
import Link from "next/link";
import { CartButton } from "@/components/cart/cart-button";
import type { SiteSettings } from "@/lib/supabase/types";
import { AuthLink } from "./auth-link";

export function BrandMark({
  settings,
  className = "",
}: {
  settings: Pick<SiteSettings, "brand_name" | "logo_url">;
  className?: string;
}) {
  return (
    <span className={`flex min-w-0 items-center gap-2 ${className}`}>
      {settings.logo_url && (
        <Image
          src={settings.logo_url}
          alt=""
          width={36}
          height={36}
          className="size-9 shrink-0 rounded-full object-cover"
        />
      )}
      <span className="truncate font-display text-lg font-semibold sm:text-xl">{settings.brand_name}</span>
    </span>
  );
}

export function SiteHeader({ settings }: { settings: SiteSettings }) {
  return (
    <header className="sticky top-0 z-30 border-b border-secondary/10 bg-neutral-light/85 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-4 py-3">
        <Link href="/" className="min-w-0 text-secondary" aria-label={`${settings.brand_name} home`}>
          <BrandMark settings={settings} />
        </Link>
        <nav aria-label="Main" className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
          <Link
            href="/menu"
            className="rounded-full px-3 py-2 text-sm font-medium text-secondary hover:bg-primary/40"
          >
            Menu
          </Link>
          <AuthLink />
          <CartButton />
        </nav>
      </div>
    </header>
  );
}
