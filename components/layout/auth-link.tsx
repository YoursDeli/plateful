"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Client-side so storefront pages stay statically cached (no cookies read on
// the server). Purely UI — nothing here is an access check.
export function AuthLink() {
  const router = useRouter();
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
    <button
      type="button"
      onClick={async () => {
        await createClient().auth.signOut();
        router.refresh();
      }}
      className="rounded-full px-3 py-2 text-sm font-medium text-secondary hover:bg-primary/40"
    >
      Sign out
    </button>
  );
}
