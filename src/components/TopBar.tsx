import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Menu, CheckCircle2, RefreshCw } from 'lucide-react';
import { useSync } from '@/context/SyncContext';

interface BreadcrumbMap {
  parent: string;
  current: string;
}

const ROUTE_BREADCRUMBS: Record<string, BreadcrumbMap> = {
  '/': { parent: 'Dashboard', current: 'Overview' },
  '/history': { parent: 'Races', current: 'Race History' },
  '/bests': { parent: 'Analytics', current: 'Personal Bests' },
  '/trends': { parent: 'Analytics', current: 'Performance Trends' },
  '/add': { parent: 'Races', current: 'Add Race' },
  '/categories': { parent: 'Management', current: 'Race Categories' },
  '/export': { parent: 'Data', current: 'Import & Export' },
  '/settings': { parent: 'System', current: 'Settings' },
};

export function TopBar({ onOpenMobileMenu }: { onOpenMobileMenu?: () => void }) {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const { syncStatus, triggerSync, isSignedIn, lastSyncedAt } = useSync();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const queryParam = pathname === '/history' ? (new URLSearchParams(search).get('q') ?? '') : '';
  const [searchQuery, setSearchQuery] = useState(queryParam);
  const [prevQueryParam, setPrevQueryParam] = useState(queryParam);

  // Synchronize state when URL query parameter changes
  if (queryParam !== prevQueryParam) {
    setPrevQueryParam(queryParam);
    setSearchQuery(queryParam);
  }

  // Handle Cmd+K / Ctrl+K shortcut to focus search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle dynamic paths like /race/:id or /race/:id/edit
  let breadcrumb = ROUTE_BREADCRUMBS[pathname];
  if (!breadcrumb) {
    if (pathname.includes('/edit')) {
      breadcrumb = { parent: 'Races', current: 'Edit Race' };
    } else if (pathname.startsWith('/race/')) {
      breadcrumb = { parent: 'Races', current: 'Race Details' };
    } else {
      breadcrumb = { parent: 'Dashboard', current: 'Overview' };
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/history?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/history');
    }
  };

  return (
    <header
      style={{
        height: 'var(--topbar-h)',
        backgroundColor: 'var(--shell-bg)',
        borderBottom: '1px solid var(--border-light)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        flexShrink: 0,
        boxSizing: 'border-box',
      }}
    >
      {/* ─── 4.2 Breadcrumb (Left) ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {onOpenMobileMenu && (
          <button
            type="button"
            onClick={onOpenMobileMenu}
            aria-label="Open navigation menu"
            className="md:hidden"
            style={{
              background: 'transparent',
              border: 'none',
              padding: '4px',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Menu size={16} />
          </button>
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11.5px',
            userSelect: 'none',
          }}
        >
          <span style={{ color: 'var(--text-secondary)' }}>{breadcrumb.parent}</span>
          <span style={{ color: '#C4C4C0', fontSize: '10px' }}>&gt;</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
            {breadcrumb.current}
          </span>
        </div>
      </div>

      {/* ─── 4.3 Search Field & Utility Controls (Right) ──────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <form onSubmit={handleSearchSubmit}>
          <div
            style={{
              position: 'relative',
              width: '240px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
            }}
            className="hidden sm:flex"
          >
            <Search
              size={12}
              color="var(--text-muted)"
              style={{
                position: 'absolute',
                left: '8px',
                pointerEvents: 'none',
              }}
            />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search races..."
              aria-label="Search races"
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: '#FAFAF9',
                border: '1px solid var(--border)',
                borderRadius: '7px',
                padding: '0 28px 0 26px',
                fontSize: '11.5px',
                color: 'var(--text-primary)',
                outline: 'none',
                transition: 'border-color 0.15s ease, background-color 0.15s ease',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#252525';
                e.currentTarget.style.backgroundColor = '#FFFFFF';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.backgroundColor = '#FAFAF9';
              }}
            />
            <span
              style={{
                position: 'absolute',
                right: '6px',
                fontSize: '9.5px',
                color: 'var(--text-muted)',
                backgroundColor: 'var(--border-light)',
                padding: '1px 4px',
                borderRadius: '3px',
                lineHeight: 1.2,
                pointerEvents: 'none',
              }}
            >
              ⌘K
            </span>
          </div>
        </form>

        {/* ─── 4.4 Interactive Status & Sync Button ──────────────────────── */}
        <button
          type="button"
          onClick={() => triggerSync()}
          disabled={syncStatus === 'syncing'}
          title={
            syncStatus === 'syncing'
              ? 'Syncing changes to Google Drive...'
              : isSignedIn
              ? `Google Drive connected · Click to sync now${
                  lastSyncedAt
                    ? ` (Last synced: ${new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`
                    : ''
                }`
              : 'IndexedDB active and offline ready. Click to sync.'
          }
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '3px 8px',
            backgroundColor: syncStatus === 'syncing' ? '#EFF6FF' : '#F8F8F6',
            border: syncStatus === 'syncing' ? '1px solid #BFDBFE' : '1px solid var(--border)',
            borderRadius: '5px',
            fontSize: '10px',
            color: syncStatus === 'syncing' ? '#1D4ED8' : 'var(--text-secondary)',
            height: '24px',
            cursor: syncStatus === 'syncing' ? 'default' : 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            if (syncStatus !== 'syncing') {
              e.currentTarget.style.backgroundColor = '#F0F0EE';
              e.currentTarget.style.borderColor = '#D4D4D0';
            }
          }}
          onMouseLeave={(e) => {
            if (syncStatus !== 'syncing') {
              e.currentTarget.style.backgroundColor = '#F8F8F6';
              e.currentTarget.style.borderColor = 'var(--border)';
            }
          }}
        >
          {syncStatus === 'syncing' ? (
            <>
              <RefreshCw size={11} className="animate-spin" color="#2563EB" />
              <span className="hidden md:inline" style={{ fontWeight: 500 }}>Syncing...</span>
            </>
          ) : syncStatus === 'synced' ? (
            <>
              <CheckCircle2 size={11} color="var(--perf-positive)" />
              <span className="hidden md:inline" style={{ fontWeight: 500, color: 'var(--perf-positive)' }}>Synced</span>
            </>
          ) : (
            <>
              <CheckCircle2 size={11} color="var(--perf-positive)" />
              <span className="hidden md:inline">Offline Ready</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}
