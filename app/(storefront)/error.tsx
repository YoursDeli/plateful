"use client";

import Link from "next/link";
import { useEffect } from "react";
import { StatusScreen, secondaryAction } from "@/components/layout/status-screen";
import { LiquidButton } from "@/components/ui/liquid-button";

// Anything that throws while rendering a storefront page. The header and
// footer stay; only the page area is replaced. Details go to the console
// (and the server log), never to the customer.
export default function StorefrontError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusScreen
      eyebrow="Something went wrong"
      title="That didn't load properly"
      message="It's on our side, not yours. Please try again — your cart is safe."
    >
      <LiquidButton onClick={reset}>Try again</LiquidButton>
      <Link href="/" className={secondaryAction}>
        Go home
      </Link>
    </StatusScreen>
  );
}
