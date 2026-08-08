# Notes for working in this app

This project is on **Expo SDK 54** (see `package.json`), deliberately rather than a newer one:
only SDK 54 is supported by the public Expo Go build on the App Store / Play Store, and being
able to hand someone a QR code is how this gets tested on real devices. Check the versioned docs
for the SDK actually in use — <https://docs.expo.dev/versions/v54.0.0/> — since Expo's APIs move
between majors.

Two things in here have bitten twice and are worth knowing before touching the orb:

- **`react-native-svg` behaves differently on native than in the web preview.** `<Stop>` has no
  native host view, so Reanimated cannot animate it, and a gradient stop's transparency has to
  come from the separate `stopOpacity` attribute rather than alpha baked into an `rgba()` colour.
  Both of these look perfectly fine in the browser and break on device.
- **Only ever show one of the orb's stacked gradients at a time.** They fade to transparent at
  the rim, so any two visible at once distort the alpha — see the comments in
  `src/components/CrossfadeGradientCircle.tsx`.

`PROGRESS.md` at the repo root has the full history of what was tried and why.
