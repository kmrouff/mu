import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import { useIdentity } from '../identity/useIdentity';
import { registerUser, pingContact, setPressingFor, subscribeToPressingFor, subscribeToReceivedPings } from '../firebase/presence';
import { createConnectCode, redeemConnectCode, subscribeToContacts, RemoteContact } from '../firebase/pairing';
import { motion } from '../theme/tokens';

const WELCOME_SEEN_KEY = 'mu.hasSeenWelcome';
const LAST_SEEN_KEY = 'mu.lastSeenAt';

// Pulls a connect code out of an incoming deep link. Supports both `mu://connect/XXXXXX` and
// `mu://connect?code=XXXXXX` (and Expo Go's `exp://host/--/connect/XXXXXX` dev-mode wrapping —
// `Linking.parse` strips that down to the same {path, queryParams} shape either way).
function extractInviteCode(url: string): string | null {
  try {
    const { path, queryParams } = Linking.parse(url);
    const fromQuery = queryParams?.code;
    if (typeof fromQuery === 'string') return fromQuery.toUpperCase();
    if (path) {
      const segments = path.split('/').filter(Boolean);
      const last = segments[segments.length - 1];
      if (last && last.toLowerCase() !== 'connect') return last.toUpperCase();
    }
  } catch {
    // malformed/unrelated URL — ignore
  }
  return null;
}

export type Contact = { id: string; name: string };
export type InfoScreen = 'mission' | 'contact' | 'faq' | 'terms' | null;

// README "both" haptic spec: a repeating buzz-buzz-pause. expo-haptics has no raw
// vibration-pattern API, so this approximates it with two quick impacts per tick. The tick
// interval comes from motion.heartbeatMs, the same token driving the orb's scale sequence, so
// the buzz you feel lines up with the beat you see.
async function vibrateOnce() {
  if (Platform.OS === 'web') return;
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }, 90);
  } catch {
    // haptics unavailable (e.g. simulator) — ignore
  }
}

export function useMuState() {
  const { identity, setName, clearName } = useIdentity();
  const uid = identity?.uid ?? null;

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [youPressing, setYouPressing] = useState(false);
  const [theirActive, setTheirActive] = useState<Record<string, boolean>>({});
  const [lastPingAt, setLastPingAt] = useState<Record<string, number>>({});
  const [lastSeenAt, setLastSeenAt] = useState<Record<string, number>>({});
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showAddOverlay, setShowAddOverlay] = useState(false);
  const [infoScreen, setInfoScreen] = useState<InfoScreen>(null);
  const [pendingInviteCode, setPendingInviteCode] = useState<string | null>(null);
  const [hasSeenWelcome, setHasSeenWelcome] = useState<boolean | null>(null); // null = still loading

  const heartbeatInterval = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const wasBoth = useRef(false);
  const autoRedeemed = useRef(false);

  const both = !!selectedId && youPressing && !!theirActive[selectedId];

  // One-time "why this app exists" note — check once whether this device has already
  // dismissed it, so it never shows again after the first time.
  useEffect(() => {
    AsyncStorage.getItem(WELCOME_SEEN_KEY).then((v) => setHasSeenWelcome(v === 'true'));
  }, []);

  // Pings live on the server, but "I've already looked at this one" is purely local. Without
  // persisting it, every reload compares against an empty record and every ping you've already
  // read comes back as unread.
  useEffect(() => {
    AsyncStorage.getItem(LAST_SEEN_KEY).then((raw) => {
      if (!raw) return;
      try {
        const saved = JSON.parse(raw) as Record<string, number>;
        // Anything marked seen during this session was seen more recently than the stored copy.
        setLastSeenAt((current) => ({ ...saved, ...current }));
      } catch {
        // corrupt entry — not worth surfacing, it just means one stale badge
      }
    });
  }, []);

  // Whatever you're currently looking at counts as read, including pings that land while you
  // sit on it. Bails out when it's already marked so this can't loop on its own update.
  useEffect(() => {
    if (!selectedId) return;
    const ping = lastPingAt[selectedId];
    if (ping == null) return;
    setLastSeenAt((current) => {
      if ((current[selectedId] ?? 0) >= ping) return current;
      const next = { ...current, [selectedId]: Math.max(Date.now(), ping) };
      AsyncStorage.setItem(LAST_SEEN_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, [selectedId, lastPingAt]);

  // Catch an invite code from a deep link — whether the app was launched fresh via the link
  // (cold start) or was already open when the link was tapped (warm start).
  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (url) {
        const code = extractInviteCode(url);
        if (code) setPendingInviteCode(code);
      }
    });
    const sub = Linking.addEventListener('url', ({ url }) => {
      const code = extractInviteCode(url);
      if (code) setPendingInviteCode(code);
    });
    return () => sub.remove();
  }, []);

  // Once we have both a fresh identity and a pending invite code, redeem it automatically —
  // by the time someone finishes picking a name, their person should already be there.
  useEffect(() => {
    if (!identity || !pendingInviteCode || autoRedeemed.current) return;
    autoRedeemed.current = true;
    redeemConnectCode(pendingInviteCode, identity.uid, identity.name).finally(() => {
      setPendingInviteCode(null);
    });
  }, [identity, pendingInviteCode]);

  // Register our name once we have an identity, and keep a live subscription to our real
  // contacts list (replaces the old hardcoded CONTACTS array).
  useEffect(() => {
    if (!identity) return;
    registerUser(identity.uid, identity.name);
    const unsub = subscribeToContacts(identity.uid, (list: RemoteContact[]) => {
      setContacts(list);
      setSelectedId((current) => current ?? list[0]?.id ?? null);
    });
    return unsub;
  }, [identity]);

  // For every contact, listen to whether *they* are currently pressing towards *us*.
  useEffect(() => {
    if (!uid) return;
    const unsubs = contacts.map((c) =>
      subscribeToPressingFor(c.id, (pressingForMe) => {
        setTheirActive((s) => ({ ...s, [c.id]: pressingForMe === uid }));
      }),
    );
    return () => unsubs.forEach((u) => u());
  }, [uid, contacts]);

  // Real pings received from contacts (each keyed by the sender's uid, which is the contact id).
  useEffect(() => {
    if (!uid) return;
    return subscribeToReceivedPings(uid, (pings) => setLastPingAt(pings ?? {}));
  }, [uid]);

  const unseen = useMemo(() => {
    const result: Record<string, boolean> = {};
    for (const c of contacts) {
      result[c.id] = (lastPingAt[c.id] ?? 0) > (lastSeenAt[c.id] ?? 0);
    }
    return result;
  }, [contacts, lastPingAt, lastSeenAt]);

  // Haptic heartbeat loop while the mutual "both" state holds.
  useEffect(() => {
    if (both && !wasBoth.current) {
      vibrateOnce();
      heartbeatInterval.current = setInterval(vibrateOnce, motion.heartbeatMs);
    } else if (!both && wasBoth.current) {
      clearInterval(heartbeatInterval.current);
    }
    wasBoth.current = both;
    return () => clearInterval(heartbeatInterval.current);
  }, [both]);

  return {
    identity,
    contacts,
    selectedId,
    youPressing,
    theirActive,
    unseen,
    lastPingAt,
    settingsOpen,
    showAddOverlay,
    infoScreen,
    both,
    loggedIn: !!identity,
    hasPendingInvite: !!pendingInviteCode,
    showWelcome: !!identity && hasSeenWelcome === false,

    setName,

    selectContact: (id: string) => {
      setSelectedId(id);
      setLastSeenAt((s) => {
        const next = { ...s, [id]: Date.now() };
        AsyncStorage.setItem(LAST_SEEN_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    handlePress: () => {
      setYouPressing(true);
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
      if (uid && selectedId) {
        setPressingFor(uid, selectedId);
        pingContact(uid, selectedId);
      }
    },
    handleRelease: () => {
      setYouPressing(false);
      if (uid) setPressingFor(uid, null);
    },
    toggleSettings: () => setSettingsOpen((v) => !v),
    closeSettings: () => setSettingsOpen(false),
    openAddOverlay: () => setShowAddOverlay(true),
    closeAddOverlay: () => setShowAddOverlay(false),
    logout: () => {
      // Deliberately leaves the "seen the welcome screen" flag alone: logging out to change
      // your name shouldn't replay the intro.
      setSettingsOpen(false);
      clearName();
    },
    openInfo: (screen: InfoScreen) => {
      setSettingsOpen(false);
      setInfoScreen(screen);
    },
    closeInfo: () => setInfoScreen(null),
    dismissWelcome: () => {
      AsyncStorage.setItem(WELCOME_SEEN_KEY, 'true');
      setHasSeenWelcome(true);
    },

    createShareCode: () => (uid && identity ? createConnectCode(uid, identity.name) : Promise.reject()),
    redeemCode: (code: string) => (uid && identity ? redeemConnectCode(code, uid, identity.name) : Promise.reject()),
  };
}
