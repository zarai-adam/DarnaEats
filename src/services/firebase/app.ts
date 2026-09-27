import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getReactNativePersistence } from '@firebase/auth';
import { connectAuthEmulator, getAuth, initializeAuth, type Auth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, initializeFirestore, type Firestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions, type Functions } from 'firebase/functions';
import { connectStorageEmulator, getStorage, type FirebaseStorage } from 'firebase/storage';
import { Platform } from 'react-native';
import { env } from '@/config/env';
import { secureStorage } from '@/services/secureStorage';

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let functions: Functions;
let storage: FirebaseStorage;

function init() {
  if (getApps().length > 0) {
    app = getApp();
    auth = getAuth(app);
    db = getFirestore(app);
  } else {
    app = initializeApp(env.firebase);
    auth =
      Platform.OS === 'web'
        ? getAuth(app)
        : // Session tokens live in the OS keychain/keystore, not plain storage.
          initializeAuth(app, { persistence: getReactNativePersistence(secureStorage) });
    // Long polling is more reliable on mobile networks and emulators.
    db = initializeFirestore(app, { experimentalAutoDetectLongPolling: true, ignoreUndefinedProperties: true });
  }
  functions = getFunctions(app, env.functionsRegion);
  storage = getStorage(app);

  if (env.useEmulators) {
    const host = env.emulatorHost;
    connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, host, 8080);
    connectFunctionsEmulator(functions, host, 5001);
    connectStorageEmulator(storage, host, 9199);
  }

  if (Platform.OS === 'web' && env.appCheckSiteKey && !env.useEmulators) {
    // App Check in the JS SDK is web-only. Native attestation (Play Integrity /
    // App Attest) requires @react-native-firebase/app-check in a dev build.
    void import('firebase/app-check').then(({ initializeAppCheck, ReCaptchaEnterpriseProvider }) =>
      initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(env.appCheckSiteKey),
        isTokenAutoRefreshEnabled: true,
      }),
    );
  }
}

init();

export { app, auth, db, functions, storage };
