# FitLog — Agent Instructions

## Obsidian memory (required)

This project’s durable memory lives in Obsidian so work can continue after a session drop.

- Vault folder: `/opt/data/obsidian-vault/FitLog/`
- Read first when starting: `핸드오프.md`, then `백로그.md`
- After meaningful work (feature, fix, deploy, infra, decision): update Obsidian **before considering the task done**

### Update checklist

1. `핸드오프.md` — recent work, commit hash, commands/URLs if changed  
2. `백로그.md` — check off done items; add new follow-ups  
3. Touch `아키텍처.md` / `결정사항.md` / `배포.md` / `index.md` when those change  

Do not paste secret token values—only env var names (`GITHUB_PUNKRECORDS_TOKEN`, `VERCEL_TOKEN`, etc.).

See also: `.cursor/rules/obsidian-handoff.mdc`
