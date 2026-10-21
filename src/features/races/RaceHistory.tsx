import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useSearchParams } from 'react-router-dom';
import { db, raceRepo } from '@/db';
import type { Race } from '@/types';
import { formatMs } from '@/lib/time';
import { ConfirmDialog } from '@/components/ui';
import {
  Plus,
  Search,
  X,
  ExternalLink,
  Edit2,
  Trash2,
  ChevronDown,
  Download,
} from 'lucide-react';

const EMPTY_RACES: Race[] = [];
const EMPTY_CATEGORIES: import('@/types').RaceCategory[] = [];

export default function RaceHistory() {
  const [searchParams] = useSearchParams();
  const races = useLiveQuery(() => db.races.toArray()) ?? EMPTY_RACES;
  const categories = useLiveQuery(() => db.categories.toArray()) ?? EMPTY_CATEGORIES;

  const queryParam = searchParams.get('q') ?? '';
  const [search, setSearch] = useState(queryParam);
  const [prevQueryParam, setPrevQueryParam] = useState(queryParam);

  // Synchronize state when URL query parameter changes
  if (queryParam !== prevQueryParam) {
    setPrevQueryParam(queryParam);
    setSearch(queryParam);
  }

  const [filterYear, setFilterYear] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'fastest'>('newest');
  const [raceToDelete, setRaceToDelete] = useState<Race | null>(null);

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);

  const years = useMemo(() => {
    const ys = [...new Set(races.map((r) => r.eventYear))].sort((a, b) => b - a);
    return ys;
  }, [races]);

  const filtered = useMemo(() => {
    let list = [...races];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) => {
        const ev = r.eventName.toLowerCase().includes(q);
        const nt = r.notes?.toLowerCase().includes(q);
        const cat = catMap.get(r.categoryId)?.toLowerCase().includes(q);
        return ev || nt || cat;
      });
    }
    if (filterYear) {
      list = list.filter((r) => r.eventYear === Number(filterYear));
    }
    if (filterCat) {
      list = list.filter((r) => r.categoryId === filterCat);
    }

    if (sort === 'newest') {
      list.sort((a, b) => b.eventDate.localeCompare(a.eventDate));
    } else if (sort === 'oldest') {
      list.sort((a, b) => a.eventDate.localeCompare(b.eventDate));
    } else if (sort === 'fastest') {
      list.sort((a, b) => a.skaterTimeMs - b.skaterTimeMs);
    }

    return list;
  }, [races, search, filterYear, filterCat, sort, catMap]);

  const hasFilters = search || filterYear || filterCat;
  const clearFilters = () => {
    setSearch('');
    setFilterYear('');
    setFilterCat('');
  };

  const handleDelete = async () => {
    if (!raceToDelete) return;
    await raceRepo.delete(raceToDelete.id);
    setRaceToDelete(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* ─── Compact Page Header ────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Race History
          </h1>
          <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {races.length} total race records stored locally
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link to="/export" className="ent-btn ent-btn-secondary">
            <Download size={12} />
            <span>Export</span>
          </Link>
          <Link to="/add" className="ent-btn ent-btn-primary">
            <Plus size={12} strokeWidth={2.4} />
            <span>Add Race</span>
          </Link>
        </div>
      </div>

      {/* ─── Filter & Search Toolbar ────────────────────────────────────── */}
      <div
        className="ent-card"
        style={{
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '220px' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', width: '220px', maxWidth: '100%' }}>
            <Search
              size={12}
              color="var(--text-muted)"
              style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search event name..."
              className="ent-input"
              style={{ paddingLeft: '26px', height: '28px' }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute',
                  right: '6px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  color: 'var(--text-muted)',
                }}
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div style={{ position: 'relative' }}>
            <select
              value={filterCat}
              onChange={(e) => setFilterCat(e.target.value)}
              aria-label="Filter by Category"
              style={{
                height: '28px',
                padding: '0 20px 0 8px',
                fontSize: '11px',
                color: 'var(--text-primary)',
                backgroundColor: '#FAFAF9',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-control)',
                outline: 'none',
                appearance: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <ChevronDown
              size={10}
              color="var(--text-secondary)"
              style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
            />
          </div>

          {/* Year Filter */}
          <div style={{ position: 'relative' }}>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              aria-label="Filter by Year"
              style={{
                height: '28px',
                padding: '0 20px 0 8px',
                fontSize: '11px',
                color: 'var(--text-primary)',
                backgroundColor: '#FAFAF9',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-control)',
                outline: 'none',
                appearance: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="">All Years</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <ChevronDown
              size={10}
              color="var(--text-secondary)"
              style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
            />
          </div>

          {/* Clear Filters */}
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="ent-btn ent-btn-ghost"
              style={{ height: '28px', fontSize: '11px', gap: '3px' }}
            >
              <X size={11} /> Clear
            </button>
          )}
        </div>

        {/* Sort Select */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Sort:</span>
          <div style={{ position: 'relative' }}>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as any)}
              aria-label="Sort races"
              style={{
                height: '28px',
                padding: '0 20px 0 8px',
                fontSize: '11px',
                color: 'var(--text-primary)',
                backgroundColor: '#FAFAF9',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-control)',
                outline: 'none',
                appearance: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="newest">Date: Newest First</option>
              <option value="oldest">Date: Oldest First</option>
              <option value="fastest">Time: Fastest First</option>
            </select>
            <ChevronDown
              size={10}
              color="var(--text-secondary)"
              style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
            />
          </div>
        </div>
      </div>

      {/* ─── Table Panel ────────────────────────────────────────────────── */}
      <div className="ent-card" style={{ overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <p style={{ fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>
              {hasFilters ? 'No races match your filters' : 'No race records yet'}
            </p>
            <p style={{ fontSize: '11.5px', marginBottom: '14px' }}>
              {hasFilters ? 'Try adjusting your search query or selected category.' : 'Add your first race to start tracking.'}
            </p>
            {hasFilters ? (
              <button type="button" onClick={clearFilters} className="ent-btn ent-btn-secondary">
                Reset Filters
              </button>
            ) : (
              <Link to="/add" className="ent-btn ent-btn-primary">
                <Plus size={12} /> Add Race
              </Link>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }} className="custom-scrollbar">
            <table className="ent-table">
              <thead>
                <tr>
                  <th style={{ width: '28%' }}>EVENT</th>
                  <th style={{ width: '13%' }}>DATE</th>
                  <th style={{ width: '15%' }}>CATEGORY</th>
                  <th style={{ width: '14%' }}>SKATER TIME</th>
                  <th style={{ width: '10%' }}>RANK</th>
                  <th style={{ width: '15%' }}>TOP 3</th>
                  <th style={{ width: '5%', textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((race) => {
                  const catName = catMap.get(race.categoryId) ?? 'Unknown';

                  // Rank Badge
                  let rankBg = '#F4F4F5';
                  let rankColor = '#71717A';
                  let rankBorder = 'transparent';
                  if (race.skaterRank === 1) {
                    rankBg = 'var(--rank-gold-bg)';
                    rankColor = 'var(--rank-gold-text)';
                    rankBorder = 'var(--rank-gold-border)';
                  } else if (race.skaterRank === 2) {
                    rankBg = 'var(--rank-silver-bg)';
                    rankColor = 'var(--rank-silver-text)';
                    rankBorder = 'var(--rank-silver-border)';
                  } else if (race.skaterRank === 3) {
                    rankBg = 'var(--rank-bronze-bg)';
                    rankColor = 'var(--rank-bronze-text)';
                    rankBorder = 'var(--rank-bronze-border)';
                  }

                  const top3Summary = race.topPerformers
                    .slice(0, 3)
                    .map((p) => `${p.rank}. ${p.name}`)
                    .join(' · ');

                  return (
                    <tr key={race.id}>
                      <td style={{ fontWeight: 500 }}>
                        <Link
                          to={`/race/${race.id}`}
                          style={{ color: 'var(--text-primary)', textDecoration: 'none' }}
                        >
                          {race.eventName}
                        </Link>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{race.eventDate}</td>
                      <td>
                        <span
                          style={{
                            backgroundColor: 'var(--surface-secondary)',
                            border: '1px solid var(--border-subtle)',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontSize: '10.5px',
                          }}
                        >
                          {catName}
                        </span>
                      </td>
                      <td>
                        <span className="time-tabular" style={{ fontWeight: 600 }}>
                          {formatMs(race.skaterTimeMs)}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: 600,
                            backgroundColor: rankBg,
                            color: rankColor,
                            border: `1px solid ${rankBorder}`,
                          }}
                        >
                          {race.skaterRank === 1
                            ? '1st'
                            : race.skaterRank === 2
                              ? '2nd'
                              : race.skaterRank === 3
                                ? '3rd'
                                : `${race.skaterRank}th`}
                        </span>
                      </td>
                      <td
                        style={{
                          color: 'var(--text-secondary)',
                          fontSize: '10.5px',
                          maxWidth: '180px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {top3Summary || '—'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <Link
                            to={`/race/${race.id}`}
                            className="ent-btn ent-btn-ghost"
                            style={{ width: '24px', height: '24px', padding: 0 }}
                            title="View Race"
                          >
                            <ExternalLink size={11} />
                          </Link>
                          <Link
                            to={`/race/${race.id}/edit`}
                            className="ent-btn ent-btn-ghost"
                            style={{ width: '24px', height: '24px', padding: 0 }}
                            title="Edit Race"
                          >
                            <Edit2 size={11} />
                          </Link>
                          <button
                            type="button"
                            className="ent-btn ent-btn-ghost"
                            style={{ width: '24px', height: '24px', padding: 0 }}
                            onClick={() => setRaceToDelete(race)}
                            title="Delete Race"
                          >
                            <Trash2 size={11} color="var(--perf-negative)" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        open={Boolean(raceToDelete)}
        title="Delete Race Record"
        description={`Are you sure you want to delete ${raceToDelete?.eventName ?? ''} (${raceToDelete?.eventDate ?? ''})? This action cannot be undone.`}
        confirmLabel="Delete Race"
        cancelLabel="Cancel"
        danger
        onConfirm={handleDelete}
        onCancel={() => setRaceToDelete(null)}
      />
    </div>
  );
}
