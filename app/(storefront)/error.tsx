"use client";

import Link from "next/link";
import { useEffect } from "react";
import { StatusScreen, primaryAction, secondaryAction } from "@/components/layout/status-screen";

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
      <button type="button" onClick={reset} className={primaryAction}>
        Try again
      </button>
      <Link href="/" className={secondaryAction}>
        Go home
      </Link>
    </StatusScreen>
  );
}
