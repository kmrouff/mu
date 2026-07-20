# Handoff: Mu — Presence App Prototype

## Overview
"Mu" is a minimal presence/connection app: a single glowing orb represents a live connection to one chosen contact. Pressing and holding the orb signals "thinking of you" to that person; when both people press at the same time, the app flips into a distinct mutual state with a haptic pulse. A horizontal contact rail lets the user switch between people, add new connections, and see a notification badge when someone has reached out. The app also includes a soft-branded login screen.

## About the Design Files
The files in this bundle (`Mu.dc.html`, `ios-frame.jsx`) are **design references built in HTML/JS**, running in a custom in-browser component runtime (not React/Vue as usually shipped) — they are prototypes demonstrating intended look, motion, and interaction, **not production code to copy directly**. The task is to **recreate this design in the target codebase's actual environment** (iOS native/SwiftUI, React Native, Flutter, or whatever stack the app uses) using its established patterns, navigation, and component libraries. If no mobile codebase exists yet, choose the framework best suited to the team's stack and implement the designs there.

`ios-frame.jsx` is only a device-bezel mockup (status bar, notch, home indicator) used to preview the design as if on an iPhone — it is not part of the actual product UI and should be discarded; the real app runs full-screen on-device.

## Fidelity
**High-fidelity.** Colors, spacing, typography, motion timing, and interaction states are final/intentional and should be recreated pixel-for-pixel where the target platform allows. All colors are authored in OKLCH — convert to the target platform's color system keeping the same lightness/chroma/hue values (or nearest sRGB equivalent) rather than eyeballing new colors.

## Screens / Views

The app has 3 layers, cross-faded via opacity (all mounted simultaneously in the prototype; a real app should route between them):

### 1. Login screen
- **Purpose**: Entry point before the app is usable.
- **Layout**: Full-screen, vertically and horizontally centered content, column layout, gap 56px between the brand block and the button stack. Horizontal padding 32px.
- **Brand block** (column, centered, gap 18px):
  - Orb: 96×96px circle, `radial-gradient(circle at 50% 50%, oklch(0.86 0.05 258) 0%, oklch(0.77 0.045 258) 40%, transparent 74%)`, glow `box-shadow: 0 0 55px 16px oklch(0.86 0.06 258 / 0.28)`. Continuously animates: a gentle breathing scale (1 → 1.014 → 1, 4.2s ease-in-out loop) AND a full hue-rotate cycle (0deg → 360deg, 10s linear loop) so the orb's color drifts slowly through the spectrum, forever gently pulsing and shifting hue — never static.
  - Inner core glow: an absolutely-positioned inner circle at 60% size, radial gradient `oklch(0.96 0.03 258 / 0.45)` fading to transparent, blurred 14px, drifting (opacity 0.35↔0.65, scale 0.96↔1.08, 6s loop) and hue-cycling in sync with the outer orb.
  - Logo: text "mu", lowercase, 44px, weight 600, letter-spacing -0.02em, color `oklch(0.32 0.012 60)` (soft dark warm gray), system font.
- **Login buttons** (column, gap 12px, full width):
  - Three pill buttons, identical style, stacked: "Continue with Google", "Continue with Apple", "Continue with Email".
  - Style: full width, padding 15px 20px, border-radius 999px (full pill), background `oklch(0.99 0.006 75)` (near-white warm), NO border/outline, soft shadow `0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)`, text centered, 15.5px, weight 500, color `oklch(0.3 0.012 60)`.
  - No provider icons/logos are drawn — text-only by design (avoids reproducing Google/Apple trademarked marks; recreate with the platform's official SDK-provided sign-in buttons/icons where available and appropriate).
  - **Behavior**: clicking ANY of the three buttons logs the user in (prototype stub — no real auth). On click, the app cross-fades: login layer opacity 1→0 and app layer opacity 0→1, both over 0.6s ease, simultaneously (a simple dissolve transition, not a navigation push).

### 2. Main / Home screen
- **Purpose**: View and interact with the live connection to the currently-selected contact.
- **Layout**: Full-height column. Top padding 62px (status-bar clearance — omit on native, use safe-area instead), bottom padding 24px.
  - **Header** (row, space-between, horizontal padding 22px):
    - Wordmark "mu", 21px, weight 600, letter-spacing -0.02em, color `oklch(0.32 0.012 60)`.
    - Menu button: top-right, 40×40px tap target, NO background/border/circle — just three small dots (4.5px circles, `oklch(0.4 0.015 60 / 0.75)`, 3.5px gap, row layout) centered in the tap target. Opens the settings drawer on tap.
  - **Main content** (flex:1, column, centered, gap 40px between orb and name):
    - The **presence orb**, 232px circle. Its color/motion state depends on press state (see Interactions below).
    - Selected contact's first name below it: 17px, weight 500, letter-spacing 0.01em, color `oklch(0.52 0.012 60)` (lighter/muted, more breathing room from orb than initial pass — this was explicitly loosened after review).
  - **Contact rail** (bottom, horizontally scrollable row, gap 18px, padding `34px 22px 22px` — generous vertical padding is intentional so the orbs' soft outer glow isn't clipped by the scroll container):
    - One 64px-wide item per contact: 50px mini orb (same live-state coloring logic as the main orb) + uppercase label (10.5px, letter-spacing 0.05em, selected = `oklch(0.3 0.012 60)`/weight 600, unselected = `oklch(0.62 0.01 60)`/weight 500).
    - Each mini orb can show a small notification badge (see Interactions).
    - Scrolling: native horizontal scroll, scroll-snap (`x proximity`, items snap-align center), edges fade via a mask-image gradient (transparent → opaque over the first/last 24px) to hint scrollability. `-webkit-overflow-scrolling: touch` for momentum on iOS webviews — on native, use the platform's standard horizontal scroll/carousel with snapping.
    - Last item in the rail: an "Add" tile — faint, ethereal 50px circle (soft light-gray radial gradient, very subtle glow, no border/dashed outline) with a thin "+" (two 1.3px-thick crossed lines, ~11px long, `oklch(0.6 0.008 60 / 0.55)`) centered, label "ADD" below in the same unselected label style. Tapping opens the "Connect with someone" overlay.

### 3. Settings drawer (slide-in panel)
- **Purpose**: Account/menu actions (currently non-functional placeholders except visual state).
- **Trigger**: tap the three-dot menu button in the header.
- **Layout**: Right-side drawer, NOT a small dropdown — full height, 216px wide, slides in from off-screen right.
  - Backdrop: covers full screen, `oklch(0.15 0.01 60 / 0.28)`, fades in/out (opacity 0↔1, 0.35s ease), tap to dismiss.
  - Panel: `position: absolute; top:0; bottom:0; right:0; width:216px`, background `oklch(0.99 0.006 75)`, padding `70px 0 24px` (top padding clears the status bar), shadow `-8px 0 32px rgba(0,0,0,0.12)`, thin left border `oklch(0 0 0 / 0.05)`. Slides via `transform: translateX(0 / 100%)`, `transition: transform .38s cubic-bezier(.32,.72,0,1)` (always mounted, animated by transform+opacity rather than mount/unmount, so both open AND close are animated).
  - Items (list, top to bottom): Mission, Contact, FAQ, T&C, Log Out. Each: padding `13px 24px`, 15px, bottom divider `1px solid oklch(0 0 0 / 0.05)` (all but last). All items are currently disabled placeholders — `opacity: 0.35`, `pointer-events: none`. "Log Out" is styled in a muted red/pink `oklch(0.6 0.09 22)` to signal it's a destructive action once wired up.

### 4. "Connect with someone" overlay (add-contact sheet)
- **Purpose**: Search for or invite a new connection.
- **Trigger**: tap the "Add" tile at the end of the contact rail.
- **Layout**: Full-screen sheet over the whole app (covers the header/orb/rail), slides up from the bottom.
  - Container: `position:absolute; inset:0`, background `oklch(0.98 0.006 75 / 0.98)` with `backdrop-filter: blur(20px)`, padding `70px 24px 32px`. Animates via `transform: translateY(0 / 100%)` + opacity, `transition: transform .4s cubic-bezier(.32,.72,0,1), opacity .3s ease` (always mounted, animated, so it can both enter and exit smoothly).
  - Header row: 3-column grid (`36px 1fr 36px`) so the title is truly centered regardless of button widths.
    - Left: close button — 36×36px circle, no fill, just a thin "×" made of two crossed 15px lines (`oklch(0.4 0.012 60)`, rotate ±45deg). Closes the overlay.
    - Center: title "Connect with someone", 17px, weight 600, color `oklch(0.3 0.012 60)`, centered.
    - Right: submit/check button — 36×36px filled circle, background `oklch(0.85 0.11 148)` (pastel green, matches the "receiving" theme color), soft shadow, white checkmark (two 2px white border edges forming a check via rotated `border-left`+`border-bottom`). Currently also just closes the overlay (no real submit logic).
  - Body (vertically centered in the remaining space below the header, NOT flush under it — deliberately given "breathing room toward the center of the screen" per review feedback; column, gap 28px, `padding-bottom: 10%` to bias slightly above dead-center):
    - Search field: a real `<input>`, full width, padding `15px 18px`, border-radius 18px, thin `1px solid oklch(0 0 0 / 0.08)` border, background `oklch(1 0 0 / 0.6)` (translucent over the blurred backdrop), 15px text, placeholder **"Name, email, username, or phone"** — a single field handles all four identifier types (no separate fields/tabs).
    - Divider: a thin horizontal rule on each side of the word "or" (uppercase, 12.5px, letter-spacing 0.05em, `oklch(0.55 0.01 60)`), gap 12px.
    - "Share connection link": a secondary pill/row button below the divider, padding `15px 18px`, border-radius 18px, background `oklch(0.97 0.008 75)`, thin border `oklch(0 0 0 / 0.06)`, centered text, 15px weight 500. Alternative to search — generates/copies an invite link (not yet wired to real logic).

## Interactions & Behavior

### Presence orb color/motion states
The orb (both the 232px main orb and each 50px mini rail orb) has 4 visual states, each a distinct pastel color + distinct animation, applied via a shared `orbLook(state, size, ring)` look-up:

| State | Trigger | Color (OKLCH hue) | Feel |
|---|---|---|---|
| `idle` | default / nobody active | pastel blue, hue 258 | very slow breathing (scale 1→1.014, 4.2s) |
| `sending` | the user is pressing-and-holding the orb | pastel yellow, hue ~95 | faster, clearer pulse (scale 1→1.06, 1.05s) |
| `receiving` | the OTHER person is currently "thinking of" this contact (simulated) | pastel green, hue 148 | same fast pulse as sending, but green — deliberately made higher-chroma/more saturated than idle so it reads as clearly distinct from the static idle state (this was a specific fix: an earlier blue "receiving" color was too close to idle blue) |
| `both` | both sides pressing at once — mutual moment | pastel red, hue ~22 | a heartbeat scale pattern (double-bump: 1→1.04→1.005→1.04→1, 1.05s) PLUS the whole phone screen "shakes" very subtly (translate ±0.2–0.3px, 1.05s) PLUS a real device haptic buzz via `navigator.vibrate([45,65,45,260])` repeating every 1.05s for as long as the mutual state holds |

Orb rendering recipe (apply per state): outer circle = `radial-gradient(circle at 50% 50%, <mid-color> 0%, <lo-color> 38%, transparent 72%)` + soft outer glow via `box-shadow: 0 0 <size*0.6>px <size*0.2>px <glow-color>` (no hard edges/rings — intentionally "ethereal", not a solid 3D sphere) + a very slight self-blur (`size*0.015px`) for extra softness. An inner "core" glow sits on top: 60% size, `radial-gradient(circle, <core-color> 0%, transparent 68%)`, blurred `size*0.16px`, independently drifting (opacity 0.35↔0.65, scale 0.96↔1.08, 6s loop) for a living, non-static glow. When an orb is the "selected" one in the rail, add a thin outer ring: `0 0 0 1.5px <glow-color>` (soft outline, not a glossy inset highlight — avoid anything that reads as a hard 3D bead/sphere).

Interaction wiring: `pointerdown` on the main orb → `sending` state (while held); `pointerup`/`pointerleave`/`pointercancel` → back to idle/receiving. In the prototype, "the other person" pressing is simulated by a random timer (every ~3.2–8.4s, a random contact's `receiving` state turns on for ~2.2–3.8s) — in the real app this should come from a live presence signal (websocket/push) from that contact's device.

### Notification badge ("someone thought of me")
- When a contact's `receiving` ping fires (they pressed their end), mark that contact `unseen: true`.
- Renders as a small 12px pastel-red (`oklch(0.8 0.15 22)`) dot with a 2px light ring border (matching the app background, so it "cuts into" the orb), positioned top-right of that contact's 50px mini orb, popping in with a slight overshoot (`cubic-bezier(.34,1.56,.64,1)`, scale 0→1).
- **Persistence rule**: the badge stays visible even after the ping itself ends — it is NOT tied to the live `receiving` animation state. It only clears when the user taps/selects that contact in the rail (whether or not they were already selected).

### Cross-fades / transitions
The prototype keeps login layer, app layer, settings drawer, and add-overlay all permanently mounted and controls visibility purely via `opacity` + `pointer-events` + (for drawer/sheet) `transform`, so every open/close is a smooth animated transition rather than an abrupt mount/unmount. Recreate this as real animated transitions (not simple show/hide) on whatever platform this ships to.

## State Management
Minimal local state is sufficient to recreate the prototype:
- `contacts`: list of `{id, name}`.
- `selectedId`: currently viewed contact.
- `youPressing`: bool — is the local user currently holding the orb.
- `theirActive: {[contactId]: bool}`: is that contact currently "pressing" (live presence signal in production).
- `unseen: {[contactId]: bool}`: has that contact pinged since last viewed — drives the notification badge; cleared on selecting the contact.
- `settingsOpen`, `showAddOverlay`, `loggedIn`: bools controlling the three overlays/screens.

Production should replace the `theirActive` random simulation with a real real-time presence channel per contact (e.g. websocket event when the other person presses/releases their orb), and `loggedIn` with real auth state.

## Design Tokens

**Colors** (all OKLCH — `oklch(L C H [/ alpha])`; L=lightness 0–1, C=chroma, H=hue in degrees):
- Background (app canvas): `oklch(0.97 0.008 75)` — soft warm off-white.
- Outer bezel backdrop (preview-only): `oklch(0.93 0.01 75)`.
- Primary text: `oklch(0.32 0.012 60)` (dark warm gray, not pure black).
- Secondary/muted text: `oklch(0.52 0.012 60)` and `oklch(0.62 0.01 60)`.
- Panels/cards: `oklch(0.99 0.006 75)` (near-white).
- Orb — idle (pastel blue): mid `oklch(0.87 0.045 258)`, lo `oklch(0.79 0.04 258)`, glow `oklch(0.87 0.05 258 / 0.22)`, core `oklch(0.96 0.025 258 / 0.4)`.
- Orb — sending (pastel yellow): mid `oklch(0.92 0.09 95)`, lo `oklch(0.85 0.09 92)`, glow `oklch(0.92 0.11 95 / 0.28)`, core `oklch(0.97 0.07 96 / 0.45)`.
- Orb — receiving (pastel green): mid `oklch(0.85 0.11 148)`, lo `oklch(0.72 0.11 148)`, glow `oklch(0.85 0.14 148 / 0.34)`, core `oklch(0.95 0.09 150 / 0.5)`.
- Orb — both/mutual (pastel red): mid `oklch(0.84 0.09 22)`, lo `oklch(0.73 0.09 20)`, glow `oklch(0.86 0.11 22 / 0.3)`, core `oklch(0.96 0.07 24 / 0.48)`.
- Notification badge: `oklch(0.8 0.15 22)`.
- Log Out (destructive) text: `oklch(0.6 0.09 22)`.

**Typography**: system font stack (`-apple-system, system-ui` — use SF Pro / platform-native equivalent on the real app). Sizes used: 10.5px (rail labels), 12.5px (divider "or"), 15–15.5px (body/buttons/inputs), 17px (contact name, sheet title), 21px (header wordmark), 44px (login logo). Weights: 500 (regular UI text), 600 (emphasis/headers/selected label). Letter-spacing: -0.02em on wordmark/logo, 0.01em on contact name, 0.05em uppercase tracking on small labels.

**Spacing/radius**: pill buttons/rows use 18px or 999px (full pill) border-radius. Rail items are 64px wide with 18px gaps. Orb sizes: 232px (main), 96px (login), 50px (rail).

**Motion**: breathing 4.2s / pulse 1.05s / heartbeat 1.05s / drift 6s / hue-cycle 10s — see keyframes below, all `ease-in-out` except hue-cycle (`linear`) and shake (`ease-in-out`).

```css
@keyframes muBreathe { 0%,100% { transform: scale(1) } 50% { transform: scale(1.014) } }
@keyframes muPulse { 0%,100% { transform: scale(1) } 50% { transform: scale(1.06) } }
@keyframes muHeartbeat { 0% { transform: scale(1) } 16% { transform: scale(1.04) } 32% { transform: scale(1.005) } 46% { transform: scale(1.04) } 70%,100% { transform: scale(1) } }
@keyframes muShake { 0%,100% { transform: translate(0,0) } 10% { transform: translate(0,-0.3px) } 20% { transform: translate(0,0.25px) } 30% { transform: translate(0,-0.2px) } 40% { transform: translate(0,0.2px) } 50% { transform: translate(0,0) } }
@keyframes muDrift { 0%,100% { opacity: 0.35; transform: translate(-50%,-50%) scale(0.96) } 50% { opacity: 0.65; transform: translate(-50%,-50%) scale(1.08) } }
@keyframes muHueCycle { 0% { filter: hue-rotate(0deg) } 100% { filter: hue-rotate(360deg) } }
```

## Assets
No image/icon assets are used. All visual elements (dots, plus sign, X, checkmark, orbs) are built from plain CSS shapes (divs with border-radius/gradients/rotated borders) — no SVGs or icon fonts. Recreate icons using the target platform's native icon/shape primitives; do not need to source or draw new icon assets.

## Files
- `Mu.dc.html` — the full design source (markup + inline styles + component logic/state). This is the design of record; read it top to bottom alongside this README.
- `ios-frame.jsx` — iPhone bezel mockup used only to preview the design in a browser; not part of the product.
