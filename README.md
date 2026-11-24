# API Usage Tracker

[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![runtime](https://img.shields.io/badge/runtime-DSH%20bundle-brightgreen.svg)](https://github.com/deepseek-ai/deepseek-harness)
[![node](https://img.shields.io/badge/node-%E2%89%A518-339933.svg)](https://nodejs.org/)
[![version](https://img.shields.io/badge/version-3.23.0-orange.svg)](package.json)

**A local usage meter for [the agent runtime (DSH)](https://github.com/deepseek-ai/deepseek-harness): every model call recorded, every token and quota accounted for — right in the sidebar.**

> English is the primary edition. [中文版](README.zh.md) · This is the English README.

---

## Contents

- [What it is](#what-it-is)
- [Features](#features)
- [Install & enable](#install--enable)
- [Quick start](#quick-start)
- [Workbench modules](#workbench-modules)
- [Data & privacy](#data--privacy)
- [Development & verification](#development--verification)
- [FAQ](#faq)
- [Security notes](#security-notes)
- [Repository layout](#repository-layout)
- [License](#license)

## What it is

API Usage Tracker is a **local DSH plugin bundle (Cordis bundle)** — it is not a
standalone app and it is not a Python project. It hooks into DSH's `llm/stream`
event, appends one compact metadata record per model call to a local JSONL file,
and renders an interactive workbench in the DSH Web GUI sidebar.

Because it runs inside DSH, it can also reuse the sessions you are already
logged in with to read remaining quotas and wallet balances — no extra API keys
needed for those providers. Optionally, an OpenAI Admin Key enables
organization-level usage and cost reporting.

> **Zero runtime dependencies**: Preact, Cordis and the module loader are all
> supplied by the DSH host. There is nothing to `npm install`.

## Features

- **Per-call records** — one JSONL line per LLM call: timestamp, provider,
  model, session, purpose, input/output/cache/reasoning tokens, finish reason
  and duration. Metadata only — no prompts, no response bodies.
- **Eight-tile workbench** — Overview, Usage trend, Provider share, Quota &
  balance, Requests by hour, Models, Activity heatmap, Recent calls. Tiles are
  drag-and-drop, resizable, and the layout is saved on the host.
- **Adaptive provider-share chart** — the donut measures its own cell and
  reflows its legend into as many columns as fit, shrinking the ring and finally
  dropping the annotation chips only when necessary. No more clipped providers
  when a tile is short or narrow.
- **Quota & balance probes** — Kimi Coding, Kimi Coding Global, DeepSeek
  Official, DeepSeek Account, MiniMax CN and WorkBuddy, using your existing DSH
  sessions. Results are cached for two minutes; force-refresh from the toolbar.
- **Wallet-aware balances** — provider wallets (top-up + granted funds) are
  drawn as composition rings with the amount in the centre; a negative balance
  is coloured as debt and formatted correctly as `-¥0.03` (not `¥-0.03`).
- **OpenAI organization usage/costs** — month-to-date (UTC) usage and cost with
  an optional monthly budget progress bar, using an Admin Key stored in DSH
  credentials.
- **Local spend tracking** — for providers that expose only a balance, spend is
  accumulated locally from balance drops (`spend.json`).
- **Export & clear** — one-click JSON snapshot export and one-click clear of
  local call records.
- **Permission-aware layout editing** — module drag handles and name chrome
  appear only while editing or on hover/focus, so they never overlap a tile's
  own title.
- **Bilingual UI** — English / Chinese, detected from the DSH context.

## Install & enable

1. **Plugin manager (recommended)** — call `plugin_manager` with
   `action: "install_bundle"` and `target` set to the **absolute path** of this
   directory.
2. **Web GUI** — **Plugins → Add plugin → local directory**, then select the
   folder containing `package.json`.

Restart DSH or refresh the Web GUI. A panel labelled **API usage tracker** opens
from the left sidebar (bar-chart icon, order 20).

Detailed guides: [`docs/usage.md`](docs/usage.md) and
[`docs/architecture.md`](docs/architecture.md).

## Quick start

1. Install and enable the bundle (above), then open the sidebar panel.
2. Use the toolbar to pick a time range, force-refresh quotas, export JSON or
   clear local records.
3. Drag a tile's edge to resize; the layout is saved automatically.
4. **Optional — OpenAI Admin Key**: at the bottom of the Models area, or under
   **Settings → Models**, find the **OpenAI Admin Key** card, paste the key and
   save.

The key is stored in the DSH credential system under the reference name
`OPENAI_ADMIN_KEY`. It is **write-only**: the bundle never echoes it back to the
UI, writes it to logs, or drops it into the project. Clear it from the same card.

## Workbench modules

The workbench is a 24-column grid with eight modules:

| ID | Module | What it shows |
| --- | --- | --- |
| `ov` | Overview | Total calls, token totals, recent activity |
| `trend` | Usage trend | Requests and tokens over time |
| `donut` | Provider share | Adaptive donut of usage per provider |
| `quota` | Quota & balance | Remaining quota windows and wallet balances |
| `hourly` | Requests by hour | Daily request histogram by hour |
| `model` | Models | Token usage broken down by model |
| `heat` | Activity heatmap | Time-of-day × day-of-week density |
| `table` | Recent calls | Time, provider, model, tokens, duration per call |

## Data & privacy

The host writes under the DSH profile directory
(`DSH_PROFILE_DIR` → `DSH_HOME` → `~/.deepseek-harness`):

```
<profile>/api-usage-tracker/
├── records.jsonl   # one metadata record per call (no prompts/responses)
├── settings.json   # OpenAI monthly budget (openaiBudgetUsd)
├── layout.json     # saved workbench layout
└── spend.json      # locally accumulated spend per wallet
```

- `records.jsonl` is capped at 50,000 lines; the oldest records are dropped.
- **All data stays on your machine.** Records contain metadata only.
- Clearing records removes only `records.jsonl`; export produces a JSON snapshot
  of the current data.

## Development & verification

No `npm install` needed. With any Node.js ≥ 18:

```bash
node --check index.js
node --check client.js
node scripts/check-bundle.js     # manifest and file-integrity check
node --test test/*.test.js       # zero-dependency tests
```

CI runs the manifest check and tests on `ubuntu-latest` with Node 20. See
[`CONTRIBUTING.md`](CONTRIBUTING.md) before contributing; update
[`CHANGELOG.md`](CHANGELOG.md) for behaviour changes.

## FAQ

- **No sidebar panel after install?** Check that `package.json`'s `files[]`
  contains `index.js`, `client.js`, `cordis.patch.yml`, `icon.svg` and
  `locale/*.json`; run `node scripts/check-bundle.js` to self-check, then
  restart DSH or refresh the GUI.
- **Quota unavailable?** Quota probes reuse DSH logins — sign in to the
  provider in DSH first. Results are cached for two minutes; use the toolbar
  refresh to force an update.
- **OpenAI usage missing?** Confirm the Admin Key is set (see Quick start). The
  key is a write-only reference, so it cannot be read back — set or clear it
  again from the card.

## Security notes

- No real credentials are present in source. The Admin Key is an opaque DSH
  credential reference, set/unset only and never read back to the client.
- `.env.example` lists variable names only; `.env` is git-ignored.
- All client requests are same-origin host routes (`/api-usage-tracker/*`);
  upstream provider calls are made by the host.
- `apply(ctx)` returns a disposer that releases every listener and route, so
  uninstalling leaves nothing behind.

## Repository layout

This is a JavaScript (ESM) bundle, so the Python-specific template entries are
adapted to equivalent DSH plugin structure.

| Standard template | This project | Notes |
| --- | --- | --- |
| `.github/workflows/` | ✅ `.github/workflows/ci.yml` | Node syntax/manifest check + tests |
| `docs/` | ✅ `docs/usage.md`, `docs/architecture.md` | Usage & architecture guides |
| `scripts/` | ✅ `scripts/check-bundle.js` | Zero-dependency validator |
| `src/your_package/` | ✅ root `index.js` / `client.js` | DSH bundles keep source at the root |
| `tests/` | ✅ `test/bundle.test.js`, `test/README.md` | `node:test` lightweight tests |
| `.env.example` | ✅ | Variable names only, no secrets |
| `.gitignore` | ✅ | Ignores `.env`, runtime data, build output |
| `CHANGELOG.md` | ✅ | Keep a Changelog format |
| `CONTRIBUTING.md` | ✅ | Contribution & install guide |
| `LICENSE` | ✅ | MIT |
| `README.md` | ✅ `README.md` + `README.zh.md` | English primary + Chinese edition |
| `pyproject.toml` | ➡️ `package.json` | JS equivalent: `exports` + `dsh.bundle.patch` + `dsh.client` |
| `Dockerfile` | ➖ N/A | Runs inside the DSH host |

```
api-usage-tracker/
├── .github/workflows/ci.yml
├── docs/
│   ├── architecture.md
│   └── usage.md
├── scripts/check-bundle.js
├── test/
│   ├── README.md
│   └── bundle.test.js
├── .env.example
├── .gitignore
├── CHANGELOG.md
├── CONTRIBUTING.md
├── LICENSE
├── README.md            # English (primary)
├── README.zh.md         # 中文版
├── package.json
├── cordis.patch.yml
├── index.js             # Host: recording, quota probes, routes
├── client.js            # Web: sidebar panel, workbench, key card
├── locale/
│   ├── en.json
│   └── zh.json
└── icon.svg
```

## License

[MIT](LICENSE) © 2026 API Usage Tracker contributors.
