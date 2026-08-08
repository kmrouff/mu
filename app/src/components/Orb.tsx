import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { CrossfadeGradientCircle, GradientLook } from './CrossfadeGradientCircle';
import { mixOklch, parseRGBA, RGBA, toRgbaString } from '../theme/colorMix';
import { motion, orbTheme, OrbState } from '../theme/tokens';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const STATES: OrbState[] = ['idle', 'sending', 'receiving', 'both'];

// Sample points along the OKLCH path between the two state colours. The crossfade blends
// linearly between consecutive samples, so this only needs to be fine enough that the straight
// chord between neighbours hugs the curve — 6 is plenty for the hue distances involved here.
const TRANSITION_STEPS = 6;

const TRANSITION_MS = 800;

const midRGBA = Object.fromEntries(STATES.map((s) => [s, parseRGBA(orbTheme[s].mid)])) as Record<OrbState, RGBA>;
const loRGBA = Object.fromEntries(STATES.map((s) => [s, parseRGBA(orbTheme[s].lo)])) as Record<OrbState, RGBA>;
const glowRGBA = Object.fromEntries(STATES.map((s) => [s, parseRGBA(orbTheme[s].glow)])) as Record<OrbState, RGBA>;
const coreRGBA = Object.fromEntries(STATES.map((s) => [s, parseRGBA(orbTheme[s].core)])) as Record<OrbState, RGBA>;

function buildTransitionLooks(idPrefix: string, from: OrbState, to: OrbState) {
  const main: GradientLook[] = [];
  const glow: GradientLook[] = [];
  const core: GradientLook[] = [];
  for (let i = 0; i < TRANSITION_STEPS; i++) {
    const t = i / (TRANSITION_STEPS - 1);
    // Fade-to-transparent stops use the `opacity` field (-> SVG stopOpacity), not alpha baked
    // into the color string — react-native-svg's native (iOS/Android) renderer doesn't reliably
    // respect an rgba() stop-color's own alpha the way a browser does; it rendered fully opaque
    // on-device even though it looked correct in the web preview. stopOpacity is the real,
    // cross-platform-reliable transparency control for a gradient stop.
    const lo = toRgbaString(mixOklch(loRGBA[from], loRGBA[to], t));
    main.push({
      id: `${idPrefix}-main-${i}`,
      stops: [
        { offset: '0%', color: toRgbaString(mixOklch(midRGBA[from], midRGBA[to], t)) },
        { offset: '38%', color: lo },
        { offset: '72%', color: lo, opacity: 0 },
      ],
    });
    const glowC = toRgbaString(mixOklch(glowRGBA[from], glowRGBA[to], t));
    glow.push({
      id: `${idPrefix}-glow-${i}`,
      stops: [
        { offset: '0%', color: glowC },
        { offset: '55%', color: glowC, opacity: 0 },
      ],
    });
    const coreC = toRgbaString(mixOklch(coreRGBA[from], coreRGBA[to], t));
    core.push({
      id: `${idPrefix}-core-${i}`,
      stops: [
        { offset: '0%', color: coreC },
        { offset: '68%', color: coreC, opacity: 0 },
      ],
    });
  }
  return { main, glow, core };
}

type Props = {
  state: OrbState;
  size: number;
  ring?: boolean;
};

export function Orb({ state, size, ring = false }: Props) {
  const progress = useSharedValue(TRANSITION_STEPS - 1);
  const prevStateRef = useRef(state);
  const [transitionFrom, setTransitionFrom] = useState(state);
  const [transitionTo, setTransitionTo] = useState(state);

  const scale = useSharedValue(1);
  const coreOpacity = useSharedValue(0.35);
  const coreScale = useSharedValue(0.96);

  // Once a sweep lands, drop the now-invisible "from" layers by collapsing the stack onto a
  // single colour. The layers underneath the leading edge stay opaque during the sweep, and the
  // gradients fade out at their rim, so without this the settled orb's faint outer halo would
  // keep showing a blend of every colour it passed through rather than the state colour itself.
  const settle = useCallback((landedOn: OrbState) => {
    if (prevStateRef.current === landedOn) setTransitionFrom(landedOn);
  }, []);

  useEffect(() => {
    const from = prevStateRef.current;
    prevStateRef.current = state;
    if (from === state) return;
    setTransitionFrom(from);
    setTransitionTo(state);
    progress.value = 0;
    progress.value = withTiming(
      TRANSITION_STEPS - 1,
      { duration: TRANSITION_MS, easing: Easing.inOut(Easing.ease) },
      (finished) => {
        if (finished) runOnJS(settle)(state);
      },
    );
  }, [state, settle]);

  useEffect(() => {
    cancelAnimation(scale);
    const easeInOut = Easing.inOut(Easing.ease);
    if (state === 'idle') {
      scale.value = 1;
      scale.value = withRepeat(
        withTiming(1.014, { duration: motion.breatheMs / 2, easing: easeInOut }),
        -1,
        true,
      );
    } else if (state === 'sending' || state === 'receiving') {
      // Quick snap up on entry (more noticeable than easing straight into the loop),
      // then a bigger, elevated-baseline pulse — grows and stays grown, not just breathing.
      scale.value = withSequence(
        withTiming(1.1, { duration: 140, easing: Easing.out(Easing.back(1.4)) }),
        withRepeat(withTiming(1.02, { duration: motion.pulseMs / 2, easing: easeInOut }), -1, true),
      );
    } else {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.065, { duration: 168, easing: easeInOut }),
          withTiming(1.015, { duration: 168, easing: easeInOut }),
          withTiming(1.06, { duration: 147, easing: easeInOut }),
          withTiming(1, { duration: 252, easing: easeInOut }),
          withTiming(1, { duration: 315, easing: easeInOut }),
        ),
        -1,
      );
    }
    return () => cancelAnimation(scale);
  }, [state]);

  // Inner core drift runs continuously, independent of state — never static.
  useEffect(() => {
    const easeInOut = Easing.inOut(Easing.ease);
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
  }, []);

  const outerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const coreAnimatedStyle = useAnimatedStyle(() => ({
    opacity: coreOpacity.value,
    transform: [{ scale: coreScale.value }],
  }));

  const idPrefix = useRef(`orb-${Math.random().toString(36).slice(2)}`).current;

  const glowSize = size * 2.1;
  const coreSize = size * 0.6;

  // The ring follows the same OKLCH path as the gradients. OKLCH conversion is too heavy to run
  // per frame inside a worklet, so sample it on the same grid as the gradient steps and just
  // walk that table — the chord between neighbours is short enough to lerp straight through.
  const ringSteps = useMemo(
    () =>
      Array.from({ length: TRANSITION_STEPS }, (_, i) =>
        mixOklch(glowRGBA[transitionFrom], glowRGBA[transitionTo], i / (TRANSITION_STEPS - 1)),
      ),
    [transitionFrom, transitionTo],
  );
  const ringProps = useAnimatedProps(() => {
    const p = Math.max(0, Math.min(TRANSITION_STEPS - 1, progress.value));
    const i0 = Math.floor(p);
    const i1 = Math.min(i0 + 1, TRANSITION_STEPS - 1);
    const f = p - i0;
    const a = ringSteps[i0];
    const b = ringSteps[i1];
    return {
      stroke: `rgba(${a[0] + (b[0] - a[0]) * f}, ${a[1] + (b[1] - a[1]) * f}, ${
        a[2] + (b[2] - a[2]) * f
      }, ${a[3] + (b[3] - a[3]) * f})`,
    };
  });

  const { main: mainLooks, glow: glowLooks, core: coreLooks } = useMemo(
    () => buildTransitionLooks(idPrefix, transitionFrom, transitionTo),
    [idPrefix, transitionFrom, transitionTo],
  );

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Soft outer glow, approximates the CSS box-shadow blur */}
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}
      >
        <View style={{ position: 'absolute', width: glowSize, height: glowSize }}>
          <CrossfadeGradientCircle looks={glowLooks} size={glowSize} progress={progress} />
        </View>
      </View>

      <Animated.View style={outerAnimatedStyle}>
        <View style={{ width: size, height: size }}>
          <CrossfadeGradientCircle looks={mainLooks} size={size} progress={progress} />
          {ring && (
            <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
              <AnimatedCircle
                cx={size / 2}
                cy={size / 2}
                r={size / 2 - 0.75}
                fill="none"
                strokeWidth={1.5}
                animatedProps={ringProps}
              />
            </Svg>
          )}
        </View>

        {/* Inner core glow — independently drifting opacity/scale, hue-locked to state color */}
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              width: coreSize,
              height: coreSize,
              top: (size - coreSize) / 2,
              left: (size - coreSize) / 2,
            },
            coreAnimatedStyle,
          ]}
        >
          <CrossfadeGradientCircle looks={coreLooks} size={coreSize} progress={progress} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}
