import Link from "next/link";
import { StatusScreen, secondaryAction } from "@/components/layout/status-screen";
import { LiquidButton } from "@/components/ui/liquid-button";

// notFound() anywhere in the storefront (unknown dish, someone else's order…).
export default function StorefrontNotFound() {
  return (
    <StatusScreen
      eyebrow="Page not found"
      title="We couldn't find that"
      message="The link may be old, or the page may have moved. Here are a few places to start."
    >
      <LiquidButton href="/menu">Browse the Food Menu</LiquidButton>
      <Link href="/" className={secondaryAction}>
        Go home
      </Link>
    </StatusScreen>
  );
}
