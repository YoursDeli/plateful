"use client";

import { usePathname, useRouter } from "next/navigation";
import { PENDING_FAVORITE_KEY, useFavorites } from "@/lib/favorites/store";

// ♥ toggle for a dish. Guests are sent to sign in, and the dish is saved
// automatically when they come back (see FavoritesSync).
export function HeartButton({
  menuItemId,
  name,
  variant = "overlay",
}: {
  menuItemId: string;
  name: string;
  variant?: "overlay" | "inline";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const saved = useFavorites((s) => s.ids.has(menuItemId));
  const toggle = useFavorites((s) => s.toggle);

  async function onClick() {
    const result = await toggle(menuItemId);
    if (result === "needs_auth") {
      try {
        sessionStorage.setItem(PENDING_FAVORITE_KEY, menuItemId);
      } catch {
        // Can't remember it — they'll just tap ♥ again after signing in.
      }
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }

  const icon = (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" strokeWidth={2} stroke="currentColor" fill={saved ? "currentColor" : "none"}>
      <path strokeLinejoin="round" d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.4 4.5 7 4.5c2 0 3.4 1.1 5 3 1.6-1.9 3-3 5-3 3.6 0 5.6 3.5 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2Z" />
    </svg>
  );

  const label = saved ? `Remove ${name} from favourites` : `Save ${name} to favourites`;

  if (variant === "inline") {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={saved}
        aria-label={label}
        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
          saved
            ? "border-secondary bg-secondary text-white"
            : "border-secondary/30 text-secondary hover:bg-primary/40"
        }`}
      >
        {icon}
        {saved ? "Saved" : "Save"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={saved}
      aria-label={label}
      className={`flex size-9 items-center justify-center rounded-full shadow backdrop-blur transition active:scale-90 motion-reduce:transition-none ${
        saved ? "bg-secondary text-primary" : "bg-white/85 text-secondary hover:bg-white"
      }`}
    >
      {icon}
    </button>
  );
}
