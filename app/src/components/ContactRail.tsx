import React, { useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { Orb } from './Orb';
import { NotificationBadge } from './NotificationBadge';
import { CrossfadeGradientCircle, GradientLook } from './CrossfadeGradientCircle';
import { colors, orbSizes, spacing, type, OrbState } from '../theme/tokens';

// Mirrors Orb's own rendering technique (soft outer glow + radial gradient circle) but with
// a single static grey look, matching the design's "faint, ethereal" add-tile spec.
function AddOrb() {
  const size = orbSizes.rail;
  const progress = useSharedValue(0);
  const idPrefix = useRef(`add-orb-${Math.random().toString(36).slice(2)}`).current;
  const glowSize = size * 2.1;

  const mainLooks: GradientLook[] = [
    {
      id: `${idPrefix}-main`,
      stops: [
        { offset: '0%', color: colors.addTileMid },
        { offset: '40%', color: colors.addTileLo },
        { offset: '74%', color: colors.addTileLo, opacity: 0 },
      ],
    },
  ];
  const glowLooks: GradientLook[] = [
    {
      id: `${idPrefix}-glow`,
      stops: [
        { offset: '0%', color: colors.addTileGlow },
        { offset: '55%', color: colors.addTileGlow, opacity: 0 },
      ],
    },
  ];

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <View style={{ position: 'absolute', width: glowSize, height: glowSize }}>
          <CrossfadeGradientCircle looks={glowLooks} size={glowSize} progress={progress} />
        </View>
      </View>
      <View style={{ width: size, height: size }}>
        <CrossfadeGradientCircle looks={mainLooks} size={size} progress={progress} />
      </View>
      <View style={styles.plusLineH} />
      <View style={styles.plusLineV} />
    </View>
  );
}

export type RailItem = {
  id: string;
  name: string;
  state: OrbState;
  selected: boolean;
  hasUnseen: boolean;
};

type Props = {
  items: RailItem[];
  onSelect: (id: string) => void;
  onAddPress: () => void;
};

export function ContactRail({ items, onSelect, onAddPress }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      decelerationRate="fast"
      snapToInterval={spacing.railItemWidth + spacing.railGap}
      snapToAlignment="center"
      style={styles.scrollView}
      contentContainerStyle={styles.content}
    >
      {items.map((item) => (
        <Pressable key={item.id} style={styles.item} onPress={() => onSelect(item.id)}>
          <View style={styles.orbSlot}>
            <Orb state={item.state} size={orbSizes.rail} ring={item.selected} />
            <NotificationBadge visible={item.hasUnseen} />
          </View>
          <Text style={[styles.label, item.selected ? styles.labelSelected : styles.labelUnselected]}>
            {item.name.toUpperCase()}
          </Text>
        </Pressable>
      ))}

      <Pressable style={styles.item} onPress={onAddPress}>
        <AddOrb />
        <Text style={[styles.label, styles.labelUnselected]}>ADD</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Explicit, non-growing size — without this, ScrollView's default flexGrow:1 stretches it
  // to fill all leftover vertical space in HomeScreen's column instead of just hugging its
  // content, leaving a large blank area below the actual rail row.
  scrollView: {
    flexGrow: 0,
    flexShrink: 0,
  },
  content: {
    gap: spacing.railGap,
    paddingHorizontal: 22,
    paddingTop: 34,
    paddingBottom: 22,
    alignItems: 'flex-start',
  },
  item: {
    width: spacing.railItemWidth,
    alignItems: 'center',
    gap: 7,
  },
  orbSlot: {
    width: orbSizes.rail,
    height: orbSizes.rail,
  },
  label: {
    fontSize: type.railLabel,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  labelSelected: {
    color: colors.titleText,
    fontWeight: '600',
  },
  labelUnselected: {
    color: colors.textSecondary2,
    fontWeight: '500',
  },
  plusLineH: {
    position: 'absolute',
    width: 11,
    height: 1.3,
    borderRadius: 1,
    backgroundColor: colors.plusLine,
  },
  plusLineV: {
    position: 'absolute',
    width: 1.3,
    height: 11,
    borderRadius: 1,
    backgroundColor: colors.plusLine,
  },
});
