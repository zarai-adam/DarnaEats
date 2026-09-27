import { doc, getDoc } from 'firebase/firestore';
import { isOrderable } from '@shared/availability';
import { clampQuantity, lineSubtotal } from '@shared/pricing';
import { LIMITS } from '@shared/constants';
import { db } from '@/services/firebase/app';
import { fromDocOrNull } from '@/services/firebase/converters';
import { useCartStore } from '@/store/cartStore';
import type { CartItem, Dish, Order } from '@/types/models';

/**
 * Rebuilds the cart from a past order using CURRENT dish data and prices.
 * Returns how many items could not be re-added (sold out, removed...).
 */
export async function reorder(order: Order): Promise<{ added: number; skipped: number }> {
  const dishes = await Promise.all(
    order.items.map((item) =>
      getDoc(doc(db, 'dishes', item.dishId))
        .then((snap) => fromDocOrNull<Dish>(snap))
        .catch(() => null),
    ),
  );
  const items: CartItem[] = [];
  order.items.forEach((item, i) => {
    const dish = dishes[i];
    if (!dish || !isOrderable(dish)) return;
    const quantity = clampQuantity(item.quantity, dish.availableQuantity);
    if (quantity <= 0) return;
    items.push({
      dishId: dish.id,
      nameAr: dish.nameAr,
      nameFr: dish.nameFr,
      imageUrl: dish.imageUrls[0] ?? null,
      quantity,
      unitPriceSnapshot: dish.price,
      subtotal: lineSubtotal({ unitPrice: dish.price, quantity }),
      maxQuantity: Math.min(dish.availableQuantity, LIMITS.maxItemQuantity),
    });
  });
  if (items.length > 0) useCartStore.getState().replaceWith(order.sellerId, order.sellerName, items);
  return { added: items.length, skipped: order.items.length - items.length };
}
