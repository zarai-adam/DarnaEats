/**
 * Darna Eats Cloud Functions entry point.
 *
 * Callable functions wrap framework-agnostic service functions so that the
 * business logic can be integration-tested directly against the emulators.
 */
import { setGlobalOptions } from 'firebase-functions/v2';
import { onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { callerFrom, type Caller } from './lib/context';
import { REGION } from './lib/firebase';
import * as admin from './services/admin';
import * as dishes from './services/dishes';
import * as orders from './services/orders';
import * as reports from './services/reports';
import * as reviews from './services/reviews';
import * as sellers from './services/sellers';
import * as users from './services/users';

setGlobalOptions({ region: REGION, maxInstances: 10 });

// App Check is enforced in production once the app ships with an attested
// provider. Toggle with the ENFORCE_APP_CHECK environment variable.
const enforceAppCheck = process.env.ENFORCE_APP_CHECK === 'true';

function callable<T>(handler: (caller: Caller, data: unknown) => Promise<T>) {
  return onCall({ enforceAppCheck, cors: true }, (request: CallableRequest) =>
    handler(callerFrom(request), request.data),
  );
}

export const ensureUserProfile = callable(users.ensureUserProfile);
export const becomeSeller = callable((caller) => sellers.becomeSeller(caller));
export const submitSellerApplication = callable((caller) => sellers.submitSellerApplication(caller));
export const reviewSellerApplication = callable(sellers.reviewSeller);

export const placeOrder = callable((caller, data) => orders.placeOrder(caller, data));
export const updateOrderStatus = callable((caller, data) => orders.updateOrderStatus(caller, data));

export const submitReview = callable(reviews.submitReview);
export const respondToReview = callable(reviews.respondToReview);
export const flagReview = callable(reviews.flagReview);
export const moderateReview = callable(reviews.moderateReview);

export const createReport = callable(reports.createReport);
export const updateReport = callable(reports.updateReport);

export const setDishHidden = callable(dishes.setDishHidden);

export const adminGetStats = callable((caller) => admin.getAdminStats(caller));
export const adminGetAnalytics = callable((caller) => admin.getAdminAnalytics(caller));
export const adminSetUserRoles = callable(admin.setUserRoles);
export const adminSetUserActive = callable(admin.setUserActive);
export const adminSaveCatalogEntity = callable(admin.saveCatalogEntity);
export const adminInspectConversation = callable(admin.inspectConversation);
export const adminLogVerificationAccess = callable(admin.logVerificationAccess);

export const expireStaleOrders = onSchedule({ schedule: 'every 60 minutes', timeZone: 'Africa/Tunis' }, async () => {
  await orders.expireStalePendingOrders();
});

export { onDishWritten, onMenuWritten, onMessageCreated, onSellerProfileWritten } from './triggers';
