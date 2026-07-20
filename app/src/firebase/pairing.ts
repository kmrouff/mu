import { get, onValue, ref, remove, set } from 'firebase/database';
import { db } from './init';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I — easier to read aloud
const CODE_LENGTH = 6;
const CODE_TTL_MS = 15 * 60 * 1000;

function randomCode() {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

export type RemoteContact = { id: string; name: string };

// Generates a short, human-shareable code the other person types into "Connect with someone"
// (or that a real share sheet could send as a link, later). Whoever redeems it first wins —
// simple, no server-side auth needed since there's nothing sensitive in a name + random id.
export async function createConnectCode(myUid: string, myName: string): Promise<string> {
  if (!db) throw new Error('Backend not configured yet');
  const code = randomCode();
  await set(ref(db, `connectCodes/${code}`), {
    uid: myUid,
    name: myName,
    expiresAt: Date.now() + CODE_TTL_MS,
  });
  return code;
}

export type RedeemCodeResult = { contact: RemoteContact } | { error: 'not_found' | 'expired' | 'self' };

export async function redeemConnectCode(
  rawCode: string,
  myUid: string,
  myName: string,
): Promise<RedeemCodeResult> {
  if (!db) return { error: 'not_found' };
  const code = rawCode.trim().toUpperCase();
  const snap = await get(ref(db, `connectCodes/${code}`));
  const val = snap.val() as { uid: string; name: string; expiresAt: number } | null;

  if (!val) return { error: 'not_found' };
  if (val.expiresAt < Date.now()) return { error: 'expired' };
  if (val.uid === myUid) return { error: 'self' };

  const now = Date.now();
  await Promise.all([
    set(ref(db, `users/${myUid}/contacts/${val.uid}`), { name: val.name, addedAt: now }),
    set(ref(db, `users/${val.uid}/contacts/${myUid}`), { name: myName, addedAt: now }),
    remove(ref(db, `connectCodes/${code}`)),
  ]);

  return { contact: { id: val.uid, name: val.name } };
}

export function subscribeToContacts(
  uid: string,
  callback: (contacts: RemoteContact[]) => void,
): () => void {
  if (!db) return () => {};
  const node = ref(db, `users/${uid}/contacts`);
  const unsub = onValue(node, (snap) => {
    const val = (snap.val() ?? {}) as Record<string, { name: string; addedAt: number }>;
    const list = Object.entries(val)
      .sort((a, b) => a[1].addedAt - b[1].addedAt)
      .map(([id, v]) => ({ id, name: v.name }));
    callback(list);
  });
  return unsub;
}
