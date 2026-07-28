# Fitness PWA — Design Spec

**Date:** 2026-07-28  
**Status:** Draft for review  
**Product:** Personal workout logging & routine manager (PWA)

## Goal

Build a mobile-first Progressive Web App for logging workouts and managing routines. Exercise catalog (names, form cues, demo videos) comes from an open dataset. User data starts local-only; cloud sync can be added later without rewriting the UI.

## Decisions (locked)

| Topic | Choice |
|--------|--------|
| Core features | Exercise logging + routines (A+B) |
| Exercise data | [harshvishu/free-exercise-db-with-videos](https://github.com/harshvishu/free-exercise-db-with-videos) (MIT; JSON + male/female demo videos, form cues, common mistakes) |
| Client | Vite + React + TypeScript PWA |
| Storage (v1) | IndexedDB via a `WorkoutStore` interface; sync later |
| Session flow | Start from routine **or** free workout; add/skip exercises mid-session |
| Visual tone | Not bound to reference dark/red skin — visual design is free |
| UX reference | Feature/flow reference from provided screenshots (home routines, session set grid, rest timer, history) — not pixel-perfect clone |

## Non-goals (v1)

- Social, friends, notifications, AI coach
- Ads
- 3D muscle maps (use dataset thumbnails/videos instead)
- Complex program periodization / locked “회차” scheduling
- Account login / multi-device sync (placeholder only via store abstraction)
- Native app stores (PWA install is enough)

## Architecture

```
┌─────────────────────────────────────────┐
│  React UI (pages + session controls)    │
├─────────────────────────────────────────┤
│  Domain services (routines, sessions)   │
├─────────────────────────────────────────┤
│  WorkoutStore interface                 │
│    └─ LocalWorkoutStore (IndexedDB)     │
│    └─ (future) SyncWorkoutStore         │
├─────────────────────────────────────────┤
│  ExerciseCatalog (bundled/cached JSON)  │
│  Media: CDN video URLs from dataset     │
├─────────────────────────────────────────┤
│  Service Worker (app shell + catalog)   │
└─────────────────────────────────────────┘
```

- **Single SPA** — no SSR required for v1.
- **Catalog** — ship `exercises.json` (or fetch once and cache). Videos stream from dataset CDN URLs; offline video is optional, not required for v1.
- **Migration path** — UI talks only to `WorkoutStore` + `ExerciseCatalog`. Moving to Next.js or adding an API later means swapping the store implementation and optionally hosting the catalog.

## Screens & features (MVP)

### Home
- List of user routines: name, target muscle summary, last performed time
- Highlight recent/active routine when available
- **자유운동** — start empty session
- **추가** — create routine (name → search/add exercises in order)

### Routine detail
- Ordered exercise list (thumbnail, name, target muscles)
- **시작** opens a session seeded from the routine
- Empty routine: start disabled

### Active session (core)
- Progress: current exercise index / total
- Set table: set # | KG | reps | completed
- Add/delete sets; mark set complete; “all sets complete”; next exercise
- Mid-session: add exercise from catalog; skip exercise
- Rest timer: default seconds, +/−, pause, reset
- Live session volume (sum of weight × reps for completed sets)
- Exercise info sheet: video, steps, formCues, commonMistakes, breathing

### History (기록)
- Sessions by date
- Session detail: exercises and sets
- Per-exercise recent history and volume comparison vs previous session of the same exercise (when data exists)

### Stats (thin)
- Weekly session count and total volume (minimal charts OK)

### Shell
- Bottom nav: **홈 / 기록 / 통계** (no social). Stats tab shows only the thin weekly metrics above.
- PWA installable; Korean UI labels; catalog copy may remain English in v1

## Data model

### Exercise (catalog, read-only)
- `id`, `name`, `aliases?`
- `bodyPart`, `target`, `secondaryMuscles[]`, `equipment`, `difficulty`
- `compound?`, `unilateral?`
- `shortDescription?`, `instructions?`, `steps[]`, `formCues[]`, `commonMistakes[]`, `breathing?`
- `videos: { male?, female? }`, `thumbnails: { male?, female? }`

### Routine
- `id`, `name`
- `exerciseIds: string[]` (ordered)
- `createdAt`, `updatedAt`, `lastPerformedAt?`

### Session
- `id`
- `routineId: string | null` (null = free workout)
- `startedAt`, `endedAt?`
- `status: 'in_progress' | 'completed' | 'discarded'`
- `items: SessionExercise[]`

### SessionExercise
- `exerciseId`, `order`
- `sets: SessionSet[]`
- `restSecondsDefault?`

### SessionSet
- `setNumber`, `weightKg`, `reps`, `completed: boolean`

### AppSettings
- `defaultRestSeconds`, `weightUnit: 'kg'` (lb later)
- Reserved fields for future sync identity

IDs: UUID v4 for user-generated entities. Timestamps: ISO-8601 strings.

## Error & edge cases

- Closing the app mid-session keeps `in_progress` in IndexedDB; on next open, offer resume.
- Reject empty/negative weight or reps on commit of a set; allow navigating away with incomplete sets after a light confirm.
- Video load failure → show thumbnail + text cues only.
- Offline: routine/session CRUD works from IndexedDB; catalog from cache; videos may fail without network.
- Discard vs complete: user can abandon an in-progress session as `discarded` (excluded from stats) or finish as `completed`.

## Testing (minimum)

- Unit: LocalWorkoutStore — routine CRUD; start session; complete sets; end session; resume in-progress.
- Flow smoke: free workout log; routine → session → complete → appears in history.

## Tech stack (v1)

- Vite, React (current stable), TypeScript
- Client routing (React Router)
- IndexedDB via `idb` (or equivalent thin wrapper)
- vite-plugin-pwa (Workbox) for service worker
- CSS: project-owned tokens/variables (visual direction free; avoid cloning reference brand colors unless chosen later)
- Vitest for unit tests

## Future upgrades (out of MVP, planned hooks)

1. Cloud sync behind `WorkoutStore`
2. Korean localization of exercise names/cues
3. Richer stats / personal records / 1RM estimates
4. Optional local download of videos for full offline
5. Program templates (multi-day splits) on top of routines

## Success criteria (MVP)

- Installable PWA on phone
- Create a routine from catalog exercises and complete a session with set logging + rest timer
- Start a free workout and add exercises mid-session
- See completed sessions in history after reload (persistence)
- Resume an interrupted in-progress session
