// Colors converted 1:1 from the OKLCH values in ../../../README.md (Design Tokens section).
// Conversion uses Björn Ottosson's OKLab/OKLCH -> sRGB matrices — same L/C/H, nearest sRGB hex.
// Do not hand-tune these; if a token changes, regenerate from the README's oklch() value.

export const colors = {
  bg: '#f8f4ef',
  panel: '#fefbf7',

  textPrimary: '#38322d',
  textSecondary1: '#6e6762', // contact name under main orb
  textSecondary2: '#8b8580', // unselected rail labels
  titleText: '#322c28', // sheet titles, selected rail label

  hairline: 'rgba(0, 0, 0, 0.05)',
  hairlineStrong: 'rgba(0, 0, 0, 0.06)',
  hairlineInput: 'rgba(0, 0, 0, 0.08)',

  backdrop: 'rgba(14, 10, 7, 0.28)',
  dots: 'rgba(78, 70, 64, 0.75)',
  dividerText: '#76706c',
  xLine: '#4d4641',

  searchInputBg: 'rgba(255, 255, 255, 0.6)',
  shareBg: '#f8f4ef',
  addOverlayBg: 'rgba(251, 248, 244, 0.98)',

  badge: '#ff9492',
  logout: '#b06a68',

  addTileMid: '#e8e4e1',
  addTileLo: '#d4d0cd',
  addTileGlow: 'rgba(210, 205, 201, 0.16)',
  plusLine: 'rgba(132, 127, 123, 0.55)',
} as const;

export type OrbState = 'idle' | 'sending' | 'receiving' | 'both';

export const orbTheme: Record<OrbState, { mid: string; lo: string; glow: string; core: string }> = {
  idle: { mid: '#c2d6f2', lo: '#abbcd5', glow: 'rgba(192, 214, 246, 0.22)', core: 'rgba(232, 243, 255, 0.4)' },
  sending: { mid: '#f7e59f', lo: '#e3cd89', glow: 'rgba(251, 228, 141, 0.28)', core: 'rgba(255, 246, 192, 0.45)' },
  receiving: { mid: '#9be2a5', lo: '#73b87d', glow: 'rgba(138, 231, 153, 0.34)', core: 'rgba(196, 255, 207, 0.5)' },
  both: { mid: '#ffb4b0', lo: '#db9190', glow: 'rgba(255, 180, 176, 0.3)', core: 'rgba(255, 224, 219, 0.48)' },
};

export const loginOrbTheme = {
  mid: '#bdd3f2',
  lo: '#a3b6d1',
  glow: 'rgba(185, 211, 249, 0.28)',
  core: 'rgba(230, 243, 255, 0.45)',
};

export const fontFamily = 'System';

export const type = {
  railLabel: 10.5,
  divider: 12.5,
  body: 15,
  buttonText: 15.5,
  contactName: 17,
  sheetTitle: 17,
  wordmark: 21,
  loginLogo: 44,
};

export const spacing = {
  pillRadius: 999,
  cardRadius: 18,
  railGap: 18,
  railItemWidth: 64,
};

export const orbSizes = {
  main: 232,
  login: 96,
  rail: 50,
};

export const motion = {
  breatheMs: 4200,
  pulseMs: 1050,
  heartbeatMs: 1050,
  driftMs: 6000,
  hueCycleMs: 10000,
  crossFadeMs: 600,
  drawerMs: 380,
  sheetMs: 400,
  badgePopMs: 300,
  backdropMs: 350,
};
