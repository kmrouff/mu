import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { CrossfadeGradientCircle, GradientLook } from './CrossfadeGradientCircle';
import { motion, orbSizes } from '../theme/tokens';
import { coreHueStops, glowHueStops, loHueStops, midHueStops } from '../theme/loginHueStops';

// Drop the duplicate wrap-around stop (last === first) — CrossfadeGradientCircle's
// `wrap` mode already treats the stop list as circular.
const HUE_COUNT = midHueStops.length - 1;

function buildLooks(prefix: string, mid: string[], lo?: string[]): GradientLook[] {
  return Array.from({ length: HUE_COUNT }, (_, i) => ({
    id: `${prefix}-${i}`,
    stops: lo
      ? [
          { offset: '0%', color: mid[i] },
          { offset: '40%', color: lo[i] },
          { offset: '74%', color: lo[i], opacity: 0 },
        ]
      : [
          { offset: '0%', color: mid[i] },
          { offset: '55%', color: mid[i], opacity: 0 },
        ],
  }));
}

export function LoginOrb() {
  const size = orbSizes.login;
  const scale = useSharedValue(1);
  const coreOpacity = useSharedValue(0.35);
  const coreScale = useSharedValue(0.96);
  const hue = useSharedValue(0);

  useEffect(() => {
    const easeInOut = Easing.inOut(Easing.ease);
    scale.value = withRepeat(
      withTiming(1.014, { duration: motion.breatheMs / 2, easing: easeInOut }),
      -1,
      true,
    );
    coreOpacity.value = withRepeat(
      withTiming(0.65, { duration: motion.driftMs / 2, easing: easeInOut }),
      -1,
      true,
    );
    coreScale.value = withRepeat(
      withTiming(1.08, { duration: motion.driftMs / 2, easing: easeInOut }),
      -1,
      true,
    );
    hue.value = withRepeat(
      withTiming(HUE_COUNT, { duration: motion.hueCycleMs, easing: Easing.linear }),
      -1,
      false,
    );
  }, []);

  const outerAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const coreAnimatedStyle = useAnimatedStyle(() => ({
    opacity: coreOpacity.value,
    transform: [{ scale: coreScale.value }],
  }));

  const glowSize = size * 2.1;
  const coreSize = size * 0.6;

  const mainLooks = buildLooks('login-main', midHueStops, loHueStops);
  const glowLooks = buildLooks('login-glow', glowHueStops);
  const coreLooks = buildLooks('login-core', coreHueStops);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <View style={{ position: 'absolute', width: glowSize, height: glowSize }}>
          <CrossfadeGradientCircle looks={glowLooks} size={glowSize} progress={hue} wrap />
        </View>
      </View>

      <Animated.View style={outerAnimatedStyle}>
        <View style={{ width: size, height: size }}>
          <CrossfadeGradientCircle looks={mainLooks} size={size} progress={hue} wrap />
        </View>

        <Animated.View
          pointerEvents="none"
          style={[
            { position: 'absolute', width: coreSize, height: coreSize, top: (size - coreSize) / 2, left: (size - coreSize) / 2 },
            coreAnimatedStyle,
          ]}
        >
          <CrossfadeGradientCircle looks={coreLooks} size={coreSize} progress={hue} wrap />
        </Animated.View>
      </Animated.View>
    </View>
  );
}
