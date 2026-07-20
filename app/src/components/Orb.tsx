import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { CrossfadeGradientCircle, GradientLook } from './CrossfadeGradientCircle';
import { motion, orbTheme, OrbState } from '../theme/tokens';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const STATES: OrbState[] = ['idle', 'sending', 'receiving', 'both'];

// Enough intermediate steps that any single blend-step is between two RGB-close colors —
// alpha-compositing two *similar* colors crossfades cleanly, but compositing two very
// different ones (e.g. blue over yellow) visibly desaturates toward grey partway through.
// This is what made idle->receiving flash grey instead of going straight blue->green.
const TRANSITION_STEPS = 6;

type RGBA = [number, number, number, number];

function parseRGBA(c: string): RGBA {
  if (c.startsWith('#')) {
    return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16), 1];
  }
  const parts = c
    .slice(c.indexOf('(') + 1, c.indexOf(')'))
    .split(',')
    .map((s) => parseFloat(s.trim()));
  return [parts[0], parts[1], parts[2], parts[3] ?? 1];
}

function mixRGBA(a: RGBA, b: RGBA, t: number): RGBA {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t];
}

function toRgbaString([r, g, b, a]: RGBA, alphaOverride?: number): string {
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${alphaOverride ?? a})`;
}

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
    const lo = toRgbaString(mixRGBA(loRGBA[from], loRGBA[to], t));
    main.push({
      id: `${idPrefix}-main-${i}`,
      stops: [
        { offset: '0%', color: toRgbaString(mixRGBA(midRGBA[from], midRGBA[to], t)) },
        { offset: '38%', color: lo },
        { offset: '72%', color: lo, opacity: 0 },
      ],
    });
    const glowC = toRgbaString(mixRGBA(glowRGBA[from], glowRGBA[to], t));
    glow.push({
      id: `${idPrefix}-glow-${i}`,
      stops: [
        { offset: '0%', color: glowC },
        { offset: '55%', color: glowC, opacity: 0 },
      ],
    });
    const coreC = toRgbaString(mixRGBA(coreRGBA[from], coreRGBA[to], t));
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

  useEffect(() => {
    const from = prevStateRef.current;
    prevStateRef.current = state;
    if (from === state) return;
    setTransitionFrom(from);
    setTransitionTo(state);
    progress.value = 0;
    progress.value = withTiming(TRANSITION_STEPS - 1, { duration: 800, easing: Easing.inOut(Easing.ease) });
  }, [state]);

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

  // Same direct 2-point interpolation the transition steps above are built from, just
  // computed live for the ring stroke instead of baked into a static gradient stop.
  const ringFromGlow = glowRGBA[transitionFrom];
  const ringToGlow = glowRGBA[transitionTo];
  const ringProps = useAnimatedProps(() => {
    const t = progress.value / (TRANSITION_STEPS - 1);
    const r = ringFromGlow[0] + (ringToGlow[0] - ringFromGlow[0]) * t;
    const g = ringFromGlow[1] + (ringToGlow[1] - ringFromGlow[1]) * t;
    const b = ringFromGlow[2] + (ringToGlow[2] - ringFromGlow[2]) * t;
    const a = ringFromGlow[3] + (ringToGlow[3] - ringFromGlow[3]) * t;
    return { stroke: `rgba(${r}, ${g}, ${b}, ${a})` };
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
