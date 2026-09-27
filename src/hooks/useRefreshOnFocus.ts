import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';

/** Refetches when a screen regains focus (skipping the first focus). */
export function useRefreshOnFocus(refetch: () => unknown) {
  const first = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (first.current) {
        first.current = false;
        return;
      }
      void refetch();
    }, [refetch]),
  );
}
