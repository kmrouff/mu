// Colour interpolation in OKLCH (Björn Ottosson's perceptual space — the same space the
// design tokens are authored in).
//
// Why not just lerp RGB: straight-line RGB interpolation between two saturated, near-opposite
// hues passes through the desaturated middle of the colour cube. Blue -> yellow literally
// crosses grey, which is exactly the "goes blue, briefly grey, then yellow" artefact. OKLCH
// separates lightness / chroma / hue, so interpolating hue around the colour wheel keeps
// chroma up the whole way and the sweep reads as one clean colour change.

export type RGBA = [number, number, number, number];

export function parseRGBA(c: string): RGBA {
  if (c.startsWith('#')) {
    return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16), 1];
  }
  const parts = c
    .slice(c.indexOf('(') + 1, c.indexOf(')'))
    .split(',')
    .map((s) => parseFloat(s.trim()));
  return [parts[0], parts[1], parts[2], parts[3] ?? 1];
}

export function toRgbaString([r, g, b, a]: RGBA): string {
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})`;
}

const srgbToLinear = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
};

const linearToSrgb = (c: number) => {
  const v = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(Math.max(c, 0), 1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, v * 255));
};

function rgbToOklab(r: number, g: number, b: number): [number, number, number] {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function oklabToRgb(L: number, a: number, b: number): [number, number, number] {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;
  return [
    linearToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

// How much to raise lightness at the midpoint of a sweep. Tuned by eye against the orb on its
// cream background: enough that the crossing reads as the orb brightening, not as it going drab,
// while staying clearly darker than the page so it never dissolves into the background.
const MID_LIFT = 0.035;

/**
 * Interpolate two colours in a straight line through Oklab, brightening slightly at the midpoint.
 *
 * The tempting alternative is to rotate hue around the colour wheel, which keeps chroma up the
 * whole way. Don't: the orb's states sit far apart in hue (idle and sending are ~198 degrees
 * apart), so that route travels through entirely different colours — blue reaches yellow via a
 * vivid cyan, and red reaches blue via magenta and violet. Worse, lerping chroma across the arc
 * leaves the midpoint *more* saturated than either endpoint, so those detours don't read as a
 * transition at all, they read as the orb turning a new colour.
 *
 * A straight line has no such detour, but it does pass near the neutral axis, which on its own
 * looks drab. Lifting lightness over the crossing turns that into a brief pale glow instead —
 * which suits an orb whose whole visual language is light.
 */
export function mixOklch(from: RGBA, to: RGBA, t: number): RGBA {
  const [L1, a1, b1] = rgbToOklab(from[0], from[1], from[2]);
  const [L2, a2, b2] = rgbToOklab(to[0], to[1], to[2]);

  const a = a1 + (a2 - a1) * t;
  const b = b1 + (b2 - b1) * t;
  // Peaks at t = 0.5 and vanishes at both ends, so the endpoints stay exactly on their tokens.
  const L = L1 + (L2 - L1) * t + MID_LIFT * Math.sin(Math.PI * t);

  const [r, g, bl] = oklabToRgb(L, a, b);
  return [r, g, bl, from[3] + (to[3] - from[3]) * t];
}
