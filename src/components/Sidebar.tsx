import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  History,
  Trophy,
  TrendingUp,
  PlusCircle,
  Tag,
  FileSpreadsheet,
  Settings,
  HardDrive,
  Timer,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { GoogleDriveIcon } from '@/components/icons/GoogleIcons';
import { useSync } from '@/context/SyncContext';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'MAIN MENU',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/history', label: 'Race History', icon: History },
      { to: '/bests', label: 'Personal Bests', icon: Trophy },
      { to: '/trends', label: 'Performance Trends', icon: TrendingUp },
    ],
  },
  {
    label: 'RACE MANAGEMENT',
    items: [
      { to: '/add', label: 'Add Race', icon: PlusCircle },
      { to: '/categories', label: 'Race Categories', icon: Tag },
    ],
  },
  {
    label: 'DATA',
    items: [
      { to: '/export', label: 'Import & Export', icon: FileSpreadsheet },
      { to: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

function formatTimeAgo(timestamp: number | null): string {
  if (!timestamp) return 'Ready';
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

export function Sidebar({ onCloseMobile }: { onCloseMobile?: () => void }) {
  const { pathname } = useLocation();
  const { isSignedIn, syncStatus, lastSyncedAt } = useSync();

  const isItemActive = (to: string) => {
    if (to === '/') return pathname === '/';
    return pathname.startsWith(to);
  };

  return (
    <aside
      aria-label="Application sidebar"
      style={{
        width: 'var(--sidebar-w)',
        height: '100%',
        backgroundColor: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '10px',
        boxSizing: 'border-box',
        userSelect: 'none',
        flexShrink: 0,
      }}
    >
      {/* ─── 3.2 Application Identity Block ─────────────────────────────────── */}
      <Link
        to="/"
        onClick={onCloseMobile}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          height: '46px',
          padding: '0 10px',
          borderRadius: '9px',
          backgroundColor: '#F8F8F6',
          border: '1px solid var(--border)',
          textDecoration: 'none',
          marginBottom: '14px',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '6px',
            backgroundColor: '#202020',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Timer size={13} strokeWidth={2.2} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <span
            style={{
              fontSize: '11.5px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              lineHeight: 1.2,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              letterSpacing: '-0.01em',
            }}
          >
            Skating Race Tracker
          </span>
          <span
            style={{
              fontSize: '9.5px',
              color: 'var(--text-secondary)',
              lineHeight: 1.2,
            }}
          >
            Performance Tracker
          </span>
        </div>
      </Link>

      {/* ─── 3.3 Navigation Groups ──────────────────────────────────────────── */}
      <nav
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          flex: 1,
          overflowY: 'auto',
        }}
        className="custom-scrollbar"
      >
        {NAV_GROUPS.map((group, gIdx) => (
          <div key={group.label} style={{ display: 'flex', flexDirection: 'column' }}>
            {gIdx > 0 && (
              <div
                style={{
                  height: '1px',
                  backgroundColor: 'var(--border-subtle)',
                  margin: '0 4px 12px',
                }}
              />
            )}
            <span
              style={{
                fontSize: '9.5px',
                fontWeight: 600,
                color: 'var(--text-muted)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                padding: '0 8px',
                marginBottom: '5px',
              }}
            >
              {group.label}
            </span>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {group.items.map((item) => {
                const active = isItemActive(item.to);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={onCloseMobile}
                    aria-current={active ? 'page' : undefined}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      height: '29px',
                      padding: '0 9px',
                      borderRadius: 'var(--radius-nav)',
                      textDecoration: 'none',
                      fontSize: '11.5px',
                      fontWeight: active ? 600 : 400,
                      color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                      backgroundColor: active ? '#FFFFFF' : 'transparent',
                      border: active ? '1px solid var(--border)' : '1px solid transparent',
                      boxShadow: active ? 'var(--shadow-active-nav)' : 'none',
                      transition: 'background-color 0.1s ease, color 0.1s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        e.currentTarget.style.backgroundColor = 'var(--surface-secondary)';
                        e.currentTarget.style.color = 'var(--text-primary)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = 'var(--text-secondary)';
                      }
                    }}
                  >
                    <Icon
                      size={13}
                      strokeWidth={active ? 2.2 : 1.8}
                      color={active ? 'var(--text-primary)' : 'var(--text-secondary)'}
                    />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ─── 3.5 Sidebar Bottom Area: Drive Status & Local Storage ───────── */}
      <div
        style={{
          marginTop: 'auto',
          paddingTop: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        {/* Google Drive Status Button */}
        <Link
          to="/settings"
          onClick={onCloseMobile}
          title={
            !isSignedIn
              ? 'Google Drive not connected. Click to open Settings and connect.'
              : syncStatus === 'syncing'
              ? 'Syncing race data with Google Drive...'
              : `Google Drive connected. Last synced: ${lastSyncedAt ? new Date(lastSyncedAt).toLocaleTimeString() : 'Ready'}`
          }
          style={{
            height: '38px',
            backgroundColor: '#F8F8F6',
            border: !isSignedIn ? '1px solid #FDE68A' : '1px solid var(--border)',
            borderRadius: '8px',
            padding: '0 10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxSizing: 'border-box',
            textDecoration: 'none',
            transition: 'background-color 0.15s ease, border-color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#F0F0EE';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#F8F8F6';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '14px', height: '14px' }}>
              <GoogleDriveIcon size={14} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  lineHeight: 1.2,
                }}
              >
                Google Drive
              </span>
              <span
                style={{
                  fontSize: '9px',
                  color: !isSignedIn ? '#B45309' : 'var(--text-secondary)',
                  lineHeight: 1.2,
                }}
              >
                {!isSignedIn
                  ? 'Not connected'
                  : syncStatus === 'syncing'
                  ? 'Syncing...'
                  : `Synced · ${formatTimeAgo(lastSyncedAt)}`}
              </span>
            </div>
          </div>

          {!isSignedIn ? (
            <div title="Warning: Google Drive not connected" style={{ display: 'flex', alignItems: 'center' }}>
              <AlertTriangle size={12} color="#D97706" />
            </div>
          ) : syncStatus === 'syncing' ? (
            <RefreshCw size={11} className="animate-spin" color="#2563EB" />
          ) : (
            <span
              title="Google Drive sync active"
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: 'var(--perf-positive)',
                boxShadow: '0 0 0 2px rgba(22, 163, 74, 0.15)',
                display: 'inline-block',
              }}
            />
          )}
        </Link>

        {/* Local Storage Card */}
        <div
          style={{
            height: '38px',
            backgroundColor: '#F8F8F6',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '0 10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HardDrive size={13} color="var(--text-secondary)" />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  lineHeight: 1.2,
                }}
              >
                Local Storage
              </span>
              <span
                style={{
                  fontSize: '9px',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.2,
                }}
              >
                Available offline
              </span>
            </div>
          </div>
          <span
            title="Local IndexedDB operational"
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: 'var(--perf-positive)',
              boxShadow: '0 0 0 2px rgba(22, 163, 74, 0.15)',
              display: 'inline-block',
            }}
          />
        </div>
      </div>
    </aside>
  );
}
