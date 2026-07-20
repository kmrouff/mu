import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const UID_KEY = 'mu.uid';
const NAME_KEY = 'mu.name';

function randomId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export type Identity = { uid: string; name: string };

// No passwords, no OAuth — each install gets a private random ID the first time it runs,
// persisted locally. "Signing in" just means picking a name once; there's nothing to log
// into on a server. Good enough for a small app between people who trust each other.
export function useIdentity() {
  const [identity, setIdentity] = useState<Identity | null | undefined>(undefined); // undefined = still loading
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      let storedUid = await AsyncStorage.getItem(UID_KEY);
      if (!storedUid) {
        storedUid = randomId();
        await AsyncStorage.setItem(UID_KEY, storedUid);
      }
      setUid(storedUid);
      const storedName = await AsyncStorage.getItem(NAME_KEY);
      setIdentity(storedName ? { uid: storedUid, name: storedName } : null);
    })();
  }, []);

  const setName = async (name: string) => {
    if (!uid) return;
    await AsyncStorage.setItem(NAME_KEY, name);
    setIdentity({ uid, name });
  };

  const clearName = async () => {
    await AsyncStorage.removeItem(NAME_KEY);
    setIdentity(null);
  };

  return { identity, setName, clearName, loading: identity === undefined };
}
