import { CartHydrator } from "@/components/cart/cart-hydrator";
import { CartPanel } from "@/components/cart/cart-panel";
import { SiteHeader } from "@/components/layout/site-header";
import { getSiteSettings } from "@/lib/site-settings";

// Site-wide Footer joins here in Build Order step 11.
export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings();
  return (
    <>
      <SiteHeader settings={settings} />
      <div className="flex flex-1 flex-col">{children}</div>
      <CartPanel />
      <CartHydrator />
    </>
  );
}
