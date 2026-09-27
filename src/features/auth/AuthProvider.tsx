import { onAuthStateChanged, signOut as fbSignOut, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Role } from '@shared/constants';
import { isStaff as staffCheck } from '@shared/permissions';
import { auth, db } from '@/services/firebase/app';
import { api } from '@/services/firebase/callables';
import { fromDocOrNull } from '@/services/firebase/converters';
import { useCartStore } from '@/store/cartStore';
import { useSettingsStore } from '@/store/settingsStore';
import type { UserProfile } from '@/types/models';
import { track } from '@/services/analytics';

interface AuthState {
  initializing: boolean;
  user: User | null;
  roles: Role[];
  profile: UserProfile | null;
  error: unknown;
  isStaff: boolean;
  isAdmin: boolean;
  isSeller: boolean;
  /** Re-reads custom claims and the profile document (after role changes). */
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

async function loadClaims(user: User, force: boolean): Promise<Role[]> {
  const token = await user.getIdTokenResult(force);
  const roles = token.claims.roles;
  return Array.isArray(roles) ? (roles as Role[]) : [];
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<unknown>(null);
  const language = useSettingsStore((s) => s.language);
  const languageRef = useRef(language);
  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  const hydrate = useCallback(async (current: User, forceClaims: boolean) => {
    const ensured = await api.ensureUserProfile({ preferredLanguage: languageRef.current ?? undefined });
    if (ensured.created) track('signup_completed', { language: languageRef.current ?? 'ar' });
    const nextRoles = await loadClaims(current, forceClaims || ensured.claimsUpdated);
    const snap = await getDoc(doc(db, 'users', current.uid));
    setRoles(nextRoles);
    setProfile(fromDocOrNull<UserProfile>(snap));
  }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, (next) => {
      setUser(next);
      setError(null);
      if (!next) {
        setRoles([]);
        setProfile(null);
        setInitializing(false);
        return;
      }
      setInitializing(true);
      hydrate(next, false)
        .catch((e: unknown) => setError(e))
        .finally(() => setInitializing(false));
    });
  }, [hydrate]);

  const refresh = useCallback(async () => {
    if (!auth.currentUser) return;
    setError(null);
    try {
      await hydrate(auth.currentUser, true);
    } catch (e) {
      setError(e);
    }
  }, [hydrate]);

  const signOut = useCallback(async () => {
    useCartStore.getState().clear();
    useSettingsStore.getState().setMode('buyer');
    await fbSignOut(auth);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      initializing,
      user,
      roles,
      profile,
      error,
      isStaff: staffCheck({ roles }),
      isAdmin: roles.includes('admin'),
      isSeller: roles.includes('seller'),
      refresh,
      signOut,
    }),
    [initializing, user, roles, profile, error, refresh, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

/** Convenience for screens that are only reachable when signed in. */
export function useUid(): string {
  const { user } = useAuth();
  return user?.uid ?? '';
}
