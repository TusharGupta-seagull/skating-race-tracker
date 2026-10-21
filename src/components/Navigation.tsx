import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, History, PlusCircle, Settings } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/history', icon: History, label: 'History' },
  { to: '/add', icon: PlusCircle, label: 'Add Race', accent: true },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

// ─── Desktop Sidebar ──────────────────────────────────────────────────────────
export function Sidebar() {
  const { pathname } = useLocation();

  return (
    <nav
      aria-label="Main navigation"
      style={{
        width: 220, flexShrink: 0, borderRight: '1px solid var(--border)',
        background: 'var(--surface)', height: '100dvh', position: 'sticky',
        top: 0, display: 'flex', flexDirection: 'column', padding: '24px 12px',
      }}
    >
      {/* Logo */}
      <div style={{ padding: '4px 12px 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 32, height: 32, background: 'var(--accent)', borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16,
        }}>⛸</div>
        <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.01em' }}>SkateTrack</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV_ITEMS.map(({ to, icon: Icon, label, accent }) => {
          const active = pathname === to || (to !== '/' && pathname.startsWith(to));
          return (
            <Link
              key={to}
              to={to}
              aria-current={active ? 'page' : undefined}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 500,
                color: active ? (accent ? '#fff' : 'var(--text)') : 'var(--text-muted)',
                background: active ? (accent ? 'var(--accent)' : 'var(--surface-2)') : 'transparent',
                transition: 'all 0.1s',
              }}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// ─── Mobile Top Bar ───────────────────────────────────────────────────────────
export function TopBar({ title }: { title: string }) {
  return (
    <header
      style={{
        height: 'var(--nav-h)', borderBottom: '1px solid var(--border)',
        background: 'var(--surface)', display: 'flex', alignItems: 'center',
        padding: '0 16px', gap: 10, position: 'sticky', top: 0, zIndex: 50,
      }}
    >
      <div style={{
        width: 28, height: 28, background: 'var(--accent)', borderRadius: 6,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0,
      }}>⛸</div>
      <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.01em' }}>{title}</span>
    </header>
  );
}

// ─── Mobile Bottom Nav ────────────────────────────────────────────────────────
export function BottomNav() {
  const { pathname } = useLocation();

  return (
    <nav
      aria-label="Bottom navigation"
      style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        height: 'calc(var(--bottom-nav-h) + env(safe-area-inset-bottom, 0px))',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        background: 'var(--surface)', borderTop: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-around',
        zIndex: 100,
      }}
    >
      {NAV_ITEMS.map(({ to, icon: Icon, label, accent }) => {
        const active = pathname === to || (to !== '/' && pathname.startsWith(to));
        return (
          <Link
            key={to}
            to={to}
            aria-label={label}
            aria-current={active ? 'page' : undefined}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              padding: '8px 16px', borderRadius: 12, textDecoration: 'none', flex: 1,
              color: active ? (accent ? '#fff' : 'var(--accent)') : 'var(--text-muted)',
            }}
          >
            <div style={{
              width: accent ? 44 : 'auto', height: accent ? 34 : 'auto',
              background: accent ? 'var(--accent)' : 'transparent',
              borderRadius: accent ? 10 : 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: accent ? 0 : 0,
            }}>
              <Icon size={accent ? 20 : 22} />
            </div>
            <span style={{ fontSize: 10, fontWeight: active ? 600 : 400 }}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
