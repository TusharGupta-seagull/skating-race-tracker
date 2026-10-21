/**
 * Time utilities for Skating Race Tracker
 *
 * Internal representation: integer milliseconds
 * Display format: mm:ss.cs (e.g. 01:23.45 = 83,450 ms)
 */

// ─── Parse ────────────────────────────────────────────────────────────────────

/**
 * Parse a time string in "mm:ss.cs", "mm:ss.ms", "ss.cs", or "ss" format into milliseconds.
 * Returns null for empty strings, throws for invalid input.
 */
export function parseTimeToMs(raw: string): number | null {
  let s = raw.trim();
  if (!s) return null;

  // Remove optional trailing 's' or 'sec'
  s = s.replace(/s(ec)?$/i, '').trim();

  // If format is mm:ss:cs (e.g. 01:23:45 with two colons), convert second colon to dot
  const colonCount = (s.match(/:/g) || []).length;
  if (colonCount === 2) {
    const lastColonIdx = s.lastIndexOf(':');
    s = s.substring(0, lastColonIdx) + '.' + s.substring(lastColonIdx + 1);
  }

  // If format is mm.ss.cs (e.g. 1.23.45 with two dots), convert first dot to colon
  const dotCount = (s.match(/\./g) || []).length;
  if (dotCount === 2 && colonCount === 0) {
    const firstDotIdx = s.indexOf('.');
    s = s.substring(0, firstDotIdx) + ':' + s.substring(firstDotIdx + 1);
  }

  // Replace comma with period (common European format, e.g. 43,12)
  s = s.replace(',', '.');

  // Accepts: "mm:ss.cs", "mm:ss.ms", "mm:ss", "ss.cs", "ss"
  const re = /^(?:(\d+):)?(\d{1,3})(?:\.(\d{1,3}))?$/;
  const m = s.match(re);
  if (!m) {
    throw new Error(`Invalid time format: "${raw}". Expected mm:ss.cs (e.g. 01:23.45 or 43.12)`);
  }

  let minutes = m[1] !== undefined ? parseInt(m[1], 10) : 0;
  let seconds = parseInt(m[2], 10);
  
  // If no minutes provided and seconds >= 60, normalize
  if (m[1] === undefined && seconds >= 60) {
    minutes = Math.floor(seconds / 60);
    seconds = seconds % 60;
  } else if (m[1] !== undefined && seconds >= 60) {
    throw new Error(`Seconds must be 0–59 when minutes are specified, got ${seconds}`);
  }

  // Milliseconds from 1, 2, or 3 decimal digits
  const msDigits = m[3] !== undefined ? m[3].padEnd(3, '0').slice(0, 3) : '000';
  const millis = parseInt(msDigits, 10);

  return minutes * 60_000 + seconds * 1_000 + millis;
}

// ─── Format ───────────────────────────────────────────────────────────────────

/**
 * Format milliseconds into "mm:ss.cs" string (e.g. 83,450 ms -> "01:23.45").
 */
export function formatMs(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '--:--';
  const totalSecs = Math.floor(ms / 1000);
  const centis = Math.floor((ms % 1000) / 10);
  const minutes = Math.floor(totalSecs / 60);
  const seconds = totalSecs % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centis).padStart(2, '0')}`;
}

/**
 * Format a delta in ms as a human-readable string.
 * Negative = faster, positive = slower.
 */
export function formatDelta(deltaMs: number): string {
  if (deltaMs === 0) return 'No change';
  const abs = Math.abs(deltaMs);
  const secs = (abs / 1000).toFixed(2);
  return deltaMs < 0 ? `${secs}s faster` : `${secs}s slower`;
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Returns a validation error message or null if valid.
 */
export function validateTimeString(raw: string): string | null {
  if (!raw.trim()) return 'Time is required';
  try {
    parseTimeToMs(raw);
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : 'Invalid time';
  }
}

// ─── Comparison ───────────────────────────────────────────────────────────────

/** Returns true if a is faster (lower) than b */
export function isFaster(aMs: number, bMs: number): boolean {
  return aMs < bMs;
}

/** Returns delta: negative means 'current' is faster */
export function timeDelta(currentMs: number, previousMs: number): number {
  return currentMs - previousMs;
}
