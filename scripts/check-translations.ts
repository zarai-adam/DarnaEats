/**
 * Verifies that every translation key used in the app exists in BOTH the
 * Arabic and French locale files, and that the two files have identical key
 * sets. Dynamic keys built from domain enums are expanded explicitly.
 *
 *   npm run check-translations
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  ALLERGENS,
  DIETARY_TAGS,
  IDENTITY_DOCUMENT_TYPES,
  MENU_STATUSES,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  REPORT_PRIORITIES,
  REPORT_REASONS,
  REPORT_STATUSES,
  REPORT_TARGET_TYPES,
  REVIEW_STATUSES,
  ROLES,
  SELLER_STATUSES,
  SPECIALTIES,
} from '../shared/constants';

const root = join(__dirname, '..');

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

function flatten(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' ? flatten(v as Record<string, unknown>, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

const files = [...walk(join(root, 'app')), ...walk(join(root, 'src'))];
const used = new Set<string>();
const keyPattern = /\bt\(\s*'([a-zA-Z0-9_.]+)'/g;
const quotedKeys = /['"]((?:[a-z][a-zA-Z0-9]*\.)+[a-zA-Z0-9_]+)['"]/g;
for (const file of files) {
  const src = readFileSync(file, 'utf8');
  for (const m of src.matchAll(keyPattern)) used.add(m[1]!);
  // Keys passed around as strings (labelKey: 'payment.cashOnDelivery', step keys, ...).
  for (const m of src.matchAll(quotedKeys)) {
    const key = m[1]!;
    if (
      /^(common|auth|errors|validation|payment|fulfillment|onboarding|hygiene|foodSafety|legal|welcome|dashboard|earnings|sellerProfile|reviews|orders|admin|search|checkout|chat|dish|seller|home)\./.test(
        key,
      )
    )
      used.add(key);
  }
}

const expand = (prefix: string, values: readonly (string | number)[]) =>
  values.forEach((v) => used.add(`${prefix}.${v}`));
expand('orderStatus', ORDER_STATUSES);
expand('paymentStatus', PAYMENT_STATUSES);
expand('sellerStatus', SELLER_STATUSES);
expand('onboarding.statusExplain', SELLER_STATUSES);
expand('reviewStatus', REVIEW_STATUSES);
expand('reportStatus', REPORT_STATUSES);
expand('priority', REPORT_PRIORITIES);
expand('report.reasons', REPORT_REASONS);
expand('report.target', REPORT_TARGET_TYPES);
expand('dietary', DIETARY_TAGS);
expand('allergen', ALLERGENS);
expand('specialty', SPECIALTIES);
expand('documentType', IDENTITY_DOCUMENT_TYPES);
expand('menuStatus', MENU_STATUSES);
expand('roles', ROLES);
expand('spice', [0, 1, 2, 3]);
expand('availability', [
  'available',
  'preorder',
  'sold_out',
  'outside_hours',
  'preorder_closed',
  'unavailable',
  'limited_one',
  'limited_other',
]);
expand('search.sort', ['newest', 'rating', 'price_asc', 'price_desc', 'nearest']);
expand('search.priceBand', ['any', 'under10', '10to25', 'over25']);
expand('sellerOrders.filter', ['active', 'pending', 'completed', 'cancelled', 'all']);
expand('admin.decision', ['start_review', 'approve', 'reject', 'request_changes', 'suspend', 'reactivate']);
expand('admin.actions', ['none', 'hide_dish', 'remove_review', 'suspend_seller']);
expand('admin.reviewAction', ['remove', 'restore', 'dismiss_flag']);
expand('admin.stats', [
  'totalUsers',
  'activeSellers',
  'pendingApplications',
  'activeDishes',
  'ordersToday',
  'completedOrders',
  'openReports',
  'flaggedReviews',
  'averageRating',
]);
expand('settings.push', ['granted', 'denied', 'unsupported']);
expand('requirement', [
  'displayName',
  'story',
  'specialties',
  'serviceAreaId',
  'kitchenPhotoPath',
  'identityDocumentPath',
  'identityDocumentType',
  'legalFullName',
  'phoneVerified',
  'hygieneAgreementAccepted',
  'foodSafetyAgreementAccepted',
]);
for (const s of ['marketplace', 'sellers', 'food', 'payments', 'privacy', 'data', 'moderation', 'contact']) {
  used.add(`legal.sections.${s}.title`);
  used.add(`legal.sections.${s}.body`);
}
// Plural forms (i18next count-based keys) are checked via their base key.
const pluralBases = new Set<string>();

const ar = new Set(flatten(JSON.parse(readFileSync(join(root, 'locales/ar/common.json'), 'utf8'))));
const fr = new Set(flatten(JSON.parse(readFileSync(join(root, 'locales/fr/common.json'), 'utf8'))));
const has = (set: Set<string>, key: string) =>
  set.has(key) ||
  ['_zero', '_one', '_two', '_few', '_many', '_other'].some(
    (suffix) => set.has(`${key}${suffix}`) && pluralBases.add(key),
  );

// The availability.limited key is pluralised; check forms explicitly.
used.delete('availability.limited_one');
used.delete('availability.limited_other');
used.add('availability.limited');

const missingAr = [...used].filter((k) => !has(ar, k)).sort();
const missingFr = [...used].filter((k) => !has(fr, k)).sort();
const onlyAr = [...ar].filter((k) => !fr.has(k) && !/_(zero|one|two|few|many|other)$/.test(k));
const onlyFr = [...fr].filter((k) => !ar.has(k) && !/_(zero|one|two|few|many|other)$/.test(k));

let failed = false;
const report = (label: string, list: string[]) => {
  if (list.length === 0) return;
  failed = true;
  console.error(`\n${label} (${list.length}):\n  ${list.join('\n  ')}`);
};
report('Missing in ar/common.json', missingAr);
report('Missing in fr/common.json', missingFr);
report('Keys only in ar', onlyAr);
report('Keys only in fr', onlyFr);
if (failed) process.exit(1);
console.log(`Translations OK: ${used.size} keys used, ${ar.size} ar / ${fr.size} fr entries.`);
