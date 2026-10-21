import { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { exportToCSV, exportToExcel, exportToJSON } from '@/lib/export';
import { backupSchema } from '@/lib/validation';
import type { BackupFile, Race, RaceCategory } from '@/types';
import {
  FileSpreadsheet,
  Download,
  Upload,
  AlertCircle,
  CheckCircle2,
  Info,
  ShieldCheck,
} from 'lucide-react';

export default function ImportExport() {
  const races = useLiveQuery(() => db.races.toArray(), []) ?? [];
  const categories = useLiveQuery(() => db.categories.toArray(), []) ?? [];

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<{
    type: 'idle' | 'preview' | 'success' | 'error';
    message?: string;
    previewData?: { races: Race[]; categories: RaceCategory[] };
  }>({ type: 'idle' });

  // ─── Export Handlers ────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    if (races.length === 0) {
      alert('No race records to export.');
      return;
    }
    exportToCSV(races, categories);
  };

  const handleExportExcel = () => {
    if (races.length === 0) {
      alert('No race records to export.');
      return;
    }
    exportToExcel(races, categories);
  };

  const handleExportJSON = () => {
    exportToJSON(races, categories);
  };

  // ─── Import Handler ────────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const raw = JSON.parse(event.target?.result as string);
        const result = backupSchema.safeParse(raw);

        if (!result.success) {
          const errDetail = result.error.issues.map((i) => i.message).join(', ');
          setImportStatus({
            type: 'error',
            message: `Invalid backup schema: ${errDetail}`,
          });
          return;
        }

        const validBackup = result.data as BackupFile;
        setImportStatus({
          type: 'preview',
          previewData: {
            races: validBackup.races,
            categories: validBackup.categories,
          },
        });
      } catch {
        setImportStatus({
          type: 'error',
          message: 'Failed to parse JSON file. Please ensure it is a valid Skating Tracker backup.',
        });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Perform Merge Import
  const handleMergeImport = async () => {
    if (!importStatus.previewData) return;
    const { races: newRaces, categories: newCats } = importStatus.previewData;

    try {
      await db.transaction('rw', db.races, db.categories, async () => {
        // Upsert categories
        for (const cat of newCats) {
          const existing = await db.categories.get(cat.id);
          if (!existing) {
            await db.categories.add(cat);
          }
        }
        // Upsert races
        for (const race of newRaces) {
          await db.races.put(race);
        }
      });

      setImportStatus({
        type: 'success',
        message: `Successfully merged ${newRaces.length} races and ${newCats.length} categories.`,
      });
    } catch {
      setImportStatus({
        type: 'error',
        message: 'Database transaction failed during merge.',
      });
    }
  };

  // Perform Replace Import
  const handleReplaceImport = async () => {
    if (!importStatus.previewData) return;
    const { races: newRaces, categories: newCats } = importStatus.previewData;

    try {
      await db.transaction('rw', db.races, db.categories, async () => {
        await db.races.clear();
        await db.categories.clear();
        await db.categories.bulkAdd(newCats);
        await db.races.bulkAdd(newRaces);
      });

      setImportStatus({
        type: 'success',
        message: `Database replaced with ${newRaces.length} races and ${newCats.length} categories.`,
      });
    } catch {
      setImportStatus({
        type: 'error',
        message: 'Database transaction failed during replacement.',
      });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* ─── Header ────────────────────────────────────────────────────── */}
      <div>
        <h1 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
          Import & Export
        </h1>
        <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
          Back up your performance records locally, transfer data to spreadsheets, or restore previous backups.
        </p>
      </div>

      {/* ─── Storage Disclosure Alert ───────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'flex-start',
          padding: '10px 12px',
          backgroundColor: '#F8F8F6',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-card)',
          fontSize: '11.5px',
          color: 'var(--text-secondary)',
        }}
      >
        <Info size={14} color="#777777" style={{ marginTop: '1px', flexShrink: 0 }} />
        <span>
          <strong>Offline & Local Storage Notice:</strong> All race data is stored exclusively in your browser’s IndexedDB. Data is not transmitted to any external server or cloud service. Regularly export a JSON backup to prevent data loss if browser storage is cleared.
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '10px',
        }}
      >
        {/* ─── Export Panel ─────────────────────────────────────────────── */}
        <div className="ent-card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-secondary)',
                display: 'block',
                marginBottom: '4px',
              }}
            >
              DATA EXPORT
            </span>
            <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
              Download your records in standard formats for external analysis or safe archiving.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* JSON Backup */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                backgroundColor: 'var(--surface-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
              }}
            >
              <div>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>
                  JSON Full Backup (.json)
                </span>
                <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                  Complete database backup with schema versioning for lossless restore
                </span>
              </div>
              <button
                type="button"
                onClick={handleExportJSON}
                className="ent-btn ent-btn-primary"
              >
                <Download size={11} /> Backup
              </button>
            </div>

            {/* Excel Export */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                backgroundColor: 'var(--surface-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
              }}
            >
              <div>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>
                  Excel Spreadsheet (.xlsx)
                </span>
                <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                  Worksheets for Race History, Top Performers, and Categories
                </span>
              </div>
              <button
                type="button"
                onClick={handleExportExcel}
                className="ent-btn ent-btn-secondary"
              >
                <FileSpreadsheet size={11} /> Excel
              </button>
            </div>

            {/* CSV Export */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                backgroundColor: 'var(--surface-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
              }}
            >
              <div>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>
                  CSV Race Log (.csv)
                </span>
                <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                  Universal comma-separated tabular records for spreadsheets
                </span>
              </div>
              <button
                type="button"
                onClick={handleExportCSV}
                className="ent-btn ent-btn-secondary"
              >
                <Download size={11} /> CSV
              </button>
            </div>
          </div>
        </div>

        {/* ─── Import Panel ─────────────────────────────────────────────── */}
        <div className="ent-card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-secondary)',
                display: 'block',
                marginBottom: '4px',
              }}
            >
              DATA RESTORE / IMPORT
            </span>
            <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
              Restore from a previously exported Skating Tracker JSON backup file.
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            style={{ display: 'none' }}
            id="backup-file-input"
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: '1px dashed var(--border)',
              borderRadius: '8px',
              padding: '24px 16px',
              textAlign: 'center',
              backgroundColor: '#FAFAF9',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F0F0EE')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FAFAF9')}
          >
            <Upload size={24} color="var(--text-secondary)" style={{ margin: '0 auto 8px' }} />
            <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)', display: 'block' }}>
              Select JSON Backup File
            </span>
            <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
              Click to browse your device for .json backup
            </span>
          </div>

          {/* Import Status and Preview Area */}
          {importStatus.type === 'error' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                backgroundColor: 'var(--perf-negative-bg)',
                border: '1px solid var(--perf-negative-border)',
                borderRadius: '6px',
                color: 'var(--perf-negative)',
                fontSize: '11px',
              }}
            >
              <AlertCircle size={14} style={{ flexShrink: 0 }} />
              <span>{importStatus.message}</span>
            </div>
          )}

          {importStatus.type === 'success' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                backgroundColor: 'var(--perf-positive-bg)',
                border: '1px solid var(--perf-positive-border)',
                borderRadius: '6px',
                color: 'var(--perf-positive)',
                fontSize: '11px',
              }}
            >
              <CheckCircle2 size={14} style={{ flexShrink: 0 }} />
              <span>{importStatus.message}</span>
            </div>
          )}

          {importStatus.type === 'preview' && importStatus.previewData && (
            <div
              style={{
                padding: '10px 12px',
                backgroundColor: 'var(--surface-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={14} color="var(--perf-positive)" />
                <span style={{ fontSize: '11.5px', fontWeight: 600 }}>
                  Validated Backup File Ready
                </span>
              </div>

              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Contains <strong>{importStatus.previewData.races.length} races</strong> and{' '}
                <strong>{importStatus.previewData.categories.length} categories</strong>.
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
                <button
                  type="button"
                  onClick={handleMergeImport}
                  className="ent-btn ent-btn-primary"
                  style={{ flex: 1 }}
                >
                  Merge with Current Data
                </button>
                <button
                  type="button"
                  onClick={handleReplaceImport}
                  className="ent-btn ent-btn-danger"
                  style={{ flex: 1 }}
                >
                  Replace All Data
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
