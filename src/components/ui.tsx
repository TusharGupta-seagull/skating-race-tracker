import React from 'react';
import { clsx } from 'clsx';

// ─── Card ─────────────────────────────────────────────────────────────────────
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated';
}
export function Card({ className, variant = 'default', style, ...props }: CardProps) {
  return (
    <div
      className={clsx('ent-card p-4', variant === 'elevated' && 'shadow-md', className)}
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-card)',
        boxShadow: 'var(--shadow-card)',
        ...style,
      }}
      {...props}
    />
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  accent?: boolean;
  className?: string;
}
export function StatCard({ label, value, sub, accent, className }: StatCardProps) {
  return (
    <div
      className={clsx('ent-card p-3 flex flex-col justify-between', className)}
      style={{
        backgroundColor: '#FFFFFF',
        border: accent ? '1px solid #252525' : '1px solid var(--border)',
        borderRadius: 'var(--radius-card)',
        height: '78px',
        boxSizing: 'border-box',
      }}
    >
      <span
        style={{
          color: 'var(--text-secondary)',
          fontSize: '9.5px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {label}
      </span>
      <span
        className="time-tabular"
        style={{
          fontSize: '22px',
          fontWeight: 600,
          lineHeight: 1.1,
          color: 'var(--text-primary)',
          letterSpacing: '-0.02em',
        }}
      >
        {value}
      </span>
      {sub && (
        <span
          style={{
            fontSize: '10.5px',
            color: 'var(--text-secondary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {sub}
        </span>
      )}
    </div>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'accent' | 'success' | 'warning' | 'danger' | 'muted';
  className?: string;
  style?: React.CSSProperties;
}
export function Badge({ children, variant = 'muted', className, style }: BadgeProps) {
  const styles: Record<string, React.CSSProperties> = {
    muted: { backgroundColor: 'var(--surface-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' },
    success: { backgroundColor: 'var(--perf-positive-bg)', color: 'var(--perf-positive)', border: '1px solid var(--perf-positive-border)' },
    warning: { backgroundColor: 'var(--rank-gold-bg)', color: 'var(--rank-gold-text)', border: '1px solid var(--rank-gold-border)' },
    danger: { backgroundColor: 'var(--perf-negative-bg)', color: 'var(--perf-negative)', border: '1px solid var(--perf-negative-border)' },
    accent: { backgroundColor: '#F0F0EE', color: 'var(--text-primary)', border: '1px solid var(--border)' },
  };

  return (
    <span
      className={clsx('badge', className)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '1px 6px',
        borderRadius: '4px',
        fontSize: '10.5px',
        fontWeight: 500,
        ...styles[variant],
        ...style,
      }}
    >
      {children}
    </span>
  );
}

// ─── Button ───────────────────────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md';
  loading?: boolean;
}
export function Button({ variant = 'primary', size, loading, children, className, disabled, style, ...props }: ButtonProps) {
  const variantClass =
    variant === 'primary'
      ? 'ent-btn-primary'
      : variant === 'secondary'
        ? 'ent-btn-secondary'
        : variant === 'danger'
          ? 'ent-btn-danger'
          : 'ent-btn-ghost';

  return (
    <button
      className={clsx('ent-btn', variantClass, size === 'sm' && 'h-6 text-xs px-2', className)}
      disabled={disabled || loading}
      style={style}
      {...props}
    >
      {loading ? <Spinner size={12} /> : null}
      {children}
    </button>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
export function Spinner({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '36px 16px', gap: '8px' }}>
      {icon && <div style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>{icon}</div>}
      <p style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>{title}</p>
      {description && <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', maxWidth: '300px' }}>{description}</p>}
      {action && <div style={{ marginTop: '6px' }}>{action}</div>}
    </div>
  );
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────
interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}
export function ConfirmDialog({ open, title, description, confirmLabel = 'Confirm', cancelLabel = 'Cancel', onConfirm, onCancel, danger }: ConfirmDialogProps) {
  React.useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
      }}
      onClick={onCancel}
    >
      <div
        className="ent-card"
        style={{
          padding: '16px 20px',
          maxWidth: '380px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          backgroundColor: '#FFFFFF',
          boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div>
          <h2 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
            {title}
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {description}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
          <button type="button" className="ent-btn ent-btn-secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={clsx('ent-btn', danger ? 'ent-btn-danger' : 'ent-btn-primary')}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
interface ToastProps { message: string; type?: 'success' | 'error' | 'info'; }
export function Toast({ message, type = 'info' }: ToastProps) {
  const borderColor =
    type === 'success'
      ? 'var(--perf-positive)'
      : type === 'error'
        ? 'var(--perf-negative)'
        : '#555555';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: '#202020',
        color: '#FFFFFF',
        borderRadius: '7px',
        padding: '8px 16px',
        fontSize: '12px',
        zIndex: 1000,
        boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
        whiteSpace: 'nowrap',
        borderLeft: `3px solid ${borderColor}`,
      }}
      role="alert"
    >
      {message}
    </div>
  );
}

// ─── Form Field ───────────────────────────────────────────────────────────────
interface FormFieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
}
export function FormField({ label, htmlFor, error, required, children, hint }: FormFieldProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <label
        htmlFor={htmlFor}
        style={{
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        {label}
        {required && <span style={{ color: 'var(--perf-negative)', marginLeft: '3px' }}>*</span>}
      </label>
      {children}
      {hint && !error && (
        <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{hint}</span>
      )}
      {error && (
        <span style={{ fontSize: '10.5px', color: 'var(--perf-negative)', fontWeight: 500 }} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

// ─── Rank Medal ───────────────────────────────────────────────────────────────
export function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <Badge variant="warning">1st</Badge>;
  if (rank === 2) return <Badge variant="muted">2nd</Badge>;
  if (rank === 3) return <Badge variant="accent">3rd</Badge>;
  return <Badge variant="muted">#{rank}</Badge>;
}
