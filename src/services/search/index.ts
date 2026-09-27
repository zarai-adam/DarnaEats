import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { getDishAvailability } from '@shared/availability';
import type { DietaryTag } from '@shared/constants';
import { haversineKm, type LatLng } from '@shared/geo';
import { tokenize } from '@shared/text';
import { db } from '@/services/firebase/app';
import { fromDoc } from '@/services/firebase/converters';
import type { Dish } from '@/types/models';

export type SearchSort = 'newest' | 'rating' | 'price_asc' | 'price_desc' | 'nearest';

export interface SearchFilters {
  categoryId?: string | null;
  governorateId?: string | null;
  serviceAreaId?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  minRating?: number | null;
  dietaryTags?: DietaryTag[];
  availableNow?: boolean;
  fulfillment?: 'pickup' | 'seller_delivery' | null;
  preOrderOnly?: boolean;
}

export interface SearchRequest {
  text?: string;
  filters?: SearchFilters;
  sort?: SearchSort;
  origin?: LatLng | null;
  cursor?: QueryDocumentSnapshot | null;
  pageSize?: number;
}

export interface SearchResult {
  items: (Dish & { distanceKm?: number })[];
  cursor: QueryDocumentSnapshot | null;
  hasMore: boolean;
}

/**
 * Search provider abstraction. The MVP implementation uses Firestore prefix
 * tokens; Algolia/Typesense/Meilisearch can implement the same interface
 * when the catalogue outgrows Firestore querying.
 */
export interface SearchProvider {
  searchDishes(request: SearchRequest): Promise<SearchResult>;
}

function matchesFilters(dish: Dish, filters: SearchFilters, tokens: string[]): boolean {
  const dishTokens = (dish as Dish & { searchTokens?: string[] }).searchTokens ?? [];
  if (tokens.some((t) => !dishTokens.includes(t))) return false;
  if (filters.categoryId && dish.categoryId !== filters.categoryId) return false;
  if (filters.governorateId && dish.governorateId !== filters.governorateId) return false;
  if (filters.serviceAreaId && dish.serviceAreaId !== filters.serviceAreaId) return false;
  if (filters.minPrice != null && dish.price < filters.minPrice) return false;
  if (filters.maxPrice != null && dish.price > filters.maxPrice) return false;
  if (filters.minRating != null && (dish.sellerRating ?? 0) < filters.minRating) return false;
  if (filters.dietaryTags?.length && !filters.dietaryTags.every((tag) => dish.dietaryTags.includes(tag))) return false;
  if (filters.fulfillment === 'pickup' && !dish.pickupAvailable) return false;
  if (filters.fulfillment === 'seller_delivery' && !dish.selfDeliveryAvailable) return false;
  if (filters.preOrderOnly && !dish.isPreOrder) return false;
  if (filters.availableNow && getDishAvailability(dish) !== 'available') return false;
  return true;
}

function sortDishes(items: (Dish & { distanceKm?: number })[], sort: SearchSort) {
  const copy = [...items];
  switch (sort) {
    case 'rating':
      return copy.sort((a, b) => (b.sellerRating ?? 0) - (a.sellerRating ?? 0));
    case 'price_asc':
      return copy.sort((a, b) => a.price - b.price);
    case 'price_desc':
      return copy.sort((a, b) => b.price - a.price);
    case 'nearest':
      return copy.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
    default:
      return copy.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  }
}

export const firestoreSearchProvider: SearchProvider = {
  async searchDishes({ text = '', filters = {}, sort = 'newest', origin = null, cursor = null, pageSize = 40 }) {
    const tokens = [...new Set(tokenize(text).map((t) => t.slice(0, 15)))];
    const constraints: QueryConstraint[] = [
      where('sellerApproved', '==', true),
      where('isActive', '==', true),
      where('isHidden', '==', false),
    ];
    let paged = false;
    if (tokens.length > 0) {
      // Use the longest (most selective) token server-side, the rest client-side.
      const primary = [...tokens].sort((a, b) => b.length - a.length)[0]!;
      constraints.push(where('searchTokens', 'array-contains', primary), limit(100));
    } else {
      if (filters.categoryId) constraints.push(where('categoryId', '==', filters.categoryId));
      else if (filters.governorateId) constraints.push(where('governorateId', '==', filters.governorateId));
      constraints.push(orderBy('createdAt', 'desc'));
      if (cursor) constraints.push(startAfter(cursor));
      constraints.push(limit(pageSize));
      paged = true;
    }

    const snap = await getDocs(query(collection(db, 'dishes'), ...constraints));
    const items = snap.docs
      .map((d) => fromDoc<Dish>(d))
      .filter((dish) => matchesFilters(dish, filters, tokens))
      .map((dish) =>
        origin && dish.approximateLatitude != null && dish.approximateLongitude != null
          ? {
              ...dish,
              distanceKm: haversineKm(origin, {
                latitude: dish.approximateLatitude,
                longitude: dish.approximateLongitude,
              }),
            }
          : dish,
      );
    const last = snap.docs[snap.docs.length - 1] ?? null;
    return {
      items: sortDishes(items, sort),
      cursor: paged ? last : null,
      hasMore: paged && snap.docs.length === pageSize,
    };
  },
};

export const searchProvider: SearchProvider = firestoreSearchProvider;
