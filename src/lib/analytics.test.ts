import { describe, it, expect } from 'vitest';
import { computePersonalBests, computeDashboardStats, computeImprovement, buildChartPoints } from './analytics';
import type { Race, RaceCategory } from '@/types';

const MOCK_CATEGORIES: RaceCategory[] = [
  { id: 'cat-500m', name: '500m + D', isArchived: false, createdAt: 1000 },
  { id: 'cat-1000m', name: '1000m', isArchived: false, createdAt: 2000 },
];

const MOCK_RACES: Race[] = [
  {
    id: 'r1',
    eventName: 'Stage 1',
    eventDate: '2026-01-10',
    eventYear: 2026,
    categoryId: 'cat-500m',
    skaterTimeMs: 44100, // 44.10s
    skaterRank: 3,
    topPerformers: [],
    createdAt: 1000,
    updatedAt: 1000,
  },
  {
    id: 'r2',
    eventName: 'Stage 2',
    eventDate: '2026-02-15',
    eventYear: 2026,
    categoryId: 'cat-500m',
    skaterTimeMs: 43400, // 43.40s (faster)
    skaterRank: 2,
    topPerformers: [],
    createdAt: 2000,
    updatedAt: 2000,
  },
  {
    id: 'r3',
    eventName: 'Championship',
    eventDate: '2026-03-20',
    eventYear: 2026,
    categoryId: 'cat-500m',
    skaterTimeMs: 42850, // 42.85s (PB)
    skaterRank: 1,
    topPerformers: [],
    createdAt: 3000,
    updatedAt: 3000,
  },
  {
    id: 'r4',
    eventName: 'Championship 1000m',
    eventDate: '2026-03-21',
    eventYear: 2026,
    categoryId: 'cat-1000m',
    skaterTimeMs: 88500, // 1:28.50 (PB)
    skaterRank: 2,
    topPerformers: [],
    createdAt: 4000,
    updatedAt: 4000,
  },
];

describe('analytics utilities', () => {
  describe('computePersonalBests', () => {
    it('finds the minimum time for each category', () => {
      const pbs = computePersonalBests(MOCK_RACES, MOCK_CATEGORIES);
      expect(pbs).toHaveLength(2);

      const pb500 = pbs.find((p) => p.categoryId === 'cat-500m');
      expect(pb500?.race.skaterTimeMs).toBe(42850);
      expect(pb500?.raceCount).toBe(3);
      expect(pb500?.previousBestMs).toBe(43400);

      const pb1000 = pbs.find((p) => p.categoryId === 'cat-1000m');
      expect(pb1000?.race.skaterTimeMs).toBe(88500);
      expect(pb1000?.raceCount).toBe(1);
      expect(pb1000?.previousBestMs).toBeUndefined();
    });
  });

  describe('computeDashboardStats', () => {
    it('calculates total races, podium finishes, and overall best', () => {
      const stats = computeDashboardStats(MOCK_RACES, MOCK_CATEGORIES);
      expect(stats.totalRaces).toBe(4);
      expect(stats.podiumFinishes).toBe(4); // ranks 3, 2, 1, 2 are all <= 3
      expect(stats.mostRecentDate).toBe('2026-03-21');
      expect(stats.overallBest?.timeMs).toBe(42850);
    });
  });

  describe('computeImprovement', () => {
    it('computes improvement between the latest two chronological races', () => {
      const imp = computeImprovement(MOCK_RACES, 'cat-500m');
      expect(imp).not.toBeNull();
      expect(imp?.faster).toBe(true);
      expect(imp?.deltaMs).toBe(42850 - 43400); // -550ms
      expect(imp?.label).toBe('0.55s faster than previous');
    });

    it('returns null if fewer than 2 races exist in category', () => {
      const imp = computeImprovement(MOCK_RACES, 'cat-1000m');
      expect(imp).toBeNull();
    });
  });

  describe('buildChartPoints', () => {
    it('sorts chart points in chronological order', () => {
      const points = buildChartPoints(MOCK_RACES, 'cat-500m');
      expect(points).toHaveLength(3);
      expect(points[0].date).toBe('2026-01-10');
      expect(points[1].date).toBe('2026-02-15');
      expect(points[2].date).toBe('2026-03-20');
      expect(points[2].timeMs).toBe(42850);
    });
  });
});
