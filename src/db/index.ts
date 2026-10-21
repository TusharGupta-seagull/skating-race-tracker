import Dexie, { type Table } from 'dexie';
import type { Race, RaceCategory } from '@/types';
import { nanoid } from '@/lib/nanoid';

// ─── Default Categories ────────────────────────────────────────────────────────
export const DEFAULT_CATEGORIES: RaceCategory[] = [
  { id: 'cat-1lap', name: '1 Lap (Rink)', isArchived: false, createdAt: Date.now() },
  { id: 'cat-500m', name: '500m + D', isArchived: false, createdAt: Date.now() },
  { id: 'cat-1000m', name: '1000m', isArchived: false, createdAt: Date.now() },
  { id: 'cat-tt', name: 'Time Trial (TT)', isArchived: false, createdAt: Date.now() },
  { id: 'cat-road', name: 'Road Race', isArchived: false, createdAt: Date.now() },
];

// ─── Database Class ────────────────────────────────────────────────────────────
class SkatingDB extends Dexie {
  races!: Table<Race, string>;
  categories!: Table<RaceCategory, string>;

  constructor() {
    super('SkatingRaceTracker');

    this.version(1).stores({
      races: 'id, eventDate, eventYear, categoryId, createdAt',
      categories: 'id, name, isArchived',
    });
  }
}

export const db = new SkatingDB();

// ─── Seed default categories on first run ─────────────────────────────────────
db.on('ready', async () => {
  const count = await db.categories.count();
  if (count === 0) {
    await db.categories.bulkAdd(DEFAULT_CATEGORIES);
  }
});

// ─── Race Repository ──────────────────────────────────────────────────────────
export const raceRepo = {
  async getAll(): Promise<Race[]> {
    return db.races.orderBy('eventDate').reverse().toArray();
  },

  async getById(id: string): Promise<Race | undefined> {
    return db.races.get(id);
  },

  async create(data: Omit<Race, 'id' | 'createdAt' | 'updatedAt'>): Promise<Race> {
    const now = Date.now();
    const race: Race = { ...data, id: nanoid(), createdAt: now, updatedAt: now };
    await db.races.add(race);
    return race;
  },

  async update(id: string, data: Partial<Omit<Race, 'id' | 'createdAt'>>): Promise<Race> {
    const now = Date.now();
    await db.races.update(id, { ...data, updatedAt: now });
    const updated = await db.races.get(id);
    if (!updated) throw new Error(`Race ${id} not found after update`);
    return updated;
  },

  async delete(id: string): Promise<void> {
    await db.races.delete(id);
  },

  async getByCategory(categoryId: string): Promise<Race[]> {
    return db.races.where('categoryId').equals(categoryId).toArray();
  },

  async getByYear(year: number): Promise<Race[]> {
    return db.races.where('eventYear').equals(year).toArray();
  },

  async getAllYears(): Promise<number[]> {
    const races = await db.races.toArray();
    const years = [...new Set(races.map((r) => r.eventYear))].sort((a, b) => b - a);
    return years;
  },
};

// ─── Category Repository ──────────────────────────────────────────────────────
export const categoryRepo = {
  async getAll(): Promise<RaceCategory[]> {
    return db.categories.toArray();
  },

  async getActive(): Promise<RaceCategory[]> {
    const cats = await db.categories.toArray();
    return cats.filter((c) => !c.isArchived);
  },

  async getById(id: string): Promise<RaceCategory | undefined> {
    return db.categories.get(id);
  },

  async create(name: string): Promise<RaceCategory> {
    const cat: RaceCategory = { id: nanoid(), name, isArchived: false, createdAt: Date.now() };
    await db.categories.add(cat);
    return cat;
  },

  async rename(id: string, name: string): Promise<void> {
    await db.categories.update(id, { name });
  },

  async archive(id: string): Promise<void> {
    await db.categories.update(id, { isArchived: true });
  },

  async restore(id: string): Promise<void> {
    await db.categories.update(id, { isArchived: false });
  },
};
