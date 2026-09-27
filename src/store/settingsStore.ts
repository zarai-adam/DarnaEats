import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Language } from '@shared/constants';

export type AppMode = 'buyer' | 'seller';

interface SettingsState {
  language: Language | null;
  mode: AppMode;
  /** Governorate used to prioritise nearby food when location is not shared. */
  preferredGovernorateId: string | null;
  notificationsPrompted: boolean;
  hasHydrated: boolean;
  setLanguage: (language: Language) => void;
  setMode: (mode: AppMode) => void;
  setPreferredGovernorate: (id: string | null) => void;
  setNotificationsPrompted: () => void;
}

/** Non-sensitive UI preferences persisted on device. */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: null,
      mode: 'buyer',
      preferredGovernorateId: null,
      notificationsPrompted: false,
      hasHydrated: false,
      setLanguage: (language) => set({ language }),
      setMode: (mode) => set({ mode }),
      setPreferredGovernorate: (preferredGovernorateId) => set({ preferredGovernorateId }),
      setNotificationsPrompted: () => set({ notificationsPrompted: true }),
    }),
    {
      name: 'darna-settings',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ language, mode, preferredGovernorateId, notificationsPrompted }) => ({
        language,
        mode,
        preferredGovernorateId,
        notificationsPrompted,
      }),
      onRehydrateStorage: () => () => {
        useSettingsStore.setState({ hasHydrated: true });
      },
    },
  ),
);
