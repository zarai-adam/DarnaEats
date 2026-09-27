import { FirebaseError } from 'firebase/app';
import type { TFunction } from 'i18next';

/**
 * Maps any thrown error to a localized, user-safe message. Raw Firebase or
 * server messages are never shown to users.
 */
export function errorKey(error: unknown): string {
  if (error instanceof FirebaseError) {
    const details = (error as FirebaseError & { details?: { reason?: string } }).details;
    const reason = details?.reason ?? '';
    if (reason.startsWith('dish/insufficient-stock')) return 'errors.insufficientStock';
    if (reason.startsWith('dish/unavailable')) return 'errors.dishUnavailable';
    if (reason === 'seller/not-available') return 'errors.sellerUnavailable';
    if (reason === 'order/invalid-schedule') return 'errors.invalidSchedule';
    if (reason === 'order/cannot-order-own-food') return 'errors.ownFood';
    if (reason === 'order/pickup-unavailable' || reason === 'order/delivery-unavailable')
      return 'errors.fulfillmentUnavailable';
    if (reason === 'order/total-too-high') return 'errors.totalTooHigh';
    if (reason.startsWith('order/invalid-transition')) return 'errors.invalidTransition';
    if (reason === 'order/dispute-window-closed') return 'errors.disputeWindowClosed';
    if (reason === 'review/already-submitted' || reason === 'review/already-responded') return 'errors.alreadyDone';
    if (reason.startsWith('rate-limit')) return 'errors.rateLimited';
    if (reason.startsWith('validation')) return 'errors.validation';

    switch (error.code) {
      case 'auth/invalid-email':
        return 'errors.auth.invalidEmail';
      case 'auth/email-already-in-use':
        return 'errors.auth.emailInUse';
      case 'auth/weak-password':
        return 'errors.auth.weakPassword';
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'errors.auth.invalidCredentials';
      case 'auth/too-many-requests':
        return 'errors.rateLimited';
      case 'auth/invalid-phone-number':
        return 'errors.auth.invalidPhone';
      case 'auth/invalid-verification-code':
      case 'auth/code-expired':
        return 'errors.auth.invalidCode';
      case 'auth/user-disabled':
        return 'errors.auth.disabled';
      case 'auth/network-request-failed':
      case 'unavailable':
      case 'functions/unavailable':
        return 'errors.network';
      case 'permission-denied':
      case 'functions/permission-denied':
      case 'storage/unauthorized':
        return 'errors.permission';
      case 'functions/unauthenticated':
      case 'unauthenticated':
        return 'errors.unauthenticated';
      case 'functions/resource-exhausted':
        return 'errors.rateLimited';
      case 'not-found':
      case 'functions/not-found':
        return 'errors.notFound';
      default:
        return 'errors.generic';
    }
  }
  if (error instanceof Error && error.message === 'too-large') return 'errors.imageTooLarge';
  return 'errors.generic';
}

export function errorMessage(error: unknown, t: TFunction): string {
  return t(errorKey(error));
}
