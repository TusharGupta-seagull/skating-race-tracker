import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { formatMs, timeDelta } from '@/lib/time';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import { ChevronDown, TrendingUp, Info } from 'lucide-react';

const EMPTY_RACES: import('@/types').Race[] = [];
const EMPTY_CATEGORIES: import('@/types').RaceCategory[] = [];

export default function PerformanceTrends() {
  const [nowMs] = useState(() => Date.now());
  const races = useLiveQuery(() => db.races.orderBy('eventDate').toArray()) ?? EMPTY_RACES;
  const categories = useLiveQuery(() => db.categories.toArray()) ?? EMPTY_CATEGORIES;

  const activeCategories = useMemo(
    () => categories.filter((c) => !c.isArchived).sort((a, b) => a.createdAt - b.createdAt),
    [categories]
  );

  const [selectedCatId, setSelectedCatId] = useState<string>('');
  const [timeRange, setTimeRange] = useState<'3M' | '6M' | '1Y' | 'ALL'>('ALL');

  const currentCatId = useMemo(() => {
    if (selectedCatId) return selectedCatId;
    if (activeCategories.length > 0) return activeCategories[0].id;
    return '';
  }, [selectedCatId, activeCategories]);

  const currentCategory = activeCategories.find((c) => c.id === currentCatId);

  // Filtered races for category & date range
  const { catRaces, chartPoints } = useMemo(() => {
    if (!currentCatId) return { catRaces: [], chartPoints: [] };

    let filtered = races
      .filter((r) => r.categoryId === currentCatId)
      .sort((a, b) => a.eventDate.localeCompare(b.eventDate));

    if (timeRange !== 'ALL' && filtered.length > 0) {
      const msMap = { '3M': 90 * 86400000, '6M': 180 * 86400000, '1Y': 365 * 86400000 };
      const cutoffTime = nowMs - (msMap[timeRange] || 0);
      const cutoffStr = new Date(cutoffTime).toISOString().split('T')[0];
      filtered = filtered.filter((r) => r.eventDate >= cutoffStr);
    }

    const points = filtered.map((r, idx, arr) => {
      const prev = idx > 0 ? arr[idx - 1] : undefined;
      const deltaMs = prev ? timeDelta(r.skaterTimeMs, prev.skaterTimeMs) : undefined;
      return {
        date: r.eventDate,
        timeMs: r.skaterTimeMs,
        eventName: r.eventName,
        rank: r.skaterRank,
        deltaMs,
      };
    });

    return { catRaces: filtered, chartPoints: points };
  }, [races, currentCatId, timeRange, nowMs]);

  // Analytical Metrics for category
  const stats = useMemo(() => {
    if (catRaces.length === 0) return null;
    const times = catRaces.map((r) => r.skaterTimeMs).sort((a, b) => a - b);
    const pb = times[0];
    const avg = Math.round(times.reduce((s, t) => s + t, 0) / times.length);
    const mid = Math.floor(times.length / 2);
    const median = times.length % 2 !== 0 ? times[mid] : Math.round((times[mid - 1] + times[mid]) / 2);
    const pod = catRaces.filter((r) => r.skaterRank <= 3).length;

    let maxImprovement = 0;
    for (let i = 1; i < catRaces.length; i++) {
      const d = catRaces[i - 1].skaterTimeMs - catRaces[i].skaterTimeMs;
      if (d > maxImprovement) maxImprovement = d;
    }

    return { pb, avg, median, pod, total: catRaces.length, maxImprovement };
  }, [catRaces]);

  const { minMs, maxMs, pad } = useMemo(() => {
    if (chartPoints.length === 0) return { minMs: 0, maxMs: 60000, pad: 1000 };
    const times = chartPoints.map((p) => p.timeMs);
    const min = Math.min(...times);
    const max = Math.max(...times);
    const p = Math.max(500, Math.round((max - min) * 0.15));
    return { minMs: min, maxMs: max, pad: p };
  }, [chartPoints]);

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
            Performance Trends
          </h1>
          <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Detailed time progression analysis and speed improvement curves
          </p>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Category Dropdown */}
          <div style={{ position: 'relative' }}>
            <select
              value={currentCatId}
              onChange={(e) => setSelectedCatId(e.target.value)}
              aria-label="Category Selection"
              style={{
                height: '28px',
                padding: '0 22px 0 8px',
                fontSize: '11.5px',
                color: 'var(--text-primary)',
                backgroundColor: '#FAFAF9',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-control)',
                outline: 'none',
                appearance: 'none',
                cursor: 'pointer',
              }}
            >
              {activeCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <ChevronDown
              size={10}
              color="var(--text-secondary)"
              style={{ position: 'absolute', right: '7px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
            />
          </div>

          {/* Time Range Pills */}
          <div
            style={{
              display: 'flex',
              backgroundColor: '#FAFAF9',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-control)',
              padding: '1px',
            }}
          >
            {(['3M', '6M', '1Y', 'ALL'] as const).map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setTimeRange(range)}
                style={{
                  height: '24px',
                  padding: '0 8px',
                  fontSize: '10.5px',
                  fontWeight: timeRange === range ? 600 : 400,
                  color: timeRange === range ? 'var(--text-primary)' : 'var(--text-secondary)',
                  backgroundColor: timeRange === range ? '#FFFFFF' : 'transparent',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  boxShadow: timeRange === range ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                }}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Category Metrics Row ───────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '8px',
        }}
      >
        <div className="ent-card" style={{ padding: '10px 12px' }}>
          <span style={{ fontSize: '9.5px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
            PERSONAL BEST
          </span>
          <div className="time-tabular" style={{ fontSize: '20px', fontWeight: 600, marginTop: '2px' }}>
            {stats ? formatMs(stats.pb) : '—'}
          </div>
          <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
            {currentCategory?.name ?? 'Category'} record
          </span>
        </div>

        <div className="ent-card" style={{ padding: '10px 12px' }}>
          <span style={{ fontSize: '9.5px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
            AVERAGE TIME
          </span>
          <div className="time-tabular" style={{ fontSize: '20px', fontWeight: 600, marginTop: '2px' }}>
            {stats ? formatMs(stats.avg) : '—'}
          </div>
          <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
            Median: {stats ? formatMs(stats.median) : '—'}
          </span>
        </div>

        <div className="ent-card" style={{ padding: '10px 12px' }}>
          <span style={{ fontSize: '9.5px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
            PODIUM RATE
          </span>
          <div style={{ fontSize: '20px', fontWeight: 600, marginTop: '2px' }}>
            {stats && stats.total > 0
              ? `${Math.round((stats.pod / stats.total) * 100)}%`
              : '—'}
          </div>
          <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
            {stats ? `${stats.pod} of ${stats.total} races` : 'No races'}
          </span>
        </div>

        <div className="ent-card" style={{ padding: '10px 12px' }}>
          <span style={{ fontSize: '9.5px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
            MAX IMPROVEMENT
          </span>
          <div style={{ fontSize: '20px', fontWeight: 600, marginTop: '2px', color: stats?.maxImprovement ? 'var(--perf-positive)' : 'inherit' }}>
            {stats?.maxImprovement ? `▲ ${(stats.maxImprovement / 1000).toFixed(2)}s` : '—'}
          </div>
          <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
            Single race improvement
          </span>
        </div>
      </div>

      {/* ─── Large Analytical Chart ─────────────────────────────────────── */}
      <div className="ent-card" style={{ padding: '14px 16px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-secondary)',
              }}
            >
              {currentCategory?.name ?? 'Category'} Progression Curve
            </span>
            <span title="Chronological completion times. Lower line indicates faster performance.">
              <Info size={11} color="var(--text-muted)" style={{ cursor: 'help' }} />
            </span>
          </div>

          <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
            {chartPoints.length} points plotted
          </span>
        </div>

        <div style={{ height: '300px', width: '100%' }}>
          {chartPoints.length < 2 ? (
            <div
              style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)',
                fontSize: '12px',
                gap: '4px',
              }}
            >
              <TrendingUp size={32} color="var(--text-muted)" style={{ marginBottom: '6px' }} />
              <p style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                Insufficient data for trend curve
              </p>
              <p style={{ fontSize: '11px' }}>
                Add at least two races in <strong>{currentCategory?.name ?? 'this category'}</strong> to visualize improvement.
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartPoints} margin={{ top: 10, right: 16, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: 'var(--text-secondary)', fontSize: 10.5 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  domain={[minMs - pad, maxMs + pad]}
                  tickFormatter={(v) => formatMs(v)}
                  tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  width={68}
                  reversed={true}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null;
                    const d = payload[0].payload;
                    return (
                      <div
                        style={{
                          backgroundColor: '#FFFFFF',
                          border: '1px solid var(--border)',
                          borderRadius: '6px',
                          padding: '8px 10px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                          fontSize: '11px',
                        }}
                      >
                        <div style={{ fontWeight: 600 }}>{d.eventName}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>{d.date}</div>
                        <div className="time-tabular" style={{ fontSize: '14px', fontWeight: 600, marginTop: '2px' }}>
                          {formatMs(d.timeMs)}
                        </div>
                        {d.deltaMs !== undefined && (
                          <div
                            style={{
                              fontSize: '10px',
                              fontWeight: 500,
                              marginTop: '2px',
                              color: d.deltaMs < 0 ? 'var(--perf-positive)' : 'var(--perf-negative)',
                            }}
                          >
                            {d.deltaMs < 0
                              ? `▲ ${(Math.abs(d.deltaMs) / 1000).toFixed(2)}s faster than prev`
                              : `▼ ${(Math.abs(d.deltaMs) / 1000).toFixed(2)}s slower than prev`}
                          </div>
                        )}
                      </div>
                    );
                  }}
                />
                {stats && (
                  <ReferenceLine
                    y={stats.pb}
                    stroke="var(--perf-positive)"
                    strokeDasharray="4 2"
                    label={{ value: 'PB', fill: 'var(--perf-positive)', fontSize: 10 }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="timeMs"
                  stroke="#252525"
                  strokeWidth={2}
                  dot={{ fill: '#252525', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
