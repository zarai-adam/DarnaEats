import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Platform } from 'react-native';
import { db } from '@/services/firebase/app';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

function tokenDocId(token: string): string {
  return token.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 300);
}

/**
 * Registers this device for push notifications. Android devices register a
 * native FCM token (sent via Firebase Cloud Messaging); iOS devices register
 * an Expo push token (relayed to APNs by Expo) so no APNs key lives in the app.
 */
export async function registerForPushNotifications(uid: string): Promise<'granted' | 'denied' | 'unsupported'> {
  if (Platform.OS === 'web' || !Device.isDevice) return 'unsupported';

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('orders', {
      name: 'Orders',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  const current = await Notifications.getPermissionsAsync();
  let status = current.status;
  if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return 'denied';

  try {
    let token: string;
    let type: 'fcm' | 'expo';
    if (Platform.OS === 'android') {
      token = (await Notifications.getDevicePushTokenAsync()).data as string;
      type = 'fcm';
    } else {
      const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
      token = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;
      type = 'expo';
    }
    await setDoc(doc(db, 'users', uid, 'pushTokens', tokenDocId(token)), {
      token,
      type,
      platform: Platform.OS,
      updatedAt: serverTimestamp(),
    });
    return 'granted';
  } catch {
    // Push is best-effort (e.g. Expo Go without FCM config); in-app notifications still work.
    return 'unsupported';
  }
}

/** Maps a notification payload to an in-app route. */
export function routeForNotification(
  data: Record<string, unknown> | undefined,
  isSellerContext: boolean,
): string | null {
  const entityType = typeof data?.entityType === 'string' ? data.entityType : '';
  const entityId = typeof data?.entityId === 'string' ? data.entityId : '';
  if (!entityId) return entityType === 'seller' ? '/seller/onboarding/status' : null;
  switch (entityType) {
    case 'order':
      return isSellerContext ? `/seller/order/${entityId}` : `/order/${entityId}`;
    case 'conversation':
      return `/chat/${entityId}`;
    case 'review':
      return isSellerContext ? '/seller/reviews' : null;
    case 'report':
      return `/admin/reports/${entityId}`;
    case 'seller':
      return isSellerContext ? '/seller/onboarding/status' : `/admin/verification/${entityId}`;
    default:
      return null;
  }
}
