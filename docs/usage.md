# Usage guide

This bundle adds an **API usage workbench** to the DSH Web GUI. It records
every model API call made through DSH and shows where your tokens and quotas go.

## Install

The bundle is a local DSH plugin (a Cordis bundle), not a standalone app.

- Using the DSH plugin manager tool: `install_bundle` with the **absolute path**
  to this directory.
- Using the Web GUI: **Plugins → Add plugin → local directory**, choose the
  folder containing `package.json`.

Enable the plugin, then restart DSH or refresh the Web GUI. A new panel appears
in the left sidebar (labeled "API usage tracker" / "API 用量统计"); click it to
open the workbench.

## Workbench modules

The workbench is a 24-column grid of eight tiles you can resize and rearrange
(your layout is saved automatically):

| Module | What it shows |
| --- | --- |
| Overview | Total calls, input/output/cache tokens, recent activity |
| Usage trend | Requests and tokens over time |
| Provider share | Donut chart of usage per provider |
| Quota & balance | Remaining quota windows and wallet balances per provider |
| Requests by hour | Daily request histogram by hour |
| Models | Token usage broken down by model |
| Activity heatmap | Time-of-day / day-of-week density |
| Recent calls | Table of the latest calls (time, provider, model, tokens, duration) |

Use the toolbar controls to change the time range, force-refresh quotas, export
the data as JSON, or clear local records.

## Quota probes

The Host reads quota/balance from existing DSH sessions for these providers:

- Kimi Coding (`kimi-coding`)
- Kimi Coding Global (`kimi-coding-global`)
- DeepSeek Official (`deepseek-official`)
- DeepSeek Account (`deepseek-account`)
- MiniMax CN (`minimax-cn`)
- WorkBuddy (`workbuddy`)

No API keys for these services are stored by this plugin — it relies on being
logged in through DSH. Some providers expose only a balance, not a usage number;
for those the Host tracks spend locally by accumulating balance drops (`spend.json`).

## OpenAI organization usage & Admin Key

To show OpenAI org usage/costs (month to date, UTC), set an OpenAI **Admin Key**:

1. Open the workbench, scroll to the **OpenAI Admin Key** footer card in the
   models area, or go to **Settings → Models** and find the `api-usage-openai-admin`
   footer section.
2. Paste the Admin Key and save. It is stored in DSH credentials under the
   reference name `OPENAI_ADMIN_KEY` and can be cleared from the same card.

The key is write-only: the plugin never reads it back into the UI or logs it.
The Host uses it against `https://api.openai.com/v1/organization/usage/costs`
and `/v1/organization/costs`. You can also set a monthly budget (USD) for the
spend progress bar; the value lives in `settings.json`.

## Data & privacy

All usage records stay on your machine. The Host writes to:

```
<profile>/api-usage-tracker/
├── records.jsonl   # one JSON object per LLM call (token counts, no prompt text)
├── settings.json   # openaiBudgetUsd
├── layout.json     # saved workbench layout
└── spend.json      # locally accumulated spend per wallet
```

`<profile>` is `DSH_PROFILE_DIR`, else `DSH_HOME`, else `~/.deepseek-harness`.
`records.jsonl` is capped at 50,000 lines (oldest dropped). Records contain
metadata only — no prompts or response bodies. Clearing records removes
`records.jsonl` (other files are kept). Export produces a JSON snapshot of the
current data.
