import { Platform } from 'react-native';
import { env } from '@/config/env';
import { app } from '@/services/firebase/app';

/**
 * Product analytics. Only these events exist, and parameters are restricted
 * to non-personal identifiers (no names, phone numbers, addresses, message
 * contents or verification data).
 */
export type AnalyticsEvent =
  | 'app_open'
  | 'signup_completed'
  | 'seller_application_started'
  | 'seller_application_submitted'
  | 'seller_approved'
  | 'dish_viewed'
  | 'seller_viewed'
  | 'search_performed'
  | 'add_to_cart'
  | 'checkout_started'
  | 'order_created'
  | 'order_completed'
  | 'review_submitted'
  | 'report_submitted';

type Params = Record<string, string | number | boolean | undefined>;

interface AnalyticsSink {
  log(event: AnalyticsEvent, params?: Params): void;
}

const debugSink: AnalyticsSink = {
  log: (event, params) => {
    if (__DEV__) console.info(`[analytics] ${event}`, params ?? {});
  },
};

let sink: AnalyticsSink = debugSink;

// Firebase Analytics (JS SDK) runs on web only. On native, swap this sink for
// @react-native-firebase/analytics in a development/production build.
if (Platform.OS === 'web' && env.firebase.measurementId && !env.useEmulators) {
  void import('firebase/analytics').then(async ({ getAnalytics, isSupported, logEvent }) => {
    if (await isSupported()) {
      const analytics = getAnalytics(app);
      sink = { log: (event, params) => logEvent(analytics, event as string, params) };
    }
  });
}

const ALLOWED_KEYS = new Set([
  'dish_id',
  'seller_id',
  'category_id',
  'order_id',
  'value',
  'items',
  'fulfillment',
  'query_length',
  'results',
  'target_type',
  'rating',
  'method',
  'language',
]);

export function track(event: AnalyticsEvent, params?: Params): void {
  const safe: Params = {};
  for (const [key, value] of Object.entries(params ?? {})) {
    if (ALLOWED_KEYS.has(key) && value !== undefined) safe[key] = value;
  }
  try {
    sink.log(event, safe);
  } catch {
    // Analytics must never break the app.
  }
}
