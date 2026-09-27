import * as SecureStore from 'expo-secure-store';

/**
 * AsyncStorage-compatible adapter backed by the OS keychain/keystore
 * (Expo SecureStore). Used to persist the Firebase Auth session on device.
 *
 * SecureStore keys only allow [A-Za-z0-9._-] and values should stay under
 * ~2 KB, so keys are encoded and large values are split into chunks.
 */
const CHUNK_SIZE = 1800;

function encodeKey(key: string): string {
  return `de_${key.replace(/[^A-Za-z0-9._-]/g, (c) => `_${c.charCodeAt(0).toString(16)}_`)}`;
}

async function removeChunks(base: string): Promise<void> {
  const count = Number((await SecureStore.getItemAsync(`${base}.n`)) ?? '0');
  await Promise.all(Array.from({ length: count }, (_, i) => SecureStore.deleteItemAsync(`${base}.${i}`)));
  await SecureStore.deleteItemAsync(`${base}.n`);
}

export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    const base = encodeKey(key);
    const count = await SecureStore.getItemAsync(`${base}.n`);
    if (count === null) return null;
    const parts = await Promise.all(
      Array.from({ length: Number(count) }, (_, i) => SecureStore.getItemAsync(`${base}.${i}`)),
    );
    if (parts.some((p) => p === null)) return null;
    return parts.join('');
  },
  async setItem(key: string, value: string): Promise<void> {
    const base = encodeKey(key);
    await removeChunks(base);
    const chunks = value.match(new RegExp(`[\\s\\S]{1,${CHUNK_SIZE}}`, 'g')) ?? [''];
    await Promise.all(chunks.map((chunk, i) => SecureStore.setItemAsync(`${base}.${i}`, chunk)));
    await SecureStore.setItemAsync(`${base}.n`, String(chunks.length));
  },
  async removeItem(key: string): Promise<void> {
    await removeChunks(encodeKey(key));
  },
};
