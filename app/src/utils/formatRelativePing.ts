const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

// Buckets a ping timestamp into a short, human phrase relative to `now`, meant to slot into
// "{name} thought of you {phrase}". Falls back to a calendar date (prefixed with "on", since
// "thought of you on Jul 15" reads right but "thought of you Jul 15" doesn't) once it's
// further back than "yesterday" — matches the design ask: "yesterday morning", "yesterday
// afternoon", "today", "this morning", "last night", otherwise a date.
export function formatRelativePing(pingAt: number, now: number): string {
  const ping = new Date(pingAt);
  const nowDate = new Date(now);
  const dayDiff = Math.round((startOfDay(nowDate) - startOfDay(ping)) / 86_400_000);
  const hour = ping.getHours();

  // Time-of-day buckets are the wrong tool for something that just happened: a ping sent
  // seconds ago at half past midnight is technically in the small hours, but calling it
  // "last night" is plainly wrong. This is also the most common case in an app built around
  // presence, since the message appears the moment someone stops pressing.
  if (now - pingAt < 2 * 60_000) return 'just now';

  if (dayDiff <= 0) {
    // Only reach back for "last night" once the night is actually over — otherwise it's still
    // tonight for both of us.
    if (hour < 5) return nowDate.getHours() < 5 ? 'earlier tonight' : 'last night';
    if (hour < 12) return 'this morning';
    return 'today';
  }

  if (dayDiff === 1) {
    if (hour < 12) return 'yesterday morning';
    if (hour < 17) return 'yesterday afternoon';
    return 'yesterday';
  }

  const sameYear = ping.getFullYear() === nowDate.getFullYear();
  const datePart = `${MONTHS[ping.getMonth()]} ${ping.getDate()}`;
  return `on ${sameYear ? datePart : `${datePart}, ${ping.getFullYear()}`}`;
}
