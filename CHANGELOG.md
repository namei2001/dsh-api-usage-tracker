# Changelog

All notable changes to this bundle are documented in this file. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow
[Semantic Versioning](https://semver.org/).

## [Unreleased]

## [3.24.1]

### Changed
- Full light-theme support. Every colour in the workbench is now expressed through
  CSS custom properties, so the light theme can re-point tokens in one scoped
  block instead of at dozens of call sites.
- On a light background the page uses a neutral-bluish canvas with white cards,
  real shadows and stronger 10–18 % hairlines, so module boundaries no longer
  disappear into a white-on-white board.
- Inner quota/KPI cards drop to a faint grey and the heatmap swatches use light
  variants, so a near-black "empty" cell no longer reads as a hole on a white
  card.
- Model tags are inverted in light mode (pale hue tint as ground, deep hue tint
  as text) so monograms stay readable; legend dots, percentages and lintels are
  darkened only where they are used as text.
- The ring groove, chart endpoint cut-outs and drag-handle chrome route through
  theme-aware custom properties instead of hard-coded dark colours.

## [3.23.0]

### Changed
- Provider-share donut now measures its cell and reflows the legend into as
  many columns as fit, shrinking the ring and dropping annotation chips only
  when needed; short/narrow tiles no longer clip providers.
- Quota wallet cards handle zero and negative balances: debt is tinted and
  formatted as `-¥0.03`, and the amount stays in the ring centre.
- Module drag handles / name chrome appear only while editing, on hover or on
  keyboard focus, so they no longer overlap a tile's own title.
- Rebuilt `README.md` as the English primary entry point and added a standalone
  `README.zh.md` Chinese edition, covering all current features, quick start,
  workbench modules, data/privacy, FAQ and the standard-template mapping.

## [3.20.0]

### Added
- Per-call usage records: every `llm/stream` call is tee'd and appended as one
  JSONL line (timestamp, provider, model, session, purpose, input/output/cache
  tokens, finish reason, duration).
- Workbench with 8 arrangeable modules: overview, usage trend, provider share,
  quota & balance, requests by hour, models, activity heatmap, recent calls.
- Quota & balance probes for Kimi Coding, Kimi Coding Global, DeepSeek Official,
  DeepSeek Account, MiniMax CN and WorkBuddy (via existing DSH sessions).
- OpenAI organization usage/costs month-to-date, using an Admin Key stored in
  DSH credentials under `OPENAI_ADMIN_KEY`.
- Local spend tracking: cumulative spend per wallet measured from balance drops.
- Layout persistence on the Host (`layout.json`) so it survives browser resets.
- JSON export and one-click clear of local records.
- Standard project scaffolding: README, docs, LICENSE, CONTRIBUTING,
  CHANGELOG, .env.example, .gitignore and a minimal test suite.

### Changed
- Workbench footer now shows the bundle's real version from `package.json`
  instead of a hard-coded value.
- Web routes are registered through `ctx.inject(['webServer'], ...)` so they
  are available even when the Host boots without the web server ready.
