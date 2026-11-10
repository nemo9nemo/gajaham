import test, { after } from 'node:test';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8180') throw new Error('Only isolated local emulator allowed.');
const env = await initializeTestEnvironment({ projectId: 'demo-gajaham-web', firestore: { host: '127.0.0.1', port: 8180, rules: await readFile(new URL('../../firestore.rules', import.meta.url), 'utf8') } });
after(() => env.cleanup());
test('direct database reads/writes denied for guest, owner, other UID and forged administrator', async () => {
  for (const context of [env.unauthenticatedContext(), env.authenticatedContext('owner'), env.authenticatedContext('other'), env.authenticatedContext('owner', { admin: true })]) {
    const db = context.firestore();
    await assertFails(getDoc(doc(db, 'users/owner')));
    await assertFails(getDocs(collection(db, 'users/owner/records')));
    await assertFails(setDoc(doc(db, 'users/owner/records/forged'), { memo: 'write' }));
    await assertFails(setDoc(doc(db, 'apiLimits/owner'), { units: 0 }));
  }
});
