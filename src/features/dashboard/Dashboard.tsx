import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useNavigate } from 'react-router-dom';
import { db, raceRepo } from '@/db';
import type { Race } from '@/types';
import { formatMs, timeDelta } from '@/lib/time';
import { ConfirmDialog } from '@/components/ui';
import {
  Plus,
  Info,
  MoreVertical,
  ExternalLink,
  Edit2,
  Trash2,
  ChevronDown,
  Download,
} from 'lucide-react';
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

// ─── Mini Sparkline Bar Chart for KPI Cards ───────────────────────────────────
function MiniSparkline({ values }: { values: number[] }) {
  if (!values || values.length === 0) {
    return (
      <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', height: '24px', opacity: 0.3 }}>
        {[8, 14, 10, 18, 12].map((h, i) => (
          <div
            key={i}
            style={{
              width: '3px',
              height: `${h}px`,
              backgroundColor: '#C4C4C0',
              borderRadius: '1px',
            }}
          />
        ))}
      </div>
    );
  }

  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: '2.5px',
        height: '24px',
        paddingRight: '2px',
      }}
      aria-hidden="true"
    >
      {values.slice(-6).map((val, idx) => {
        const height = Math.max(6, Math.round(((val - min) / range) * 20) + 4);
        return (
          <div
            key={idx}
            style={{
              width: '3.5px',
              height: `${height}px`,
              backgroundColor: idx === values.length - 1 ? '#252525' : '#D4D4D0',
              borderRadius: '1px',
            }}
          />
        );
      })}
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
interface KPICardProps {
  label: string;
  value: React.ReactNode;
  supporting: string;
  sparklineData?: number[];
}

function KPICard({ label, value, supporting, sparklineData }: KPICardProps) {
  return (
    <div
      style={{
        backgroundColor: 'var(--surface-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-card)',
        padding: '10px 12px',
        height: '78px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        boxSizing: 'border-box',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
        <span
          style={{
            fontSize: '9.5px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--text-secondary)',
          }}
        >
          {label}
        </span>
        <div
          style={{
            fontSize: '22px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
          }}
          className="time-tabular"
        >
          {value}
        </div>
        <span
          style={{
            fontSize: '10.5px',
            color: 'var(--text-secondary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '180px',
          }}
        >
          {supporting}
        </span>
      </div>

      <div style={{ alignSelf: 'center' }}>
        <MiniSparkline values={sparklineData ?? []} />
      </div>
    </div>
  );
}

// ─── Clean White Chart Tooltip ────────────────────────────────────────────────
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: {
      date: string;
      timeMs: number;
      eventName: string;
      rank: number;
      deltaMs?: number;
    };
  }>;
}

function EnterpriseChartTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid var(--border)',
        borderRadius: '6px',
        padding: '8px 10px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
        fontSize: '11px',
        color: 'var(--text-primary)',
        minWidth: '140px',
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: '2px' }}>{d.eventName}</div>
      <div style={{ color: 'var(--text-secondary)', fontSize: '10px', marginBottom: '4px' }}>
        {d.date}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
        <span className="time-tabular" style={{ fontSize: '14px', fontWeight: 600 }}>
          {formatMs(d.timeMs)}
        </span>
        <span
          style={{
            fontSize: '9.5px',
            padding: '1px 5px',
            borderRadius: '4px',
            backgroundColor: d.rank <= 3 ? 'var(--rank-gold-bg)' : '#F0F0EE',
            color: d.rank <= 3 ? 'var(--rank-gold-text)' : 'var(--text-secondary)',
            fontWeight: 500,
          }}
        >
          #{d.rank}
        </span>
      </div>
      {d.deltaMs !== undefined && (
        <div
          style={{
            fontSize: '10px',
            marginTop: '4px',
            fontWeight: 500,
            color: d.deltaMs < 0 ? 'var(--perf-positive)' : d.deltaMs > 0 ? 'var(--perf-negative)' : 'var(--text-secondary)',
          }}
        >
          {d.deltaMs < 0
            ? `${(Math.abs(d.deltaMs) / 1000).toFixed(2)}s faster vs prev`
            : d.deltaMs > 0
              ? `${(Math.abs(d.deltaMs) / 1000).toFixed(2)}s slower vs prev`
              : 'Equal to prev'}
        </div>
      )}
    </div>
  );
}

const EMPTY_RACES: Race[] = [];
const EMPTY_CATEGORIES: import('@/types').RaceCategory[] = [];

// ─── Dashboard Component ──────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const [nowMs] = useState(() => Date.now());

  // 1. Data Layer Queries
  const races = useLiveQuery(() => db.races.orderBy('eventDate').toArray()) ?? EMPTY_RACES;
  const categories = useLiveQuery(() => db.categories.toArray()) ?? EMPTY_CATEGORIES;

  // Filter & View State
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedTimeRange, setSelectedTimeRange] = useState<'3M' | '6M' | '1Y' | 'ALL'>('ALL');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [raceToDelete, setRaceToDelete] = useState<Race | null>(null);

  const activeCategories = useMemo(
    () => categories.filter((c) => !c.isArchived).sort((a, b) => a.createdAt - b.createdAt),
    [categories]
  );

  // Set default category once categories load
  const currentCategoryId = useMemo(() => {
    if (selectedCategoryId) return selectedCategoryId;
    if (activeCategories.length > 0) return activeCategories[0].id;
    return '';
  }, [selectedCategoryId, activeCategories]);

  const currentCategory = activeCategories.find((c) => c.id === currentCategoryId);

  // Available Years
  const availableYears = useMemo(() => {
    const set = new Set(races.map((r) => r.eventYear));
    return Array.from(set).sort((a, b) => b - a);
  }, [races]);

  // Filtered Races by Year
  const yearFilteredRaces = useMemo(() => {
    if (selectedYear === 'all') return races;
    const y = parseInt(selectedYear, 10);
    return races.filter((r) => r.eventYear === y);
  }, [races, selectedYear]);

  // ─── KPI Calculations ────────────────────────────────────────────────────────
  // Card 1: TOTAL RACES
  const totalRacesCount = yearFilteredRaces.length;

  // Card 2: PERSONAL BESTS (Number of categories with at least one PB)
  const categoriesWithPBCount = useMemo(() => {
    const catsWithRaces = new Set<string>();
    for (const r of yearFilteredRaces) {
      catsWithRaces.add(r.categoryId);
    }
    return catsWithRaces.size;
  }, [yearFilteredRaces]);

  // Card 3: PODIUM FINISHES (1st, 2nd, 3rd)
  const podiumFinishesCount = useMemo(() => {
    return yearFilteredRaces.filter((r) => r.skaterRank >= 1 && r.skaterRank <= 3).length;
  }, [yearFilteredRaces]);

  // Card 4: LATEST RESULT (in selected category, or overall)
  const latestResult = useMemo(() => {
    const inCat = yearFilteredRaces
      .filter((r) => !currentCategoryId || r.categoryId === currentCategoryId)
      .sort((a, b) => b.eventDate.localeCompare(a.eventDate));
    return inCat[0] ?? null;
  }, [yearFilteredRaces, currentCategoryId]);

  // Sparkline data points (e.g. recent ranks or completion times)
  const recentRanks = useMemo(() => {
    return yearFilteredRaces.slice(-6).map((r) => 10 - Math.min(r.skaterRank, 9));
  }, [yearFilteredRaces]);

  // ─── Left Chart Points ───────────────────────────────────────────────────────
  const chartPoints = useMemo(() => {
    if (!currentCategoryId) return [];

    let catRaces = races
      .filter((r) => r.categoryId === currentCategoryId)
      .sort((a, b) => a.eventDate.localeCompare(b.eventDate));

    // Time range filter
    if (selectedTimeRange !== 'ALL' && catRaces.length > 0) {
      const msMap = { '3M': 90 * 86400000, '6M': 180 * 86400000, '1Y': 365 * 86400000 };
      const cutoffTime = nowMs - (msMap[selectedTimeRange] || 0);
      const cutoffStr = new Date(cutoffTime).toISOString().split('T')[0];
      catRaces = catRaces.filter((r) => r.eventDate >= cutoffStr);
    }

    return catRaces.map((r, idx, arr) => {
      const prev = idx > 0 ? arr[idx - 1] : undefined;
      const deltaMs = prev ? timeDelta(r.skaterTimeMs, prev.skaterTimeMs) : undefined;
      return {
        date: r.eventDate,
        timeMs: r.skaterTimeMs,
        eventName: r.eventName,
        rank: r.skaterRank,
        raceId: r.id,
        deltaMs,
      };
    });
  }, [races, currentCategoryId, selectedTimeRange, nowMs]);

  const bestTimeInCat = useMemo(() => {
    if (chartPoints.length === 0) return null;
    return Math.min(...chartPoints.map((p) => p.timeMs));
  }, [chartPoints]);

  const latestTimeInCat = useMemo(() => {
    if (chartPoints.length === 0) return null;
    return chartPoints[chartPoints.length - 1].timeMs;
  }, [chartPoints]);

  // Y-axis bounds
  const { minMs, maxMs, pad } = useMemo(() => {
    if (chartPoints.length === 0) return { minMs: 0, maxMs: 60000, pad: 1000 };
    const times = chartPoints.map((p) => p.timeMs);
    const min = Math.min(...times);
    const max = Math.max(...times);
    const p = Math.max(500, Math.round((max - min) * 0.15));
    return { minMs: min, maxMs: max, pad: p };
  }, [chartPoints]);

  // ─── Right Category Breakdown Data ──────────────────────────────────────────
  const categoryBreakdownList = useMemo(() => {
    return activeCategories.map((cat) => {
      const catRaces = races
        .filter((r) => r.categoryId === cat.id)
        .sort((a, b) => a.eventDate.localeCompare(b.eventDate));

      if (catRaces.length === 0) {
        return {
          cat,
          pbMs: null,
          latestMs: null,
          diffText: 'No results',
          diffType: 'none' as const,
          count: 0,
        };
      }

      // Fastest time is PB
      const sortedByTime = [...catRaces].sort((a, b) => a.skaterTimeMs - b.skaterTimeMs);
      const pbMs = sortedByTime[0].skaterTimeMs;
      const latest = catRaces[catRaces.length - 1];
      const latestMs = latest.skaterTimeMs;

      let diffText = 'Equal to PB';
      let diffType: 'faster' | 'slower' | 'equal' | 'none' = 'equal';

      if (catRaces.length >= 2) {
        const prev = catRaces[catRaces.length - 2];
        const delta = timeDelta(latestMs, prev.skaterTimeMs);
        if (delta < 0) {
          diffText = `${(Math.abs(delta) / 1000).toFixed(2)}s faster`;
          diffType = 'faster';
        } else if (delta > 0) {
          diffText = `${(Math.abs(delta) / 1000).toFixed(2)}s slower`;
          diffType = 'slower';
        }
      } else if (latestMs === pbMs) {
        diffText = 'Personal Best';
        diffType = 'faster';
      }

      return {
        cat,
        pbMs,
        latestMs,
        diffText,
        diffType,
        count: catRaces.length,
      };
    });
  }, [activeCategories, races]);

  // ─── Delete Race Handler ─────────────────────────────────────────────────────
  const handleDeleteConfirm = async () => {
    if (!raceToDelete) return;
    await raceRepo.delete(raceToDelete.id);
    setRaceToDelete(null);
  };

  // Recent 6 Races
  const recentRaces = useMemo(() => {
    return [...races].sort((a, b) => b.eventDate.localeCompare(a.eventDate)).slice(0, 6);
  }, [races]);

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* ─── PART 5 — PAGE HEADER ────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '2px 0',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h1
            style={{
              fontSize: '20px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              lineHeight: 1.2,
            }}
          >
            Welcome back, Skater
          </h1>
          <span
            style={{
              fontSize: '12px',
              color: 'var(--text-secondary)',
              marginTop: '2px',
            }}
          >
            Your race performance at a glance
          </span>
        </div>

        {/* Right side controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Year selector */}
          <div style={{ position: 'relative' }}>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              aria-label="Filter by Year"
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
              <option value="all">Year: All</option>
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  Year: {yr}
                </option>
              ))}
            </select>
            <ChevronDown
              size={11}
              color="var(--text-secondary)"
              style={{
                position: 'absolute',
                right: '7px',
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
              }}
            />
          </div>

          {/* Export Action */}
          <Link
            to="/export"
            className="ent-btn ent-btn-secondary"
            title="Import & Export data"
          >
            <Download size={12} />
            <span className="hidden sm:inline">Export</span>
          </Link>

          {/* Primary Add Race Button */}
          <Link to="/add" className="ent-btn ent-btn-primary">
            <Plus size={13} strokeWidth={2.4} />
            <span>Add Race</span>
          </Link>
        </div>
      </div>

      {/* ─── PART 6 — FOUR KPI CARDS ─────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '8px',
        }}
      >
        {/* Card 1: TOTAL RACES */}
        <KPICard
          label="TOTAL RACES"
          value={totalRacesCount}
          supporting="Races recorded"
          sparklineData={recentRanks}
        />

        {/* Card 2: PERSONAL BESTS */}
        <KPICard
          label="PERSONAL BESTS"
          value={categoriesWithPBCount}
          supporting="Categories with a PB"
          sparklineData={recentRanks.slice(0, 4)}
        />

        {/* Card 3: PODIUM FINISHES */}
        <KPICard
          label="PODIUM FINISHES"
          value={podiumFinishesCount}
          supporting="Top 3 finishes"
          sparklineData={recentRanks.filter((r) => r >= 7)}
        />

        {/* Card 4: LATEST RESULT */}
        <KPICard
          label="LATEST RESULT"
          value={
            latestResult ? (
              formatMs(latestResult.skaterTimeMs)
            ) : (
              '—'
            )
          }
          supporting={
            latestResult
              ? `${catMap.get(latestResult.categoryId) ?? 'Race'} · ${latestResult.eventDate}`
              : 'No races logged'
          }
          sparklineData={chartPoints.map((p) => p.timeMs)}
        />
      </div>

      {/* ─── PART 7 — TWO-PANEL ANALYTICS GRID ────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '8px',
        }}
        className="analytics-grid"
      >
        {/* ─── PART 8: LEFT ANALYTICS PANEL (RACE PERFORMANCE TREND) ───────── */}
        <div
          className="ent-card"
          style={{
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            flex: 1.8,
            minWidth: 0,
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  fontSize: '10.5px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--text-secondary)',
                }}
              >
                RACE PERFORMANCE TREND
              </span>
              <span title="Shows chronological progression of completion times in this category. Lower time indicates faster speed.">
                <Info size={11} color="var(--text-muted)" style={{ cursor: 'help' }} />
              </span>
            </div>

            <button
              type="button"
              className="ent-btn ent-btn-ghost"
              style={{ width: '22px', height: '22px', padding: 0 }}
              onClick={() => navigate('/trends')}
              title="View full performance trends"
            >
              <MoreVertical size={13} />
            </button>
          </div>

          {/* Chart Controls Toolbar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px',
              borderBottom: '1px solid var(--border-subtle)',
              paddingBottom: '8px',
            }}
          >
            {/* Left: Big Time Metric */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                {bestTimeInCat ? 'Personal Best Time' : 'Completion Time'}
              </span>
              <div
                className="time-tabular"
                style={{
                  fontSize: '20px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  lineHeight: 1.2,
                }}
              >
                {bestTimeInCat ? formatMs(bestTimeInCat) : '—'}
              </div>
            </div>

            {/* Right: Category Selector & Time Range Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {/* Category selector */}
              <div style={{ position: 'relative' }}>
                <select
                  value={currentCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  aria-label="Select Race Category"
                  style={{
                    height: '26px',
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
                  {activeCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={10}
                  color="var(--text-secondary)"
                  style={{
                    position: 'absolute',
                    right: '6px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                  }}
                />
              </div>

              {/* Segmented Time Range */}
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
                    onClick={() => setSelectedTimeRange(range)}
                    style={{
                      height: '22px',
                      padding: '0 6px',
                      fontSize: '10px',
                      fontWeight: selectedTimeRange === range ? 600 : 400,
                      color: selectedTimeRange === range ? 'var(--text-primary)' : 'var(--text-secondary)',
                      backgroundColor: selectedTimeRange === range ? '#FFFFFF' : 'transparent',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      boxShadow: selectedTimeRange === range ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                      transition: 'all 0.1s ease',
                    }}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Chart plotting area */}
          <div style={{ height: '240px', width: '100%', position: 'relative' }}>
            {chartPoints.length < 2 ? (
              <div
                style={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  color: 'var(--text-secondary)',
                  textAlign: 'center',
                  padding: '20px',
                }}
              >
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                  {chartPoints.length === 1 ? '1 race recorded in this category' : 'No race data yet'}
                </span>
                <span style={{ fontSize: '11px', maxWidth: '260px' }}>
                  {chartPoints.length === 1
                    ? 'Add a second race in this category to track your chronological improvement curve.'
                    : 'Add your first race to start tracking progress.'}
                </span>
                <Link
                  to="/add"
                  className="ent-btn ent-btn-secondary"
                  style={{ marginTop: '8px' }}
                >
                  <Plus size={11} /> Add Race
                </Link>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartPoints}
                  margin={{ top: 8, right: 12, bottom: 4, left: -10 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--chart-grid)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    dy={4}
                  />
                  <YAxis
                    domain={[minMs - pad, maxMs + pad]}
                    tickFormatter={(v) => formatMs(v)}
                    tick={{ fill: 'var(--text-secondary)', fontSize: 9.5 }}
                    tickLine={false}
                    axisLine={false}
                    width={64}
                    reversed={true} // lower is faster
                  />
                  <Tooltip content={<EnterpriseChartTooltip />} />
                  {bestTimeInCat !== null && (
                    <ReferenceLine
                      y={bestTimeInCat}
                      stroke="var(--perf-positive)"
                      strokeDasharray="4 2"
                      strokeOpacity={0.7}
                      label={{
                        value: 'PB',
                        fill: 'var(--perf-positive)',
                        fontSize: 9.5,
                        position: 'insideRight',
                      }}
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="timeMs"
                    stroke="#252525"
                    strokeWidth={1.8}
                    dot={{ fill: '#252525', r: 3.5, strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: '#252525' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '10px',
              color: 'var(--text-muted)',
              paddingTop: '2px',
            }}
          >
            <span>↑ Chronological line (lower is faster)</span>
            <span>Category: {currentCategory?.name ?? '—'}</span>
          </div>
        </div>

        {/* ─── PART 9: RIGHT ANALYTICS PANEL (CATEGORY BREAKDOWN) ─────────── */}
        <div
          className="ent-card"
          style={{
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            flex: 0.9,
            minWidth: 0,
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span
              style={{
                fontSize: '10.5px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-secondary)',
              }}
            >
              CATEGORY BREAKDOWN
            </span>
            <Link
              to="/categories"
              style={{
                fontSize: '10px',
                color: 'var(--text-secondary)',
                textDecoration: 'none',
              }}
            >
              Manage →
            </Link>
          </div>

          {/* Selected Category Summary Box */}
          <div
            style={{
              backgroundColor: 'var(--surface-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '7px',
              padding: '10px 12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  color: 'var(--text-secondary)',
                }}
              >
                {currentCategory?.name ?? 'Overview'}
              </span>
              <div
                className="time-tabular"
                style={{
                  fontSize: '18px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  lineHeight: 1.2,
                }}
              >
                {bestTimeInCat ? formatMs(bestTimeInCat) : '—'}
              </div>
              <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                Personal Best
              </span>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                }}
              >
                {chartPoints.length} race{chartPoints.length !== 1 ? 's' : ''}
              </span>
              <div
                style={{
                  fontSize: '9.5px',
                  color: 'var(--text-secondary)',
                  marginTop: '2px',
                }}
              >
                Latest: {latestTimeInCat ? formatMs(latestTimeInCat) : '—'}
              </div>
            </div>
          </div>

          {/* Category List */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              overflowY: 'auto',
              maxHeight: '230px',
            }}
            className="custom-scrollbar"
          >
            {categoryBreakdownList.map((item) => {
              const isSelected = item.cat.id === currentCategoryId;

              return (
                <div
                  key={item.cat.id}
                  onClick={() => setSelectedCategoryId(item.cat.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '7px 9px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? '#FAFAF9' : 'transparent',
                    border: isSelected ? '1px solid var(--border)' : '1px solid transparent',
                    transition: 'background-color 0.1s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--surface-secondary)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span
                      style={{
                        fontSize: '11.5px',
                        fontWeight: isSelected ? 600 : 500,
                        color: 'var(--text-primary)',
                      }}
                    >
                      {item.cat.name}
                    </span>
                    <span style={{ fontSize: '9.5px', color: 'var(--text-secondary)' }}>
                      {item.count} race{item.count !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span
                      className="time-tabular"
                      style={{
                        fontSize: '11.5px',
                        fontWeight: 600,
                        color: item.pbMs ? 'var(--text-primary)' : 'var(--text-muted)',
                      }}
                    >
                      {item.pbMs ? formatMs(item.pbMs) : '—'}
                    </span>
                    <span
                      style={{
                        fontSize: '9.5px',
                        fontWeight: 500,
                        color:
                          item.diffType === 'faster'
                            ? 'var(--perf-positive)'
                            : item.diffType === 'slower'
                              ? 'var(--perf-negative)'
                              : 'var(--text-muted)',
                      }}
                    >
                      {item.diffText}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── PART 10 — RECENT RACES TABLE ─────────────────────────────────── */}
      <div className="ent-card" style={{ overflow: 'hidden' }}>
        {/* Table Panel Header */}
        <div
          style={{
            padding: '10px 14px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <span
            style={{
              fontSize: '10.5px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--text-secondary)',
            }}
          >
            RECENT RACES
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Link
              to="/history"
              style={{
                fontSize: '11px',
                color: 'var(--text-secondary)',
                textDecoration: 'none',
              }}
            >
              View all ({races.length}) →
            </Link>

            <Link to="/add" className="ent-btn ent-btn-primary" style={{ height: '24px', fontSize: '11px' }}>
              <Plus size={11} strokeWidth={2.4} /> Add Race
            </Link>
          </div>
        </div>

        {/* Table Content */}
        {recentRaces.length === 0 ? (
          <div
            style={{
              padding: '32px 16px',
              textAlign: 'center',
              color: 'var(--text-secondary)',
              fontSize: '12px',
            }}
          >
            <p style={{ fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>
              No races recorded yet
            </p>
            <p style={{ marginBottom: '12px' }}>
              Record your first speed skating performance to see recent race records here.
            </p>
            <Link to="/add" className="ent-btn ent-btn-primary">
              <Plus size={12} /> Add Your First Race
            </Link>
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
                {recentRaces.map((race) => {
                  const catName = catMap.get(race.categoryId) ?? 'Unknown';

                  // Rank Badge Restrained Styling
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

                  // Top 3 summary
                  const top3Summary = race.topPerformers
                    .slice(0, 3)
                    .map((p) => `${p.rank}. ${p.name}`)
                    .join(' · ');

                  return (
                    <tr key={race.id}>
                      {/* Event */}
                      <td style={{ fontWeight: 500 }}>
                        <Link
                          to={`/race/${race.id}`}
                          style={{
                            color: 'var(--text-primary)',
                            textDecoration: 'none',
                          }}
                        >
                          {race.eventName}
                        </Link>
                      </td>

                      {/* Date */}
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {race.eventDate}
                      </td>

                      {/* Category */}
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

                      {/* Time */}
                      <td>
                        <span className="time-tabular" style={{ fontWeight: 600 }}>
                          {formatMs(race.skaterTimeMs)}
                        </span>
                      </td>

                      {/* Rank */}
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

                      {/* Top 3 */}
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

                      {/* Actions */}
                      <td style={{ textAlign: 'right', position: 'relative' }}>
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
        onConfirm={handleDeleteConfirm}
        onCancel={() => setRaceToDelete(null)}
      />
    </div>
  );
}
