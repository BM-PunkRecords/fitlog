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

## Vercel / duckmu.com

- Production alias: https://fitlog-sage.vercel.app
- Custom domain (Vercel 연결됨, DNS 대기): `fitlog.duckmu.com` (`duckgung.duckmu.com`과 같은 패턴)

Cloudflare DNS에 아래 레코드를 추가하면 서브도메인이 살아납니다 (`duckgung`과 동일하게 Proxied 가능):

| Type | Name | Target |
|------|------|--------|
| CNAME | `fitlog` | `cname.vercel-dns.com` |

(또는 Vercel이 안내하는 `db5e027c52187bba.vercel-dns-017.com`)

## 스택

- Vite + React + TypeScript
- IndexedDB (`idb`) via `WorkoutStore`
- PWA (`vite-plugin-pwa`)
- Docker multi-stage build + nginx
- Vercel (team: parkbeommins-projects)
- Exercise catalog: [harshvishu/free-exercise-db-with-videos](https://github.com/harshvishu/free-exercise-db-with-videos) (MIT)

## 설계/계획

- `docs/superpowers/specs/2026-07-28-fitness-pwa-design.md`
- `docs/superpowers/plans/2026-07-28-fitness-pwa.md`
