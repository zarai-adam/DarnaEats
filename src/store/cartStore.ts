import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { LIMITS } from '@shared/constants';
import { clampQuantity, computeTotals, lineSubtotal } from '@shared/pricing';
import type { CartItem, Dish } from '@/types/models';

export interface CartState {
  sellerId: string | null;
  sellerName: string | null;
  items: CartItem[];
  addItem: (dish: Dish, quantity: number) => 'added' | 'seller_conflict' | 'limit';
  setQuantity: (dishId: string, quantity: number) => void;
  setNotes: (dishId: string, notes: string) => void;
  removeItem: (dishId: string) => void;
  clear: () => void;
  replaceWith: (sellerId: string, sellerName: string, items: CartItem[]) => void;
}

function toItem(dish: Dish, quantity: number): CartItem {
  return {
    dishId: dish.id,
    nameAr: dish.nameAr,
    nameFr: dish.nameFr,
    imageUrl: dish.imageUrls[0] ?? null,
    quantity,
    // Snapshot for display only; the server re-prices every order.
    unitPriceSnapshot: dish.price,
    subtotal: lineSubtotal({ unitPrice: dish.price, quantity }),
    maxQuantity: Math.min(dish.availableQuantity, LIMITS.maxItemQuantity),
  };
}

/**
 * One-seller cart. Persisted locally for offline resilience and mirrored to
 * `carts/{uid}` (see useCartSync). Prices are snapshots for display only.
 */
export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      sellerId: null,
      sellerName: null,
      items: [],
      addItem: (dish, quantity) => {
        const state = get();
        if (state.sellerId && state.sellerId !== dish.sellerId && state.items.length > 0) return 'seller_conflict';
        const existing = state.items.find((i) => i.dishId === dish.id);
        if (!existing && state.items.length >= LIMITS.maxCartItems) return 'limit';
        const nextQuantity = clampQuantity((existing?.quantity ?? 0) + quantity, dish.availableQuantity);
        if (nextQuantity <= 0) return 'limit';
        const item = toItem(dish, nextQuantity);
        set({
          sellerId: dish.sellerId,
          sellerName: dish.sellerName ?? state.sellerName,
          items: existing
            ? state.items.map((i) => (i.dishId === dish.id ? { ...item, notes: i.notes } : i))
            : [...state.items, item],
        });
        return 'added';
      },
      setQuantity: (dishId, quantity) =>
        set((state) => {
          const items = state.items
            .map((i) => {
              if (i.dishId !== dishId) return i;
              const q = Math.min(Math.max(0, Math.floor(quantity)), i.maxQuantity);
              return {
                ...i,
                quantity: q,
                subtotal: q > 0 ? lineSubtotal({ unitPrice: i.unitPriceSnapshot, quantity: q }) : 0,
              };
            })
            .filter((i) => i.quantity > 0);
          return items.length === 0 ? { items, sellerId: null, sellerName: null } : { items };
        }),
      setNotes: (dishId, notes) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.dishId === dishId ? { ...i, notes: notes.slice(0, LIMITS.maxNotesLength) } : i,
          ),
        })),
      removeItem: (dishId) =>
        set((state) => {
          const items = state.items.filter((i) => i.dishId !== dishId);
          return items.length === 0 ? { items, sellerId: null, sellerName: null } : { items };
        }),
      clear: () => set({ items: [], sellerId: null, sellerName: null }),
      replaceWith: (sellerId, sellerName, items) => set({ sellerId, sellerName, items }),
    }),
    { name: 'darna-cart', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

export function cartTotals(items: CartItem[], deliveryFee = 0) {
  return computeTotals(
    items.map((i) => ({ unitPrice: i.unitPriceSnapshot, quantity: i.quantity })),
    deliveryFee,
  );
}
