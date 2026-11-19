# Contributing

Thanks for helping improve the API Usage Tracker. This bundle runs inside
[DeepSeek Harness (DSH)](https://github.com/); it is plain JavaScript (ESM), not
a Python package, so the usual `pyproject.toml` / `src/` layout does not apply.

## Setup

1. Clone/download this directory. It has **no npm dependencies** — the Host
   provides Cordis, Preact and the module loader at runtime.
2. Check syntax before installing (use any Node.js ≥ 18):

   ```bash
   node --check index.js
   node --check client.js
   ```

3. Run the lightweight test suite:

   ```bash
   node --test test/*.test.js
   ```

## Installing into DSH

Use the DSH plugin manager (recommended):

- `plugin_manager` with `action: "install_bundle"` and `target` set to the
  **absolute path** of this directory, or
- In the Web GUI: **Plugins → Add plugin → local directory**, select this folder.

Restart DSH / refresh the Web GUI if the workbench does not appear. Do **not**
edit the profile's `cordis.patch.yml` by hand to configure the plugin; use the
DSH settings UI.

## Code layout

| File | Role |
| --- | --- |
| `index.js` | Host half: record persistence, quota probes, settings/data routes |
| `client.js` | Web client half: sidebar panel, workbench modules, admin key UI |
| `cordis.patch.yml` | Bundle patch that inserts this plugin into the profile |
| `locale/*.json` | Plugin display title/description (en / zh) |
| `icon.svg` | Plugin icon |
| `docs/` | Architecture and usage notes |
| `test/` | Minimal node:test suite |

Keep every file that is needed at runtime in the `files` array of
`package.json`; otherwise the installed bundle will be incomplete.

## Guidelines

- Never commit real API keys. Secrets live in DSH credentials (`ctx.credentials`),
  never in source, `.env` or config files.
- Do not change the public route paths (`/api-usage-tracker/*`) without updating
  both halves and the docs.
- Resource registration must be cleaned up: return a disposer from `apply(ctx)`.
- Prefer small, focused changes; update `CHANGELOG.md` and this README when
  behavior changes.

## License

By contributing you agree that your contributions are licensed under the
same terms as the project (see [LICENSE](LICENSE)).
