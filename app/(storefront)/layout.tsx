import { CartHydrator } from "@/components/cart/cart-hydrator";
import { CartPanel } from "@/components/cart/cart-panel";
import { FavoritesSync } from "@/components/favorites/favorites-sync";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { getSiteSettings } from "@/lib/site-settings";

export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings();
  return (
    <>
      <SiteHeader settings={settings} />
      <div className="flex flex-1 flex-col">{children}</div>
      <SiteFooter settings={settings} />
      <CartPanel />
      <CartHydrator />
      <FavoritesSync />
    </>
  );
}
