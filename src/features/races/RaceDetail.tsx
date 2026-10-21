import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, raceRepo } from '@/db';
import { formatMs, timeDelta } from '@/lib/time';
import { computePersonalBests } from '@/lib/analytics';
import { Spinner, ConfirmDialog } from '@/components/ui';
import { Edit2, Trash2, ArrowLeft, Trophy } from 'lucide-react';
import type { Race } from '@/types';

export default function RaceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const categories = useLiveQuery(() => db.categories.toArray(), []) ?? [];
  const allRaces = useLiveQuery(() => db.races.toArray(), []) ?? [];
  const [race, setRace] = useState<Race | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!id) return;
    raceRepo.getById(id).then((r) => {
      setRace(r ?? null);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
        <Spinner size={24} />
      </div>
    );
  }

  if (!race) {
    return (
      <div className="ent-card" style={{ padding: '24px', textAlign: 'center' }}>
        <p style={{ color: 'var(--perf-negative)', fontSize: '13px', marginBottom: '12px' }}>
          Race record not found.
        </p>
        <Link to="/history" className="ent-btn ent-btn-secondary">
          <ArrowLeft size={12} /> Back to History
        </Link>
      </div>
    );
  }

  const cat = categories.find((c) => c.id === race.categoryId);

  // Check if personal best in category
  const pbs = computePersonalBests(allRaces, categories);
  const isPB = pbs.some((pb) => pb.categoryId === race.categoryId && pb.race.id === race.id);

  // Comparison to previous race in same category
  const catRaces = allRaces
    .filter((r) => r.categoryId === race.categoryId)
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  const myIdx = catRaces.findIndex((r) => r.id === race.id);
  const prevRace = myIdx > 0 ? catRaces[myIdx - 1] : null;
  const delta = prevRace ? timeDelta(race.skaterTimeMs, prevRace.skaterTimeMs) : null;

  const handleDelete = async () => {
    await raceRepo.delete(race.id);
    navigate('/history');
  };

  return (
    <div style={{ maxWidth: '680px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* ─── Back + Actions ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
        <button
          type="button"
          className="ent-btn ent-btn-ghost"
          onClick={() => navigate(-1)}
          style={{ gap: '4px' }}
        >
          <ArrowLeft size={12} /> Back
        </button>

        <div style={{ display: 'flex', gap: '6px' }}>
          <Link to={`/race/${race.id}/edit`} className="ent-btn ent-btn-secondary">
            <Edit2 size={11} /> Edit
          </Link>
          <button
            type="button"
            className="ent-btn ent-btn-danger"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 size={11} /> Delete
          </button>
        </div>
      </div>

      {/* ─── Title & Header ─────────────────────────────────────────────── */}
      <div className="ent-card" style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
          <h1 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {race.eventName}
          </h1>
          {isPB && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                padding: '1px 6px',
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: 600,
                backgroundColor: 'var(--rank-gold-bg)',
                color: 'var(--rank-gold-text)',
                border: '1px solid var(--rank-gold-border)',
              }}
            >
              <Trophy size={11} /> Personal Best
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', color: 'var(--text-secondary)', fontSize: '11.5px' }}>
          <span>{race.eventDate}</span>
          <span>·</span>
          <span>Season {race.eventYear}</span>
          <span>·</span>
          <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
            {cat?.name ?? race.categoryId}
          </span>
        </div>
      </div>

      {/* ─── Result Metrics Card ────────────────────────────────────────── */}
      <div className="ent-card" style={{ padding: '14px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-secondary)',
                display: 'block',
                marginBottom: '2px',
              }}
            >
              COMPLETION TIME
            </span>
            <div
              className="time-tabular"
              style={{ fontSize: '28px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.1 }}
            >
              {formatMs(race.skaterTimeMs)}
            </div>
          </div>

          <div>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-secondary)',
                display: 'block',
                marginBottom: '2px',
              }}
            >
              FINISHING RANK
            </span>
            <div style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {race.skaterRank === 1
                ? '1st Place'
                : race.skaterRank === 2
                  ? '2nd Place'
                  : race.skaterRank === 3
                    ? '3rd Place'
                    : `#${race.skaterRank}`}
            </div>
          </div>
        </div>

        {delta !== null && (
          <div
            style={{
              marginTop: '12px',
              paddingTop: '10px',
              borderTop: '1px solid var(--border-subtle)',
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ color: 'var(--text-secondary)' }}>
              vs previous race ({prevRace!.eventName}):
            </span>
            <span
              style={{
                fontWeight: 600,
                color: delta < 0 ? 'var(--perf-positive)' : delta > 0 ? 'var(--perf-negative)' : 'var(--text-secondary)',
              }}
            >
              {delta < 0
                ? `▲ ${(Math.abs(delta) / 1000).toFixed(2)}s faster`
                : delta > 0
                  ? `▼ ${(delta / 1000).toFixed(2)}s slower`
                  : 'Identical time'}
            </span>
          </div>
        )}
      </div>

      {/* ─── Top Performers ─────────────────────────────────────────────── */}
      {race.topPerformers.length > 0 && (
        <div className="ent-card" style={{ padding: '14px 16px' }}>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--text-secondary)',
              display: 'block',
              marginBottom: '10px',
            }}
          >
            PODIUM / TOP PERFORMERS
          </span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[...race.topPerformers]
              .sort((a, b) => a.rank - b.rank)
              .map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '6px 8px',
                    borderRadius: '5px',
                    backgroundColor: 'var(--surface-secondary)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        padding: '1px 5px',
                        borderRadius: '3px',
                        backgroundColor: p.rank === 1 ? 'var(--rank-gold-bg)' : p.rank === 2 ? 'var(--rank-silver-bg)' : 'var(--rank-bronze-bg)',
                        color: p.rank === 1 ? 'var(--rank-gold-text)' : p.rank === 2 ? 'var(--rank-silver-text)' : 'var(--rank-bronze-text)',
                      }}
                    >
                      #{p.rank}
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 500 }}>{p.name}</span>
                  </div>
                  <span className="time-tabular" style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 500 }}>
                    {formatMs(p.timeMs)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ─── Notes ──────────────────────────────────────────────────────── */}
      {race.notes && (
        <div className="ent-card" style={{ padding: '14px 16px' }}>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--text-secondary)',
              display: 'block',
              marginBottom: '6px',
            }}
          >
            TACTICAL & RACE NOTES
          </span>
          <p style={{ fontSize: '12px', color: 'var(--text-primary)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
            {race.notes}
          </p>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        open={confirmDelete}
        title="Delete Race Record"
        description={`Are you sure you want to delete ${race.eventName}? This action cannot be undone.`}
        confirmLabel="Delete Race"
        cancelLabel="Cancel"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
