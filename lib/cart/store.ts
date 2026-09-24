"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

// Client-side cart (docs/cart-checkout-payment-workflow.md §1), persisted to
// localStorage so it survives refreshes for signed-out visitors. Prices here
// are for DISPLAY only — the server recomputes every price at checkout.

export type CartItem = {
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  imageUrl: string | null;
};

// Set when a cart refresh finds the dish changed since it was added.
export type CartItemNotice = "price_changed" | "unavailable" | "removed";

export const MAX_QUANTITY = 50;

type CartState = {
  items: CartItem[];
  updatedAt: number;
  notices: Record<string, CartItemNotice>;
  isOpen: boolean;
  hasHydrated: boolean;
  add: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  setQuantity: (menuItemId: string, quantity: number) => void;
  remove: (menuItemId: string) => void;
  clear: () => void;
  open: () => void;
  close: () => void;
  applyRefresh: (
    fresh: Map<string, { name: string; price: number; imageUrl: string | null; isAvailable: boolean }>,
  ) => void;
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
          const existing = state.items.find((i) => i.menuItemId === item.menuItemId);
          const items = existing
            ? state.items.map((i) =>
                i.menuItemId === item.menuItemId
                  ? { ...i, ...item, quantity: clamp(i.quantity + quantity) }
                  : i,
              )
            : [...state.items, { ...item, quantity: clamp(quantity) }];
          return { items, updatedAt: Date.now() };
        }),

      setQuantity: (menuItemId, quantity) =>
        set((state) => {
          const q = clamp(quantity);
          const items =
            q === 0
              ? state.items.filter((i) => i.menuItemId !== menuItemId)
              : state.items.map((i) => (i.menuItemId === menuItemId ? { ...i, quantity: q } : i));
          return { items, updatedAt: Date.now() };
        }),

      remove: (menuItemId) =>
        set((state) => {
          const notices = { ...state.notices };
          delete notices[menuItemId];
          return {
            items: state.items.filter((i) => i.menuItemId !== menuItemId),
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
            const current = fresh.get(item.menuItemId);
            if (!current) {
              notices[item.menuItemId] = "removed";
              return item;
            }
            if (!current.isAvailable) notices[item.menuItemId] = "unavailable";
            else if (current.price !== item.unitPrice) notices[item.menuItemId] = "price_changed";
            return { ...item, name: current.name, unitPrice: current.price, imageUrl: current.imageUrl };
          });
          return { items, notices };
        }),
    }),
    {
      name: "plateful-cart",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // UI state (open panel, notices) isn't persisted — only the cart.
      partialize: (state) => ({ items: state.items, updatedAt: state.updatedAt }),
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
