/**
 * `getReactNativePersistence` exists in the React Native build of
 * @firebase/auth (selected by Metro via the "react-native" export condition)
 * but is missing from the default public typings. Declare it here.
 */
import type { Persistence } from 'firebase/auth';

declare module '@firebase/auth' {
  interface ReactNativeAsyncStorage {
    setItem(key: string, value: string): Promise<void>;
    getItem(key: string): Promise<string | null>;
    removeItem(key: string): Promise<void>;
  }
  export function getReactNativePersistence(storage: ReactNativeAsyncStorage): Persistence;
}
