"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Client-side so storefront pages stay statically cached (no cookies read on
// the server). Purely UI — nothing here is an access check.
export function AuthLink() {
  const pathname = usePathname();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data } = supabase.auth.onAuthStateChange((_event, session) =>
      setSignedIn(Boolean(session)),
    );
    return () => data.subscription.unsubscribe();
  }, []);

  if (signedIn === null) return <span className="w-16" aria-hidden="true" />;

  if (!signedIn) {
    const next = pathname === "/login" ? "/" : pathname;
    return (
      <Link
        href={`/login?next=${encodeURIComponent(next)}`}
        className="rounded-full px-3 py-2 text-sm font-medium text-secondary hover:bg-primary/40"
      >
        Sign in
      </Link>
    );
  }

  return (
    <>
      <Link
        href="/favorites"
        aria-label="Your favourites"
        className="flex size-10 items-center justify-center rounded-full text-secondary hover:bg-primary/40"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinejoin="round" d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.4 4.5 7 4.5c2 0 3.4 1.1 5 3 1.6-1.9 3-3 5-3 3.6 0 5.6 3.5 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2Z" />
        </svg>
      </Link>
      {/* Sign out lives on /account. */}
      <Link
        href="/account"
        aria-label="Your account"
        className="flex size-10 items-center justify-center rounded-full text-secondary hover:bg-primary/40"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" />
        </svg>
      </Link>
    </>
  );
}
