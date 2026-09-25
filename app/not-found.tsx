import Link from "next/link";
import { StatusScreen, primaryAction, secondaryAction } from "@/components/layout/status-screen";
import { getSiteSettings } from "@/lib/site-settings";

// URLs that match no route at all. Rendered without the storefront header,
// so it carries the brand name itself.
export default async function NotFound() {
  const { brand_name } = await getSiteSettings();
  return (
    <div className="flex flex-1 flex-col">
      <header className="px-4 py-5 text-center">
        <Link href="/" className="font-display text-2xl font-semibold text-secondary">
          {brand_name}
        </Link>
      </header>
      <StatusScreen
        eyebrow="Page not found"
        title="We couldn't find that"
        message="The link may be old, or the page may have moved. Here are a few places to start."
      >
        <Link href="/menu" className={primaryAction}>
          Browse the Food Menu
        </Link>
        <Link href="/" className={secondaryAction}>
          Go home
        </Link>
      </StatusScreen>
    </div>
  );
}
