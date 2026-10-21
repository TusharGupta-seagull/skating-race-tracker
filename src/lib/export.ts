import type { Race, RaceCategory, BackupFile } from '@/types';
import { formatMs } from '@/lib/time';
import * as XLSX from 'xlsx';

// ─── CSV Export ───────────────────────────────────────────────────────────────

function escapeCSV(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export function exportToCSV(races: Race[], categories: RaceCategory[]): void {
  const catMap = new Map(categories.map((c) => [c.id, c.name]));

  const headers = [
    'Race ID', 'Event Name', 'Event Date', 'Event Year', 'Category',
    'Skater Time', 'Skater Time (ms)', 'Skater Rank',
    '1st Name', '1st Time', '1st Rank',
    '2nd Name', '2nd Time', '2nd Rank',
    '3rd Name', '3rd Time', '3rd Rank',
    'Notes', 'Created At', 'Updated At',
  ];

  const rows = races.map((r) => {
    const performers = [1, 2, 3].map((rank) => {
      const p = r.topPerformers.find((tp) => tp.rank === rank);
      return p ? [p.name, formatMs(p.timeMs), String(p.rank)] : ['', '', ''];
    });

    return [
      r.id, r.eventName, r.eventDate, r.eventYear,
      catMap.get(r.categoryId) ?? r.categoryId,
      formatMs(r.skaterTimeMs), r.skaterTimeMs, r.skaterRank,
      ...performers.flat(),
      r.notes ?? '',
      new Date(r.createdAt).toISOString(),
      new Date(r.updatedAt).toISOString(),
    ];
  });

  const csvRows = [headers, ...rows]
    .map((row) => row.map(escapeCSV).join(','))
    .join('\r\n');

  const blob = new Blob(['\uFEFF' + csvRows], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, 'skating-races.csv');
}

// ─── Excel Export ─────────────────────────────────────────────────────────────

export function exportToExcel(races: Race[], categories: RaceCategory[]): void {
  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  const wb = XLSX.utils.book_new();

  // Race History sheet
  const raceRows = races.map((r) => ({
    'Race ID': r.id,
    'Event Name': r.eventName,
    'Event Date': r.eventDate,
    'Event Year': r.eventYear,
    'Category': catMap.get(r.categoryId) ?? r.categoryId,
    'Skater Time': formatMs(r.skaterTimeMs),
    'Skater Time (ms)': r.skaterTimeMs,
    'Skater Rank': r.skaterRank,
    'Notes': r.notes ?? '',
    'Created At': new Date(r.createdAt).toISOString(),
    'Updated At': new Date(r.updatedAt).toISOString(),
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(raceRows), 'Race History');

  // Top Performers sheet
  const performerRows = races.flatMap((r) =>
    r.topPerformers.map((p) => ({
      'Race ID': r.id,
      'Event Name': r.eventName,
      'Event Date': r.eventDate,
      'Performer Name': p.name,
      'Performer Time': formatMs(p.timeMs),
      'Performer Time (ms)': p.timeMs,
      'Performer Rank': p.rank,
    }))
  );
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(performerRows), 'Top Performers');

  // Categories sheet
  const catRows = categories.map((c) => ({
    'Category ID': c.id,
    'Name': c.name,
    'Archived': c.isArchived ? 'Yes' : 'No',
    'Created At': new Date(c.createdAt).toISOString(),
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(catRows), 'Categories');

  XLSX.writeFile(wb, 'skating-races.xlsx');
}

// ─── JSON Backup ──────────────────────────────────────────────────────────────

export function exportToJSON(races: Race[], categories: RaceCategory[]): void {
  const backup: BackupFile = {
    version: 1,
    exportedAt: new Date().toISOString(),
    races,
    categories,
  };
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
  downloadBlob(blob, `skating-backup-${new Date().toISOString().split('T')[0]}.json`);
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
