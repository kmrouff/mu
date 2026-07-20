import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { colors, motion } from '../theme/tokens';
import { InfoScreen } from '../state/useMuState';

const ITEMS: { label: string; screen: Exclude<InfoScreen, null> }[] = [
  { label: 'Mission', screen: 'mission' },
  { label: 'Contact', screen: 'contact' },
  { label: 'FAQ', screen: 'faq' },
  { label: 'T&C', screen: 'terms' },
];

type Props = {
  open: boolean;
  onClose: () => void;
  onOpenInfo: (screen: InfoScreen) => void;
  onOpenAdd: () => void;
  onLogout: () => void;
};

export function SettingsDrawer({ open, onClose, onOpenInfo, onOpenAdd, onLogout }: Props) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(open ? 1 : 0, {
      duration: motion.drawerMs,
      easing: Easing.bezier(0.32, 0.72, 0, 1),
    });
  }, [open]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (1 - progress.value) * 216 }],
  }));

  return (
    <>
      <Animated.View
        style={[styles.backdrop, backdropStyle]}
        pointerEvents={open ? 'auto' : 'none'}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[styles.panel, panelStyle]} pointerEvents={open ? 'auto' : 'none'}>
        <Pressable
          onPress={() => {
            onClose();
            onOpenAdd();
          }}
        >
          <Text style={styles.item}>Invite someone</Text>
        </Pressable>
        {ITEMS.map(({ label, screen }) => (
          <Pressable key={label} onPress={() => onOpenInfo(screen)}>
            <Text style={styles.item}>{label}</Text>
          </Pressable>
        ))}
        <Pressable onPress={onLogout}>
          <Text style={styles.logoutItem}>Log Out</Text>
        </Pressable>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.backdrop,
    zIndex: 20,
  },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: 216,
    backgroundColor: colors.panel,
    paddingTop: 70,
    paddingBottom: 24,
    borderLeftWidth: 1,
    borderLeftColor: colors.hairline,
    shadowColor: '#000',
    shadowOffset: { width: -8, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 32,
    zIndex: 25,
  },
  item: {
    paddingVertical: 13,
    paddingHorizontal: 24,
    fontSize: 15,
    color: colors.textPrimary,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  logoutItem: {
    paddingVertical: 13,
    paddingHorizontal: 24,
    fontSize: 15,
    color: colors.logout,
    fontWeight: '500',
  },
});
