import { CartHydrator } from "@/components/cart/cart-hydrator";
import { CartPanel } from "@/components/cart/cart-panel";
import { FavoritesSync } from "@/components/favorites/favorites-sync";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { getSiteSettings } from "@/lib/site-settings";

const skipLink =
  "sr-only rounded-btn bg-secondary px-4 py-2 text-sm font-medium text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100]";

export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings();
  return (
    <>
      <a href="#main" className={skipLink}>
        Skip to content
      </a>
      <SiteHeader settings={settings} />
      <div id="main" tabIndex={-1} className="flex flex-1 flex-col outline-none">
        {children}
      </div>
      <SiteFooter settings={settings} />
      <CartPanel />
      <CartHydrator />
      <FavoritesSync />
    </>
  );
}
