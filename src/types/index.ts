// ─── Domain Types ─────────────────────────────────────────────────────────────

export interface TopPerformer {
  id: string;
  name: string;
  timeMs: number;
  rank: number;
}

export interface Race {
  id: string;
  eventName: string;
  eventDate: string;      // ISO date string "YYYY-MM-DD"
  eventYear: number;      // editable, independent from eventDate
  categoryId: string;
  skaterTimeMs: number;
  skaterRank: number;
  topPerformers: TopPerformer[];
  notes?: string;
  createdAt: number;      // timestamp ms
  updatedAt: number;      // timestamp ms
}

export interface RaceCategory {
  id: string;
  name: string;
  isArchived: boolean;
  createdAt: number;
}

// ─── Form Types ────────────────────────────────────────────────────────────────

export interface RaceFormValues {
  eventName: string;
  eventDate: string;
  eventYear: number;
  categoryId: string;
  skaterTime: string;     // formatted mm:ss.ms
  skaterRank: number;
  topPerformers: {
    id: string;
    name: string;
    time: string;         // formatted
    rank: number;
  }[];
  notes: string;
}

// ─── Analytics Types ──────────────────────────────────────────────────────────

export interface PersonalBest {
  categoryId: string;
  categoryName: string;
  race: Race;
  previousBestMs?: number;
  raceCount: number;
}

export interface ChartPoint {
  date: string;
  timeMs: number;
  eventName: string;
  rank: number;
  raceId: string;
}

export interface ImprovementData {
  deltaMs: number;          // negative = faster
  label: string;
}

// ─── Backup Types ─────────────────────────────────────────────────────────────

export interface BackupFile {
  version: number;
  exportedAt: string;
  races: Race[];
  categories: RaceCategory[];
}
