# Architecture

The bundle is split into a Host half and a Web client half, following DSH's
plugin model. Both live in this single package.

```
api-usage-tracker/
├── cordis.patch.yml   # insert this plugin into the profile
├── index.js           # Host module (ESM): apply(ctx)
├── client.js          # Web client module: window.__ModuleLoader__.load(...)
├── locale/            # display metadata (title/description), en + zh
├── icon.svg
└── package.json       # exports + dsh.bundle.patch + dsh.client manifest
```

## Host (`index.js`)

- `export const inject = ['llm']`; `export function apply(ctx)`.
- Persistence: a small serial write queue protects `records.jsonl`,
  `settings.json`, `layout.json`, `spend.json` under `<profile>/api-usage-tracker/`.
- Recording: wraps `ctx.on('llm/stream', ...)`. The generator is tee'd; a
  `usage` chunk and the `finish` chunk are captured, then one JSONL record is
  written in the generator's `finally` block. Persistence failures are swallowed
  so recording never breaks a model stream. Each record includes id, ts,
  provider, model, session, purpose, finish, error, duration and flattened
  token counts (input / output / cache read / cache write / reasoning).
- Quota probes: a table of 6 providers (`QUOTA_PROBES`) with per-provider
  parsers. Results are cached (`QUOTA_CACHE_MS`) and refreshed in the
  background; stale data is served immediately.
- OpenAI org usage: uses the Admin Key from `ctx.credentials.resolve('OPENAI_ADMIN_KEY')`,
  with the two org endpoints queried concurrently and cached.
- Spend tracking: `trackWalletSpend()` diffs successive balances per
  `provider:currency` wallet, accumulating drops as locally-tracked spend.
- Routes registered through `ctx.inject(['webServer'], ...)` (not a one-shot
  `ctx.get`) because the web server may not be available at cold boot. Exact
  routes: `GET /api-usage-tracker/data`, `POST /clear`, `/admin-credential`,
  `/settings`, `GET|POST /layout`, `GET /export`.
- `apply(ctx)` returns a disposer that tears down every listener/route.

## Web client (`client.js`)

- Registers via `window.__ModuleLoader__.load({ id: '@local/api-usage-tracker', factory })`.
- Injects three slots: `sidebar.panellist` (panel icon + label), `main`
  (the workbench), and `settings.models.footer` (OpenAI admin key card).
- Uses the Host's own Preact `h` from `require`; no bundled frontend deps.
- State: a 24-column layout document persisted both to `localStorage`
  (`dsau.workbench.v5`) and the Host `/layout` route; snapshots polled from
  `/api-usage-tracker/data`.
- Eight modules (`ov`, `trend`, `donut`, `quota`, `hourly`, `model`, `heat`,
  `table`), each a Preact component with drag/resize handles.
- Bilingual UI: inline dictionaries `DICTS.en` / `DICTS.zh`, language detected
  from context; `locale/*.json` provide the plugin store metadata.

## Security notes

- No real credentials are present in source. The Admin Key is an opaque
  DSH credential reference (`OPENAI_ADMIN_KEY`), set/unset only — never read
  back to the client.
- `.env.example` lists variable names only; `.env` is git-ignored.
- All HTTP calls from the client are same-origin to the Host routes; upstream
  provider calls are made by the Host.
