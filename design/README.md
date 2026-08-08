# Design handoff

The original design for mu, kept for reference. None of this ships — the app in [`../app`](../app)
is a from-scratch React Native implementation, not a port of this code.

- `Mu.dc.html` — the interactive prototype the app was built from. Colours, spacing and motion
  timings in here are the source of truth; they were treated as final rather than as suggestions.
- `ios-frame.jsx` — a device-bezel mockup used only to preview the prototype as if on a phone.
- `support.js` — generated runtime that `Mu.dc.html` needs in order to open. Not written by hand.

Colours were authored in OKLCH and converted once to sRGB for
[`../app/src/theme/tokens.ts`](../app/src/theme/tokens.ts), keeping the same lightness, chroma and
hue rather than being re-picked by eye.
