/**
 * Public runtime configuration. Everything here is embedded in the bundle,
 * so it must never contain secrets.
 *
 * Expo only inlines EXPO_PUBLIC_* variables accessed statically as
 * `process.env.EXPO_PUBLIC_NAME`, so each one is read explicitly.
 */
function or(value: string | undefined, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

export const env = {
  firebase: {
    apiKey: or(process.env.EXPO_PUBLIC_FIREBASE_API_KEY, 'demo-api-key'),
    authDomain: or(process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN, 'demo-darna-eats.firebaseapp.com'),
    projectId: or(process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID, 'demo-darna-eats'),
    storageBucket: or(process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET, 'demo-darna-eats.appspot.com'),
    messagingSenderId: or(process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID, '0'),
    appId: or(process.env.EXPO_PUBLIC_FIREBASE_APP_ID, '1:0:web:0'),
    measurementId: or(process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID, ''),
  },
  functionsRegion: or(process.env.EXPO_PUBLIC_FUNCTIONS_REGION, 'europe-west1'),
  useEmulators: or(process.env.EXPO_PUBLIC_USE_EMULATORS, 'true') === 'true',
  emulatorHost: or(process.env.EXPO_PUBLIC_EMULATOR_HOST, '127.0.0.1'),
  appCheckSiteKey: or(process.env.EXPO_PUBLIC_APPCHECK_RECAPTCHA_SITE_KEY, ''),
  mapTileUrl: or(process.env.EXPO_PUBLIC_MAP_TILE_URL, 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'),
  mapAttribution: or(process.env.EXPO_PUBLIC_MAP_ATTRIBUTION, '© OpenStreetMap contributors'),
  termsVersion: or(process.env.EXPO_PUBLIC_TERMS_VERSION, '1.0'),
} as const;
