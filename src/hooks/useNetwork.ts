import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

/** Wires React Query's online manager to NetInfo (call once at the root). */
export function setupOnlineManager() {
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => setOnline(state.isConnected !== false && state.isInternetReachable !== false)),
  );
}

export function useIsOnline(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(
    () =>
      NetInfo.addEventListener((state) =>
        setOnline(state.isConnected !== false && state.isInternetReachable !== false),
      ),
    [],
  );
  return online;
}
