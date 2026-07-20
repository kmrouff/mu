import React, { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { colors, motion, type } from '../theme/tokens';

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
};

// Same slide-up-sheet language as AddOverlay, reused for Mission/Contact/FAQ/T&C so the whole
// settings menu feels like one consistent app, not four bolted-on screens.
export function InfoOverlay({ open, title, onClose, children }: Props) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(open ? 1 : 0, {
      duration: open ? motion.sheetMs : 300,
      easing: Easing.bezier(0.32, 0.72, 0, 1),
    });
  }, [open]);

  const sheetStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 400 }],
  }));

  return (
    <Animated.View style={[styles.container, sheetStyle]} pointerEvents={open ? 'auto' : 'none'}>
      <View style={styles.header}>
        <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={8}>
          <View style={[styles.xLine, { transform: [{ rotate: '45deg' }] }]} />
          <View style={[styles.xLine, { transform: [{ rotate: '-45deg' }] }]} />
        </Pressable>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.closeBtn} />
      </View>
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 45,
    backgroundColor: colors.addOverlayBg,
    paddingTop: 70,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  xLine: {
    position: 'absolute',
    width: 15,
    height: 1.6,
    borderRadius: 1,
    backgroundColor: colors.xLine,
  },
  title: {
    flex: 1,
    fontSize: type.sheetTitle,
    fontWeight: '600',
    color: colors.titleText,
    textAlign: 'center',
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingBottom: 48,
  },
});
