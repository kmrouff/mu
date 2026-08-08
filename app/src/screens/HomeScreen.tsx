import React, { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Orb } from '../components/Orb';
import { ContactRail, RailItem } from '../components/ContactRail';
import { SettingsDrawer } from '../components/SettingsDrawer';
import { AddOverlay } from '../components/AddOverlay';
import { InfoOverlay } from '../components/InfoOverlay';
import { colors, orbSizes, type, OrbState } from '../theme/tokens';
import { Contact, InfoScreen } from '../state/useMuState';
import { formatRelativePing } from '../utils/formatRelativePing';
import { ContactContent, FaqContent, MissionContent, TermsContent } from '../content/InfoContent';
import { RedeemCodeResult } from '../firebase/pairing';

const INFO_TITLES: Record<Exclude<InfoScreen, null>, string> = {
  mission: 'Mission',
  contact: 'Contact',
  faq: 'FAQ',
  terms: 'Terms & Conditions',
};

const PING_MESSAGE_VISIBLE_MS = 4000;

function PresenceMessage({
  name,
  isLive,
  isSending,
  isBoth,
  pingAt,
}: {
  name: string;
  isLive: boolean;
  isSending: boolean;
  isBoth: boolean;
  pingAt?: number;
}) {
  const opacity = useSharedValue(0);
  const pulse = useSharedValue(1);

  useEffect(() => {
    cancelAnimation(pulse);
    if (isBoth || isLive || isSending) {
      pulse.value = 1;
      opacity.value = withTiming(1, { duration: 300, easing: Easing.inOut(Easing.ease) });
      // Gentle continuous pulse while the ping is actually live — distinguishes "right now"
      // from the one-shot pop-in used for the past-tense message below.
      pulse.value = withRepeat(withTiming(0.55, { duration: 700, easing: Easing.inOut(Easing.ease) }), -1, true);
      return;
    }

    pulse.value = 1;
    if (pingAt != null) {
      opacity.value = 0;
      opacity.value = withTiming(1, { duration: 420, easing: Easing.bezier(0.34, 1.56, 0.64, 1) });
      const hideTimer = setTimeout(() => {
        opacity.value = withTiming(0, { duration: 400, easing: Easing.inOut(Easing.ease) });
      }, PING_MESSAGE_VISIBLE_MS);
      return () => clearTimeout(hideTimer);
    }

    opacity.value = withTiming(0, { duration: 200 });
  }, [isBoth, isLive, isSending, pingAt]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value * pulse.value,
  }));

  // Always render the line (even empty) so its height is reserved whether or not there's
  // anything to show — otherwise the orb above visibly shifts up/down as this text
  // appears/disappears, since it sits inside a vertically-centered flex column.
  // Order matters: a mutual press outranks either side on its own, and anything happening right
  // now outranks the past-tense line.
  const text = isBoth
    ? "You're synced"
    : isSending
      ? `You're thinking of ${name}`
      : isLive
        ? `${name} is thinking of you`
        : pingAt != null
          ? `${name} thought of you ${formatRelativePing(pingAt, Date.now())}`
          : ' ';

  return (
    <Animated.Text style={[styles.pingLabel, style]} numberOfLines={1}>
      {text}
    </Animated.Text>
  );
}

type Props = {
  contacts: Contact[];
  selectedId: string | null;
  youPressing: boolean;
  theirActive: Record<string, boolean>;
  unseen: Record<string, boolean>;
  lastPingAt: Record<string, number>;
  both: boolean;
  settingsOpen: boolean;
  showAddOverlay: boolean;
  infoScreen: InfoScreen;
  onSelect: (id: string) => void;
  onPressIn: () => void;
  onPressOut: () => void;
  onToggleSettings: () => void;
  onCloseSettings: () => void;
  onOpenAdd: () => void;
  onCloseAdd: () => void;
  onOpenInfo: (screen: InfoScreen) => void;
  onCloseInfo: () => void;
  onLogout: () => void;
  onCreateCode: () => Promise<string>;
  onRedeemCode: (code: string) => Promise<RedeemCodeResult>;
};

export function HomeScreen({
  contacts,
  selectedId,
  youPressing,
  theirActive,
  unseen,
  lastPingAt,
  both,
  settingsOpen,
  showAddOverlay,
  infoScreen,
  onSelect,
  onPressIn,
  onPressOut,
  onToggleSettings,
  onCloseSettings,
  onOpenAdd,
  onCloseAdd,
  onOpenInfo,
  onCloseInfo,
  onLogout,
  onCreateCode,
  onRedeemCode,
}: Props) {
  const insets = useSafeAreaInsets();
  const selectedContact = contacts.find((c) => c.id === selectedId);

  const mainState: OrbState = both
    ? 'both'
    : youPressing
      ? 'sending'
      : selectedId && theirActive[selectedId]
        ? 'receiving'
        : 'idle';

  const railItems: RailItem[] = useMemo(
    () =>
      contacts.map((c) => {
        const isSelected = c.id === selectedId;
        const cBoth = isSelected && both;
        const state: OrbState = cBoth
          ? 'both'
          : isSelected && youPressing
            ? 'sending'
            : theirActive[c.id]
              ? 'receiving'
              : 'idle';
        return {
          id: c.id,
          name: c.name,
          state,
          selected: isSelected,
          // Never show the "someone pinged" badge for whoever's already open — you're looking
          // right at them, a badge would be redundant (and the live/ping message below covers it).
          hasUnseen: isSelected ? false : !!unseen[c.id],
        };
      }),
    [contacts, selectedId, youPressing, theirActive, unseen, both],
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.wordmark}>mu</Text>
        <Pressable style={styles.menuBtn} onPress={onToggleSettings} hitSlop={8}>
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </Pressable>
      </View>

      <View style={styles.main}>
        {selectedContact ? (
          <>
            <Pressable onPressIn={onPressIn} onPressOut={onPressOut}>
              <Orb state={mainState} size={orbSizes.main} />
            </Pressable>
            <View style={styles.nameBlock}>
              <Text style={styles.name}>{selectedContact.name}</Text>
              <PresenceMessage
                key={selectedContact.id}
                name={selectedContact.name}
                isLive={!!theirActive[selectedContact.id]}
                isSending={youPressing}
                isBoth={both}
                pingAt={lastPingAt[selectedContact.id]}
              />
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Orb state="idle" size={orbSizes.main} />
            <Text style={styles.emptyStateText}>
              No connections yet{'\n'}tap Add below to connect with someone
            </Text>
          </View>
        )}
      </View>

      <ContactRail items={railItems} onSelect={onSelect} onAddPress={onOpenAdd} />

      <SettingsDrawer
        open={settingsOpen}
        onClose={onCloseSettings}
        onOpenInfo={onOpenInfo}
        onOpenAdd={onOpenAdd}
        onLogout={onLogout}
      />
      <AddOverlay
        open={showAddOverlay}
        onClose={onCloseAdd}
        onCreateCode={onCreateCode}
        onRedeemCode={onRedeemCode}
      />

      <InfoOverlay open={infoScreen != null} title={infoScreen ? INFO_TITLES[infoScreen] : ''} onClose={onCloseInfo}>
        {infoScreen === 'mission' && <MissionContent />}
        {infoScreen === 'contact' && <ContactContent />}
        {infoScreen === 'faq' && <FaqContent />}
        {infoScreen === 'terms' && <TermsContent />}
      </InfoOverlay>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 24,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
  },
  wordmark: {
    fontSize: type.wordmark,
    fontWeight: '600',
    letterSpacing: -0.42,
    color: colors.textPrimary,
  },
  menuBtn: {
    width: 40,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3.5,
  },
  dot: {
    width: 4.5,
    height: 4.5,
    borderRadius: 2.25,
    backgroundColor: colors.dots,
  },
  main: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 40,
  },
  nameBlock: {
    alignItems: 'center',
    gap: 5,
  },
  emptyState: {
    alignItems: 'center',
    gap: 24,
  },
  emptyStateText: {
    fontSize: type.body,
    textAlign: 'center',
    lineHeight: 21,
    color: colors.textSecondary2,
  },
  pingLabel: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.textSecondary2,
    letterSpacing: 0.1,
    // Pin the line's height so the block above it never moves. The component always renders a
    // space when there's nothing to say, which reserves the line on native — but on web that
    // lone space is collapsed away per normal HTML whitespace handling, the line box goes to
    // zero, and the vertically-centred orb and name jump up by half a line as a message
    // appears. An explicit height holds the space open on both.
    lineHeight: 16,
    minHeight: 16,
  },
  name: {
    fontSize: type.contactName,
    fontWeight: '500',
    letterSpacing: 0.17,
    color: colors.textSecondary1,
  },
});
