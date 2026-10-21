import type { Race, RaceCategory, PersonalBest, ChartPoint } from '@/types';
import { isFaster, timeDelta } from '@/lib/time';

// ─── Personal Bests ───────────────────────────────────────────────────────────

export function computePersonalBests(
  races: Race[],
  categories: RaceCategory[]
): PersonalBest[] {
  const catMap = new Map(categories.map((c) => [c.id, c]));

  // Group races by category, sorted chronologically
  const byCat = new Map<string, Race[]>();
  for (const race of races) {
    if (!byCat.has(race.categoryId)) byCat.set(race.categoryId, []);
    byCat.get(race.categoryId)!.push(race);
  }

  const result: PersonalBest[] = [];

  for (const [catId, catRaces] of byCat) {
    const cat = catMap.get(catId);
    if (!cat) continue;

    // Sort by time ascending to find best
    const sorted = [...catRaces].sort((a, b) => a.skaterTimeMs - b.skaterTimeMs);
    const best = sorted[0];

    // Find previous best (second unique time)
    const previousBestMs = sorted.length > 1 ? sorted[1].skaterTimeMs : undefined;

    result.push({
      categoryId: catId,
      categoryName: cat.name,
      race: best,
      previousBestMs,
      raceCount: catRaces.length,
    });
  }

  // Sort by category creation order using original array
  result.sort((a, b) => {
    const catA = catMap.get(a.categoryId);
    const catB = catMap.get(b.categoryId);
    return (catA?.createdAt ?? 0) - (catB?.createdAt ?? 0);
  });

  return result;
}

// ─── Chart Data ───────────────────────────────────────────────────────────────

export function buildChartPoints(races: Race[], categoryId: string): ChartPoint[] {
  return races
    .filter((r) => r.categoryId === categoryId)
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate))
    .map((r) => ({
      date: r.eventDate,
      timeMs: r.skaterTimeMs,
      eventName: r.eventName,
      rank: r.skaterRank,
      raceId: r.id,
    }));
}

// ─── Summary Stats ────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalRaces: number;
  podiumFinishes: number;  // skaterRank 1, 2, or 3
  mostRecentDate: string | null;
  overallBest: { timeMs: number; categoryName: string; eventName: string } | null;
}

export function computeDashboardStats(
  races: Race[],
  categories: RaceCategory[]
): DashboardStats {
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const totalRaces = races.length;
  const podiumFinishes = races.filter((r) => r.skaterRank >= 1 && r.skaterRank <= 3).length;

  const sorted = [...races].sort((a, b) => b.eventDate.localeCompare(a.eventDate));
  const mostRecentDate = sorted[0]?.eventDate ?? null;

  // Overall best: fastest skaterTime across all categories
  let overallBest: DashboardStats['overallBest'] = null;
  for (const r of races) {
    if (!overallBest || isFaster(r.skaterTimeMs, overallBest.timeMs)) {
      const cat = catMap.get(r.categoryId);
      overallBest = {
        timeMs: r.skaterTimeMs,
        categoryName: cat?.name ?? 'Unknown',
        eventName: r.eventName,
      };
    }
  }

  return { totalRaces, podiumFinishes, mostRecentDate, overallBest };
}

// ─── Improvement Calculations ─────────────────────────────────────────────────

export interface ImprovementResult {
  deltaMs: number;
  faster: boolean;
  label: string;
}

export function computeImprovement(
  races: Race[],
  categoryId: string
): ImprovementResult | null {
  const catRaces = races
    .filter((r) => r.categoryId === categoryId)
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate));

  if (catRaces.length < 2) return null;

  const latest = catRaces[catRaces.length - 1];
  const prev = catRaces[catRaces.length - 2];
  const delta = timeDelta(latest.skaterTimeMs, prev.skaterTimeMs);
  const absSecs = (Math.abs(delta) / 1000).toFixed(2);

  return {
    deltaMs: delta,
    faster: delta < 0,
    label: delta < 0
      ? `${absSecs}s faster than previous`
      : delta > 0
        ? `${absSecs}s slower than previous`
        : 'No change',
  };
}

// ─── Season Stats ─────────────────────────────────────────────────────────────

export function computeSeasonStats(races: Race[], categoryId: string, year: number) {
  const filtered = races.filter((r) => r.categoryId === categoryId && r.eventYear === year);
  if (filtered.length === 0) return null;

  const sorted = [...filtered].sort((a, b) => a.skaterTimeMs - b.skaterTimeMs);
  const best = sorted[0].skaterTimeMs;
  const avg = Math.round(filtered.reduce((s, r) => s + r.skaterTimeMs, 0) / filtered.length);

  return { count: filtered.length, best, avg };
}
