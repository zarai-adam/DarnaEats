import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/services/firebase/app';
import { api } from '@/services/firebase/callables';
import { fromDoc, fromDocOrNull } from '@/services/firebase/converters';
import type { SellerPrivate, SellerProfile, SellerVerification } from '@/types/models';
import { qk } from '../queryKeys';

export function useSellerProfile(id: string | undefined) {
  return useQuery({
    queryKey: qk.seller(id ?? ''),
    enabled: Boolean(id),
    queryFn: async () => fromDocOrNull<SellerProfile>(await getDoc(doc(db, 'sellerProfiles', id!))),
    staleTime: 60_000,
    meta: { persist: true },
  });
}

export function useTopSellers(governorateId: string | null, max = 10) {
  return useQuery({
    queryKey: qk.topSellers(governorateId),
    queryFn: async () => {
      const constraints = governorateId ? [where('governorateId', '==', governorateId)] : [];
      const snap = await getDocs(
        query(
          collection(db, 'sellerProfiles'),
          where('status', '==', 'approved'),
          ...constraints,
          orderBy('averageRating', 'desc'),
          limit(max),
        ),
      );
      return snap.docs.map((d) => fromDoc<SellerProfile>(d));
    },
    staleTime: 5 * 60_000,
    meta: { persist: true },
  });
}

/** Approved sellers for the discovery map (approximate coordinates only). */
export function useApprovedSellers(max = 100) {
  return useQuery({
    queryKey: qk.approvedSellers,
    queryFn: async () => {
      const snap = await getDocs(
        query(
          collection(db, 'sellerProfiles'),
          where('status', '==', 'approved'),
          orderBy('averageRating', 'desc'),
          limit(max),
        ),
      );
      return snap.docs.map((d) => fromDoc<SellerProfile>(d));
    },
    staleTime: 10 * 60_000,
    meta: { persist: true },
  });
}

export function useMySellerProfile(uid: string, enabled = true) {
  return useQuery({
    queryKey: qk.mySeller(uid),
    enabled: Boolean(uid) && enabled,
    queryFn: async () => fromDocOrNull<SellerProfile>(await getDoc(doc(db, 'sellerProfiles', uid))),
  });
}

export function useMyVerification(uid: string) {
  return useQuery({
    queryKey: qk.myVerification(uid),
    enabled: Boolean(uid),
    queryFn: async () => fromDocOrNull<SellerVerification>(await getDoc(doc(db, 'sellerVerification', uid))),
  });
}

export function useMySellerPrivate(uid: string) {
  return useQuery({
    queryKey: qk.mySellerPrivate(uid),
    enabled: Boolean(uid),
    queryFn: async () => fromDocOrNull<SellerPrivate>(await getDoc(doc(db, 'sellerPrivate', uid))),
  });
}

type ProfileUpdate = Partial<
  Pick<
    SellerProfile,
    | 'displayName'
    | 'story'
    | 'profilePhotoUrl'
    | 'kitchenPhotoUrl'
    | 'specialties'
    | 'governorateId'
    | 'cityId'
    | 'serviceAreaId'
    | 'serviceAreas'
    | 'approximateLatitude'
    | 'approximateLongitude'
    | 'pickupAvailable'
    | 'selfDeliveryAvailable'
    | 'deliveryFee'
  >
>;

export function useUpdateSellerProfile(uid: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (changes: ProfileUpdate) =>
      updateDoc(doc(db, 'sellerProfiles', uid), { ...changes, updatedAt: serverTimestamp() }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: qk.mySeller(uid) });
      void client.invalidateQueries({ queryKey: qk.seller(uid) });
    },
  });
}

type VerificationUpdate = Partial<
  Pick<
    SellerVerification,
    | 'legalFullName'
    | 'identityDocumentPath'
    | 'identityDocumentType'
    | 'kitchenPhotoPath'
    | 'hygieneAgreementAccepted'
    | 'foodSafetyAgreementAccepted'
  >
>;

export function useUpdateVerification(uid: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (changes: VerificationUpdate) => updateDoc(doc(db, 'sellerVerification', uid), changes),
    onSuccess: () => void client.invalidateQueries({ queryKey: qk.myVerification(uid) }),
  });
}

export function useUpdateSellerPrivate(uid: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (changes: Partial<Pick<SellerPrivate, 'pickupAddress' | 'contactPhone'>>) =>
      updateDoc(doc(db, 'sellerPrivate', uid), changes),
    onSuccess: () => void client.invalidateQueries({ queryKey: qk.mySellerPrivate(uid) }),
  });
}

export function useBecomeSeller() {
  return useMutation({ mutationFn: () => api.becomeSeller({}) });
}

export function useSubmitApplication(uid: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => api.submitSellerApplication({}),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: qk.mySeller(uid) });
      void client.invalidateQueries({ queryKey: qk.myVerification(uid) });
    },
  });
}
