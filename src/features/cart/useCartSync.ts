import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useEffect, useRef } from 'react';
import { db } from '@/services/firebase/app';
import { cartTotals, useCartStore } from '@/store/cartStore';
import type { CartItem } from '@/types/models';

/**
 * Mirrors the local cart to `carts/{uid}` (debounced) so it follows the user
 * across devices, and restores it on sign-in when the local cart is empty.
 * The server never trusts these values: checkout re-prices from dishes.
 */
export function useCartSync(uid: string | undefined) {
  const restored = useRef<string | null>(null);

  useEffect(() => {
    if (!uid || restored.current === uid) return;
    restored.current = uid;
    const local = useCartStore.getState();
    if (local.items.length > 0) return;
    getDoc(doc(db, 'carts', uid))
      .then((snap) => {
        const data = snap.data() as { sellerId?: string; sellerName?: string; items?: CartItem[] } | undefined;
        if (data?.sellerId && data.items?.length && useCartStore.getState().items.length === 0) {
          useCartStore.getState().replaceWith(data.sellerId, data.sellerName ?? '', data.items);
        }
      })
      .catch(() => undefined);
  }, [uid]);

  useEffect(() => {
    if (!uid) return undefined;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = useCartStore.subscribe((state) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const ref = doc(db, 'carts', uid);
        if (state.items.length === 0) {
          void deleteDoc(ref).catch(() => undefined);
          return;
        }
        const totals = cartTotals(state.items);
        void setDoc(ref, {
          buyerId: uid,
          sellerId: state.sellerId,
          sellerName: state.sellerName ?? '',
          items: state.items,
          subtotal: totals.subtotal,
          deliveryFee: 0,
          total: totals.total,
          updatedAt: serverTimestamp(),
        }).catch(() => undefined);
      }, 1500);
    });
    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, [uid]);
}
