import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '@/services/firebase/app';
import { fromDoc } from '@/services/firebase/converters';
import type { AppSetting, Category, City, Governorate, ServiceArea } from '@/types/models';
import { qk } from '../queryKeys';

const HOUR = 3_600_000;
/** Reference data changes rarely: cache for a long time and persist offline. */
const catalogOptions = { staleTime: 6 * HOUR, gcTime: 24 * HOUR, meta: { persist: true } } as const;

async function readAll<T extends { id: string }>(name: string): Promise<T[]> {
  const snap = await getDocs(collection(db, name));
  return snap.docs.map((d) => fromDoc<T>(d));
}

export function useCategories(includeInactive = false) {
  return useQuery({
    queryKey: qk.categories,
    queryFn: async () => {
      const snap = await getDocs(query(collection(db, 'categories'), orderBy('sortOrder')));
      return snap.docs.map((d) => fromDoc<Category>(d));
    },
    select: (items) => (includeInactive ? items : items.filter((c) => c.isActive)),
    ...catalogOptions,
  });
}

export function useGovernorates(includeInactive = false) {
  return useQuery({
    queryKey: qk.governorates,
    queryFn: () => readAll<Governorate>('governorates'),
    select: (items) => (includeInactive ? items : items.filter((g) => g.isActive)),
    ...catalogOptions,
  });
}

export function useCities(includeInactive = false) {
  return useQuery({
    queryKey: qk.cities,
    queryFn: () => readAll<City>('cities'),
    select: (items) => (includeInactive ? items : items.filter((c) => c.isActive)),
    ...catalogOptions,
  });
}

export function useServiceAreas(includeInactive = false) {
  return useQuery({
    queryKey: qk.serviceAreas,
    queryFn: () => readAll<ServiceArea>('serviceAreas'),
    select: (items) => (includeInactive ? items : items.filter((a) => a.isActive)),
    ...catalogOptions,
  });
}

export function useAppSettings() {
  return useQuery({ queryKey: qk.appSettings, queryFn: () => readAll<AppSetting>('appSettings'), ...catalogOptions });
}
