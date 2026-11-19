/**
 * Host half of @local/api-usage-tracker.
 *
 * Observes every `llm/stream` waterfall call (one per streaming model call,
 * covering every registered provider — current and future), persists one JSONL
 * record per call, probes provider quota/balance APIs (Kimi Code, DeepSeek,
 * DeepSeek Account), queries OpenAI organization usage/costs, and serves the
 * workbench data over same-origin HTTP routes.
 */
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import { join } from 'node:path'

export const inject = ['llm']

const MAX_RECORDS = 50000
const DATA_ROUTE = '/api-usage-tracker/data'
const CLEAR_ROUTE = '/api-usage-tracker/clear'
const EXPORT_ROUTE = '/api-usage-tracker/export'
const ADMIN_ROUTE = '/api-usage-tracker/admin-credential'
const SETTINGS_ROUTE = '/api-usage-tracker/settings'
const LAYOUT_ROUTE = '/api-usage-tracker/layout'
const ADMIN_CREDENTIAL_REF = 'OPENAI_ADMIN_KEY'
const QUOTA_CACHE_MS = 120_000
const QUOTA_TIMEOUT_MS = 10_000
const OPENAI_USAGE_CACHE_MS = 15 * 60_000
const OPENAI_USAGE_MAX_PAGES = 5
const OPENAI_TIMEOUT_MS = 25_000
const OPENAI_TIMEOUT_RETRIES = 1
const OPENAI_USAGE_URL = 'https://api.openai.com/v1/organization/usage/completions'
const OPENAI_COSTS_URL = 'https://api.openai.com/v1/organization/costs'

/**
 * Provider quota probes. To cover another provider later, add one entry:
 * the request is `GET url` with a bearer token resolved through the harness
 * credential seam (environment references first, then the provider's stored
 * llm-pi-ai record), and `parse` normalizes the reply into quota windows.
 */
const QUOTA_PROBES = [
  {
    provider: 'kimi-coding',
    label: 'Kimi For Coding',
    url: 'https://api.kimi.com/coding/v1/usages',
    env: ['KIMI_CODING_API_KEY', 'KIMI_CN_API_KEY', 'KIMI_API_KEY', 'KIMI_CODE_API_KEY'],
    record: 'llm-pi-ai/kimi-coding',
    parse: parseKimiUsages,
  },
  {
    provider: 'kimi-coding-global',
    label: 'Kimi For Coding (Global)',
    url: 'https://api.kimi.ai/coding/v1/usages',
    env: ['KIMI_GLOBAL_API_KEY'],
    record: undefined,
    parse: parseKimiUsages,
  },
  {
    provider: 'deepseek-official',
    label: 'DeepSeek',
    url: 'https://api.deepseek.com/user/balance',
    env: ['DEEPSEEK_API_KEY'],
    record: undefined,
    type: 'balance',
    parse: parseDeepseekBalance,
  },
  {
    // The signed-in account's platform wallets (recharge + bonus), via the
    // Host account service — this is the balance the DeepSeek console shows.
    provider: 'deepseek-account',
    label: 'DeepSeek Account',
    type: 'account-balance',
  },
  {
    // MiniMax Coding Plan meters a rolling 5-hour interval plus a weekly
    // bucket as REMAINING percentages — there is no money balance and no
    // per-model counter, so the card shows those two windows and nothing else.
    provider: 'minimax-cn',
    label: 'MiniMax',
    url: 'https://api.minimaxi.com/v1/token_plan/remains',
    env: ['MINIMAX_CN_API_KEY', 'MINIMAX_API_KEY'],
    record: 'llm-pi-ai/minimax-cn',
    parse: parseMinimaxRemains,
  },
  {
    // WorkBuddy bills in CREDITS (积分), not tokens or windows. The bridge
    // plugin already holds the signed-in credential and exposes the billing
    // answer on a local read-only route, so read that instead of re-deriving
    // the vendor's private billing envelope here.
    provider: 'workbuddy',
    label: 'WorkBuddy',
    type: 'credits',
  },
]

function json(value, init = {}) {
  return new Response(JSON.stringify(value), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...(init.headers || {}),
    },
  })
}

// webServer `resource` routes only serve GET/HEAD over HTTP; POST endpoints
// (clear, credential write) must be raw `handler` routes with Node req/res.
function nodeJson(res, status, value) {
  const body = JSON.stringify(value)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  })
  res.end(body)
}

function readRequestBody(req, limit = 8192) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > limit) {
        reject(new Error('body-too-large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function num(value) {
  const n = typeof value === 'string' ? Number(value) : value
  return typeof n === 'number' && Number.isFinite(n) ? n : undefined
}

function asObject(value) {
  return value !== null && typeof value === 'object' ? value : undefined
}

function resetIso(data) {
  for (const key of ['reset_at', 'resetAt', 'reset_time', 'resetTime']) {
    const v = data[key]
    if (typeof v === 'string' && v.trim()) {
      const ms = Date.parse(v)
      if (Number.isFinite(ms)) return ms
    }
  }
  for (const key of ['reset_in', 'resetIn', 'ttl']) {
    const s = num(data[key])
    if (s !== undefined && s > 0) return Date.now() + Math.round(s * 1000)
  }
  const win = asObject(data.window)
  if (win) {
    const s = num(win.duration)
    if (s !== undefined && s > 0) return Date.now() + Math.round(s * 1000)
  }
  return undefined
}

function windowLabel(item, detail, win, index) {
  for (const key of ['name', 'title', 'scope']) {
    const v = item[key] ?? detail[key]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  const duration = num(win.duration ?? item.duration ?? detail.duration)
  const unit = String(win.timeUnit ?? item.timeUnit ?? detail.timeUnit ?? '')
  if (duration !== undefined && duration > 0) {
    if (unit.includes('MINUTE')) {
      return duration >= 60 && duration % 60 === 0 ? `${duration / 60}h limit` : `${duration}m limit`
    }
    if (unit.includes('HOUR')) return `${duration}h limit`
    if (unit.includes('DAY')) return `${duration}d limit`
    return `${duration}s limit`
  }
  return `Limit ${index + 1}`
}

const USAGES_LABELS = {
  limit_5h: '5h limit',
  limit_month_total: 'Monthly total',
  limit_month_code: 'Monthly code',
  limit_week_total: 'Weekly total',
  limit_week_code: 'Weekly code',
  limit_day_total: 'Daily total',
  limit_day_code: 'Daily code',
}

function usagesLabel(key) {
  if (USAGES_LABELS[key]) return USAGES_LABELS[key]
  return key.replace(/^limit_/i, '').replace(/_/g, ' ')
}

function toWindow(data, fallbackLabel) {
  const limit = num(data.limit)
  let used = num(data.used)
  if (used === undefined) {
    const remaining = num(data.remaining)
    if (remaining !== undefined && limit !== undefined) used = limit - remaining
  }
  // `used_ratio`-style replies carry only a fraction of the limit consumed.
  if (used === undefined && limit === undefined) {
    const ratio = num(data.used_ratio ?? data.usedRatio ?? data.ratio)
    if (ratio !== undefined) {
      return {
        label: typeof data.name === 'string' && data.name.trim() ? data.name.trim() : fallbackLabel,
        used: undefined,
        limit: undefined,
        percentUsed: ratio <= 1 ? ratio * 100 : ratio,
        resetAt: resetIso(data),
      }
    }
    return null
  }
  const safeUsed = used ?? 0
  const safeLimit = limit ?? 0
  return {
    label: typeof data.name === 'string' && data.name.trim() ? data.name.trim() : fallbackLabel,
    used: safeUsed,
    limit: safeLimit,
    percentUsed: safeLimit > 0 ? (safeUsed / safeLimit) * 100 : undefined,
    resetAt: resetIso(data),
  }
}

function parseKimiUsages(payload) {
  const root = asObject(payload) ?? {}
  const data = asObject(root.data) ?? root
  // The keyed usage map is canonical. The limits array can describe the same
  // rolling window with absolute units, so merge by window identity instead
  // of rendering it twice. Monthly total and monthly code are distinct.
  const windows = new Map()
  const add = (key, window) => {
    if (!window) return
    const previous = windows.get(key)
    windows.set(key, previous ? {
      ...previous,
      ...(window.used !== undefined && window.limit > 0 ? { used: window.used, limit: window.limit } : {}),
      percentUsed: previous.percentUsed ?? window.percentUsed,
      resetAt: previous.resetAt ?? window.resetAt,
    } : { ...window, id: key })
  }
  const usages = asObject(data.usages)
  if (usages) {
    for (const [key, value] of Object.entries(usages)) {
      add(key, toWindow(asObject(value) ?? {}, usagesLabel(key)))
    }
  }
  const usage = asObject(data.usage)
  if (usage) add('periodic', toWindow(usage, 'Periodic usage'))
  if (Array.isArray(data.limits)) {
    data.limits.forEach((item, index) => {
      const map = asObject(item)
      if (!map) return
      const detail = asObject(map.detail) ?? map
      const win = asObject(map.window) ?? {}
      const label = windowLabel(map, detail, win, index)
      const duration = num(win.duration ?? map.duration ?? detail.duration)
      const unit = String(win.timeUnit ?? map.timeUnit ?? detail.timeUnit ?? '').toUpperCase()
      const fiveHour = label === '5h limit' || (duration === 300 && unit.includes('MINUTE')) || (duration === 5 && unit.includes('HOUR'))
      add(fiveHour ? 'limit_5h' : `limit_array_${index}`, toWindow(detail, label))
    })
  }
  return [...windows.values()].sort((a, b) => {
    const order = { limit_month_total: 0, limit_month_code: 1, limit_5h: 2 }
    return (order[a.id] ?? 10) - (order[b.id] ?? 10)
  })
}

/**
 * DeepSeek GET /user/balance: money, not quota. Returns balances per currency
 * plus whether the account can still call. (Official API, see
 * https://api-docs.deepseek.com/api/get-user-balance)
 */
function parseDeepseekBalance(payload) {
  const root = asObject(payload) ?? {}
  const infos = Array.isArray(root.balance_infos) ? root.balance_infos : []
  const balances = []
  for (const item of infos) {
    const b = asObject(item)
    if (!b) continue
    const total = num(b.total_balance)
    if (total === undefined) continue
    balances.push({
      currency: typeof b.currency === 'string' && b.currency ? b.currency : 'CNY',
      total,
      toppedUp: num(b.topped_up_balance),
      granted: num(b.granted_balance),
    })
  }
  return { isAvailable: root.is_available === true, balances }
}

/**
 * MiniMax `GET /v1/token_plan/remains` answers per model group with counts that
 * are usually zeroed out plus a `*_remaining_percent` pair. The percentage is
 * the only field that is always populated, so the window is described by how
 * much is LEFT; the UI renders it as used = 100 - remaining.
 */
function parseMinimaxRemains(payload) {
  const root = asObject(payload) ?? {}
  const rows = Array.isArray(root.model_remains) ? root.model_remains : []
  const general = rows.find((r) => asObject(r) && String(r.model_name || '') === 'general') || rows[0]
  const item = asObject(general)
  if (!item) return []
  const pct = (used, total, remaining) => {
    const r = num(remaining)
    if (r !== undefined) return { used: 100 - r, limit: 100, resetAt: undefined }
    const u = num(used), t = num(total)
    if (u !== undefined && t !== undefined && t > 0) return { used: u, limit: t, resetAt: undefined }
    return undefined
  }
  // `*_remains_time` is a duration ALREADY in milliseconds (measured: 7_981_538
  // for a 2h13m window), and the `*_end_time` fields are millisecond epochs
  // (1794812400000), so neither needs a seconds→ms conversion.
  const resetFrom = (value) => {
    const n = num(value)
    return n !== undefined && n > 0 ? Date.now() + Math.round(n) : undefined
  }
  const stampOf = (value) => {
    const n = num(value)
    return n !== undefined && n > 0 ? Math.round(n) : undefined
  }
  const windows = []
  const intervalEnd = stampOf(item.end_time)
  const weeklyEnd = stampOf(item.weekly_end_time)
  const interval = pct(item.current_interval_usage_count, item.current_interval_total_count, item.current_interval_remaining_percent)
  if (interval) {
    windows.push({
      id: 'interval_5h',
      label: 'limit_5h',
      percentUsed: interval.limit > 0 ? (interval.used / interval.limit) * 100 : 0,
      resetAt: resetFrom(item.remains_time) ?? intervalEnd,
    })
  }
  const weekly = pct(item.current_weekly_usage_count, item.current_weekly_total_count, item.current_weekly_remaining_percent)
  if (weekly) {
    windows.push({
      id: 'limit_week_total',
      label: 'Weekly total',
      percentUsed: weekly.limit > 0 ? (weekly.used / weekly.limit) * 100 : 0,
      resetAt: resetFrom(item.weekly_remains_time) ?? weeklyEnd,
    })
  }
  return windows
}

/** Breadth-first scan of a credential record for a usable bearer token. */function findToken(record) {
  const preferred = ['access', 'accessToken', 'access_token', 'apiKey', 'api_key', 'token', 'key', 'value']
  const queue = [record]
  const seen = new Set()
  while (queue.length && seen.size < 16) {
    const cur = queue.shift()
    if (!cur || typeof cur !== 'object' || seen.has(cur)) continue
    seen.add(cur)
    for (const name of preferred) {
      const v = cur[name]
      if (typeof v === 'string' && v.length > 8) return v
    }
    for (const v of Object.values(cur)) {
      if (v && typeof v === 'object') queue.push(v)
    }
  }
  return undefined
}

function openaiMonthStart(now = new Date()) {
  return Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) / 1000)
}

/** Stable transport-failure codes for the client to render friendly copy. */
function classifyTransportError(error) {
  const code = error?.cause?.code
  if (code === 'UND_ERR_CONNECT_TIMEOUT' || error?.cause?.name === 'ConnectTimeoutError'
    || error?.cause?.message === 'Connect Timeout Error') return 'network-unreachable'
  if (error?.name === 'TimeoutError' || error?.name === 'AbortError') return 'network-timeout'
  if (code === 'ECONNREFUSED') return 'network-refused'
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') return 'network-dns'
  if (code === 'CERT_HAS_EXPIRED' || code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE'
    || String(error?.cause?.message ?? '').includes('certificate')) return 'network-tls'
  return 'usage-unavailable'
}

function parseOpenaiUsagePage(payload) {
  if (!payload || !Array.isArray(payload.data)) throw new Error('unexpected-response')
  const days = new Map()
  let calls = 0, input = 0, output = 0, cacheRead = 0
  for (const bucket of payload.data) {
    const start = num(bucket?.start_time)
    if (start === undefined || !Array.isArray(bucket.results)) continue
    const day = new Date(start * 1000).toISOString().slice(0, 10)
    let daily = days.get(day)
    if (!daily) days.set(day, (daily = { day, calls: 0, input: 0, output: 0, cacheRead: 0 }))
    for (const result of bucket.results) {
      if (result?.object !== 'organization.usage.completions.result') continue
      const req = Math.max(0, num(result.num_model_requests) ?? 0)
      // OpenAI's input_tokens includes cached input; do not count it twice.
      const ins = Math.max(0, num(result.input_tokens) ?? 0)
      const outs = Math.max(0, num(result.output_tokens) ?? 0)
      const cached = Math.max(0, num(result.input_cached_tokens) ?? 0)
      daily.calls += req; daily.input += ins; daily.output += outs; daily.cacheRead += cached
      calls += req; input += ins; output += outs; cacheRead += cached
    }
  }
  return { calls, input, output, cacheRead, days: [...days.values()], hasMore: payload.has_more === true,
    nextPage: typeof payload.next_page === 'string' ? payload.next_page : undefined }
}

function parseOpenaiCostsPage(payload) {
  if (!payload || !Array.isArray(payload.data)) throw new Error('unexpected-response')
  const days = new Map()
  let cost = 0
  let currency
  for (const bucket of payload.data) {
    const start = num(bucket?.start_time)
    if (start === undefined || !Array.isArray(bucket.results)) continue
    const day = new Date(start * 1000).toISOString().slice(0, 10)
    for (const result of bucket.results) {
      if (result?.object !== 'organization.costs.result') continue
      const value = num(result.amount?.value)
      if (value === undefined) continue
      cost += value
      days.set(day, (days.get(day) ?? 0) + value)
      if (typeof result.amount?.currency === 'string' && result.amount.currency) {
        currency = result.amount.currency
      }
    }
  }
  return { cost: Math.round(cost * 10000) / 10000, currency, days,
    hasMore: payload.has_more === true,
    nextPage: typeof payload.next_page === 'string' ? payload.next_page : undefined }
}

function flattenUsage(usage) {
  if (!usage || typeof usage !== 'object') {
    return { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0 }
  }
  const numField = (v) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.round(v) : 0)
  return {
    input: numField(usage.inputTokens),
    output: numField(usage.outputTokens),
    cacheRead: numField(usage.cacheReadTokens),
    cacheWrite: numField(usage.cacheWriteTokens),
    reasoning: numField(usage.reasoningTokens),
  }
}

export function apply(ctx) {
  const disposers = []

  const home =
    process.env.DSH_PROFILE_DIR ||
    process.env.DSH_HOME ||
    join(os.homedir(), '.deepseek-harness')
  const dir = join(home, 'api-usage-tracker')
  const file = join(dir, 'records.jsonl')
  const settingsFile = join(dir, 'settings.json')
  const layoutFile = join(dir, 'layout.json')
  const spendFile = join(dir, 'spend.json')

  /** The bundle's own version, read once from its package.json so the workbench
   *  footer can say which build it is running. Previously the footer showed the
   *  hard-coded string "3.0.0" in the client and a `version: 1` data-schema
   *  number from the Host, so it was wrong on every release — the reader had no
   *  way to tell whether a refresh had actually picked up a new build. */
  let pluginVersion = null
  async function readPluginVersion() {
    if (pluginVersion) return pluginVersion
    try {
      const pkgUrl = new URL('./package.json', import.meta.url)
      const pkg = JSON.parse(await readFile(pkgUrl, 'utf8'))
      pluginVersion = typeof pkg.version === 'string' ? pkg.version : null
    } catch {
      pluginVersion = null
    }
    return pluginVersion
  }

  /** User-set monthly budget for the OpenAI spend progress bar (USD). */
  let openaiBudgetUsd = null

  /** The saved workbench layout. Kept next to the records so a layout survives
   *  a cleared browser profile, a different browser, and the desktop shell —
   *  localStorage alone loses it on any of those, which reads as "my layout
   *  keeps resetting". null means "nothing saved yet, use the defaults". */
  let layoutDoc = null

  /** Cumulative spend per wallet.
   *
   *  No provider tells us how much money was USED — Kimi/MiniMax report
   *  percentages, and the DeepSeek account service returns only what is LEFT
   *  (`value` + `bonusWallets`, no usage endpoint at all). A balance, though,
   *  only moves for two reasons: a top-up raises it, spending lowers it. So the
   *  Host watches the balance between refreshes and accumulates the drops. That
   *  is a measurement, not an estimate, and it is labelled as tracked locally
   *  because it can only speak for the period the plugin has been watching. */
  let spendDoc = null
  const spendKey = (provider, currency) => `${provider}:${currency}`

  function queueSpendSave() {
    enqueue(() => writeFile(spendFile, JSON.stringify(spendDoc, null, 2) + '\n', 'utf8'))
  }

  /** Fold the freshly read balances into the running per-wallet tally.
   *  Returns the same balances with `spent` / `since` attached, so the probe
   *  result carries everything the card needs and the client stays dumb. */
  function trackWalletSpend(providerId, balances) {
    if (!spendDoc || typeof spendDoc !== 'object') spendDoc = { v: 1, wallets: {} }
    if (!spendDoc.wallets || typeof spendDoc.wallets !== 'object') spendDoc.wallets = {}
    const store = spendDoc.wallets
    const now = Date.now()
    let dirty = false
    const out = balances.map((b) => {
      const key = spendKey(providerId, b.currency)
      const total = Math.round((Number(b.total) || 0) * 100) / 100
      const prev = store[key]
      if (!prev || !Number.isFinite(prev.total)) {
        /* First sighting. We know nothing about what came before, so the tally
           starts at zero HERE rather than guessing a historical figure — a made
           up "you used ¥120" would be worse than an honest, dated zero. */
        store[key] = { first: now, seen: now, total, peak: total, spent: 0 }
        dirty = true
        return { ...b, spent: 0, peak: total, since: now }
      }
      const spent = Number(prev.spent) || 0
      const was = prev.total
      if (total > was) {
        /* A rise is a top-up (or a granted credit landing): it is not spend, and
           it lifts the peak so a later drop is measured against the right
           high-water mark instead of counting the topped-up money as usage. */
        store[key] = { ...prev, seen: now, total, peak: Math.max(Number(prev.peak) || was, total) }
        dirty = true
        return { ...b, spent, peak: store[key].peak, since: prev.first || now }
      }
      if (total < was) {
        const grown = spent + (was - total)
        store[key] = { ...prev, seen: now, total, spent: Math.round(grown * 100) / 100 }
        dirty = true
        return { ...b, spent: store[key].spent, peak: Number(prev.peak) || was, since: prev.first || now }
      }
      /* Unchanged balance: still stamp the sighting so a stale tally is visibly
         stale, but do not manufacture spend. */
      store[key] = { ...prev, seen: now, total }
      dirty = true
      return { ...b, spent, peak: Number(prev.peak) || total, since: prev.first || now }
    })
    if (dirty) queueSpendSave()
    return out
  }

  /** @type {Array<Record<string, unknown>>} */
  let records = []
  let totalRecorded = 0
  let ready = false
  let queue = Promise.resolve()
  let needsRewrite = false

  // Filled once `webServer` injects; the credits probe asks the bridge plugin
  // for its balance over this same origin (its route needs no credentials).
  let serverOrigin = ''
  const originOf = () => serverOrigin

  const enqueue = (task) => {
    queue = queue.then(task).catch(() => {})
  }

  function persist(record) {
    records.push(record)
    totalRecorded += 1
    if (records.length > MAX_RECORDS) {
      records = records.slice(-MAX_RECORDS)
      needsRewrite = true
    }
    if (needsRewrite) {
      needsRewrite = false
      const body = records.map((r) => JSON.stringify(r)).join('\n') + '\n'
      enqueue(() => writeFile(file, body, 'utf8'))
    } else {
      enqueue(() => appendFile(file, JSON.stringify(record) + '\n', 'utf8'))
    }
  }

  const readyPromise = (async () => {
    try {
      await mkdir(dir, { recursive: true })
      const text = await readFile(file, 'utf8').catch(() => '')
      for (const line of text.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed) continue
        try {
          records.push(JSON.parse(trimmed))
        } catch {
          // Ignore malformed lines from interrupted writes.
        }
      }
      totalRecorded = records.length
      if (records.length > MAX_RECORDS) {
        records = records.slice(-MAX_RECORDS)
        const body = records.map((r) => JSON.stringify(r)).join('\n') + '\n'
        enqueue(() => writeFile(file, body, 'utf8'))
      }
      try {
        const saved = JSON.parse(await readFile(settingsFile, 'utf8'))
        const v = num(saved?.openaiBudgetUsd)
        openaiBudgetUsd = v !== undefined && v > 0 && v <= 1e9 ? v : null
      } catch {}
      try {
        const saved = JSON.parse(await readFile(layoutFile, 'utf8'))
        if (saved && typeof saved === 'object' && saved.modules && typeof saved.modules === 'object') {
          layoutDoc = saved
        }
      } catch {}
      try {
        const saved = JSON.parse(await readFile(spendFile, 'utf8'))
        if (saved && typeof saved === 'object' && saved.wallets && typeof saved.wallets === 'object') {
          spendDoc = saved
        }
      } catch {}
    } catch (error) {
      ctx.logger?.warn?.(`[api-usage-tracker] failed to load records: ${error}`)
    } finally {
      ready = true
    }
  })()

  // ---- quota probes ----

  const quotaCache = new Map()
  const quotaInflight = new Map()
  let openaiUsageCache
  let openaiUsageInflight

  async function resolveToken(probe) {
    const credentials = ctx.get('credentials')
    if (!credentials) return undefined
    for (const name of probe.env) {
      try {
        const hit = await credentials.resolve(name)
        if (hit && typeof hit.value === 'string' && hit.value) return hit.value
      } catch {}
    }
    if (probe.record) {
      try {
        const record = await credentials.readRecord(probe.record)
        const token = findToken(record)
        if (token) return token
      } catch {}
    }
    return undefined
  }

  /** Signed-in DeepSeek account wallets via the Host account service. */
  async function fetchAccountBalance(probe) {
    const fetchedAt = Date.now()
    const fail = (error) => ({ provider: probe.provider, label: probe.label, ok: false, error, fetchedAt, windows: [] })
    const account = ctx.get('deepseekAccount')
    if (!account) return fail('account-service-unavailable')
    try {
      const state = await account.getState()
      if (state?.status !== 'credential-stored') return fail('not-signed-in')
      const balance = await account.getBalance({
        version: 'api-usage-tracker',
        locale: 'zh_CN',
        timezoneOffsetSeconds: -new Date().getTimezoneOffset() * 60,
      })
      if (!balance) return fail('not-signed-in')
      if (balance.status !== 'ready') return fail('balance-failed')
      const byCurrency = new Map()
      for (const w of balance.value || []) {
        const v = num(w.balance)
        if (v === undefined) continue
        const e = byCurrency.get(w.currency) || { currency: w.currency, toppedUp: 0, granted: 0 }
        e.toppedUp += v
        byCurrency.set(w.currency, e)
      }
      for (const w of balance.bonusWallets || []) {
        const v = num(w.balance)
        if (v === undefined) continue
        const e = byCurrency.get(w.currency) || { currency: w.currency, toppedUp: 0, granted: 0 }
        e.granted += v
        byCurrency.set(w.currency, e)
      }
      const balances = [...byCurrency.values()].map((e) => ({
        currency: e.currency,
        total: Math.round((e.toppedUp + e.granted) * 100) / 100,
        toppedUp: e.toppedUp,
        granted: e.granted,
      }))
      if (!balances.length) return fail('unexpected-response')
      return {
        provider: probe.provider, label: probe.label, ok: true, fetchedAt,
        windows: [], balances: trackWalletSpend(probe.provider, balances), balanceAvailable: balances.some((b) => b.total > 0),
      }
    } catch (error) {
      return fail(String(error?.message ?? error).slice(0, 120))
    }
  }

  /**
   * WorkBuddy answers in credits (积分). The companion bridge plugin already
   * owns the signed-in credential and its billing call, and publishes the
   * result on a read-only same-origin route, so ask it instead of rebuilding
   * the vendor's private envelope (and its signature) here.
   */
  const WORKBUDDY_STATUS_PATH = '/plugins/dsh-workbuddy-bridge/status'

  async function fetchCredits(probe) {
    const fetchedAt = Date.now()
    const base = originOf()
    if (!base) {
      return { provider: probe.provider, label: probe.label, ok: false, error: 'no-server', fetchedAt, windows: [] }
    }
    try {
      const response = await fetch(base + WORKBUDDY_STATUS_PATH, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(QUOTA_TIMEOUT_MS),
      })
      if (!response.ok) {
        return { provider: probe.provider, label: probe.label, ok: false, error: `http-${response.status}`, fetchedAt, windows: [] }
      }
      const payload = await response.json()
      const raw = asObject(asObject(payload)?.credits)
      const total = num(raw?.total)
      if (total === undefined) {
        // No credits field means the bridge is signed out (or not installed).
        return { provider: probe.provider, label: probe.label, ok: false, error: 'no-credential', fetchedAt, windows: [] }
      }
      const accounts = (Array.isArray(raw.accounts) ? raw.accounts : [])
        .map((a) => asObject(a))
        .filter((a) => a && num(a.remain) !== undefined)
        .map((a) => ({ packageName: String(a.packageName || ''), remain: num(a.remain), size: num(a.size) }))
        .filter((a) => a.remain > 0)
        .sort((a, b) => b.remain - a.remain)
      return {
        provider: probe.provider, label: probe.label, ok: true, fetchedAt,
        windows: [], credits: { total, accounts }, creditsAvailable: true,
      }
    } catch (error) {
      return {
        provider: probe.provider,
        label: probe.label,
        ok: false,
        error: String(error?.message ?? error).slice(0, 120),
        fetchedAt,
        windows: [],
      }
    }
  }

  async function runProbe(probe) {
    if (probe.type === 'account-balance') return fetchAccountBalance(probe)
    if (probe.type === 'credits') return fetchCredits(probe)
    const fetchedAt = Date.now()
    const token = await resolveToken(probe)
    if (!token) {
      return { provider: probe.provider, label: probe.label, ok: false, error: 'no-credential', fetchedAt, windows: [] }
    }
    try {
      const response = await fetch(probe.url, {
        headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
        signal: AbortSignal.timeout(QUOTA_TIMEOUT_MS),
      })
      if (!response.ok) {
        return { provider: probe.provider, label: probe.label, ok: false, error: `http-${response.status}`, fetchedAt, windows: [] }
      }
      const payload = await response.json()
      if (probe.type === 'balance') {
        const balance = probe.parse(payload)
        if (!balance.balances.length) {
          return { provider: probe.provider, label: probe.label, ok: false, error: 'unexpected-response', fetchedAt, windows: [] }
        }
        return {
          provider: probe.provider, label: probe.label, ok: true, fetchedAt,
          windows: [], balances: trackWalletSpend(probe.provider, balance.balances), balanceAvailable: balance.isAvailable,
        }
      }
      const windows = probe.parse(payload)
      if (!windows.length) {
        return { provider: probe.provider, label: probe.label, ok: false, error: 'unexpected-response', fetchedAt, windows: [] }
      }
      return { provider: probe.provider, label: probe.label, ok: true, fetchedAt, windows }
    } catch (error) {
      return {
        provider: probe.provider,
        label: probe.label,
        ok: false,
        error: String(error?.message ?? error).slice(0, 120),
        fetchedAt,
        windows: [],
      }
    }
  }

  /** Return cached quota immediately; refresh stale entries in the background. */
  function quotaSnapshot(force, relevantIds) {
    const now = Date.now()
    const out = QUOTA_PROBES.filter((probe) => relevantIds.has(probe.provider)).map((probe) => {
      const cached = quotaCache.get(probe.provider)
      const stale = !cached || now - cached.fetchedAt > QUOTA_CACHE_MS
      if ((force || stale) && !quotaInflight.has(probe.provider)) {
        const pending = runProbe(probe)
          .then((result) => {
            quotaCache.set(probe.provider, result)
            return result
          })
          .catch(() => {})
          .finally(() => quotaInflight.delete(probe.provider))
        quotaInflight.set(probe.provider, pending)
      }
      if (cached) return { ...cached, refreshing: quotaInflight.has(probe.provider) }
      return { provider: probe.provider, label: probe.label, ok: false, pending: true, fetchedAt: 0, windows: [] }
    })
    return out
  }

  async function openaiAdminToken() {
    const credentials = ctx.get('credentials')
    if (!credentials) return undefined
    try {
      const hit = await credentials.resolve(ADMIN_CREDENTIAL_REF)
      return hit && typeof hit.value === 'string' && hit.value ? hit.value : undefined
    } catch {
      return undefined
    }
  }

  /** UI-safe status only: configured/source/writable, never the value. */
  async function describeAdminCredential() {
    const credentials = ctx.get('credentials')
    if (!credentials) return { configured: false, writable: false }
    try {
      const info = await credentials.describe(ADMIN_CREDENTIAL_REF)
      return {
        configured: info?.configured === true,
        source: typeof info?.source === 'string' ? info.source : undefined,
        writable: info?.writable !== false,
      }
    } catch {
      return { configured: false, writable: false }
    }
  }

  /**
   * User-only credential write from the authenticated settings page.
   * The value travels one direction (Client -> credential store) and is never
   * read back, logged, or included in snapshots/exports.
   * Returns [status, payload] for the raw handler route.
   */
  async function adminCredentialAction(body) {
    const credentials = ctx.get('credentials')
    if (!credentials) {
      return [503, { ok: false, error: 'credentials-unavailable' }]
    }
    const action = body?.action
    try {
      if (action === 'set') {
        // Same acceptance rule as the Models page: printable ASCII only,
        // so the value is always a legal HTTP header value.
        const value = typeof body?.value === 'string' ? body.value.trim() : ''
        if (!value || value.length > 4096 || !/^[\x21-\x7E]+$/.test(value)) {
          return [400, { ok: false, error: 'invalid-key' }]
        }
        await credentials.set(ADMIN_CREDENTIAL_REF, value)
      } else if (action === 'unset') {
        await credentials.unset(ADMIN_CREDENTIAL_REF)
      } else {
        return [400, { ok: false, error: 'bad-request' }]
      }
      // Drop cached usage so the next snapshot re-probes with the new state.
      openaiUsageCache = undefined
      return [200, { ok: true, ...(await describeAdminCredential()) }]
    } catch {
      return [500, { ok: false, error: 'write-failed' }]
    }
  }

  /** Admin API GET with one retry on timeout; HTTP failures are not retried. */
  async function fetchOpenaiJson(url, token) {
    let last
    for (let attempt = 0; attempt <= OPENAI_TIMEOUT_RETRIES; attempt++) {
      try {
        const response = await fetch(url, {
          headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
          signal: AbortSignal.timeout(OPENAI_TIMEOUT_MS),
        })
        if (!response.ok) throw new Error(`http-${response.status}`)
        return await response.json()
      } catch (error) {
        last = error
        const isTimeout = error?.name === 'TimeoutError' || error?.name === 'AbortError'
        if (!isTimeout || attempt === OPENAI_TIMEOUT_RETRIES) throw error
      }
    }
    throw last
  }

  async function fetchOpenaiUsage(token, startTime) {
    // Kick off the costs query concurrently — serializing the two admin calls
    // made the organization panel visibly slow to populate. The detached
    // catch only suppresses an unhandled rejection if the usage loop throws
    // first; the later `await costsPromise` still observes the real outcome.
    const costsPromise = fetchOpenaiCosts(token, startTime)
    costsPromise.catch(() => {})
    const totals = { calls: 0, input: 0, output: 0, cacheRead: 0 }
    const days = new Map()
    let page
    let complete = false
    for (let i = 0; i < OPENAI_USAGE_MAX_PAGES; i++) {
      const url = new URL(OPENAI_USAGE_URL)
      url.searchParams.set('start_time', String(startTime))
      url.searchParams.set('bucket_width', '1d')
      url.searchParams.set('limit', '31')
      if (page) url.searchParams.set('page', page)
      const result = parseOpenaiUsagePage(await fetchOpenaiJson(url, token))
      totals.calls += result.calls
      totals.input += result.input
      totals.output += result.output
      totals.cacheRead += result.cacheRead
      for (const entry of result.days) {
        const old = days.get(entry.day)
        if (old) {
          old.calls += entry.calls; old.input += entry.input
          old.output += entry.output; old.cacheRead += entry.cacheRead
        } else days.set(entry.day, entry)
      }
      if (!result.hasMore) { complete = true; break }
      if (!result.nextPage || result.nextPage === page) break
      page = result.nextPage
    }
    if (!complete) throw new Error('pagination-incomplete')
    const result = { provider: 'openai', scope: 'organization', period: 'month-utc',
      periodStart: startTime * 1000, fetchedAt: Date.now(), ok: true,
      ...totals, days: [...days.values()].sort((a, b) => a.day.localeCompare(b.day)) }
    // Costs are billing data: a failure must not hide the usage numbers.
    try {
      const costs = await costsPromise
      result.costUsd = costs.cost
      result.currency = costs.currency || 'usd'
      const costByDay = costs.days
      for (const d of result.days) d.costUsd = Math.round((costByDay.get(d.day) ?? 0) * 10000) / 10000
    } catch (error) {
      result.costError = /^http-\d{3}$/.test(error?.message) ? error.message : 'cost-unavailable'
    }
    return result
  }

  async function fetchOpenaiCosts(token, startTime) {
    let cost = 0
    let currency
    const days = new Map()
    let page
    let complete = false
    for (let i = 0; i < OPENAI_USAGE_MAX_PAGES; i++) {
      const url = new URL(OPENAI_COSTS_URL)
      url.searchParams.set('start_time', String(startTime))
      url.searchParams.set('bucket_width', '1d')
      url.searchParams.set('limit', '180')
      if (page) url.searchParams.set('page', page)
      const result = parseOpenaiCostsPage(await fetchOpenaiJson(url, token))
      cost += result.cost
      if (result.currency) currency = result.currency
      for (const [day, value] of result.days) days.set(day, (days.get(day) ?? 0) + value)
      if (!result.hasMore) { complete = true; break }
      if (!result.nextPage || result.nextPage === page) break
      page = result.nextPage
    }
    if (!complete) throw new Error('pagination-incomplete')
    return { cost: Math.round(cost * 10000) / 10000, currency, days }
  }

  // Refresh credential presence and the organization data without retaining
  // the admin key. The inference key is never sent to this admin endpoint.
  function openaiUsageSnapshot(force, activeIds) {
    if (!activeIds.has('openai')) return undefined
    const now = Date.now()
    const startTime = openaiMonthStart(new Date(now))
    const stale = !openaiUsageCache || now - openaiUsageCache.fetchedAt >= OPENAI_USAGE_CACHE_MS
      || openaiUsageCache.ok && openaiUsageCache.periodStart !== startTime * 1000
    if ((force || stale) && !openaiUsageInflight) {
      const pending = (async () => {
        const token = await openaiAdminToken()
        if (!token) {
          openaiUsageCache = { provider: 'openai', ok: false, error: 'admin-key-required', fetchedAt: Date.now() }
          return
        }
        openaiUsageCache = await fetchOpenaiUsage(token, startTime)
      })().catch((error) => {
        // Never expose credential values or third-party response bodies;
        // transport error names (timeout, fetch failed, ...) are safe.
        const code = /^http-\d{3}$/.test(error?.message) || error?.message === 'pagination-incomplete'
          || error?.message === 'unexpected-response'
          ? error.message
          : classifyTransportError(error)
        openaiUsageCache = { provider: 'openai', ok: false, error: code, fetchedAt: Date.now() }
      }).finally(() => { if (openaiUsageInflight === pending) openaiUsageInflight = undefined })
      openaiUsageInflight = pending
    }
    return openaiUsageCache
      ? { ...openaiUsageCache, refreshing: Boolean(openaiUsageInflight) }
      : { provider: 'openai', ok: false, pending: true, refreshing: Boolean(openaiUsageInflight) }
  }

  // Wrap every streaming model call. The waterfall contract passes the call
  // through `next()`; we tee the chunk stream, tally usage/finish chunks, and
  // write one record when the stream settles. Recording never breaks the
  // stream: failures inside the recorder are swallowed.
  disposers.push(
    ctx.on('llm/stream', function (options, next) {
      const started = Date.now()
      const meta = {
        id: `${started.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        ts: started,
        provider: String(options?.provider ?? 'unknown'),
        model: String(options?.model ?? 'unknown'),
        session: options?.sessionId ? String(options.sessionId) : undefined,
        purpose: options?.purpose ? String(options.purpose) : undefined,
      }
      let usage
      let finish = 'stop'
      let error
      const source = next()
      return (async function* () {
        try {
          for await (const chunk of source) {
            if (chunk && chunk.type === 'usage') {
              usage = chunk.usage
            } else if (chunk && chunk.type === 'finish') {
              const kind = chunk.reason?.kind
              if (typeof kind === 'string') finish = kind
              if (kind === 'error' || kind === 'aborted') {
                error = chunk.reason?.failure?.message
                  ? String(chunk.reason.failure.message)
                  : kind
              }
            }
            yield chunk
          }
        } catch (e) {
          finish = 'error'
          error = String(e?.message ?? e)
          throw e
        } finally {
          try {
            persist({
              ...meta,
              finish,
              error,
              durationMs: Date.now() - started,
              ...flattenUsage(usage),
            })
          } catch {
            // Never let persistence break a model stream.
          }
        }
      })()
    }),
  )

  function providerDirectory() {
    const out = []
    try {
      for (const p of ctx.llm.listProviders()) {
        out.push({ id: String(p.id), name: String(p.name || p.id), state: 'active' })
      }
    } catch {}
    try {
      for (const p of ctx.llm.listConfigurableProviders()) {
        if (!out.some((x) => x.id === p.provider)) {
          out.push({
            id: String(p.provider),
            name: String(p.displayName || p.provider),
            state: p.error ? 'error' : 'declared',
          })
        }
      }
    } catch {}
    return out
  }

  async function snapshot(forceQuotaRefresh) {
    await readyPromise
    const providers = providerDirectory()
    const activeIds = new Set(providers.filter((p) => p.state === 'active').map((p) => p.id))
    return {
      version: 1,
      pluginVersion: await readPluginVersion(),
      generatedAt: Date.now(),
      ready,
      storageFile: file,
      totalRecorded,
      retained: records.length,
      providers,
      quotas: quotaSnapshot(forceQuotaRefresh, activeIds),
      organizationUsage: openaiUsageSnapshot(forceQuotaRefresh, activeIds),
      adminCredential: await describeAdminCredential(),
      openaiBudgetUsd,
      records,
    }
  }

  // `webServer` may not be provided yet when this plugin applies during a cold
  // boot, so route registration waits for it through ctx.inject instead of a
  // one-shot ctx.get that could silently return undefined and leave the
  // workbench routes unregistered (observed as HTTP 404 after restart).
  disposers.push(
    ctx.inject(['webServer'], (injected) => {
      const webServer = injected.webServer
      try {
        serverOrigin = String(webServer.getOrigin() || '').replace(/\/+$/, '')
      } catch {
        serverOrigin = ''
      }
      const routes = [
        webServer.register({
          kind: 'exact',
          path: DATA_ROUTE,
          resource: async (request) => {
            let force = false
            try {
              force = new URL(request.url).searchParams.get('refresh') === '1'
            } catch {}
            return json(await snapshot(force))
          },
        }),
        webServer.register({
          kind: 'exact',
          path: CLEAR_ROUTE,
          handler: async (req, res) => {
            if (req.method !== 'POST') {
              nodeJson(res, 405, { ok: false, error: 'method-not-allowed' })
              return
            }
            await readyPromise
            records = []
            enqueue(() => writeFile(file, '', 'utf8'))
            nodeJson(res, 200, { ok: true })
          },
        }),
        webServer.register({
          kind: 'exact',
          path: ADMIN_ROUTE,
          handler: async (req, res) => {
            if (req.method !== 'POST') {
              nodeJson(res, 405, { ok: false, error: 'method-not-allowed' })
              return
            }
            let body
            try {
              body = JSON.parse(await readRequestBody(req))
            } catch {
              nodeJson(res, 400, { ok: false, error: 'bad-request' })
              return
            }
            const [status, payload] = await adminCredentialAction(body)
            nodeJson(res, status, payload)
          },
        }),
        webServer.register({
          kind: 'exact',
          path: SETTINGS_ROUTE,
          handler: async (req, res) => {
            if (req.method !== 'POST') {
              nodeJson(res, 405, { ok: false, error: 'method-not-allowed' })
              return
            }
            let body
            try {
              body = JSON.parse(await readRequestBody(req))
            } catch {
              nodeJson(res, 400, { ok: false, error: 'bad-request' })
              return
            }
            if (body?.action !== 'set-budget') {
              nodeJson(res, 400, { ok: false, error: 'bad-request' })
              return
            }
            const raw = body.value
            const v = raw === null || raw === undefined || raw === '' ? null : num(raw)
            if (v !== null && (v === undefined || v <= 0 || v > 1e9)) {
              nodeJson(res, 400, { ok: false, error: 'invalid-budget' })
              return
            }
            openaiBudgetUsd = v === null ? null : Math.round(v * 100) / 100
            try {
              await mkdir(dir, { recursive: true })
              await writeFile(settingsFile, JSON.stringify({ openaiBudgetUsd }, null, 2) + '\n', 'utf8')
            } catch {
              nodeJson(res, 500, { ok: false, error: 'write-failed' })
              return
            }
            nodeJson(res, 200, { ok: true, openaiBudgetUsd })
          },
        }),
        webServer.register({
          kind: 'exact',
          path: LAYOUT_ROUTE,
          handler: async (req, res) => {
            if (req.method === 'GET') {
              nodeJson(res, 200, { ok: true, layout: layoutDoc })
              return
            }
            if (req.method !== 'POST') {
              nodeJson(res, 405, { ok: false, error: 'method-not-allowed' })
              return
            }
            let body
            try {
              body = JSON.parse(await readRequestBody(req, 65536))
            } catch {
              nodeJson(res, 400, { ok: false, error: 'bad-request' })
              return
            }
            const next = body && body.layout
            if (!next || typeof next !== 'object' || !next.modules || typeof next.modules !== 'object') {
              nodeJson(res, 400, { ok: false, error: 'bad-layout' })
              return
            }
            layoutDoc = next
            try {
              await mkdir(dir, { recursive: true })
              await writeFile(layoutFile, JSON.stringify(next, null, 2) + '\n', 'utf8')
            } catch {
              nodeJson(res, 500, { ok: false, error: 'write-failed' })
              return
            }
            nodeJson(res, 200, { ok: true })
          },
        }),
        webServer.register({
          kind: 'exact',
          path: EXPORT_ROUTE,
          resource: async () => {
            const data = await snapshot(false)
            return json(data, {
              headers: {
                'content-disposition': 'attachment; filename="api-usage-records.json"',
              },
            })
          },
        }),
      ]
      return () => routes.forEach((dispose) => dispose())
    }),
  )

  return () => {
    for (const dispose of disposers.splice(0)) {
      try {
        dispose()
      } catch {}
    }
  }
}
