import { readFileSync } from 'node:fs';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, setDoc } from 'firebase/firestore';
import { getBytes, ref, uploadBytes } from 'firebase/storage';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

let env: RulesTestEnvironment;
const IMAGE = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
const jpeg = { contentType: 'image/jpeg' };

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-darna-eats',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
    storage: { rules: readFileSync('storage.rules', 'utf8'), host: '127.0.0.1', port: 9199 },
  });
});
afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.clearStorage();
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'sellerVerification', 'sellerA'), { status: 'draft' });
    await setDoc(doc(ctx.firestore(), 'sellerVerification', 'sellerB'), { status: 'approved' });
    await uploadBytes(ref(ctx.storage(), 'verification/sellerA/id.jpg'), IMAGE, jpeg);
  });
});

const as = (uid: string, roles: string[]) => env.authenticatedContext(uid, { roles }).storage();

describe('storage rules', () => {
  it('owner can upload identity documents while the application is editable', async () => {
    await assertSucceeds(uploadBytes(ref(as('sellerA', ['seller']), 'verification/sellerA/id2.jpg'), IMAGE, jpeg));
  });
  it('identity documents are locked after approval', async () => {
    await assertFails(uploadBytes(ref(as('sellerB', ['seller']), 'verification/sellerB/id.jpg'), IMAGE, jpeg));
  });
  it("other sellers and buyers cannot read someone's identity document", async () => {
    await assertFails(getBytes(ref(as('sellerB', ['seller']), 'verification/sellerA/id.jpg')));
    await assertFails(getBytes(ref(as('buyer1', ['buyer']), 'verification/sellerA/id.jpg')));
    await assertFails(getBytes(ref(env.unauthenticatedContext().storage(), 'verification/sellerA/id.jpg')));
  });
  it('staff and the owner can read identity documents', async () => {
    await assertSucceeds(getBytes(ref(as('admin1', ['admin']), 'verification/sellerA/id.jpg')));
    await assertSucceeds(getBytes(ref(as('sellerA', ['seller']), 'verification/sellerA/id.jpg')));
  });
  it("rejects non-image uploads and writes into other users' folders", async () => {
    await assertFails(
      uploadBytes(ref(as('sellerA', ['seller']), 'dishes/sellerA/x.pdf'), IMAGE, { contentType: 'application/pdf' }),
    );
    await assertFails(uploadBytes(ref(as('sellerA', ['seller']), 'dishes/sellerB/x.jpg'), IMAGE, jpeg));
    await assertSucceeds(uploadBytes(ref(as('sellerA', ['seller']), 'dishes/sellerA/x.jpg'), IMAGE, jpeg));
    await assertFails(uploadBytes(ref(as('buyer1', ['buyer']), 'dishes/buyer1/x.jpg'), IMAGE, jpeg));
  });
  it('rejects oversized images', async () => {
    const big = new Uint8Array(5 * 1024 * 1024 + 10);
    await assertFails(uploadBytes(ref(as('sellerA', ['seller']), 'sellers/sellerA/kitchen/k.jpg'), big, jpeg));
  });
});
