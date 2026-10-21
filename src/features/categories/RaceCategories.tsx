import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, categoryRepo } from '@/db';
import { Plus, Edit2, Archive, RotateCcw, Check, X } from 'lucide-react';

const EMPTY_CATEGORIES: import('@/types').RaceCategory[] = [];
const EMPTY_RACES: import('@/types').Race[] = [];

export default function RaceCategories() {
  const categories = useLiveQuery(() => db.categories.toArray()) ?? EMPTY_CATEGORIES;
  const races = useLiveQuery(() => db.races.toArray()) ?? EMPTY_RACES;

  const [newCatName, setNewCatName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [error, setError] = useState('');

  const raceCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of races) {
      map.set(r.categoryId, (map.get(r.categoryId) ?? 0) + 1);
    }
    return map;
  }, [races]);

  const activeCategories = categories
    .filter((c) => !c.isArchived)
    .sort((a, b) => a.createdAt - b.createdAt);
  const archivedCategories = categories.filter((c) => c.isArchived);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCatName.trim();
    if (!name) {
      setError('Category name cannot be empty');
      return;
    }
    if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      setError('A category with this name already exists');
      return;
    }

    await categoryRepo.create(name);
    setNewCatName('');
    setError('');
  };

  const handleStartEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditingName(name);
  };

  const handleSaveEdit = async (id: string) => {
    const name = editingName.trim();
    if (!name) {
      setEditingId(null);
      return;
    }
    const isDuplicate = categories.some(
      (c) => c.id !== id && c.name.toLowerCase() === name.toLowerCase()
    );
    if (isDuplicate) {
      alert('A category with this name already exists.');
      return;
    }
    await categoryRepo.rename(id, name);
    setEditingId(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* ─── Header ────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Race Categories
          </h1>
          <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Configure race distances and disciplines. Renaming a category updates display names without affecting historical records.
          </p>
        </div>
      </div>

      {/* ─── Add Category Form ──────────────────────────────────────────── */}
      <div className="ent-card" style={{ padding: '12px 14px' }}>
        <span
          style={{
            fontSize: '10px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--text-secondary)',
            display: 'block',
            marginBottom: '8px',
          }}
        >
          ADD NEW CATEGORY
        </span>
        <form onSubmit={handleAddCategory} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, maxWidth: '320px' }}>
            <input
              type="text"
              value={newCatName}
              onChange={(e) => {
                setNewCatName(e.target.value);
                if (error) setError('');
              }}
              placeholder="e.g. 1500m, Relay, Elimination..."
              className="ent-input"
            />
            {error && (
              <span style={{ fontSize: '10.5px', color: 'var(--perf-negative)', display: 'block', marginTop: '3px' }}>
                {error}
              </span>
            )}
          </div>
          <button type="submit" className="ent-btn ent-btn-primary">
            <Plus size={12} strokeWidth={2.4} /> Add Category
          </button>
        </form>
      </div>

      {/* ─── Active Categories Table ────────────────────────────────────── */}
      <div className="ent-card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--text-secondary)',
            }}
          >
            ACTIVE CATEGORIES ({activeCategories.length})
          </span>
        </div>

        <table className="ent-table">
          <thead>
            <tr>
              <th style={{ width: '45%' }}>CATEGORY NAME</th>
              <th style={{ width: '25%' }}>RECORDED RACES</th>
              <th style={{ width: '30%', textAlign: 'right' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {activeCategories.map((cat) => {
              const count = raceCounts.get(cat.id) ?? 0;
              const isEditing = editingId === cat.id;

              return (
                <tr key={cat.id}>
                  <td>
                    {isEditing ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSaveEdit(cat.id);
                            } else if (e.key === 'Escape') {
                              e.preventDefault();
                              setEditingId(null);
                            }
                          }}
                          className="ent-input"
                          style={{ height: '24px', maxWidth: '200px' }}
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(cat.id)}
                          className="ent-btn ent-btn-primary"
                          style={{ height: '24px', padding: '0 6px' }}
                        >
                          <Check size={11} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="ent-btn ent-btn-ghost"
                          style={{ height: '24px', padding: '0 6px' }}
                        >
                          <X size={11} />
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontWeight: 500, fontSize: '12px' }}>{cat.name}</span>
                    )}
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>
                    {count} race{count !== 1 ? 's' : ''}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        type="button"
                        onClick={() => handleStartEdit(cat.id, cat.name)}
                        className="ent-btn ent-btn-ghost"
                        style={{ height: '24px', padding: '0 6px', fontSize: '11px' }}
                        title="Rename Category"
                      >
                        <Edit2 size={11} /> Rename
                      </button>
                      <button
                        type="button"
                        onClick={() => categoryRepo.archive(cat.id)}
                        className="ent-btn ent-btn-ghost"
                        style={{ height: '24px', padding: '0 6px', fontSize: '11px' }}
                        title="Archive Category"
                      >
                        <Archive size={11} /> Archive
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ─── Archived Categories ────────────────────────────────────────── */}
      {archivedCategories.length > 0 && (
        <div className="ent-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-secondary)',
              }}
            >
              ARCHIVED CATEGORIES ({archivedCategories.length})
            </span>
          </div>

          <table className="ent-table">
            <thead>
              <tr>
                <th style={{ width: '45%' }}>CATEGORY NAME</th>
                <th style={{ width: '25%' }}>RECORDED RACES</th>
                <th style={{ width: '30%', textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {archivedCategories.map((cat) => (
                <tr key={cat.id} style={{ opacity: 0.75 }}>
                  <td style={{ color: 'var(--text-secondary)' }}>{cat.name}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>
                    {raceCounts.get(cat.id) ?? 0} races
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={() => categoryRepo.restore(cat.id)}
                      className="ent-btn ent-btn-secondary"
                      style={{ height: '24px', padding: '0 6px', fontSize: '11px' }}
                    >
                      <RotateCcw size={11} /> Restore
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
