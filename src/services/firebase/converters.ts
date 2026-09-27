import { Timestamp, type DocumentData, type DocumentSnapshot, type QueryDocumentSnapshot } from 'firebase/firestore';

/** Recursively converts Firestore Timestamps to epoch milliseconds. */
export function normalize(value: unknown): unknown {
  if (value instanceof Timestamp) return value.toMillis();
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(value as DocumentData)) out[key] = normalize(inner);
    return out;
  }
  return value;
}

export function fromDoc<T extends { id: string }>(snap: DocumentSnapshot | QueryDocumentSnapshot): T {
  return { ...(normalize(snap.data() ?? {}) as object), id: snap.id } as T;
}

export function fromDocOrNull<T extends { id: string }>(snap: DocumentSnapshot): T | null {
  return snap.exists() ? fromDoc<T>(snap) : null;
}
