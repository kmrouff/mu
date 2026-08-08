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

// Colour and size are driven by two independent animations, which is what lets them run at
// different speeds. The size keeps the slow, gentle feel; the colour crosses quickly.
//
// Blue and yellow sit ~198 degrees apart in hue, i.e. nearly opposite, and the orb reads against
// a near-white page by its *chroma* rather than its lightness (idle sits at L 0.87 against a
// background around 0.96). So any path that drops chroma — a straight line through the middle of
// the colour space, or a cross-dissolve — washes the orb out into the background, which is the
// grey flash this all started with. Holding chroma up necessarily means travelling around the
// hue wheel, and there's no way around that; the intermediate hues have to exist. What we can
// control is how long they're on screen, so the sweep is short and heavily eased at both ends:
// it lingers on the state colours and crosses the middle quickly, reading as blue-to-yellow
// rather than a tour through green.
const TRANSITION_MS = 420;
const TRANSITION_EASING = Easing.bezier(0.7, 0, 0.3, 1);

// Long enough that a press visibly grows in on an S-curve rather than arriving at full size.
const SIZE_EASE_MS = 520;
const PRESS_SCALE = 1.08;

// Sample points along the OKLCH path between the two state colours. Only one is ever shown at a
// time (see CrossfadeGradientCircle) so the colour advances in hops rather than blending, which
// means this count sets the smoothness: at ~60fps an 800ms sweep is ~48 frames, so 24 steps land
// a new colour every couple of frames and read as continuous. The rail's little orbs get fewer —
// at 50px the hops are invisible and there can be a dozen of them on screen.
const stepsForSize = (size: number) => (size >= 140 ? 24 : 10);

const midRGBA = Object.fromEntries(STATES.map((s) => [s, parseRGBA(orbTheme[s].mid)])) as Record<OrbState, RGBA>;
const loRGBA = Object.fromEntries(STATES.map((s) => [s, parseRGBA(orbTheme[s].lo)])) as Record<OrbState, RGBA>;
const glowRGBA = Object.fromEntries(STATES.map((s) => [s, parseRGBA(orbTheme[s].glow)])) as Record<OrbState, RGBA>;
const coreRGBA = Object.fromEntries(STATES.map((s) => [s, parseRGBA(orbTheme[s].core)])) as Record<OrbState, RGBA>;

function buildTransitionLooks(idPrefix: string, from: OrbState, to: OrbState, steps: number) {
  const main: GradientLook[] = [];
  const glow: GradientLook[] = [];
  const core: GradientLook[] = [];
  for (let i = 0; i < steps; i++) {
    const t = steps === 1 ? 1 : i / (steps - 1);
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
  const steps = stepsForSize(size);
  const progress = useSharedValue(steps - 1);
  const prevStateRef = useRef(state);
  const [transitionFrom, setTransitionFrom] = useState(state);
  const [transitionTo, setTransitionTo] = useState(state);

  const scale = useSharedValue(1);
  const coreOpacity = useSharedValue(0.35);
  const coreScale = useSharedValue(0.96);

  // Once a sweep lands, collapse the whole ramp to the colour it arrived at. That leaves a
  // single gradient in the tree while the orb sits idle, which is both the cheapest thing to
  // render and exactly the look the orb had before any of this crossfading existed.
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
      steps - 1,
      { duration: TRANSITION_MS, easing: TRANSITION_EASING },
      (finished) => {
        if (finished) runOnJS(settle)(state);
      },
    );
  }, [state, settle, steps]);

  // Settled? One look is all that's needed. Mid-sweep, walk the full OKLCH ramp.
  const lookCount = transitionFrom === transitionTo ? 1 : steps;

  useEffect(() => {
    cancelAnimation(scale);
    const easeInOut = Easing.inOut(Easing.ease);
    if (state === 'idle') {
      // Ease back down to the resting size before picking the breathing loop back up. Assigning
      // 1 outright would teleport the orb back from whatever size the press had grown it to.
      scale.value = withSequence(
        withTiming(1, { duration: SIZE_EASE_MS, easing: easeInOut }),
        withRepeat(withTiming(1.014, { duration: motion.breatheMs / 2, easing: easeInOut }), -1, true),
      );
    } else if (state === 'sending' || state === 'receiving') {
      // Grow into the elevated pulse baseline. Two things used to make this feel like a pop:
      // a 140ms `back` ease (which overshoots and front-loads its movement), and a pulse that
      // then swung all the way back down to 1.02 — a 6% excursion immediately after touch.
      // Now it eases up over a longer beat and settles into a much shallower breath.
      scale.value = withSequence(
        withTiming(PRESS_SCALE, { duration: SIZE_EASE_MS, easing: easeInOut }),
        withRepeat(
          withTiming(PRESS_SCALE - 0.03, { duration: motion.pulseMs / 2, easing: easeInOut }),
          -1,
          true,
        ),
      );
    } else {
      // Lub-dub, then rest. Phases are fractions of `heartbeatMs` so the whole beat slows or
      // quickens as one, and stays locked to the haptic buzz driven off the same token.
      const hb = motion.heartbeatMs;
      scale.value = withRepeat(
        withSequence(
          withTiming(1.065, { duration: hb * 0.16, easing: easeInOut }),
          withTiming(1.015, { duration: hb * 0.16, easing: easeInOut }),
          withTiming(1.06, { duration: hb * 0.14, easing: easeInOut }),
          withTiming(1, { duration: hb * 0.24, easing: easeInOut }),
          withTiming(1, { duration: hb * 0.3, easing: easeInOut }),
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
      Array.from({ length: lookCount }, (_, i) =>
        mixOklch(glowRGBA[transitionFrom], glowRGBA[transitionTo], lookCount === 1 ? 1 : i / (lookCount - 1)),
      ),
    [transitionFrom, transitionTo, lookCount],
  );
  const ringProps = useAnimatedProps(() => {
    // The ring is a plain stroke rather than a stacked gradient, so unlike the orb body it can
    // blend continuously between ramp samples instead of hopping.
    const p = Math.max(0, Math.min(lookCount - 1, progress.value));
    const i0 = Math.floor(p);
    const i1 = Math.min(i0 + 1, lookCount - 1);
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
    () => buildTransitionLooks(idPrefix, transitionFrom, transitionTo, lookCount),
    [idPrefix, transitionFrom, transitionTo, lookCount],
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
