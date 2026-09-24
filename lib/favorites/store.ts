"use client";

import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";

// Signed-in user's favorite dish ids (docs/site-sections-and-features.md §3).
// Loaded by <FavoritesSync /> on auth changes; not persisted locally — the
// `favorites` table (RLS: own rows only) is the source of truth.

type Status = "unknown" | "loading" | "ready" | "signed_out";
export type ToggleResult = "ok" | "needs_auth" | "error" | "busy";

// A guest who taps ♥ is sent to sign in; this remembers which dish to save
// once they're back (sessionStorage, so it never outlives the tab).
export const PENDING_FAVORITE_KEY = "plateful-pending-favorite";

type FavoritesState = {
  userId: string | null;
  ids: Set<string>;
  status: Status;
  load: (userId: string) => Promise<void>;
  reset: () => void;
  toggle: (menuItemId: string) => Promise<ToggleResult>;
};

function withToggled(ids: Set<string>, id: string, present: boolean) {
  const next = new Set(ids);
  if (present) next.add(id);
  else next.delete(id);
  return next;
}

// De-duplicates concurrent loads for the same user (auth events can arrive
// in quick succession), so a pending toggle never sees a half-finished load.
let inflight: { userId: string; promise: Promise<void> } | null = null;

export const useFavorites = create<FavoritesState>()((set, get) => ({
  userId: null,
  ids: new Set(),
  status: "unknown",

  load: (userId) => {
    if (get().userId === userId && get().status === "ready") return Promise.resolve();
    if (inflight?.userId === userId) return inflight.promise;

    set({ userId, status: "loading" });
    const promise = (async () => {
      const { data, error } = await createClient()
        .from("favorites")
        .select("menu_item_id")
        .eq("user_id", userId);
      if (get().userId !== userId) return; // signed out / switched meanwhile
      if (error) console.error("Couldn't load favorites:", error.message);
      set({ ids: new Set(data?.map((f) => f.menu_item_id) ?? []), status: "ready" });
    })().finally(() => {
      if (inflight?.promise === promise) inflight = null;
    });
    inflight = { userId, promise };
    return promise;
  },

  reset: () => {
    inflight = null;
    set({ userId: null, ids: new Set(), status: "signed_out" });
  },

  toggle: async (menuItemId) => {
    const { userId, status, ids } = get();
    if (status === "signed_out") return "needs_auth";
    if (!userId || status !== "ready") return "busy";

    const adding = !ids.has(menuItemId);
    set({ ids: withToggled(ids, menuItemId, adding) }); // optimistic

    const supabase = createClient();
    const { error } = adding
      ? await supabase.from("favorites").insert({ user_id: userId, menu_item_id: menuItemId })
      : await supabase
          .from("favorites")
          .delete()
          .eq("user_id", userId)
          .eq("menu_item_id", menuItemId);

    // 23505 = already saved (e.g. from another tab) — the end state is right.
    if (error && error.code !== "23505") {
      console.error("Couldn't update favorite:", error.message);
      set({ ids: withToggled(get().ids, menuItemId, !adding) }); // roll back
      return "error";
    }
    return "ok";
  },
}));
