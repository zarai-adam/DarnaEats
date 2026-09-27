import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Expo app configuration. Only values that are safe to ship inside the app
 * bundle may be read here (EXPO_PUBLIC_* variables). Server secrets belong in
 * Cloud Functions configuration, never in this file.
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Darna Eats',
  slug: 'darna-eats',
  scheme: 'darnaeats',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  ios: {
    bundleIdentifier: 'tn.darnaeats.app',
    supportsTablet: false,
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'Darna Eats uses your approximate location to show home cooks near you. / يستعمل التطبيق موقعك التقريبي لعرض الطباخين القريبين منك.',
      NSPhotoLibraryUsageDescription: 'Darna Eats needs access to your photos to upload dish and kitchen pictures.',
      NSCameraUsageDescription: 'Darna Eats uses the camera to photograph dishes and your kitchen.',
    },
  },
  android: {
    package: 'tn.darnaeats.app',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#C65D3A',
    },
    permissions: ['ACCESS_COARSE_LOCATION', 'CAMERA', 'POST_NOTIFICATIONS'],
    blockedPermissions: ['ACCESS_FINE_LOCATION'],
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON,
  },
  web: {
    bundler: 'metro',
    output: 'single',
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-font',
    [
      'expo-splash-screen',
      { image: './assets/splash.png', imageWidth: 200, resizeMode: 'contain', backgroundColor: '#FFF8ED' },
    ],
    ['expo-localization', { supportsRTL: true }],
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
        color: '#C65D3A',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'Darna Eats needs access to your photos to upload dish and kitchen pictures.',
        cameraPermission: 'Darna Eats uses the camera to photograph dishes and your kitchen.',
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission: 'Darna Eats uses your approximate location to show home cooks near you.',
      },
    ],
  ],
  experiments: {
    typedRoutes: false,
  },
  extra: {
    supportsRTL: true,
    eas: { projectId: process.env.EAS_PROJECT_ID },
  },
});
