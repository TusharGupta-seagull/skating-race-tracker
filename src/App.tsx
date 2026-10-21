import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';
import { lazy, Suspense } from 'react';
import { Spinner } from '@/components/ui';
import { SyncProvider } from '@/context/SyncContext';

const Dashboard = lazy(() => import('@/features/dashboard/Dashboard'));
const RaceHistory = lazy(() => import('@/features/races/RaceHistory'));
const PersonalBests = lazy(() => import('@/features/bests/PersonalBests'));
const PerformanceTrends = lazy(() => import('@/features/trends/PerformanceTrends'));
const AddRace = lazy(() => import('@/features/races/AddRace'));
const EditRace = lazy(() => import('@/features/races/EditRace'));
const RaceDetail = lazy(() => import('@/features/races/RaceDetail'));
const RaceCategories = lazy(() => import('@/features/categories/RaceCategories'));
const ImportExport = lazy(() => import('@/features/export/ImportExport'));
const Settings = lazy(() => import('@/features/settings/Settings'));

function AppShell() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div
      id="app-shell"
      style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: 'var(--shell-bg)',
        display: 'flex',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
        {/* Desktop Sidebar (194px) */}
        <div className="hidden md:block" style={{ height: '100%', flexShrink: 0 }}>
          <Sidebar />
        </div>

        {/* Mobile Sidebar Drawer */}
        {mobileMenuOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              zIndex: 999,
              display: 'flex',
            }}
            onClick={() => setMobileMenuOpen(false)}
          >
            <div
              style={{
                width: 'var(--sidebar-w)',
                height: '100%',
                backgroundColor: 'var(--sidebar-bg)',
                boxShadow: '4px 0 24px rgba(0,0,0,0.15)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <Sidebar onCloseMobile={() => setMobileMenuOpen(false)} />
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
            height: '100%',
            overflow: 'hidden',
          }}
        >
          {/* Top Utility Bar (38-42px) */}
          <TopBar onOpenMobileMenu={() => setMobileMenuOpen(true)} />

          {/* Scrollable Page Body */}
          <main
            id="main-content"
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '14px 16px',
              backgroundColor: 'var(--shell-bg)',
            }}
            className="custom-scrollbar"
          >
            <Suspense
              fallback={
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '240px',
                  }}
                >
                  <Spinner size={24} />
                </div>
              }
            >
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/history" element={<RaceHistory />} />
                <Route path="/bests" element={<PersonalBests />} />
                <Route path="/trends" element={<PerformanceTrends />} />
                <Route path="/add" element={<AddRace />} />
                <Route path="/categories" element={<RaceCategories />} />
                <Route path="/export" element={<ImportExport />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/race/:id/edit" element={<EditRace />} />
                <Route path="/race/:id" element={<RaceDetail />} />
              </Routes>
            </Suspense>
          </main>
        </div>
      </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <SyncProvider>
        <AppShell />
      </SyncProvider>
    </BrowserRouter>
  );
}
