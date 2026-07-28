# Fitness PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an installable Vite React TypeScript PWA that logs workouts, manages routines, and uses the free-exercise-db-with-videos catalog with IndexedDB-backed local persistence.

**Architecture:** SPA with `ExerciseCatalog` (bundled JSON) and `WorkoutStore` (IndexedDB via `idb`). UI never talks to IndexedDB directly. Session/resume, history, and thin stats read through the store. PWA via `vite-plugin-pwa`.

**Tech Stack:** Vite, React, TypeScript, React Router, `idb`, `vite-plugin-pwa`, Vitest, CSS variables (independent visual tone — cool slate + lime accent, not reference red/dark clone).

## Global Constraints

- Korean UI labels; catalog exercise text may stay English in v1
- Local-only storage behind `WorkoutStore`; no auth in v1
- Exercise source: harshvishu/free-exercise-db-with-videos `data/exercises.json`
- No social/AI/ads/3D muscle maps
- IDs: UUID v4; timestamps ISO-8601
- Weight unit: kg; default rest from `AppSettings.defaultRestSeconds` (90)

## File structure

```
package.json
vite.config.ts
tsconfig.json
index.html
public/icons/icon-192.png
public/icons/icon-512.png
src/main.tsx
src/App.tsx
src/styles/tokens.css
src/styles/global.css
src/types/models.ts
src/catalog/types.ts
src/catalog/loadCatalog.ts
src/catalog/searchExercises.ts
src/data/exercises.json          # vendored copy of dataset
src/store/WorkoutStore.ts        # interface
src/store/LocalWorkoutStore.ts
src/store/createId.ts
src/store/volume.ts
src/store/stats.ts
src/context/AppDataContext.tsx
src/components/BottomNav.tsx
src/components/ExercisePicker.tsx
src/components/RestTimer.tsx
src/components/ExerciseInfoSheet.tsx
src/components/ResumeBanner.tsx
src/pages/HomePage.tsx
src/pages/RoutineDetailPage.tsx
src/pages/RoutineEditPage.tsx
src/pages/SessionPage.tsx
src/pages/HistoryPage.tsx
src/pages/SessionDetailPage.tsx
src/pages/StatsPage.tsx
src/test/setup.ts
src/store/LocalWorkoutStore.test.ts
src/store/volume.test.ts
src/catalog/searchExercises.test.ts
```

---

### Task 1: Scaffold Vite React TS + Vitest + PWA

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/vite-env.d.ts`, `src/test/setup.ts`, `src/styles/tokens.css`, `src/styles/global.css`, `public/icons/*`

**Interfaces:**
- Produces: runnable `npm run dev`, `npm test`, PWA plugin configured

- [ ] **Step 1: Scaffold project with Vite React-TS template in repo root** (`/opt/data/projects/fitness-pwa`) without overwriting `docs/`

```bash
cd /opt/data/projects/fitness-pwa
npm create vite@latest . -- --template react-ts
# If prompt about non-empty dir: create in /tmp/fitness-scaffold and move files excluding docs/
```

- [ ] **Step 2: Install deps**

```bash
npm install react-router-dom idb
npm install -D vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event vite-plugin-pwa fake-indexeddb
```

- [ ] **Step 3: Configure `vite.config.ts`**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'FitLog',
        short_name: 'FitLog',
        description: '운동 기록 · 루틴 관리',
        theme_color: '#0f1c1a',
        background_color: '#0f1c1a',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff2}'],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: true,
  },
})
```

- [ ] **Step 4: Add CSS tokens** (slate base + lime accent — not purple, not reference red)

```css
/* src/styles/tokens.css */
:root {
  --bg: #0f1c1a;
  --bg-elevated: #17302b;
  --bg-input: #1f3d37;
  --text: #f2f7f5;
  --text-muted: #9bb5ad;
  --accent: #b6f34d;
  --accent-ink: #132419;
  --danger: #ff6b6b;
  --ok: #5ddea0;
  --radius: 14px;
  --font-display: "Syne", system-ui, sans-serif;
  --font-body: "DM Sans", system-ui, sans-serif;
}
```

- [ ] **Step 5: Verify**

```bash
npm test -- --run
npm run build
```

Expected: tests pass (default/empty OK), build succeeds

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "chore: scaffold Vite React PWA with Vitest"
```

---

### Task 2: Domain types + volume helpers

**Files:**
- Create: `src/types/models.ts`, `src/catalog/types.ts`, `src/store/volume.ts`, `src/store/volume.test.ts`, `src/store/createId.ts`

**Interfaces:**
- Produces: `Exercise`, `Routine`, `Session`, `SessionExercise`, `SessionSet`, `AppSettings`, `sessionVolume(session): number`, `createId(): string`

- [ ] **Step 1: Write failing volume test**

```ts
// src/store/volume.test.ts
import { describe, it, expect } from 'vitest'
import { sessionVolume, exerciseVolume } from './volume'
import type { Session, SessionExercise } from '../types/models'

const item = (sets: { weightKg: number; reps: number; completed: boolean }[]): SessionExercise => ({
  exerciseId: 'e1',
  order: 0,
  sets: sets.map((s, i) => ({ setNumber: i + 1, ...s })),
})

describe('sessionVolume', () => {
  it('sums weight*reps for completed sets only', () => {
    const session: Session = {
      id: 's1',
      routineId: null,
      startedAt: '2026-07-28T00:00:00.000Z',
      status: 'in_progress',
      items: [
        item([
          { weightKg: 50, reps: 10, completed: true },
          { weightKg: 50, reps: 8, completed: false },
        ]),
      ],
    }
    expect(sessionVolume(session)).toBe(500)
    expect(exerciseVolume(session.items[0])).toBe(500)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- --run src/store/volume.test.ts
```

- [ ] **Step 3: Implement types + volume + createId**

```ts
// src/types/models.ts — match design spec fields exactly
// src/catalog/types.ts — Exercise matching dataset JSON
// src/store/volume.ts
export function exerciseVolume(item: SessionExercise): number {
  return item.sets.filter(s => s.completed).reduce((n, s) => n + s.weightKg * s.reps, 0)
}
export function sessionVolume(session: Session): number {
  return session.items.reduce((n, item) => n + exerciseVolume(item), 0)
}
```

- [ ] **Step 4: Run tests — PASS**

- [ ] **Step 5: Commit** `feat: add domain types and volume helpers`

---

### Task 3: Vendor catalog + search

**Files:**
- Create: `src/data/exercises.json`, `src/catalog/loadCatalog.ts`, `src/catalog/searchExercises.ts`, `src/catalog/searchExercises.test.ts`

**Interfaces:**
- Produces: `loadCatalog(): Exercise[]`, `searchExercises(exercises, query, filters?): Exercise[]`

- [ ] **Step 1: Download catalog**

```bash
curl -fsSL -o src/data/exercises.json \
  https://raw.githubusercontent.com/harshvishu/free-exercise-db-with-videos/main/data/exercises.json
```

- [ ] **Step 2: Failing search test** — query `"bench"` returns names containing bench; filter `bodyPart: 'chest'`

- [ ] **Step 3: Implement `searchExercises` (case-insensitive name/alias/target; optional bodyPart/equipment)

- [ ] **Step 4: `loadCatalog` imports JSON and returns typed array

- [ ] **Step 5: Tests PASS + commit `feat: vendor exercise catalog and search`

---

### Task 4: LocalWorkoutStore (TDD)

**Files:**
- Create: `src/store/WorkoutStore.ts`, `src/store/LocalWorkoutStore.ts`, `src/store/LocalWorkoutStore.test.ts`, `src/store/stats.ts`

**Interfaces:**
- Produces:

```ts
export interface WorkoutStore {
  getSettings(): Promise<AppSettings>
  saveSettings(settings: AppSettings): Promise<void>
  listRoutines(): Promise<Routine[]>
  getRoutine(id: string): Promise<Routine | undefined>
  upsertRoutine(routine: Routine): Promise<void>
  deleteRoutine(id: string): Promise<void>
  getInProgressSession(): Promise<Session | undefined>
  getSession(id: string): Promise<Session | undefined>
  listSessions(opts?: { status?: Session['status'] }): Promise<Session[]>
  saveSession(session: Session): Promise<void>
  /** Marks completed, sets endedAt, updates routine.lastPerformedAt when routineId set */
  completeSession(sessionId: string): Promise<Session>
  discardSession(sessionId: string): Promise<Session>
}
```

- [ ] **Step 1: Write failing tests** with `fake-indexeddb/auto` imported in test file:
  - create/list/update/delete routine
  - start free session (caller builds Session; store saves)
  - update sets; completeSession; list completed only
  - getInProgressSession returns only `in_progress`
  - discardSession excludes from completed list

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Implement IndexedDB stores: `settings`, `routines`, `sessions` via `idb` openDB

- [ ] **Step 4: Implement `weeklyStats(sessions, now = new Date())` in `stats.ts` — count completed sessions and total volume in last 7 days

- [ ] **Step 5: PASS + commit `feat: IndexedDB LocalWorkoutStore`

---

### Task 5: App shell, context, routing, resume banner

**Files:**
- Modify: `src/main.tsx`, `src/App.tsx`
- Create: `src/context/AppDataContext.tsx`, `src/components/BottomNav.tsx`, `src/components/ResumeBanner.tsx`, stub pages

**Interfaces:**
- Produces: `useAppData()` → `{ store, catalog, refresh, ready }`
- Routes: `/`, `/routines/new`, `/routines/:id`, `/routines/:id/edit`, `/session/:id`, `/history`, `/history/:id`, `/stats`

- [ ] **Step 1: AppDataContext** opens `LocalWorkoutStore`, loads catalog once, exposes values

- [ ] **Step 2: BottomNav** — 홈 / 기록 / 통계

- [ ] **Step 3: ResumeBanner** on home if `getInProgressSession()` — buttons 이어하기 → `/session/:id`, 폐기 → `discardSession`

- [ ] **Step 4: Wire Router + layout**

- [ ] **Step 5: Manual smoke `npm run dev` + commit `feat: app shell routing and data context`

---

### Task 6: Home + routine create/detail

**Files:**
- Create: `src/pages/HomePage.tsx`, `src/pages/RoutineDetailPage.tsx`, `src/pages/RoutineEditPage.tsx`, `src/components/ExercisePicker.tsx`

**Interfaces:**
- Consumes: `store.listRoutines`, `upsertRoutine`, `catalog` + `searchExercises`
- Free workout: create Session `{ routineId: null, status: 'in_progress', items: [] }`, `saveSession`, navigate to session
- Routine start: seed `items` from `exerciseIds` with 3 empty incomplete sets (0 kg / 0 reps) each — user fills before marking complete; validating complete rejects weight/reps ≤ 0

- [ ] **Step 1: HomePage** — routine list (name, muscle summary from catalog targets, relative lastPerformedAt), FABs 자유운동 / 추가

- [ ] **Step 2: RoutineEditPage** — name input + ExercisePicker multi-add ordered list + save

- [ ] **Step 3: RoutineDetailPage** — list exercises, 시작 disabled if empty

- [ ] **Step 4: Commit** `feat: home routines and exercise picker`

---

### Task 7: Session page + rest timer + exercise info

**Files:**
- Create: `src/pages/SessionPage.tsx`, `src/components/RestTimer.tsx`, `src/components/ExerciseInfoSheet.tsx`

**Interfaces:**
- Persist on every set change via `saveSession`
- RestTimer props: `seconds`, `onChangeDefault`, controlled countdown with +/− 15s, pause, reset
- Complete set: require `weightKg > 0 && reps > 0` else show inline error
- Next exercise / skip / add via picker
- Finish: `completeSession` → history detail
- Discard: confirm → `discardSession` → home

- [ ] **Step 1: Implement SessionPage set grid + actions**

- [ ] **Step 2: RestTimer** starts when a set is marked complete (uses settings.defaultRestSeconds)

- [ ] **Step 3: ExerciseInfoSheet** video (`videos.male` fallback female), steps, cues, mistakes; on video error show thumbnail + text

- [ ] **Step 4: Commit** `feat: active session logging with rest timer`

---

### Task 8: History + stats

**Files:**
- Create: `src/pages/HistoryPage.tsx`, `src/pages/SessionDetailPage.tsx`, `src/pages/StatsPage.tsx`

**Interfaces:**
- History lists `status === 'completed'` newest first, grouped by local date
- Session detail shows sets; per exercise show previous completed session volume delta when found
- StatsPage uses `weeklyStats`

- [ ] **Step 1: Implement history list + detail**

- [ ] **Step 2: Implement stats page**

- [ ] **Step 3: Commit** `feat: history and weekly stats`

---

### Task 9: Polish, icons, verification

**Files:**
- Create simple PNG icons (or SVG converted) under `public/icons/`
- Modify: README.md with run instructions + dataset credit

- [ ] **Step 1: Add README** — npm install/dev/build/test; credit harshvishu/free-exercise-db-with-videos MIT

- [ ] **Step 2: Full verify**

```bash
npm test -- --run
npm run build
```

Expected: all tests pass; production build OK

- [ ] **Step 3: Final commit** `chore: docs icons and verify MVP`

---

## Spec coverage checklist

| Spec item | Task |
|-----------|------|
| Vite React TS PWA | 1 |
| Catalog from free-exercise-db-with-videos | 3 |
| WorkoutStore + IndexedDB | 4 |
| Home / free / add routine | 6 |
| Routine detail start | 6 |
| Session sets / add-skip / volume | 7 |
| Rest timer | 7 |
| Exercise video + cues | 7 |
| History + volume compare | 8 |
| Thin weekly stats | 8 |
| Resume in-progress | 5 |
| Korean UI labels | 5–8 |
| Visual tone free (own tokens) | 1 |
