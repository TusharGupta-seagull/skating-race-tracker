# ⛸ Skating Race Tracker

A fast, offline-first personal speed skating performance tracker. Log race results, track personal bests, visualize time progression, and manage your skating history — all stored locally in your browser with no login required.

---

## Features

- **Add Race** — Log event name, date, year, category, your time & rank, plus top performers (1st–3rd)
- **Race History** — Filterable, sortable table/cards with search by name, year, and category
- **Dashboard** — Summary stats, personal best cards per category, time progression line charts
- **Categories** — Add, rename, archive, and restore race categories without breaking history
- **Backup** — Export CSV, Excel (.xlsx), or JSON; import JSON backup with merge/replace options
- **PWA** — Installable on mobile and desktop; fully offline after first load
- **No login** — All data stored in IndexedDB, zero server required

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Build | Vite 8 |
| Styling | Tailwind CSS v4 |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| Database | Dexie.js (IndexedDB) |
| Export | SheetJS (xlsx) |
| PWA | vite-plugin-pwa (Workbox) |
| Icons | Lucide React |
| Router | React Router DOM |

---

## Project Structure

```
src/
├── app/              # App shell and routes (App.tsx)
├── components/       # Shared UI (ui.tsx, Navigation.tsx)
├── features/
│   ├── dashboard/    # Dashboard with stats and charts
│   ├── races/        # Add, Edit, Detail, History
│   └── settings/     # Categories + backup
├── db/               # Dexie schema, repositories, seed data
├── lib/
│   ├── time.ts       # Parse/format milliseconds ↔ mm:ss.cs
│   ├── analytics.ts  # Personal bests, chart points, dashboard stats
│   ├── validation.ts # Zod schemas
│   ├── export.ts     # CSV, Excel, JSON export
│   └── nanoid.ts     # Crypto-based ID generator
└── types/            # Shared TypeScript types
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Development

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### Production Build

```bash
npm run build
npm run preview
```

### TypeScript Check

```bash
npx tsc --noEmit
```

---

## Default Categories

On first run, the following categories are seeded:

- 1 Lap (Rink)
- 500m + D
- 1000m
- Time Trial (TT)
- Road Race

---

## Time Format

Times use **`mm:ss.cs`** format (centiseconds, not milliseconds):

```
01:23.45  →  1 min, 23 sec, 45 centiseconds  =  83,450 ms
00:45.60  →  45.6 seconds                     =  45,600 ms
```

Stored internally as **integer milliseconds** in IndexedDB.

---

## Data Storage & Backup

> ⚠️ **Important:** Data is stored in your **browser's IndexedDB** and:
> - Does **not** sync between devices
> - Will be **lost** if you clear browser storage or site data
> - Is **not** accessible from other browsers on the same device

### Backup (Recommended)

Export a **JSON backup** regularly from **Settings → Export & Backup**.

Import options:
- **Merge** — adds new records, skips conflicting IDs
- **Replace** — replaces ALL data with the backup

CSV and Excel exports are for interoperability only (not restorable).

---

## PWA / Installation

For full offline support and installability:

1. Serve over **HTTPS** in production
2. A browser "Add to Home Screen" or "Install" prompt will appear
3. After installation, all previously loaded data is available offline

> The service worker caches app shell assets only. Race data lives in IndexedDB.

---

## Deployment (Free)

### Netlify

```bash
npm run build
# Drag-and-drop the dist/ folder to app.netlify.com
```

### Vercel

```bash
npx vercel --prod
# Select "Vite" when prompted
```

### GitHub Pages

```bash
npm run build
# Push dist/ contents to gh-pages branch
```

> Set `base: '/repo-name/'` in `vite.config.ts` if deploying to a GitHub Pages subdirectory.

---

## Known Limitations

- No cloud sync — single device only without manual export/import
- No user accounts or authentication (by design)
- No backend — all computation is client-side
- Large chart datasets (500+ races per category) may need virtualization in a future version
- Service worker requires HTTPS for full PWA installation in production

---

## License

MIT — personal use and self-hosting encouraged.
