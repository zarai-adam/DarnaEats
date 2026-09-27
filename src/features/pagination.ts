import { getDocs, limit, query, startAfter, Timestamp, type Query, type QueryConstraint } from 'firebase/firestore';
import { fromDoc } from '@/services/firebase/converters';

export interface Page<T> {
  items: T[];
  /** Serializable cursor (epoch ms of the last item's order field). */
  nextCursor: number | null;
}

/**
 * Cursor pagination using a serializable millisecond cursor so pages can be
 * persisted in the offline cache. `base` must already include
 * `orderBy(orderField, 'desc')`.
 */
export async function fetchPage<T extends { id: string }>(
  base: Query,
  orderField: string,
  pageSize: number,
  cursor: number | null,
  extra: QueryConstraint[] = [],
): Promise<Page<T>> {
  const constraints: QueryConstraint[] = [...extra];
  if (cursor !== null) constraints.push(startAfter(Timestamp.fromMillis(cursor)));
  constraints.push(limit(pageSize));
  const snap = await getDocs(query(base, ...constraints));
  const items = snap.docs.map((d) => fromDoc<T>(d));
  const last = items[items.length - 1] as Record<string, unknown> | undefined;
  const lastValue = last?.[orderField];
  return {
    items,
    nextCursor: items.length === pageSize && typeof lastValue === 'number' ? lastValue : null,
  };
}
