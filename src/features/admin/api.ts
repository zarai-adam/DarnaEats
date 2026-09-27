import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import type { ReportPriority, ReportStatus, ReviewStatus, SellerStatus } from '@shared/constants';
import { db } from '@/services/firebase/app';
import { api } from '@/services/firebase/callables';
import { fromDoc, fromDocOrNull } from '@/services/firebase/converters';
import type {
  AuditLog,
  Dish,
  Report,
  Review,
  SellerPrivate,
  SellerProfile,
  SellerVerification,
  UserProfile,
} from '@/types/models';
import { fetchPage } from '../pagination';
import { qk } from '../queryKeys';

export function useAdminStats() {
  return useQuery({ queryKey: qk.admin.stats, queryFn: () => api.adminGetStats({}), staleTime: 30_000 });
}

export function useAdminAnalytics() {
  return useQuery({ queryKey: qk.admin.analytics, queryFn: () => api.adminGetAnalytics({}), staleTime: 5 * 60_000 });
}

export function useVerificationQueue() {
  return useQuery({
    queryKey: qk.admin.verificationQueue,
    queryFn: async () => {
      const snap = await getDocs(
        query(
          collection(db, 'sellerProfiles'),
          where('status', 'in', ['submitted', 'under_review']),
          orderBy('updatedAt', 'asc'),
          limit(50),
        ),
      );
      return snap.docs.map((d) => fromDoc<SellerProfile>(d));
    },
  });
}

export function useSellerApplication(sellerId: string | undefined) {
  return useQuery({
    queryKey: qk.admin.verification(sellerId ?? ''),
    enabled: Boolean(sellerId),
    queryFn: async () => {
      const [profile, verification, priv, user] = await Promise.all([
        getDoc(doc(db, 'sellerProfiles', sellerId!)),
        getDoc(doc(db, 'sellerVerification', sellerId!)),
        getDoc(doc(db, 'sellerPrivate', sellerId!)),
        getDoc(doc(db, 'users', sellerId!)),
      ]);
      return {
        profile: fromDocOrNull<SellerProfile>(profile),
        verification: fromDocOrNull<SellerVerification>(verification),
        private: fromDocOrNull<SellerPrivate>(priv),
        user: fromDocOrNull<UserProfile>(user),
      };
    },
  });
}

export function useSellerDecision() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: api.reviewSellerApplication,
    onSuccess: (_r, input) => {
      void client.invalidateQueries({ queryKey: qk.admin.verificationQueue });
      void client.invalidateQueries({ queryKey: qk.admin.verification(input.sellerId) });
      void client.invalidateQueries({ queryKey: ['admin', 'sellers'] });
      void client.invalidateQueries({ queryKey: qk.admin.stats });
    },
  });
}

export function useAdminReports(status: ReportStatus | 'all', priority: ReportPriority | 'all') {
  return useInfiniteQuery({
    queryKey: qk.admin.reports(status, priority),
    initialPageParam: null as number | null,
    queryFn: ({ pageParam }) => {
      const constraints = [
        ...(status !== 'all' ? [where('status', '==', status)] : []),
        ...(priority !== 'all' ? [where('priority', '==', priority)] : []),
      ];
      return fetchPage<Report>(
        query(collection(db, 'reports'), ...constraints, orderBy('createdAt', 'desc')),
        'createdAt',
        20,
        pageParam,
      );
    },
    getNextPageParam: (last) => last.nextCursor,
  });
}

export function useAdminReport(id: string | undefined) {
  return useQuery({
    queryKey: qk.admin.report(id ?? ''),
    enabled: Boolean(id),
    queryFn: async () => fromDocOrNull<Report>(await getDoc(doc(db, 'reports', id!))),
  });
}

export function useUpdateReport() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: api.updateReport,
    onSuccess: (_r, input) => {
      void client.invalidateQueries({ queryKey: qk.admin.report(input.reportId) });
      void client.invalidateQueries({ queryKey: ['admin', 'reports'] });
      void client.invalidateQueries({ queryKey: qk.admin.stats });
    },
  });
}

export function useAdminReviews(status: ReviewStatus) {
  return useInfiniteQuery({
    queryKey: qk.admin.reviews(status),
    initialPageParam: null as number | null,
    queryFn: ({ pageParam }) =>
      fetchPage<Review>(
        query(collection(db, 'reviews'), where('status', '==', status), orderBy('createdAt', 'desc')),
        'createdAt',
        20,
        pageParam,
      ),
    getNextPageParam: (last) => last.nextCursor,
  });
}

export function useModerateReview() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: api.moderateReview,
    onSuccess: () => void client.invalidateQueries({ queryKey: ['admin', 'reviews'] }),
  });
}

export function useAdminDishes(filter: 'hidden' | 'recent') {
  return useQuery({
    queryKey: qk.admin.dishes(filter),
    queryFn: async () => {
      const q =
        filter === 'hidden'
          ? query(collection(db, 'dishes'), where('isHidden', '==', true), orderBy('updatedAt', 'desc'), limit(50))
          : query(collection(db, 'dishes'), orderBy('createdAt', 'desc'), limit(50));
      const snap = await getDocs(q);
      return snap.docs.map((d) => fromDoc<Dish>(d));
    },
  });
}

export function useSetDishHidden() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: api.setDishHidden,
    onSuccess: () => void client.invalidateQueries({ queryKey: ['admin', 'dishes'] }),
  });
}

export function useAdminSellers(status: SellerStatus | 'all') {
  return useQuery({
    queryKey: qk.admin.sellers(status),
    queryFn: async () => {
      const q =
        status === 'all'
          ? query(collection(db, 'sellerProfiles'), orderBy('updatedAt', 'desc'), limit(100))
          : query(collection(db, 'sellerProfiles'), where('status', '==', status), limit(100));
      const snap = await getDocs(q);
      return snap.docs.map((d) => fromDoc<SellerProfile>(d));
    },
  });
}

export function useAdminUsers(filter: 'all' | 'seller' | 'admin' | 'moderator') {
  return useQuery({
    queryKey: qk.admin.users(filter),
    queryFn: async () => {
      const q =
        filter === 'all'
          ? query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(100))
          : query(collection(db, 'users'), where('roles', 'array-contains', filter), limit(100));
      const snap = await getDocs(q);
      return snap.docs.map((d) => fromDoc<UserProfile>(d));
    },
  });
}

export function useAdminUserMutations() {
  const client = useQueryClient();
  const invalidate = () => void client.invalidateQueries({ queryKey: ['admin', 'users'] });
  return {
    setRoles: useMutation({ mutationFn: api.adminSetUserRoles, onSuccess: invalidate }),
    setActive: useMutation({ mutationFn: api.adminSetUserActive, onSuccess: invalidate }),
  };
}

export function useAuditLogs(entityType: string) {
  return useInfiniteQuery({
    queryKey: qk.admin.audit(entityType),
    initialPageParam: null as number | null,
    queryFn: ({ pageParam }) =>
      fetchPage<AuditLog>(
        query(
          collection(db, 'auditLogs'),
          ...(entityType !== 'all' ? [where('entityType', '==', entityType)] : []),
          orderBy('createdAt', 'desc'),
        ),
        'createdAt',
        25,
        pageParam,
      ),
    getNextPageParam: (last) => last.nextCursor,
  });
}

export function useSaveCatalogEntity() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: api.adminSaveCatalogEntity,
    onSuccess: (_r, input) => {
      const keyMap = {
        categories: ['categories'],
        governorates: ['governorates'],
        cities: ['cities'],
        serviceAreas: ['serviceAreas'],
        appSettings: ['appSettings'],
      } as const;
      void client.invalidateQueries({ queryKey: keyMap[input.collection] });
    },
  });
}
