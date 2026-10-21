import { describe, it, expect } from 'vitest';
import { raceFormSchema, backupSchema } from './validation';

describe('validation schemas', () => {
  describe('raceFormSchema', () => {
    it('validates a complete valid race form', () => {
      const valid = {
        eventName: 'National Championship',
        eventDate: '2026-03-15',
        eventYear: 2026,
        categoryId: 'cat-500m',
        skaterTime: '00:42.85',
        skaterRank: 1,
        topPerformers: [
          { id: '1', name: 'Lars Van Der Bilt', time: '00:43.10', rank: 2 },
        ],
        notes: 'Great crossover form',
      };

      const result = raceFormSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects missing event name or invalid time', () => {
      const invalid = {
        eventName: '',
        eventDate: '2026-03-15',
        eventYear: 2026,
        categoryId: 'cat-500m',
        skaterTime: 'invalid-time',
        skaterRank: 1,
        topPerformers: [],
      };
      const result = raceFormSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('allows blank top performer rows without failing', () => {
      const validWithBlankPerformer = {
        eventName: 'City Sprint',
        eventDate: '2026-03-15',
        eventYear: 2026,
        categoryId: 'cat-500m',
        skaterTime: '00:43.12',
        skaterRank: 1,
        topPerformers: [{ id: '1', name: '', time: '', rank: 1 }],
      };
      const result = raceFormSchema.safeParse(validWithBlankPerformer);
      expect(result.success).toBe(true);
    });

    it('rejects top performer with time but missing name', () => {
      const invalidPerformer = {
        eventName: 'City Sprint',
        eventDate: '2026-03-15',
        eventYear: 2026,
        categoryId: 'cat-500m',
        skaterTime: '00:43.12',
        skaterRank: 1,
        topPerformers: [{ id: '1', name: '', time: '43.50', rank: 1 }],
      };
      const result = raceFormSchema.safeParse(invalidPerformer);
      expect(result.success).toBe(false);
    });
  });

  describe('backupSchema', () => {
    it('validates a valid backup payload', () => {
      const backup = {
        version: 1,
        exportedAt: new Date().toISOString(),
        races: [
          {
            id: 'r1',
            eventName: 'Championship',
            eventDate: '2026-03-15',
            eventYear: 2026,
            categoryId: 'cat-500m',
            skaterTimeMs: 42850,
            skaterRank: 1,
            topPerformers: [],
            createdAt: 1000,
            updatedAt: 1000,
          },
        ],
        categories: [
          { id: 'cat-500m', name: '500m + D', isArchived: false, createdAt: 1000 },
        ],
      };

      const result = backupSchema.safeParse(backup);
      expect(result.success).toBe(true);
    });
  });

  describe('zod4Resolver', () => {
    it('returns empty errors for valid values', async () => {
      const { zod4Resolver } = await import('./validation');
      const resolver = zod4Resolver(raceFormSchema);
      const values = {
        eventName: 'Test Championship 2026',
        eventDate: '2026-10-21',
        eventYear: 2026,
        categoryId: 'cat-1lap',
        skaterTime: '00:43.50',
        skaterRank: 1,
        topPerformers: [],
        notes: '',
      };
      const res = await resolver(values, undefined, { shouldUseNativeValidation: false, fields: {} });
      expect(res.errors).toEqual({});
      expect(res.values).toBeDefined();
    });

    it('returns structured errors without throwing on invalid input', async () => {
      const { zod4Resolver } = await import('./validation');
      const resolver = zod4Resolver(raceFormSchema);
      const invalidValues = {
        eventName: '',
        eventDate: '2026-10-21',
        eventYear: 2026,
        categoryId: 'cat-1lap',
        skaterTime: 'invalid-time',
        skaterRank: 1,
        topPerformers: [],
        notes: '',
      };
      const res = await resolver(invalidValues, undefined, { shouldUseNativeValidation: false, fields: {} });
      expect(res.errors).toBeDefined();
      expect((res.errors as any).eventName?.message).toBe('Event name is required');
      expect((res.errors as any).skaterTime?.message).toBeDefined();
      expect(res.values).toEqual({});
    });
  });
});

