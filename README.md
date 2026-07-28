# FitLog

운동 기록 · 루틴 관리용 Progressive Web App (로컬 우선).

## 실행

```bash
npm install
npm run dev
```

```bash
npm test -- --run
npm run build
npm run preview
```

## Docker Compose

```bash
cp .env.example .env
docker compose up --build
```

브라우저: `http://localhost:8080` (포트는 `.env`의 `FITLOG_PORT`)

환경변수는 `.env` / Compose로 관리합니다. (이 환경에는 Doppler 토큰이 없어 Compose 방식을 기본으로 둡니다.)

| 변수 | 시점 | 설명 |
|------|------|------|
| `VITE_APP_NAME` | build | 앱 표시 이름 |
| `VITE_DEFAULT_REST_SECONDS` | build | 기본 휴식 초 |
| `FITLOG_PORT` | runtime | 호스트 포트 |
| `FITLOG_API_BASE_URL` | runtime | 향후 동기화 API (MVP 미사용) |
| `FITLOG_PUBLIC_ORIGIN` | runtime | 공개 URL (향후용) |

## 스택

- Vite + React + TypeScript
- IndexedDB (`idb`) via `WorkoutStore`
- PWA (`vite-plugin-pwa`)
- Docker multi-stage build + nginx
- Exercise catalog: [harshvishu/free-exercise-db-with-videos](https://github.com/harshvishu/free-exercise-db-with-videos) (MIT)

## 설계/계획

- `docs/superpowers/specs/2026-07-28-fitness-pwa-design.md`
- `docs/superpowers/plans/2026-07-28-fitness-pwa.md`
