"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

// Client-side cart (docs/cart-checkout-payment-workflow.md §1), persisted to
// localStorage so it survives refreshes for signed-out visitors. Prices here
// are for DISPLAY only — the server recomputes every price at checkout.
// One line per dish + bowl size (the same dish in two sizes = two lines).

export type CartItem = {
  key: string; // lineKey(menuItemId, sizeId)
  menuItemId: string;
  sizeId: string | null;
  sizeName: string | null;
  name: string;
  unitPrice: number;
  quantity: number;
  imageUrl: string | null;
};

export type NewCartItem = Omit<CartItem, "key" | "quantity">;

// Set when a cart refresh finds the dish changed since it was added.
export type CartItemNotice = "price_changed" | "unavailable" | "removed" | "size_removed" | "needs_size";

// Notices that stop checkout until the line is fixed.
export const BLOCKING_NOTICES: CartItemNotice[] = ["unavailable", "removed", "size_removed", "needs_size"];

export type FreshDish = {
  name: string;
  price: number;
  imageUrl: string | null;
  isAvailable: boolean;
  sizes: Map<string, { name: string; price: number }>;
};

export const MAX_QUANTITY = 50;

export const lineKey = (menuItemId: string, sizeId: string | null) => (sizeId ? `${menuItemId}:${sizeId}` : menuItemId);

type CartState = {
  items: CartItem[];
  updatedAt: number;
  notices: Record<string, CartItemNotice>;
  isOpen: boolean;
  hasHydrated: boolean;
  add: (item: NewCartItem, quantity?: number) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  open: () => void;
  close: () => void;
  applyRefresh: (fresh: Map<string, FreshDish>) => void;
};

const clamp = (n: number) => Math.max(0, Math.min(MAX_QUANTITY, Math.floor(n)));

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      updatedAt: 0,
      notices: {},
      isOpen: false,
      hasHydrated: false,

      add: (item, quantity = 1) =>
        set((state) => {
          const key = lineKey(item.menuItemId, item.sizeId);
          const existing = state.items.find((i) => i.key === key);
          const items = existing
            ? state.items.map((i) => (i.key === key ? { ...i, ...item, quantity: clamp(i.quantity + quantity) } : i))
            : [...state.items, { ...item, key, quantity: clamp(quantity) }];
          return { items, updatedAt: Date.now() };
        }),

      setQuantity: (key, quantity) =>
        set((state) => {
          const q = clamp(quantity);
          const items =
            q === 0
              ? state.items.filter((i) => i.key !== key)
              : state.items.map((i) => (i.key === key ? { ...i, quantity: q } : i));
          return { items, updatedAt: Date.now() };
        }),

      remove: (key) =>
        set((state) => {
          const notices = { ...state.notices };
          delete notices[key];
          return {
            items: state.items.filter((i) => i.key !== key),
            notices,
            updatedAt: Date.now(),
          };
        }),

      clear: () => set({ items: [], notices: {}, updatedAt: Date.now() }),
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),

      applyRefresh: (fresh) =>
        set((state) => {
          const notices: Record<string, CartItemNotice> = {};
          const items = state.items.map((item) => {
            const dish = fresh.get(item.menuItemId);
            if (!dish) {
              notices[item.key] = "removed";
              return item;
            }
            const updated = { ...item, name: dish.name, imageUrl: dish.imageUrl };
            if (!dish.isAvailable) {
              notices[item.key] = "unavailable";
              return updated;
            }
            // Dish now sold in sizes, but this line has none (added earlier).
            if (dish.sizes.size > 0 && !item.sizeId) {
              notices[item.key] = "needs_size";
              return updated;
            }
            const size = item.sizeId ? dish.sizes.get(item.sizeId) : undefined;
            if (item.sizeId && !size) {
              notices[item.key] = "size_removed";
              return updated;
            }
            const price = size ? size.price : dish.price;
            if (price !== item.unitPrice) notices[item.key] = "price_changed";
            return { ...updated, sizeName: size?.name ?? null, unitPrice: price };
          });
          return { items, notices };
        }),
    }),
    {
      name: "plateful-cart",
      version: 2,
      storage: createJSONStorage(() => localStorage),
      // UI state (open panel, notices) isn't persisted — only the cart.
      partialize: (state) => ({ items: state.items, updatedAt: state.updatedAt }),
      // v1 carts (before bowl sizes): one line per dish, no size.
      migrate: (persisted, version) => {
        const state = persisted as { items?: Partial<CartItem>[]; updatedAt?: number };
        if (version < 2) {
          state.items = (state.items ?? []).map((i) => ({
            ...i,
            key: i.menuItemId!,
            sizeId: null,
            sizeName: null,
          }));
        }
        return state as { items: CartItem[]; updatedAt: number };
      },
      // Rehydrated by <CartHydrator /> after mount, so the server render and
      // the first client render match (both show an empty cart).
      skipHydration: true,
      onRehydrateStorage: () => () => useCart.setState({ hasHydrated: true }),
    },
  ),
);

export function cartCount(items: CartItem[]) {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}

export function cartSubtotal(items: CartItem[]) {
  return items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
}

// "Jollof Rice (Large)" — for lists where the size shows inline.
export function lineLabel(item: { name: string; sizeName: string | null }) {
  return item.sizeName ? `${item.name} (${item.sizeName})` : item.name;
}
