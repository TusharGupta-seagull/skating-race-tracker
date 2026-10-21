import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { db } from '@/db';
import { computePersonalBests } from '@/lib/analytics';
import { formatMs } from '@/lib/time';
import { ArrowUpRight, Plus, Award } from 'lucide-react';

const EMPTY_RACES: import('@/types').Race[] = [];
const EMPTY_CATEGORIES: import('@/types').RaceCategory[] = [];

export default function PersonalBests() {
  const races = useLiveQuery(() => db.races.toArray()) ?? EMPTY_RACES;
  const categories = useLiveQuery(() => db.categories.toArray()) ?? EMPTY_CATEGORIES;

  const personalBests = useMemo(
    () => computePersonalBests(races, categories),
    [races, categories]
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* ─── Header ────────────────────────────────────────────────────── */}
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
            Personal Bests
          </h1>
          <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Fastest recorded completion times across all race categories
          </p>
        </div>

        <Link to="/add" className="ent-btn ent-btn-primary">
          <Plus size={12} strokeWidth={2.4} /> Add Race
        </Link>
      </div>

      {/* ─── Personal Bests Grid ────────────────────────────────────────── */}
      {personalBests.length === 0 ? (
        <div
          className="ent-card"
          style={{
            padding: '36px 16px',
            textAlign: 'center',
            color: 'var(--text-secondary)',
          }}
        >
          <Award size={36} color="var(--text-muted)" style={{ margin: '0 auto 10px' }} />
          <p style={{ fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>
            No personal bests recorded
          </p>
          <p style={{ fontSize: '11.5px', marginBottom: '14px' }}>
            Log your speed skating races to establish personal best records for each category.
          </p>
          <Link to="/add" className="ent-btn ent-btn-primary">
            <Plus size={12} /> Add Your First Race
          </Link>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '10px',
          }}
        >
          {personalBests.map((pb) => {
            const delta = pb.previousBestMs !== undefined ? pb.race.skaterTimeMs - pb.previousBestMs : null;

            return (
              <div
                key={pb.categoryId}
                className="ent-card"
                style={{
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '10px',
                  position: 'relative',
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '6px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {pb.categoryName}
                    </span>
                    <span
                      style={{
                        fontSize: '9.5px',
                        backgroundColor: 'var(--surface-secondary)',
                        border: '1px solid var(--border-subtle)',
                        padding: '1px 5px',
                        borderRadius: '4px',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {pb.raceCount} race{pb.raceCount !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div
                    className="time-tabular"
                    style={{
                      fontSize: '24px',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      lineHeight: 1.1,
                      marginBottom: '6px',
                    }}
                  >
                    {formatMs(pb.race.skaterTimeMs)}
                  </div>

                  <div style={{ fontSize: '11.5px', fontWeight: 500, color: 'var(--text-primary)' }}>
                    {pb.race.eventName}
                  </div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', marginTop: '1px' }}>
                    {pb.race.eventDate} · Rank #{pb.race.skaterRank}
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderTop: '1px solid var(--border-subtle)',
                    paddingTop: '8px',
                  }}
                >
                  <div>
                    {delta !== null ? (
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 500,
                          color: delta < 0 ? 'var(--perf-positive)' : 'var(--text-muted)',
                        }}
                      >
                        {delta < 0
                          ? `▲ ${(Math.abs(delta) / 1000).toFixed(2)}s faster than prev`
                          : 'Initial record'}
                      </span>
                    ) : (
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        Baseline PB established
                      </span>
                    )}
                  </div>

                  <Link
                    to={`/race/${pb.race.id}`}
                    className="ent-btn ent-btn-ghost"
                    style={{ height: '22px', padding: '0 6px', fontSize: '10px', gap: '3px' }}
                  >
                    View <ArrowUpRight size={10} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
