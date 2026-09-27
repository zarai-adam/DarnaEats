import type { SellerStatus } from './constants';

export type SellerDecision = 'start_review' | 'approve' | 'reject' | 'request_changes' | 'suspend' | 'reactivate';

const DECISION_RULES: Record<SellerDecision, { from: readonly SellerStatus[]; to: SellerStatus }> = {
  start_review: { from: ['submitted'], to: 'under_review' },
  approve: { from: ['submitted', 'under_review'], to: 'approved' },
  reject: { from: ['submitted', 'under_review'], to: 'rejected' },
  request_changes: { from: ['submitted', 'under_review'], to: 'draft' },
  suspend: { from: ['approved'], to: 'suspended' },
  reactivate: { from: ['suspended'], to: 'approved' },
};

export function nextSellerStatus(current: SellerStatus, decision: SellerDecision): SellerStatus | null {
  const rule = DECISION_RULES[decision];
  return rule.from.includes(current) ? rule.to : null;
}

export function decisionRequiresReason(decision: SellerDecision): boolean {
  return decision === 'reject' || decision === 'request_changes' || decision === 'suspend';
}

/** Only approved sellers are discoverable, can publish, and can receive orders. */
export function isSellerPublic(status: SellerStatus): boolean {
  return status === 'approved';
}

/** Sellers can (re)submit only from draft or after a rejection. */
export function canSubmitApplication(status: SellerStatus): boolean {
  return status === 'draft' || status === 'rejected';
}

export interface ApplicationCompleteness {
  displayName?: string | null;
  story?: string | null;
  specialties?: readonly string[] | null;
  serviceAreaId?: string | null;
  kitchenPhotoPath?: string | null;
  identityDocumentPath?: string | null;
  identityDocumentType?: string | null;
  legalFullName?: string | null;
  phoneVerified?: boolean;
  hygieneAgreementAccepted?: boolean;
  foodSafetyAgreementAccepted?: boolean;
}

export type ApplicationRequirement = keyof ApplicationCompleteness;

/** Lists missing requirements; an empty array means the application may be submitted. */
export function missingApplicationRequirements(input: ApplicationCompleteness): ApplicationRequirement[] {
  const missing: ApplicationRequirement[] = [];
  if (!input.displayName?.trim()) missing.push('displayName');
  if (!input.legalFullName?.trim()) missing.push('legalFullName');
  if (!input.story || input.story.trim().length < 20) missing.push('story');
  if (!input.specialties || input.specialties.length === 0) missing.push('specialties');
  if (!input.serviceAreaId) missing.push('serviceAreaId');
  if (!input.kitchenPhotoPath) missing.push('kitchenPhotoPath');
  if (!input.identityDocumentPath) missing.push('identityDocumentPath');
  if (!input.identityDocumentType) missing.push('identityDocumentType');
  if (!input.phoneVerified) missing.push('phoneVerified');
  if (!input.hygieneAgreementAccepted) missing.push('hygieneAgreementAccepted');
  if (!input.foodSafetyAgreementAccepted) missing.push('foodSafetyAgreementAccepted');
  return missing;
}
