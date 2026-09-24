"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Signs out in the browser so Supabase fires SIGNED_OUT: the header, hearts
// and favourites row update immediately (a server-side sign-out would leave
// those client components showing the old session until a reload).
export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await createClient().auth.signOut({ scope: "local" }); // this device only
        router.push("/");
        router.refresh();
      }}
      className={className}
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
