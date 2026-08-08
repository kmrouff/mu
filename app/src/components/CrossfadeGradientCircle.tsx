import React from 'react';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import Animated, { SharedValue, useAnimatedProps } from 'react-native-reanimated';

// react-native-svg's <Stop> renders no native view of its own (it's pure gradient-definition
// data consumed by <RadialGradient>), so Reanimated can't attach animated props to it on native
// platforms ("Cannot find host instance for this component") — even though it appears to work
// on web, where <stop> is a real DOM node. Instead we pre-build one static gradient per "look"
// and crossfade between them by animating each <Circle>'s opacity (Circle IS a real host view).

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export type GradientStop = { offset: string; color: string; opacity?: number };
export type GradientLook = { id: string; stops: GradientStop[] };

function weight(progress: number, index: number, count: number, wrap: boolean) {
  'worklet';
  // Settled on a single look: show it, wherever `progress` happens to have been left parked.
  if (count === 1) return 1;
  if (wrap) {
    // Cyclic sweep (the login orb's endless hue cycle): symmetric tent weights, since there's
    // no fixed "first" layer that can stay opaque underneath the rest.
    const d = Math.min(Math.abs(progress - index), count - Math.abs(progress - index));
    return Math.max(0, 1 - d);
  }
  // One-directional sweep (state transitions): show exactly one look at a time and step through
  // them. These gradients fade to transparent at their rim, and *any* scheme that leaves two of
  // them visible at once composites those rims together — which distorts the orb's alpha:
  //   - fading both (symmetric tent) thins the middle to 1-(1-0.5)^2 = 75% coverage, so the page
  //     shows through and the colour washes out, once per step — a strobe;
  //   - holding the lower ones opaque instead compounds the rim the other way, 1-(1-a)^n, which
  //     hardens the soft edge into a defined disc.
  // Exactly one visible layer is the only arrangement that reproduces a single gradient's alpha
  // exactly, so the rim is identical at rest and mid-sweep. The colour then advances in discrete
  // hops, which is why the caller supplies enough looks that each hop lands within a frame or two.
  return Math.round(progress) === index ? 1 : 0;
}

function LayerCircle({
  look,
  size,
  progress,
  weightOverride,
  index,
  count,
  wrap,
}: {
  look: GradientLook;
  size: number;
  progress?: SharedValue<number>;
  weightOverride?: SharedValue<number>;
  index: number;
  count: number;
  wrap: boolean;
}) {
  const animatedProps = useAnimatedProps(() => ({
    opacity: weightOverride ? weightOverride.value : weight(progress!.value, index, count, wrap),
  }));
  return (
    <AnimatedCircle
      cx={size / 2}
      cy={size / 2}
      r={size / 2}
      fill={`url(#${look.id})`}
      animatedProps={animatedProps}
    />
  );
}

export function CrossfadeGradientCircle({
  looks,
  size,
  progress,
  wrap = false,
  weights,
}: {
  looks: GradientLook[];
  size: number;
  // `progress` sweeps a single continuous value across all looks — correct for something like
  // the login orb's hue cycle, which is *meant* to pass through every color in between.
  // `weights` drives each look's opacity independently (one shared value per look) — use this
  // whenever transitions should crossfade directly between two looks without ever passing
  // through an unrelated one (e.g. state colors: idle -> receiving must never flash sending's
  // yellow, which a single swept index 0->2 would do at its index-1 midpoint).
  progress?: SharedValue<number>;
  wrap?: boolean;
  weights?: SharedValue<number>[];
}) {
  return (
    <Svg width={size} height={size}>
      <Defs>
        {looks.map((look) => (
          <RadialGradient key={look.id} id={look.id} cx="50%" cy="50%" r="50%">
            {look.stops.map((s, si) => (
              <Stop key={si} offset={s.offset} stopColor={s.color} stopOpacity={s.opacity ?? 1} />
            ))}
          </RadialGradient>
        ))}
      </Defs>
      {looks.map((look, i) => (
        <LayerCircle
          key={look.id}
          look={look}
          size={size}
          progress={progress}
          weightOverride={weights?.[i]}
          index={i}
          count={looks.length}
          wrap={wrap}
        />
      ))}
    </Svg>
  );
}
