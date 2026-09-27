import * as Updates from 'expo-updates';
import { DevSettings, Platform } from 'react-native';

/** Reloads the JS bundle so a layout direction change (RTL/LTR) applies everywhere. */
export async function reloadApp(): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.location?.reload();
    return;
  }
  try {
    await Updates.reloadAsync();
  } catch {
    // expo-updates is unavailable in development builds served by Metro.
    DevSettings.reload();
  }
}
