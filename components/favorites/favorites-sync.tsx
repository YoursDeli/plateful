"use client";

import { useEffect } from "react";
import { PENDING_FAVORITE_KEY, useFavorites } from "@/lib/favorites/store";
import { createClient } from "@/lib/supabase/client";

// Keeps the favorites store in step with the auth session, and saves a dish
// a guest tapped ♥ on before being sent to sign in.
export function FavoritesSync() {
  useEffect(() => {
    const supabase = createClient();

    async function sync(userId: string | null) {
      const store = useFavorites.getState();
      if (!userId) {
        store.reset();
        return;
      }
      await store.load(userId);

      let pending: string | null = null;
      try {
        pending = sessionStorage.getItem(PENDING_FAVORITE_KEY);
        sessionStorage.removeItem(PENDING_FAVORITE_KEY);
      } catch {
        // Storage unavailable (private mode etc.) — nothing pending.
      }
      if (pending && !useFavorites.getState().ids.has(pending)) {
        await useFavorites.getState().toggle(pending);
      }
    }

    // Fires INITIAL_SESSION immediately on subscribe, then on every change.
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      void sync(session?.user.id ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return null;
}
