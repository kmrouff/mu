// Short, warm, a little cheeky — not a marketing pitch. This is the whole pitch: a quiet nudge,
// no notifications, no noise.
export function buildInviteMessage(code: string, link: string): string {
  return `Hi! I was just thinking of you, and thought you should know — I'm sending you a little tool I found that lets us nudge each other.

The maker described it as: "Quiet, good vibes in the background whenever you feel like it. No marketing, no payments, no ads, no notifications — none of that stuff. Only invited people can join, to keep things cozy."

Try it here: ${link}

Or open mu and enter this code: ${code}`;
}

export function looksLikeEmail(value: string): boolean {
  return /\S+@\S+\.\S+/.test(value.trim());
}

// Loose "is this plausibly a real phone number" check — at least 7 digits, ignoring spaces,
// dashes, parens, and a leading +. Not meant to be a strict validator, just enough to tell
// "someone started typing a number" from "that's obviously not one yet".
export function looksLikePhone(value: string): boolean {
  const digitCount = (value.match(/\d/g) ?? []).length;
  return digitCount >= 7;
}

export function looksLikeValidTarget(value: string): boolean {
  const trimmed = value.trim();
  return looksLikeEmail(trimmed) || looksLikePhone(trimmed);
}

// Connect codes are always exactly this many characters (see CODE_LENGTH in firebase/pairing.ts).
export const CONNECT_CODE_LENGTH = 6;

export function looksLikeValidCode(value: string): boolean {
  return value.trim().length === CONNECT_CODE_LENGTH;
}
