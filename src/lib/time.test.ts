import { describe, it, expect } from 'vitest';
import { parseTimeToMs, formatMs, formatDelta, timeDelta, isFaster, validateTimeString } from './time';

describe('time utilities', () => {
  describe('parseTimeToMs', () => {
    it('parses standard mm:ss.cs format correctly', () => {
      expect(parseTimeToMs('01:23.45')).toBe(83450);
      expect(parseTimeToMs('00:43.12')).toBe(43120);
      expect(parseTimeToMs('00:14.20')).toBe(14200);
    });

    it('parses seconds-only format with decimal', () => {
      expect(parseTimeToMs('43.12')).toBe(43120);
      expect(parseTimeToMs('14.2')).toBe(14200);
    });

    it('parses 3 decimal digits (milliseconds) gracefully', () => {
      expect(parseTimeToMs('00:43.125')).toBe(43125);
      expect(parseTimeToMs('43.125')).toBe(43125);
    });

    it('normalizes total seconds >= 60 when no minutes provided', () => {
      expect(parseTimeToMs('83.45')).toBe(83450);
    });

    it('parses European comma decimals and suffixes gracefully', () => {
      expect(parseTimeToMs('43,12')).toBe(43120);
      expect(parseTimeToMs('01:23,45')).toBe(83450);
      expect(parseTimeToMs('43.12s')).toBe(43120);
      expect(parseTimeToMs('01:23:45')).toBe(83450);
      expect(parseTimeToMs('1.23.45')).toBe(83450);
    });

    it('returns null for empty strings', () => {
      expect(parseTimeToMs('')).toBeNull();
      expect(parseTimeToMs('   ')).toBeNull();
    });

    it('throws error for invalid format', () => {
      expect(() => parseTimeToMs('invalid')).toThrow();
      expect(() => parseTimeToMs('01:65.00')).toThrow();
    });
  });

  describe('formatMs', () => {
    it('formats milliseconds to mm:ss.cs', () => {
      expect(formatMs(83450)).toBe('01:23.45');
      expect(formatMs(43120)).toBe('00:43.12');
      expect(formatMs(14200)).toBe('00:14.20');
      expect(formatMs(0)).toBe('00:00.00');
    });

    it('handles negative or invalid values gracefully', () => {
      expect(formatMs(-100)).toBe('--:--');
      expect(formatMs(NaN)).toBe('--:--');
    });
  });

  describe('formatDelta & timeDelta', () => {
    it('calculates negative delta when current time is faster', () => {
      const delta = timeDelta(42850, 43400); // 42.85s vs 43.40s
      expect(delta).toBe(-550);
      expect(isFaster(42850, 43400)).toBe(true);
      expect(formatDelta(delta)).toBe('0.55s faster');
    });

    it('calculates positive delta when current time is slower', () => {
      const delta = timeDelta(44100, 43400);
      expect(delta).toBe(700);
      expect(isFaster(44100, 43400)).toBe(false);
      expect(formatDelta(delta)).toBe('0.70s slower');
    });

    it('returns "No change" for identical times', () => {
      expect(formatDelta(0)).toBe('No change');
    });
  });

  describe('validateTimeString', () => {
    it('validates strings correctly', () => {
      expect(validateTimeString('01:23.45')).toBeNull();
      expect(validateTimeString('')).toBe('Time is required');
      expect(validateTimeString('abc')).not.toBeNull();
    });
  });
});
