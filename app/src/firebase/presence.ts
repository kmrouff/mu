import { onDisconnect, onValue, ref, serverTimestamp, set } from 'firebase/database';
import { db } from './init';

// All functions no-op gracefully when `db` is null (Firebase not configured yet in .env.local)
// rather than throwing, so the app stays usable (just inert) until credentials are added.

export function registerUser(uid: string, name: string) {
  if (!db) return;
  set(ref(db, `users/${uid}/name`), name);
}

// Writes my live "who I'm pressing towards" state, and arms an onDisconnect handler so a
// crashed/closed app can't leave a contact stuck showing "receiving" forever.
export function setPressingFor(uid: string, targetId: string | null) {
  if (!db) return;
  const node = ref(db, `users/${uid}/pressingFor`);
  set(node, targetId);
  onDisconnect(node).set(null);
}

export function pingContact(myUid: string, targetUid: string) {
  if (!db) return;
  set(ref(db, `users/${targetUid}/receivedPings/${myUid}`), serverTimestamp());
}

export function subscribeToPressingFor(
  contactUid: string,
  callback: (pressingForMe: string | null) => void,
): () => void {
  if (!db) return () => {};
  const node = ref(db, `users/${contactUid}/pressingFor`);
  const unsub = onValue(node, (snap) => callback(snap.val()));
  return unsub;
}

export function subscribeToReceivedPings(
  uid: string,
  callback: (pings: Record<string, number>) => void,
): () => void {
  if (!db) return () => {};
  const node = ref(db, `users/${uid}/receivedPings`);
  const unsub = onValue(node, (snap) => callback(snap.val() ?? {}));
  return unsub;
}
