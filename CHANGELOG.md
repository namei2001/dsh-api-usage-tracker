# Changelog

All notable changes to this bundle are documented in this file. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow
[Semantic Versioning](https://semver.org/).

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
