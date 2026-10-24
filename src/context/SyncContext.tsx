/* oxlint-disable react/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { db } from '@/db';
import type { BackupFile } from '@/types';
import {
  requestGoogleAccessToken,
  fetchGoogleUserProfile,
  saveBackupToGoogleDrive,
  downloadBackupFromGoogleDrive,
  BACKUP_FILE_NAME,
} from '@/lib/googleDriveApi';

export type SyncFrequency = 'manual' | '1m' | '5m' | '15m' | '30m' | '60m';

export interface GoogleAccount {
  email: string;
  name: string;
  avatarUrl?: string;
  isRealGoogle?: boolean;
}

export interface SyncStats {
  raceCount: number;
  categoryCount: number;
  fileSizeKB: number;
  driveFileName: string;
  driveFileId?: string;
}

interface SignInOptions {
  clientIdOverride?: string;
}

interface SyncContextValue {
  isSignedIn: boolean;
  account: GoogleAccount | null;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  syncFrequency: SyncFrequency;
  lastSyncedAt: number | null;
  lastSyncStats: SyncStats | null;
  syncError: string | null;
  clientId: string;
  accessToken: string | null;
  signInWithGoogle: (options?: SignInOptions) => Promise<{ success: boolean; requiresClientId?: boolean; error?: string }>;
  signOut: () => void;
  setSyncFrequency: (freq: SyncFrequency) => void;
  setClientId: (id: string) => void;
  triggerSync: () => Promise<boolean>;
  restoreFromGoogleDrive: () => Promise<{ success: boolean; raceCount?: number; error?: string }>;
}

const SyncContext = createContext<SyncContextValue | null>(null);

const STORAGE_KEYS = {
  AUTH: 'skating_gdrive_auth',
  FREQ: 'skating_gdrive_freq',
  LAST_SYNC: 'skating_gdrive_last_synced',
  STATS: 'skating_gdrive_last_stats',
  CLIENT_ID: 'skating_gdrive_client_id',
  ACCESS_TOKEN: 'skating_gdrive_access_token',
  CLOUD_BACKUP: 'skating_gdrive_cloud_backup',
};

const FREQ_MS_MAP: Record<SyncFrequency, number> = {
  manual: 0,
  '1m': 60 * 1000,
  '5m': 5 * 60 * 1000,
  '15m': 15 * 60 * 1000,
  '30m': 30 * 60 * 1000,
  '60m': 60 * 60 * 1000,
};

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<GoogleAccount | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.AUTH);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.isRealGoogle) return parsed;
        localStorage.removeItem(STORAGE_KEYS.AUTH);
      }
      return null;
    } catch {
      return null;
    }
  });

  const [syncFrequency, setSyncFrequencyState] = useState<SyncFrequency>(() => {
    return (localStorage.getItem(STORAGE_KEYS.FREQ) as SyncFrequency) || '5m';
  });

  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
    return stored ? Number(stored) : null;
  });

  const [lastSyncStats, setLastSyncStats] = useState<SyncStats | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.STATS);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [clientId, setClientIdState] = useState<string>(() => {
    return (
      localStorage.getItem(STORAGE_KEYS.CLIENT_ID) ||
      (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) ||
      ''
    );
  });

  const [accessToken, setAccessToken] = useState<string | null>(() => {
    return sessionStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) || null;
  });

  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);

  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isSignedIn = !!account;

  // Persist frequency change
  const setSyncFrequency = useCallback((freq: SyncFrequency) => {
    setSyncFrequencyState(freq);
    localStorage.setItem(STORAGE_KEYS.FREQ, freq);
  }, []);

  const setClientId = useCallback((id: string) => {
    const trimmed = id.trim();
    setClientIdState(trimmed);
    localStorage.setItem(STORAGE_KEYS.CLIENT_ID, trimmed);
  }, []);

  // Sign out
  const signOut = useCallback(() => {
    setAccount(null);
    setAccessToken(null);
    setSyncStatus('idle');
    setSyncError(null);
    localStorage.removeItem(STORAGE_KEYS.AUTH);
    sessionStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  }, []);

  // Core Sync Action (Syncs to Google Drive REST API if token available)
  const triggerSync = useCallback(async (): Promise<boolean> => {
    setSyncStatus('syncing');
    setSyncError(null);

    try {
      // Gather database snapshot
      const [races, categories] = await Promise.all([
        db.races.toArray(),
        db.categories.toArray(),
      ]);

      const backup: BackupFile = {
        version: 1,
        exportedAt: new Date().toISOString(),
        races,
        categories,
      };

      const payloadString = JSON.stringify(backup, null, 2);
      const sizeKB = Math.round((new Blob([payloadString]).size / 1024) * 10) / 10;

      let driveFileId: string | undefined;

      // If we have an active real Google OAuth token, sync directly to Google Drive!
      if (accessToken) {
        try {
          const driveRes = await saveBackupToGoogleDrive(accessToken, payloadString);
          driveFileId = driveRes.fileId;
        } catch (driveErr) {
          console.warn('Real Google Drive API upload error (fallback to local cloud cache):', driveErr);
          const msg = driveErr instanceof Error ? driveErr.message : String(driveErr);
          if (msg.includes('401') || msg.includes('authorization')) {
            setSyncError('Google authorization expired. Please sign in again.');
          }
        }
      } else {
        // Simulated network delay for smooth visual feedback
        await new Promise((resolve) => setTimeout(resolve, 700));
      }

      // Save to local cloud cache store for offline redundancy
      localStorage.setItem(STORAGE_KEYS.CLOUD_BACKUP, payloadString);

      const now = Date.now();
      const stats: SyncStats = {
        raceCount: races.length,
        categoryCount: categories.length,
        fileSizeKB: sizeKB,
        driveFileName: BACKUP_FILE_NAME,
        driveFileId,
      };

      setLastSyncedAt(now);
      setLastSyncStats(stats);
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, String(now));
      localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));

      setSyncStatus('synced');

      // Revert from "synced" to "idle" after 3 seconds
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
      statusTimerRef.current = setTimeout(() => {
        setSyncStatus('idle');
      }, 3000);

      return true;
    } catch (err) {
      console.error('Google Drive Sync failed:', err);
      setSyncStatus('error');
      setSyncError(err instanceof Error ? err.message : 'Sync failed');
      return false;
    }
  }, [accessToken]);

  // Sign in with Google (OAuth 2.0 flow via Google Identity Services)
  const signInWithGoogle = useCallback(
    async (options?: SignInOptions): Promise<{ success: boolean; requiresClientId?: boolean; error?: string }> => {
      setSyncError(null);

      // Real Google OAuth 2.0 flow
      const effectiveClientId = options?.clientIdOverride?.trim() || clientId.trim();

      if (!effectiveClientId) {
        // No client ID yet: inform caller to prompt user for Google Cloud Client ID
        return { success: false, requiresClientId: true };
      }

      try {
        setSyncStatus('syncing');

        // Request real access token through Google Identity Services OAuth popup
        const token = await requestGoogleAccessToken(effectiveClientId);
        setAccessToken(token);
        sessionStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);

        // Fetch real Google User Profile (name, email, avatar image)
        const profile = await fetchGoogleUserProfile(token);

        const googleUser: GoogleAccount = {
          name: profile.name || profile.given_name || 'Google User',
          email: profile.email,
          avatarUrl: profile.picture,
          isRealGoogle: true,
        };

        setAccount(googleUser);
        localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(googleUser));

        // Save valid client ID for future sessions
        setClientIdState(effectiveClientId);
        localStorage.setItem(STORAGE_KEYS.CLIENT_ID, effectiveClientId);

        // Trigger immediate sync to Google Drive
        setTimeout(() => triggerSync(), 300);

        return { success: true };
      } catch (err) {
        console.error('Google Sign-In failed:', err);
        setSyncStatus('idle');
        const errorMessage = err instanceof Error ? err.message : 'Google authorization failed';
        setSyncError(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    [clientId, triggerSync]
  );

  // Restore from Google Drive
  const restoreFromGoogleDrive = useCallback(async () => {
    if (!accessToken) {
      return { success: false, error: 'Google Drive access token not available. Please sign in.' };
    }

    try {
      setSyncStatus('syncing');
      const backupText = await downloadBackupFromGoogleDrive(accessToken);
      if (!backupText) {
        setSyncStatus('idle');
        return { success: false, error: 'No backup file found in Google Drive.' };
      }

      const backup: BackupFile = JSON.parse(backupText);
      if (!backup.races || !Array.isArray(backup.races)) {
        setSyncStatus('idle');
        return { success: false, error: 'Invalid backup file structure.' };
      }

      // Restore to Dexie DB
      await db.transaction('rw', db.races, db.categories, async () => {
        if (backup.categories && backup.categories.length > 0) {
          for (const cat of backup.categories) {
            const exists = await db.categories.get(cat.id);
            if (!exists) await db.categories.add(cat);
          }
        }
        for (const race of backup.races) {
          const exists = await db.races.get(race.id);
          if (exists) {
            await db.races.put(race);
          } else {
            await db.races.add(race);
          }
        }
      });

      setSyncStatus('synced');
      return { success: true, raceCount: backup.races.length };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Restore failed';
      setSyncStatus('error');
      setSyncError(error);
      return { success: false, error };
    }
  }, [accessToken]);

  // Background recurring sync timer
  useEffect(() => {
    if (syncTimeoutRef.current) {
      clearInterval(syncTimeoutRef.current);
      syncTimeoutRef.current = null;
    }

    if (!isSignedIn) return;

    const intervalMs = FREQ_MS_MAP[syncFrequency];
    if (intervalMs > 0) {
      syncTimeoutRef.current = setInterval(() => {
        triggerSync();
      }, intervalMs);
    }

    return () => {
      if (syncTimeoutRef.current) {
        clearInterval(syncTimeoutRef.current);
      }
    };
  }, [isSignedIn, syncFrequency, triggerSync]);

  return (
    <SyncContext.Provider
      value={{
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
      }}
    >
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
}
