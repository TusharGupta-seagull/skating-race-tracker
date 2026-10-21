import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, DEFAULT_CATEGORIES } from '@/db';
import type { Race } from '@/types';
import { nanoid } from '@/lib/nanoid';
import {
  Trash2,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  LogOut,
  Clock,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  Download,
  Key,
  Copy,
  Check,
} from 'lucide-react';
import { GoogleIcon, GoogleDriveIcon } from '@/components/icons/GoogleIcons';
import { useSync, type SyncFrequency } from '@/context/SyncContext';

const SAMPLE_RACES: Omit<Race, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    eventName: 'National Speed Championships 2026',
    eventDate: '2026-03-15',
    eventYear: 2026,
    categoryId: 'cat-500m',
    skaterTimeMs: 42850, // 00:42.85 (PB)
    skaterRank: 1,
    topPerformers: [
      { id: 'p1', name: 'Myself', timeMs: 42850, rank: 1 },
      { id: 'p2', name: 'Lars Van Der Bilt', timeMs: 43100, rank: 2 },
      { id: 'p3', name: 'Viktor Morozov', timeMs: 43450, rank: 3 },
    ],
    notes: 'Flawless second turn crossover. New personal best in 500m + D.',
  },
  {
    eventName: 'Winter Regional Cup Stage 3',
    eventDate: '2026-02-18',
    eventYear: 2026,
    categoryId: 'cat-500m',
    skaterTimeMs: 43400, // 00:43.40
    skaterRank: 2,
    topPerformers: [
      { id: 'p1', name: 'Lars Van Der Bilt', timeMs: 43150, rank: 1 },
      { id: 'p2', name: 'Myself', timeMs: 43400, rank: 2 },
      { id: 'p3', name: 'Kenji Sato', timeMs: 43900, rank: 3 },
    ],
    notes: 'Good pacing, slightly wide on the final exit.',
  },
  {
    eventName: 'City Sprint Open 2026',
    eventDate: '2026-01-20',
    eventYear: 2026,
    categoryId: 'cat-500m',
    skaterTimeMs: 44100, // 00:44.10
    skaterRank: 3,
    topPerformers: [
      { id: 'p1', name: 'Kenji Sato', timeMs: 43800, rank: 1 },
      { id: 'p2', name: 'Lars Van Der Bilt', timeMs: 43950, rank: 2 },
      { id: 'p3', name: 'Myself', timeMs: 44100, rank: 3 },
    ],
    notes: 'First race of the season. Strong endurance.',
  },
  {
    eventName: 'National Speed Championships 2026',
    eventDate: '2026-03-16',
    eventYear: 2026,
    categoryId: 'cat-1000m',
    skaterTimeMs: 88500, // 01:28.50 (PB)
    skaterRank: 2,
    topPerformers: [
      { id: 'p1', name: 'Viktor Morozov', timeMs: 87900, rank: 1 },
      { id: 'p2', name: 'Myself', timeMs: 88500, rank: 2 },
      { id: 'p3', name: 'Alexandre Roy', timeMs: 89200, rank: 3 },
    ],
    notes: 'Maintained 28s lap splits consistently.',
  },
  {
    eventName: 'Winter Regional Cup Stage 2',
    eventDate: '2026-02-05',
    eventYear: 2026,
    categoryId: 'cat-1000m',
    skaterTimeMs: 90200, // 01:30.20
    skaterRank: 3,
    topPerformers: [
      { id: 'p1', name: 'Viktor Morozov', timeMs: 88700, rank: 1 },
      { id: 'p2', name: 'Alexandre Roy', timeMs: 89400, rank: 2 },
      { id: 'p3', name: 'Myself', timeMs: 90200, rank: 3 },
    ],
  },
  {
    eventName: 'Annual Rink Velocity Trial',
    eventDate: '2026-03-01',
    eventYear: 2026,
    categoryId: 'cat-1lap',
    skaterTimeMs: 14200, // 00:14.20 (PB)
    skaterRank: 1,
    topPerformers: [
      { id: 'p1', name: 'Myself', timeMs: 14200, rank: 1 },
      { id: 'p2', name: 'Marco Rossi', timeMs: 14450, rank: 2 },
      { id: 'p3', name: 'Kenji Sato', timeMs: 14600, rank: 3 },
    ],
  },
];

export default function Settings() {
  const races = useLiveQuery(() => db.races.toArray(), []) ?? [];
  const categories = useLiveQuery(() => db.categories.toArray(), []) ?? [];

  const [confirmClear, setConfirmClear] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const {
    isSignedIn,
    account,
    syncStatus,
    syncFrequency,
    lastSyncedAt,
    lastSyncStats,
    syncError,
    clientId,
    accessToken,
    signInWithGoogle,
    signOut,
    setSyncFrequency,
    setClientId,
    triggerSync,
    restoreFromGoogleDrive,
  } = useSync();

  const [showSetupModal, setShowSetupModal] = useState(false);
  const [clientIdInput, setClientIdInput] = useState(clientId || '');
  const [copiedOrigin, setCopiedOrigin] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const handleGoogleSignInClick = async () => {
    // If no Client ID configured, prompt setup modal with instructions
    if (!clientId && !clientIdInput) {
      setShowSetupModal(true);
      return;
    }

    const res = await signInWithGoogle({ clientIdOverride: clientIdInput || clientId });
    if (res.requiresClientId) {
      setShowSetupModal(true);
    } else if (res.success) {
      showNotification('Signed in with Google successfully!');
      setShowSetupModal(false);
    }
  };

  const handleDemoSignIn = async (emailOverride?: string) => {
    const email = emailOverride?.trim() || 'skater.athlete@gmail.com';
    const name = email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'Speed Skater';
    await signInWithGoogle({ customDemoAccount: { email, name } });
    setShowSetupModal(false);
    showNotification(`Signed in with Demo Google Account (${email}).`);
  };

  const handleManualSync = async () => {
    const success = await triggerSync();
    if (success) {
      showNotification('Data successfully synced to Google Drive.');
    }
  };

  const handleRestoreFromDrive = async () => {
    if (!window.confirm('Restore races and categories from Google Drive? This will merge with your local records.')) {
      return;
    }
    setIsRestoring(true);
    const res = await restoreFromGoogleDrive();
    setIsRestoring(false);
    if (res.success) {
      showNotification(`Restored ${res.raceCount ?? 0} races from Google Drive.`);
    }
  };

  const handleClearDatabase = async () => {
    await db.transaction('rw', db.races, db.categories, async () => {
      await db.races.clear();
      await db.categories.clear();
      await db.categories.bulkAdd(DEFAULT_CATEGORIES);
    });
    setConfirmClear(false);
    showNotification('All race records cleared. Default categories restored.');
  };

  const handleLoadSampleData = async () => {
    const now = Date.now();
    await db.transaction('rw', db.races, db.categories, async () => {
      // Ensure default categories exist
      for (const cat of DEFAULT_CATEGORIES) {
        const exists = await db.categories.get(cat.id);
        if (!exists) await db.categories.add(cat);
      }

      // Add sample races
      for (const r of SAMPLE_RACES) {
        await db.races.add({
          ...r,
          id: nanoid(),
          createdAt: now,
          updatedAt: now,
        });
      }
    });
    showNotification('Sample speed skating races loaded successfully.');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* ─── Header ────────────────────────────────────────────────────── */}
      <div>
        <h1 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
          Settings & System
        </h1>
        <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
          Database statistics, storage diagnostics, and system configuration
        </p>
      </div>

      {notification && (
        <div
          style={{
            padding: '8px 12px',
            backgroundColor: 'var(--perf-positive-bg)',
            border: '1px solid var(--perf-positive-border)',
            borderRadius: '6px',
            fontSize: '11px',
            color: 'var(--perf-positive)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <CheckCircle2 size={13} />
          <span>{notification}</span>
        </div>
      )}

      {/* ─── Storage & Database Metrics ─────────────────────────────────── */}
      <div className="ent-card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <span
          style={{
            fontSize: '10px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--text-secondary)',
          }}
        >
          LOCAL DATABASE STATUS
        </span>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px' }}>
          <div style={{ padding: '8px 10px', backgroundColor: 'var(--surface-secondary)', borderRadius: '6px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Total Recorded Races</span>
            <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>{races.length}</div>
          </div>
          <div style={{ padding: '8px 10px', backgroundColor: 'var(--surface-secondary)', borderRadius: '6px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Race Categories</span>
            <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>{categories.length}</div>
          </div>
          <div style={{ padding: '8px 10px', backgroundColor: 'var(--surface-secondary)', borderRadius: '6px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Storage Engine</span>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>Dexie.js / IndexedDB</div>
          </div>
          <div style={{ padding: '8px 10px', backgroundColor: 'var(--surface-secondary)', borderRadius: '6px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Offline Availability</span>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--perf-positive)', marginTop: '2px' }}>Active (PWA Ready)</div>
          </div>
        </div>
      </div>

      {/* ─── Google Drive Cloud Sync ───────────────────────────────────── */}
      <div className="ent-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <GoogleDriveIcon size={18} />
            <span
              style={{
                fontSize: '10px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-secondary)',
              }}
            >
              GOOGLE DRIVE CLOUD SYNC
            </span>
          </div>

          {isSignedIn && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  fontSize: '10.5px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--perf-positive-bg)',
                  border: '1px solid var(--perf-positive-border)',
                  color: 'var(--perf-positive)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'var(--perf-positive)' }} />
                Connected to Drive
              </span>
            </div>
          )}
        </div>

        {syncError && (
          <div
            style={{
              padding: '8px 12px',
              backgroundColor: 'var(--perf-negative-bg)',
              border: '1px solid var(--perf-negative-border)',
              borderRadius: '6px',
              fontSize: '11px',
              color: 'var(--perf-negative)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <AlertCircle size={13} />
            <span>{syncError}</span>
          </div>
        )}

        {!isSignedIn ? (
          /* Not Signed In View */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
              Sign in with your Google account to automatically sync and backup your speed skating race performances, personal bests, and custom categories directly to Google Drive.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', paddingTop: '4px' }}>
              <button
                type="button"
                onClick={handleGoogleSignInClick}
                className="ent-btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  height: '36px',
                  padding: '0 16px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: '12.5px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  cursor: 'pointer',
                  borderRadius: '6px',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F7F7F5'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#FFFFFF'; }}
              >
                <GoogleIcon size={16} />
                <span>Sign in with Google</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSetupModal(true)}
                className="ent-btn ent-btn-secondary"
                style={{ height: '36px', padding: '0 12px', fontSize: '11.5px', display: 'flex', alignItems: 'center', gap: '6px' }}
                title="Configure Google Cloud OAuth Client ID"
              >
                <Key size={13} />
                <span>{clientId ? 'Edit Client ID' : 'OAuth Client ID Setup'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoSignIn()}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '11px',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: '4px',
                }}
              >
                Or test with demo account
              </button>
            </div>

            {clientId && (
              <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                Configured Client ID: <code style={{ backgroundColor: 'var(--surface-secondary)', padding: '2px 5px', borderRadius: '3px' }}>{clientId.slice(0, 16)}...apps.googleusercontent.com</code>
              </div>
            )}

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                backgroundColor: 'var(--surface-secondary)',
                borderRadius: '6px',
                fontSize: '11px',
                color: 'var(--text-muted)',
              }}
            >
              <ShieldCheck size={14} color="var(--text-secondary)" />
              <span>Offline-first resilience: Your data always remains locally cached in IndexedDB even if cloud sync is disconnected.</span>
            </div>
          </div>
        ) : (
          /* Signed In View */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Account Card */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                backgroundColor: 'var(--surface-secondary)',
                borderRadius: '8px',
                border: '1px solid var(--border-light)',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {account?.avatarUrl ? (
                  <img
                    src={account.avatarUrl}
                    alt={account.name}
                    referrerPolicy="no-referrer"
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '1px solid var(--border)',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: '#1A73E8',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 600,
                      fontSize: '14px',
                    }}
                  >
                    {account?.name?.[0]?.toUpperCase() || 'G'}
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {account?.name || 'Speed Skater'}
                    </span>
                    <span
                      style={{
                        fontSize: '9.5px',
                        padding: '1px 5px',
                        borderRadius: '4px',
                        backgroundColor: account?.isRealGoogle ? '#EFF6FF' : 'var(--surface-tertiary)',
                        color: account?.isRealGoogle ? '#1D4ED8' : 'var(--text-secondary)',
                        fontWeight: 600,
                      }}
                    >
                      {account?.isRealGoogle ? 'Google OAuth 2.0' : 'Demo Account'}
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {account?.email}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowSetupModal(true)}
                  className="ent-btn ent-btn-secondary"
                  style={{ height: '28px', padding: '0 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  title="View or change Google Client ID"
                >
                  <Key size={11} /> Config
                </button>
                <button
                  type="button"
                  onClick={() => {
                    signOut();
                    showNotification('Signed out from Google Drive sync.');
                  }}
                  className="ent-btn ent-btn-secondary"
                  style={{ height: '28px', padding: '0 10px', fontSize: '11px' }}
                  title="Disconnect Google Drive"
                >
                  <LogOut size={12} /> Disconnect
                </button>
              </div>
            </div>

            {/* Sync Frequency Control & Actions */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                padding: '12px 14px',
                backgroundColor: '#FAFAF9',
                border: '1px solid var(--border-light)',
                borderRadius: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={13} color="var(--text-secondary)" />
                <label
                  htmlFor="syncFrequencySelect"
                  style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-primary)' }}
                >
                  AUTOMATIC SYNC FREQUENCY
                </label>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '0 0 6px 0' }}>
                How often your race logs, categories, and personal bests automatically sync to Google Drive while the application is active:
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <select
                  id="syncFrequencySelect"
                  value={syncFrequency}
                  onChange={(e) => {
                    const freq = e.target.value as SyncFrequency;
                    setSyncFrequency(freq);
                    showNotification(`Sync frequency updated to: ${e.target.options[e.target.selectedIndex].text}`);
                  }}
                  className="ent-input"
                  style={{ maxWidth: '300px', height: '32px', fontSize: '11.5px' }}
                >
                  <option value="manual">Manual only (On button click)</option>
                  <option value="1m">Every 1 minute (Fastest)</option>
                  <option value="5m">Every 5 minutes (Recommended)</option>
                  <option value="15m">Every 15 minutes</option>
                  <option value="30m">Every 30 minutes</option>
                  <option value="60m">Every 1 hour</option>
                </select>

                <button
                  type="button"
                  onClick={handleManualSync}
                  disabled={syncStatus === 'syncing'}
                  className="ent-btn ent-btn-primary"
                  style={{ height: '32px', padding: '0 14px', fontSize: '11.5px' }}
                >
                  <RefreshCw size={12} className={syncStatus === 'syncing' ? 'animate-spin' : ''} />
                  <span>{syncStatus === 'syncing' ? 'Syncing...' : 'Sync Now'}</span>
                </button>

                {accessToken && (
                  <button
                    type="button"
                    onClick={handleRestoreFromDrive}
                    disabled={isRestoring || syncStatus === 'syncing'}
                    className="ent-btn ent-btn-secondary"
                    style={{ height: '32px', padding: '0 12px', fontSize: '11.5px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    title="Download latest backup from Google Drive and restore local records"
                  >
                    <Download size={12} className={isRestoring ? 'animate-spin' : ''} />
                    <span>{isRestoring ? 'Restoring...' : 'Restore from Drive'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Cloud Drive Status Details */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '8px',
              }}
            >
              <div style={{ padding: '8px 10px', backgroundColor: 'var(--surface-secondary)', borderRadius: '6px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Last Synced</span>
                <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                  {lastSyncedAt ? new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Never'}
                </div>
              </div>

              <div style={{ padding: '8px 10px', backgroundColor: 'var(--surface-secondary)', borderRadius: '6px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Drive Target File</span>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px', fontFamily: 'monospace' }}>
                  {lastSyncStats?.driveFileName || 'skating_race_tracker_backup.json'}
                </div>
              </div>

              <div style={{ padding: '8px 10px', backgroundColor: 'var(--surface-secondary)', borderRadius: '6px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Synced Payload</span>
                <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                  {lastSyncStats ? `${lastSyncStats.raceCount} races (${lastSyncStats.fileSizeKB} KB)` : `${races.length} races`}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── Google OAuth Setup Modal ─────────────────────────────────────── */}
      {showSetupModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setShowSetupModal(false)}
        >
          <div
            className="ent-card"
            style={{
              width: '100%',
              maxWidth: '520px',
              padding: '20px',
              backgroundColor: '#FFFFFF',
              boxShadow: '0 12px 36px rgba(0,0,0,0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <GoogleIcon size={20} />
                <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                  Real Google Sign-In & Drive Sync Setup
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowSetupModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: 'var(--text-secondary)' }}
              >
                ×
              </button>
            </div>

            <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
              Google requires a verified OAuth 2.0 Client ID to grant access to your Google Drive. Follow these 2 simple steps:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '11.5px', color: 'var(--text-primary)' }}>
              <div style={{ padding: '10px', backgroundColor: 'var(--surface-secondary)', borderRadius: '6px' }}>
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>Step 1: Set Authorized JavaScript Origin</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <code style={{ fontSize: '11px', backgroundColor: '#FFFFFF', padding: '3px 6px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                    {window.location.origin}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.origin);
                      setCopiedOrigin(true);
                      setTimeout(() => setCopiedOrigin(false), 2000);
                    }}
                    className="ent-btn ent-btn-secondary"
                    style={{ height: '26px', padding: '0 8px', fontSize: '11px' }}
                  >
                    {copiedOrigin ? <Check size={12} color="var(--perf-positive)" /> : <Copy size={12} />}
                    <span>{copiedOrigin ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div style={{ padding: '10px', backgroundColor: 'var(--surface-secondary)', borderRadius: '6px' }}>
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>Step 2: Create Web OAuth Client ID in Google Cloud</div>
                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#1A73E8', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11.5px' }}
                >
                  <span>Open Google Cloud Credentials</span>
                  <ExternalLink size={11} />
                </a>
                <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  (Click Create Credentials &gt; OAuth client ID &gt; Application type: Web application)
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Paste Google Cloud OAuth Client ID:
                </label>
                <input
                  type="text"
                  value={clientIdInput}
                  onChange={(e) => setClientIdInput(e.target.value)}
                  placeholder="e.g. 123456789-abcdef.apps.googleusercontent.com"
                  className="ent-input mono"
                  style={{ height: '32px', fontSize: '11px' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'flex-end', paddingTop: '6px' }}>
              <button
                type="button"
                onClick={() => handleDemoSignIn()}
                className="ent-btn ent-btn-ghost"
                style={{ height: '32px', padding: '0 10px', fontSize: '11.5px' }}
              >
                Use Quick Demo Account
              </button>

              <button
                type="button"
                onClick={() => {
                  if (clientIdInput.trim()) {
                    setClientId(clientIdInput.trim());
                    handleGoogleSignInClick();
                  } else {
                    alert('Please enter a Google Cloud OAuth Client ID first, or click "Use Quick Demo Account".');
                  }
                }}
                className="ent-btn ent-btn-primary"
                style={{ height: '32px', padding: '0 14px', fontSize: '11.5px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <GoogleIcon size={14} />
                <span>Launch Google Sign-In</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Testing / Demonstration Tool ───────────────────────────────── */}
      <div className="ent-card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <span
          style={{
            fontSize: '10px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--text-secondary)',
          }}
        >
          DEMO DATA GENERATOR
        </span>
        <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
          Populate realistic speed skating race records across 500m + D, 1000m, and 1 Lap categories to verify charts, personal bests, and analytics.
        </p>
        <div style={{ marginTop: '4px' }}>
          <button
            type="button"
            onClick={handleLoadSampleData}
            className="ent-btn ent-btn-secondary"
          >
            <Sparkles size={12} /> Load Realistic Demo Races
          </button>
        </div>
      </div>

      {/* ─── Destructive Reset ─────────────────────────────────────────── */}
      <div className="ent-card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px', border: '1px solid #fee2e2' }}>
        <span
          style={{
            fontSize: '10px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--perf-negative)',
          }}
        >
          RESET APPLICATION DATA
        </span>
        <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
          Permanently delete all race logs and reset categories to their default state. This action cannot be undone.
        </p>

        {confirmClear ? (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px' }}>
            <button
              type="button"
              onClick={handleClearDatabase}
              className="ent-btn ent-btn-danger"
            >
              <Trash2 size={12} /> Yes, Permanently Delete All Data
            </button>
            <button
              type="button"
              onClick={() => setConfirmClear(false)}
              className="ent-btn ent-btn-secondary"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div style={{ marginTop: '4px' }}>
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="ent-btn ent-btn-danger"
            >
              <Trash2 size={12} /> Clear Database...
            </button>
          </div>
        )}
      </div>

      {/* ─── App Specifications & Version ──────────────────────────────── */}
      <div style={{ textAlign: 'center', padding: '8px 0', fontSize: '11px', color: 'var(--text-muted)' }}>
        Skating Race Tracker v1.0.0 · Offline-First Personal Speed Skating Performance Tracker
      </div>
    </div>
  );
}
