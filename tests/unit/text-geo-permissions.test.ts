import { describe, expect, it } from 'vitest';
import { approximateCoordinate, haversineKm, roundedDistanceKm } from '../../shared/geo';
import { canPerform, canSelfAssign, isStaff, primaryRole } from '../../shared/permissions';
import {
  canSubmitApplication,
  isSellerPublic,
  missingApplicationRequirements,
  nextSellerStatus,
} from '../../shared/sellerApproval';
import { buildSearchTokens, normalizeText, slugify, tokenize } from '../../shared/text';

describe('text normalisation & search tokens', () => {
  it('normalises Arabic variants and diacritics', () => {
    expect(normalizeText('كُسْكُسِي')).toBe('كسكسي');
    expect(normalizeText('أحمد')).toBe(normalizeText('احمد'));
    expect(normalizeText('ملوخية')).toBe('ملوخيه');
  });
  it('normalises French accents and punctuation', () => {
    expect(normalizeText('Pâtisserie, Crème-Brûlée!')).toBe('patisserie creme brulee');
    expect(tokenize('Brik à l’œuf')).toEqual(['brik', 'oeuf']);
  });
  it('builds prefix tokens usable for search', () => {
    const tokens = buildSearchTokens(['Couscous', 'كسكسي']);
    expect(tokens).toContain('co');
    expect(tokens).toContain('couscous');
    expect(tokens).toContain('كس');
    expect(slugify('Ben Arous Ville')).toBe('ben-arous-ville');
  });
});

describe('geo privacy', () => {
  it('snaps coordinates to a coarse grid', () => {
    expect(approximateCoordinate({ latitude: 36.84237, longitude: 10.18291 })).toEqual({
      latitude: 36.84,
      longitude: 10.18,
    });
  });
  it('computes distances and rounds them', () => {
    const km = haversineKm({ latitude: 36.8065, longitude: 10.1815 }, { latitude: 36.8782, longitude: 10.3247 });
    expect(km).toBeGreaterThan(14);
    expect(km).toBeLessThan(16);
    expect(roundedDistanceKm(0.3)).toBe(1);
    expect(roundedDistanceKm(13)).toBe(15);
  });
});

describe('permissions', () => {
  it('never lets users self-assign staff roles', () => {
    expect(canSelfAssign('seller')).toBe(true);
    expect(canSelfAssign('admin')).toBe(false);
    expect(canSelfAssign('moderator')).toBe(false);
  });
  it('scopes moderator actions', () => {
    expect(canPerform({ roles: ['moderator'] }, 'review.moderate')).toBe(true);
    expect(canPerform({ roles: ['moderator'] }, 'user.roles')).toBe(false);
    expect(canPerform({ roles: ['admin'] }, 'user.roles')).toBe(true);
    expect(canPerform({ roles: ['buyer', 'seller'] }, 'seller.review')).toBe(false);
    expect(isStaff({ roles: ['buyer'] })).toBe(false);
    expect(primaryRole(['buyer', 'seller'])).toBe('seller');
  });
});

describe('seller approval', () => {
  it('only approves from submitted/under_review', () => {
    expect(nextSellerStatus('submitted', 'approve')).toBe('approved');
    expect(nextSellerStatus('draft', 'approve')).toBeNull();
    expect(nextSellerStatus('approved', 'suspend')).toBe('suspended');
    expect(nextSellerStatus('suspended', 'reactivate')).toBe('approved');
    expect(nextSellerStatus('under_review', 'request_changes')).toBe('draft');
  });
  it('is public only when approved', () => {
    expect(isSellerPublic('approved')).toBe(true);
    expect(isSellerPublic('submitted')).toBe(false);
    expect(isSellerPublic('suspended')).toBe(false);
    expect(canSubmitApplication('rejected')).toBe(true);
    expect(canSubmitApplication('approved')).toBe(false);
  });
  it('lists missing application requirements', () => {
    expect(missingApplicationRequirements({})).toContain('hygieneAgreementAccepted');
    expect(
      missingApplicationRequirements({
        displayName: 'Najet',
        legalFullName: 'Najet B.',
        story: 'Je cuisine depuis trente ans pour ma famille.',
        specialties: ['couscous'],
        serviceAreaId: 'tunis-menzah',
        kitchenPhotoPath: 'sellers/u/kitchen/k.jpg',
        identityDocumentPath: 'verification/u/id.jpg',
        identityDocumentType: 'national_id',
        phoneVerified: true,
        hygieneAgreementAccepted: true,
        foodSafetyAgreementAccepted: true,
      }),
    ).toEqual([]);
  });
});
