window.__ModuleLoader__.load({
  id: '@local/api-usage-tracker',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const PANEL_ID = 'api-usage';
    const DATA_URL = '/api-usage-tracker/data';
    const CLEAR_URL = '/api-usage-tracker/clear';
    const EXPORT_URL = '/api-usage-tracker/export';
    const ADMIN_URL = '/api-usage-tracker/admin-credential';
    const SETTINGS_URL = '/api-usage-tracker/settings';
    const LAYOUT_URL = '/api-usage-tracker/layout';

    /* ============ Design tokens — "Precision Instrument" ============ */
    const C = {
      signal: '#CBF27E', signalDim: '#9BC253', signalDeep: '#5E7D2C', signalInk: '#0A0E13',
      azure: '#7FB3E8', violet: '#B49AEC', ok: '#84D9A6', warn: '#EFB56C', danger: '#EE8177',
      track: '#1C2834', barMute: '#4E6E82', ink: '#0A0E13',
      textHi: 'var(--dsw-alias-label-primary, #EBF1F3)',
      textMd: 'var(--dsw-alias-label-secondary, #A2B3BF)',
      textLo: 'color-mix(in srgb, var(--dsw-alias-label-secondary, #A2B3BF) 75%, var(--dsw-alias-label-primary, #EBF1F3))',
      textFaint: 'color-mix(in srgb, var(--dsw-alias-label-secondary, #A2B3BF) 55%, transparent)',
      line: 'var(--dsw-alias-border-l1, #202D38)',
      lineSoft: 'color-mix(in srgb, var(--dsw-alias-border-l1, #202D38) 60%, transparent)',
      lineStrong: 'var(--dsw-alias-border-l2, #2B3C49)',
      surface: 'var(--dsw-alias-bg-layer-1, #111922)',
      surfaceHi: 'var(--dsw-alias-bg-layer-2, #151F2A)',
      surfaceDeep: 'color-mix(in srgb, var(--dsw-alias-bg-layer-1, #111922) 60%, var(--dsw-alias-bg-base, #0A0E13))',
      mono: '"IBM Plex Mono","JetBrains Mono","SF Mono","Cascadia Code",Consolas,monospace',
      ease: 'cubic-bezier(.22,1,.36,1)',
    };

    /* ONE palette, ONE order. Every hue the board can draw comes from this
       single list, and a colour's position in it is the only thing that decides
       where that colour is used: slot 1 is the brand lime, slot 2 the blue, slot
       3 the amber, and so on. A ring arc, a legend dot, a model bar and a
       provider accent that rank first all get slot 1.
       Hues sit ~30° apart with alternating L*, so any two entries are at least
       ΔE 23 apart in CIELAB — roughly the distance at which a person says "two
       different colours" without comparing swatches.
       Red is deliberately absent. `C.danger` means "over budget / failed"
       everywhere on this board, so a red entry here would make the third package
       look like an alarm. Identity colours (providers, models) are drawn from
       this same list, so they cannot collide with a danger state either — that
       is why the previous 13th entry, a red, is gone. */
    const PAL = [
      '#CBF27E', '#6F9BE0', '#E8A462', '#9B7BE0', '#6FDCA5', '#E07A9E',
      '#6FD0DC', '#DCCB74', '#8FB0CE', '#DC74CE', '#68DE68', '#D0A8E0',
    ];
    /* Slot lookup. Every caller walks the same list from index 0, which is what
       makes "first" mean the same colour everywhere. */
    const slotColor = (i) => PAL[Math.abs(i | 0) % PAL.length];
    /* Parts of a whole (credit packages, subscription windows, wallet sources)
       use the identical list and the identical starting point. They used to own a
       second palette that started at the blue, so a quota ring led with blue
       while the donut beside it led with lime and the model bars led with
       whatever the name hashed to — three "first colours" on one screen, which
       is exactly the muddle of "which colour comes first?" this replaces. */
    const seriesColor = (i) => PAL[Math.abs(i | 0) % PAL.length];
    /* Identity colours are handed out by RANK, in the order the caller lists the
       keys — biggest first. Slot 1 therefore means "the largest" on every card
       that has a ranking: the donut's first arc, its first legend row, the first
       model bar and its monogram all take the brand lime. Hashing the name gave
       every card its own arrangement, so a reader had to decode five different
       colour orders on one screen.
       A name keeps its hue for as long as its rank holds; when the ranking moves
       the hue follows it, which is information rather than noise. */
    function rankColors(keys) {
      const out = {};
      const seen = new Set();
      let i = 0;
      for (const k of keys) {
        if (seen.has(k)) continue;
        seen.add(k);
        out[k] = PAL[i % PAL.length];
        i++;
      }
      return out;
    }

    /* Monogram for a model, so a row is scannable before the text is read. */
    function modelMark(name) {
      const s = String(name || '');
      const low = s.toLowerCase();
      if (low.includes('minimax')) return 'MM';
      if (low.includes('kimi')) return 'K';
      if (low.includes('deepseek')) return 'DS';
      if (low.includes('claude')) return 'CL';
      if (low.includes('gemini')) return 'GE';
      if (low.includes('glm')) return 'GLM';
      if (low.includes('gpt')) return 'AI';
      if (low.startsWith('hy')) return low.slice(0, 3).toUpperCase();
      const m = s.match(/[A-Za-z0-9]/);
      return m ? m[0].toUpperCase() : '\u00b7';
    }


    /* ============ Dictionary ============ */
    const DICTS = {
      en: {
        panel: 'API usage', title: 'API usage workbench', eyebrow: 'Local Telemetry',
        live: 'Live', refresh: 'Refresh', export: 'Export', clear: 'Clear', clearConfirm: 'Delete all recorded usage?',
        rangeToday: 'Today', range7: '7d', range30: '30d', rangeAll: 'All', allProviders: 'All providers',
        calls: 'Calls', tokens: 'Tokens', cache: 'Cache read', failures: 'Failures', providers: 'Providers', cost: 'Est. cost',
        callsNote: 'successful', tokensNote: 'in / out', cacheNote: 'hit rate', failuresNote: 'rate', costNote: 'estimated',
        heroTokens: 'Total tokens', heroUnit: 'M', heroIn: 'input', heroOut: 'output', heroCompare: 'vs previous period',
        dailyTitle: 'Usage trend', dailyDesc: 'Daily token consumption', hourlyTitle: 'Requests', hourlyDesc: '24-hour distribution',
        providerTitle: 'Provider share', providerDesc: 'by token consumption', modelTitle: 'Models', modelDesc: 'by token usage', quotaTitle: 'Quota & balance',
        legendTokens: 'Tokens', legendOnboard: 'Onboarding', peakLabel: 'Peak', dataOnboard: 'Data onboard',
        modelByTokens: 'Usage', modelByCalls: 'Calls', modelFootCount: '{n} models', callsUnit: 'calls',
        recentTitle: 'Recent calls', tableDescTpl: 'Latest {n} records · click headers to sort', recordCountTpl: '{n} records',
        colTime: 'Time', colProvider: 'Provider', colModel: 'Model', colInput: 'In', colOutput: 'Out', colCache: 'Cache', colStatus: 'Status', colDuration: 'Duration',
        empty: 'No usage recorded yet.', emptyTable: 'No records under the current filters.', loading: 'Loading…', loadError: 'Failed to load data.', retry: 'Retry',
        quotaMonth: 'Monthly', quota5h: '5h window', quotaLocal: 'Local', localPeriod: 'Period',
        wTotal: 'total', wCode: 'code', wWeek: 'Week', wDay: 'Day', w5h: '5h', wReset: 'resets in',
        quotaNoCredential: 'no key', quotaAuthFailed: 'auth failed', quotaError: 'unavailable',
        layoutEdit: 'Customize layout', layoutDone: 'Done', layoutReset: 'Reset layout',
        layoutHint: 'Drag the bar at the top of a module to move it · drag the corner to resize · arrow keys nudge, Shift+arrow resizes · Ctrl+Z undo',
        layoutHintShort: 'Arrow keys move · Shift+arrow resizes · Esc exits',
        undo: 'Undo', redo: 'Redo', hiddenCards: 'Hidden', cardHide: 'Hide', cardRestore: 'Restore',
        mods: { ov: 'Overview', trend: 'Usage trend', donut: 'Provider share', quota: 'Quota & balance', hourly: 'Requests', model: 'Models', heat: 'Activity', table: 'Recent calls' },
        heatTitle: 'Activity density', heatDesc: 'Weekday × two-hour slot · brighter means heavier use',
        heatPeak: 'Peak slot', heatFew: 'Less', heatMore: 'More', heatTokens: 'Tokens', heatCalls: 'Calls',
        heatEmpty: 'Not enough history for a density map yet.',
        searchPh: 'Search model, provider, status', filterAll: 'All',
        quotaDesc: 'By connected account', quotaActive: 'active', quotaInUse: 'In use',
        quotaEmptyNote: 'No usage recorded yet. This account is declared but inactive; it will appear here once data flows in.',
        quotaFootStart: 'Recording since', quotaFootTracker: 'local tracker',
        activeShort: 'active', registeredShort: 'registered', others: 'Others',
        chipsIdle: 'Additional providers are declared in the catalog but have no recorded traffic yet.',
        balanceTotal: 'Balance', balanceToppedUp: 'Topped up', balanceGranted: 'Granted', balanceUsed: 'Used', balanceUsedSince: 'tracked since', balanceAvailable: 'Available', balanceUnavailable: 'Low',
        creditsTotal: 'Credits', creditsPackages: 'Credit packages', cardWidth: 'Card width', localShort: 'Local',
        orgSpend: 'Month spend', orgSpendNote: 'Set budget in Settings → Models', budgetLabel: 'Budget (USD)', budgetSave: 'Save', budgetClear: 'Clear',
        adminSettingsTitle: 'OpenAI org · admin key', adminSettingsHelp: 'For organization usage API. Never enter a model key.',
        adminSettingsSave: 'Save key', adminSettingsRemove: 'Remove', adminSettingsPlaceholder: 'sk-admin-...',
        storageLocation: 'Storage', recordsLabel: 'Records', lastSync: 'Last sync', telemetry: 'Local telemetry',
      },
      zh: {
        panel: 'API 用量', title: 'API 用量工作台', eyebrow: 'Local Telemetry · 本地遥测',
        live: '实时采样', refresh: '刷新', export: '导出', clear: '清空', clearConfirm: '确定删除全部用量记录？',
        rangeToday: '今天', range7: '近 7 天', range30: '近 30 天', rangeAll: '全部', allProviders: '全提供商',
        calls: '调用次数', tokens: 'Token 总量', cache: '缓存读取', failures: '失败次数', providers: '输入提供商', cost: '预估费用 (USD)',
        callsNote: '次成功', tokensNote: '输入 / 输出', cacheNote: '命中率', failuresNote: '失败率', costNote: '按平台定价估算',
        heroTokens: 'Total Tokens · 总消耗', heroUnit: 'M', heroIn: '输入', heroOut: '输出', heroCompare: '较上一周期',
        dailyTitle: '用量趋势分布', dailyDesc: '每日 Token 消耗 · 单位 M', hourlyTitle: '请求分布', hourlyDesc: '24 小时 · 按小时聚合',
        providerTitle: '提供商占比', providerDesc: '按 Token 消耗计算', modelTitle: '模型用量分布', modelDesc: '按 Token 消耗排序', quotaTitle: '额度与余额',
        legendTokens: 'Token 消耗', legendOnboard: '数据接入点', peakLabel: '峰值', dataOnboard: '数据接入',
        modelByTokens: '用量', modelByCalls: '调用', modelFootCount: '共 {n} 个模型', callsUnit: '次调用',
        recentTitle: '最近调用', tableDescTpl: '最新 {n} 条记录 · 点击表头可排序', recordCountTpl: '{n} 条记录',
        colTime: '时间', colProvider: '提供商', colModel: '模型', colInput: '输入', colOutput: '输出', colCache: '缓存读取', colStatus: '状态', colDuration: '耗时',
        empty: '暂无用量数据。发起对话后自动记录。', emptyTable: '当前筛选条件下没有调用记录。', loading: '加载中…', loadError: '无法加载数据。', retry: '重试',
        quotaMonth: '本月', quota5h: '近 5 小时', quotaLocal: '本地记录', localPeriod: '所选时段',
        wTotal: '总量', wCode: '代码', wWeek: '本周', wDay: '今日', w5h: '5h', wReset: '后重置',
        quotaNoCredential: '未配置密钥', quotaAuthFailed: '鉴权失败', quotaError: '不可用',
        layoutEdit: '自定义布局', layoutDone: '完成', layoutReset: '恢复默认',
        layoutHint: '拖动模块顶部的横条可移动，拖动右下角可缩放，方向键微调、Shift+方向键改变尺寸，Ctrl+Z 撤销',
        layoutHintShort: '方向键移动 · Shift+方向键缩放 · Esc 退出',
        undo: '撤销', redo: '重做', hiddenCards: '已隐藏', cardHide: '隐藏', cardRestore: '恢复',
        mods: { ov: '概览', trend: '用量趋势', donut: '提供商占比', quota: '额度与余额', hourly: '请求分布', model: '模型', heat: '活跃度', table: '最近调用' },
        heatTitle: '活跃度分布', heatDesc: '星期 × 时段的使用密度 · 颜色越亮用量越高',
        heatPeak: '峰值时段', heatFew: '少', heatMore: '多', heatTokens: 'Token 消耗', heatCalls: '调用次数',
        heatEmpty: '历史数据还不足以绘制密度图。',
        searchPh: '搜索模型、提供方或状态', filterAll: '全部',
        quotaDesc: '按接入账户统计', quotaActive: '活跃', quotaInUse: '采用中',
        quotaEmptyNote: '暂无调用记录。该账户已声明但尚未产生用量，数据接入后将自动出现在这里。',
        quotaFootStart: '开始记录于', quotaFootTracker: '本地追踪器',
        activeShort: '活跃', registeredShort: '已录入', others: '其他',
        chipsIdle: '还有提供方已声明但尚未产生调用记录。',
        balanceTotal: '总余额', balanceToppedUp: '充值', balanceGranted: '赠送', balanceUsed: '已使用', balanceUsedSince: '统计自', balanceAvailable: '充足', balanceUnavailable: '不足',
        creditsTotal: '积分余额', creditsPackages: '积分包', cardWidth: '卡片宽度', localShort: '本地',
        orgSpend: '本月花费', orgSpendNote: '在设置中配置预算后显示进度条', budgetLabel: '月度预算（USD）', budgetSave: '保存', budgetClear: '清除',
        adminSettingsTitle: 'OpenAI 组织用量 · 管理员密钥', adminSettingsHelp: '仅用于查询 OpenAI 组织用量，请勿填写模型密钥。',
        adminSettingsSave: '保存密钥', adminSettingsRemove: '移除', adminSettingsPlaceholder: 'sk-admin-...',
        storageLocation: '存储位置', recordsLabel: '记录', lastSync: '最后同步', telemetry: '本地遥测',
      },
    };

    function detectLang(ctx) {
      try { const l = ctx.get('locale'); if (l?.getLocale) { const id = String(l.getLocale().active || '').toLowerCase(); if (id.startsWith('zh')) return 'zh'; } } catch {}
      try { if (typeof navigator !== 'undefined' && navigator.language) return String(navigator.language).toLowerCase().startsWith('zh') ? 'zh' : 'en'; } catch {}
      return 'en';
    }

    function compact(n) {
      if (!Number.isFinite(n)) return '0';
      if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
      if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'k';
      return String(Math.round(n));
    }
    function fmtM(n, d) { return `${(n / 1e6).toFixed(d === undefined ? 2 : d)}M`; }
    function fmtUsd(v) { return `$${(Number.isFinite(v) ? v : 0).toFixed(2)}`; }
    function dayKey(ts) { const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
    function fmtTime(ts) { const d = new Date(ts); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`; }
    function fmtDur(ms) { if (!Number.isFinite(ms)) return '-'; if (ms < 1000) return `${ms}ms`; const s = ms/1000; if (s < 60) return `${s.toFixed(1)}s`; return `${Math.floor(s/60)}m${Math.round(s%60)}s`; }
    // Reset countdowns reach days, so they need their own scale.
    function fmtCountdown(ms) {
      if (!Number.isFinite(ms) || ms <= 0) return '-';
      const m = Math.floor(ms / 60000);
      if (m < 60) return `${m}m`;
      const h = Math.floor(m / 60);
      if (h < 24) return `${h}h${String(m % 60).padStart(2, '0')}m`;
      return `${Math.floor(h / 24)}d${String(h % 24).padStart(2, '0')}h`;
    }
    function tpl(s, vars) { return String(s).replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? '')); }
    // Live traffic is dominated by `tool-calls`; only outcomes that mean
    // something to a reader get their own colour.
    function badgeClass(finish) {
      const f = String(finish || '');
      if (f === 'error') return ' err';
      if (f === 'stop') return ' stop';
      if (f === 'max-tokens') return ' trunc';
      return '';
    }

    /* ============================================================
     * Workbench layout engine
     * ------------------------------------------------------------
     * ONE document drives the whole workbench:
     *   { v: 2, modules: { id: {x,y,w,h} }, cards: { group: {order,hidden} } }
     *
     * Modules are placed on a fixed lattice of small cells (COLS columns of
     * ROW_H pixels). Position and size are always INTEGER cell coordinates, so
     * a module can only ever sit on the grid — never between two cells — and
     * growing/shrinking/moving costs exactly one cell per step, like stacking
     * blocks. A drag never mutates the document: it previews whole cells by
     * writing grid slots straight to the DOM, and only the drop commits,
     * through the one history stack that makes undo/redo correct.
     *
     * settleAll() is pinned-first placement followed by gravity: the
     * pinned rect keeps its slot, everything else falls to the highest
     * free row. That is what keeps the grid hole-free, which is the
     * property the old implementation was missing (it left floating
     * modules and large dead areas behind).
     * ============================================================ */
    const WB_KEY = 'dsau.workbench.v5';
    const LEGACY_KEYS = ['dsau.layout.v1', 'dsau.items.v1', 'dsau.workbench.v2', 'dsau.workbench.v3', 'dsau.workbench.v4'];
    /* Fine, uniform cells. The board is a fixed lattice of small squares and
       every module is placed on it by integer coordinates — a module is never
       positioned in pixels and never sized in pixels, so a drag always lands on
       a whole cell and two modules can never half-overlap. Doubling the column
       count from 12 (and halving the row height) is what makes the lattice
       small enough to feel like blocks: the coarsest step is now 8px of gutter
       instead of 16px, and a module can be widened or narrowed by that much. */
    /* The lattice: 24 columns of a FIXED row height and a FIXED gutter.
     *
     * These two numbers are constants, not measurements, and that is the whole
     * point: a cell is worth the same number of pixels for the entire session.
     * Resizing one module then changes that module and nothing else — the ones
     * below it slide down, the ones beside it never move. A previous release
     * derived the row height from the viewport and from the board's total height,
     * which meant every time a module was made one row taller the derived pitch
     * changed and ALL EIGHT modules changed size at once. That is what made
     * resizing feel like the whole board jumping instead of a block moving.
     *
     * The gutter is part of the board's breathing rhythm and it is also the
     * smallest move/resize step, so it is deliberately chunky: at 3px the cards
     * read as one continuous slab with no edges. */
    const COLS = 24, MAX_H = 96;
    const ROW_H = 18, GAP = 12;
    const KPI_IDS = ['calls', 'tokens', 'cache', 'failed', 'providers', 'cost'];

    // Per-module constraints, in CELLS: `min` is the hard floor a manual resize
    // may reach, `fit` is the height the content actually needs to read — the
    // point below which a module shows a title bar and nothing else. `def` is
    // the factory layout: five bands, 36 rows, every module already at or above
    // its `fit`, so one desktop screen holds the whole board with no scrollbar.
    // The minimums are deliberately LOW. A floor set to what the content
    // "ideally" needs is a floor the reader can never cross, so the board feels
    // locked; everything here is allowed to become cramped and scroll instead.
    const MODULES = {
      ov:     { min: { w: 8,  h: 5 }, fit: 7, def: { x: 0,  y: 0,  w: 24, h: 7 } },
      trend:  { min: { w: 6,  h: 5 }, fit: 7, def: { x: 0,  y: 7,  w: 14, h: 7 } },
      donut:  { min: { w: 4,  h: 5 }, fit: 7, def: { x: 14, y: 7,  w: 10, h: 7 } },
      quota:  { min: { w: 6,  h: 5 }, fit: 8, def: { x: 0,  y: 14, w: 24, h: 8 } },
      hourly: { min: { w: 4,  h: 5 }, fit: 6, def: { x: 0,  y: 22, w: 8,  h: 6 } },
      model:  { min: { w: 4,  h: 4 }, fit: 6, def: { x: 8,  y: 22, w: 8,  h: 6 } },
      heat:   { min: { w: 8,  h: 5 }, fit: 6, def: { x: 16, y: 22, w: 8,  h: 6 } },
      table:  { min: { w: 8,  h: 4 }, fit: 8, def: { x: 0,  y: 28, w: 24, h: 8 } },
    };
    const MOD_IDS = Object.keys(MODULES);
    const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
    const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

    /* Cards live in their own 12-column sub-grid inside a module, so a card can
       be resized independently of the module that holds it. */
    const CARD_COLS = 12, CARD_MIN_SPAN = 2;

    function defaultModules() {
      const out = {};
      for (const id of MOD_IDS) out[id] = { ...MODULES[id].def };
      return out;
    }
    function defaultWB() { return { v: 2, modules: defaultModules(), cards: {} }; }

    /* Placement model (the one every polished dashboard board uses):
     *
     *  1. A module keeps the COLUMN the user chose. That is the part of the
     *     gesture that is honoured literally.
     *  2. Rows are not free-standing: the board is compacted upwards, so a
     *     dropped module rises until it meets something. Gravity never pushes
     *     a module down, so dropping a module higher can never make it lower.
     *  3. The dragged module is placed FIRST, so it claims its rows before the
     *     others flow around it — that is what makes a drop feel like it
     *     "pushed in" instead of like the board re-dealt itself.
     *
     * The result is a function of (columns, sizes, relative order) only, which
     * is why there are no gaps, no overlaps, and no jump on drop: the preview
     * during the drag is the same computation with the same inputs.
     */
    function settleAll(mods, pinnedId, pinnedRect) {
      const list = MOD_IDS.map((id) => ({ id, ...(mods[id] || MODULES[id].def) }));
      const pinned = pinnedId ? list.find((i) => i.id === pinnedId) : null;
      if (pinned && pinnedRect) Object.assign(pinned, pinnedRect);
      for (const it of list) {
        it.y = Math.max(0, Math.round(Number(it.y) || 0));
        it.x = clampN(Math.round(Number(it.x) || 0), 0, COLS - it.w);
      }

      // Placement order: the pinned module first, then by requested row so the
      // board keeps its reading order.
      const placed = [];
      const order = pinned ? [pinned, ...list.filter((i) => i !== pinned)] : list.slice();
      if (!pinned) order.sort((a, b) => a.y - b.y || a.x - b.x);
      for (const it of order) {
        let y = it.y, guard = 0;
        while (placed.some((p) => overlaps(p, { ...it, y })) && guard++ < 400) y++;
        it.y = y;
        placed.push(it);
      }

      // Gravity. Repeating until stable keeps the result independent of the
      // order the modules happen to be visited in.
      for (let pass = 0; pass < 6; pass++) {
        let moved = false;
        for (const it of placed.slice().sort((a, b) => a.y - b.y)) {
          while (it.y > 0) {
            const up = { ...it, y: it.y - 1 };
            if (placed.some((p) => p !== it && overlaps(p, up))) break;
            it.y--; moved = true;
          }
        }
        if (!moved) break;
      }

      const res = {};
      for (const it of placed) res[it.id] = { x: it.x, y: it.y, w: it.w, h: it.h };
      return res;
    }


    function normalizeWB(raw) {
      const src = raw && typeof raw === 'object' ? raw : {};
      const mods = src.modules && typeof src.modules === 'object' ? src.modules : {};
      const out = {};
      for (const id of MOD_IDS) {
        const r = mods[id] || {};
        const min = MODULES[id].min, def = MODULES[id].def;
        const w = clampN(Math.round(Number(r.w)) || def.w, min.w, COLS);
        const hh = clampN(Math.round(Number(r.h)) || def.h, min.h, MAX_H);
        const x = clampN(Number.isFinite(r.x) ? Math.round(r.x) : def.x, 0, COLS - w);
        const y = Number.isFinite(r.y) ? Math.max(0, Math.round(r.y)) : def.y;
        out[id] = { x, y, w, h: hh };
      }
      const cards = {};
      const srcCards = src.cards && typeof src.cards === 'object' ? src.cards : {};
      for (const g of Object.keys(srcCards)) {
        const st = srcCards[g] || {};
        const spans = {};
        const srcSpans = st.spans && typeof st.spans === 'object' ? st.spans : {};
        for (const key of Object.keys(srcSpans).slice(0, 64)) {
          const n = Math.round(Number(srcSpans[key]));
          if (Number.isFinite(n)) spans[key] = clampN(n, CARD_MIN_SPAN, CARD_COLS);
        }
        cards[g] = {
          order: Array.isArray(st.order) ? st.order.filter((v) => typeof v === 'string').slice(0, 64) : [],
          hidden: Array.isArray(st.hidden) ? st.hidden.filter((v) => typeof v === 'string').slice(0, 64) : [],
          spans,
        };
      }
      return { v: Number.isFinite(src.v) ? (src.v | 0) : 2, modules: settleAll(out, null), cards };
    }

    /* NOTHING in this plugin may rewrite a saved board.
       A previous release tried to "fit the board to one screen" by scaling the
       heights of whatever the reader had saved. It ran on load, stamped the
       document and wrote it back, so every refresh silently replaced the
       reader's own layout with a squashed copy of it — and the board looked
       like it had forgotten everything. Fitting is a RENDER concern: it may
       change how many pixels a cell is worth, never what the document says.
       The saved document is therefore stored and restored verbatim. */

    /* localStorage alone is not durable enough for a layout: it is per-browser,
       per-profile, and wiped by "clear site data". The Host keeps a copy next to
       the usage records, so the board comes back on another browser or after a
       profile reset. Writes are debounced — a drag fires one commit, but a run
       of arrow-key nudges would otherwise POST on every key press. */
    let layoutSaveTimer = 0;
    function pushLayout(doc) {
      if (layoutSaveTimer) clearTimeout(layoutSaveTimer);
      layoutSaveTimer = setTimeout(() => {
        layoutSaveTimer = 0;
        try {
          fetch(LAYOUT_URL, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ layout: doc }),
          }).catch(() => {});
        } catch {}
      }, 400);
    }

    function saveWB(doc) {
      try { localStorage.setItem(WB_KEY, JSON.stringify(doc)); } catch {}
      pushLayout(doc);
    }
    function loadWB() {
      try {
        const raw = localStorage.getItem(WB_KEY);
        if (raw) return normalizeWB(JSON.parse(raw));
      } catch {}
      const base = defaultWB();
      // Carry over the only thing worth keeping from the previous
      // implementation: the per-card order and visibility.
      try {
        const legacy = JSON.parse(localStorage.getItem('dsau.items.v1') || '{}');
        if (legacy && typeof legacy === 'object') base.cards = legacy;
      } catch {}
      for (const k of LEGACY_KEYS) { try { localStorage.removeItem(k); } catch {} }
      /* Deliberately NOT saved here: this is a placeholder until the Host copy
         arrives (see the adopt effect in Workbench). Persisting it would store
         the factory layout over a real one the moment a profile is fresh. */
      return normalizeWB(base);
    }

    /* ---- geometry: cells -> pixels ---- */
    const colPx = (gridW) => (gridW - GAP * (COLS - 1)) / COLS;
    function cellPx(rect, gridW) {
      const cw = colPx(gridW);
      return {
        w: Math.max(0, Math.round(cw * rect.w + GAP * (rect.w - 1))),
        h: Math.max(0, Math.round(ROW_H * rect.h + GAP * (rect.h - 1))),
      };
    }

    // Density is derived from the settled cell size, so content is re-laid-out
    // (never transform-scaled). `sm` drops secondary chrome, `lg` breathes out.
    function densityOf(px) {
      if (!px || !px.w) return 'md';
      /* `sm` used to trigger when EITHER axis was small, so a tall narrow module
         — a 500px-tall donut at 319px wide — dropped its legend and chips while
         it still had room to show them, and shrinking one module could change
         what a different-looking one displayed. A cell is cramped only when it
         is small in both directions, or too narrow for any card to fit. */
      if (px.w < 300) return 'sm';
      if (px.w < 460 && px.h < 300) return 'sm';
      /* Height matters on its own: a wide module can be only ~180px tall, and md
         chrome alone (panel padding, title, description, footer rule) eats most
         of that, so the chart is clipped even though the cell is generous
         horizontally. Treat any module shorter than that as cramped and let it
         drop the secondary chrome. */
      if (px.h < 200) return 'sm';
      if (px.w >= 900 && px.h >= 440) return 'lg';
      return 'md';
    }

    /* ---- per-group card order / visibility / span ---- */
    function cardState(wb, group) {
      const st = (wb && wb.cards && wb.cards[group]) || {};
      return {
        order: Array.isArray(st.order) ? st.order : [],
        hidden: Array.isArray(st.hidden) ? st.hidden : [],
        spans: st.spans && typeof st.spans === 'object' ? st.spans : {},
      };
    }
    function cardOrder(wb, group, all) {
      const st = cardState(wb, group);
      const hidden = new Set(st.hidden);
      const saved = st.order.filter((id) => all.includes(id));
      return [...saved, ...all.filter((id) => !saved.includes(id))].filter((id) => !hidden.has(id));
    }

    /* ============================================================
     * Layout editing: pointer drag, resize, keyboard
     * ------------------------------------------------------------
     * Four ideas keep this correct and smooth:
     *
     * 1. A gesture never mutates the document. It only produces a *preview*
     *    rectangle. The preview is settled against the neighbours during the
     *    render (see `previewRects` below), and the document is written once,
     *    on drop. That is what makes undo/redo trivially correct.
     *
     * 2. Because the settlement happens in the render, siblings never snap
     *    back to a stale position: the grid reflows as one committed state,
     *    not as an imperative poke that the next render undoes.
     *
     * 3. The dragged module is already in its snapped grid slot; a single
     *    translate() (written straight to the DOM node, no React render)
     *    makes it follow the pointer between rows/columns. So the gesture
     *    costs one render per *cell crossing*, not per frame.
     *
     * 4. Pointer Events + setPointerCapture: one code path for mouse, pen and
     *    touch, pointercancel handled, so a cancelled gesture leaves nothing
     *    stuck behind.
     * ============================================================ */
    function useLayoutEditor(doc, commit) {
      const gridRef = React.useRef(null);
      const docRef = React.useRef(doc);
      docRef.current = doc;
      const gridWRef = React.useRef(1200);
      const [gridW, setGridW] = React.useState(1200);
      const [editing, setEditing] = React.useState(false);
      const dragRef = React.useRef(null);

      const measure = React.useCallback(() => {
        const el = gridRef.current;
        if (!el) return gridWRef.current;
        const w = el.getBoundingClientRect().width;
        if (w > 0) {
          gridWRef.current = w;
          setGridW((prev) => (Math.abs(prev - w) > 0.5 ? w : prev));
        }
        return gridWRef.current;
      }, []);

      React.useLayoutEffect(() => { measure(); }, [measure]);
      React.useEffect(() => {
        const el = gridRef.current;
        if (!el || typeof ResizeObserver === 'undefined') {
          const onResize = () => measure();
          window.addEventListener('resize', onResize);
          return () => window.removeEventListener('resize', onResize);
        }
        const ro = new ResizeObserver(() => measure());
        ro.observe(el);
        return () => ro.disconnect();
      }, [measure]);

      const nodeOf = (id) => {
        const el = gridRef.current;
        return el ? el.querySelector(`[data-mod="${id}"]`) : null;
      };
      const offset = (id, dx, dy) => {
        const node = nodeOf(id);
        if (!node) return;
        node.style.transform = dx || dy ? `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0)` : '';
        node.style.zIndex = dx || dy ? '45' : '';
      };

      const begin = React.useCallback((e, id, mode) => {
        if (!editing) return;
        if (e.button != null && e.button !== 0) return;
        const base = docRef.current.modules[id];
        const gridEl = gridRef.current;
        const node = nodeOf(id);
        if (!base || !node || !gridEl) return;
        const gw = measure();
        const cw = colPx(gw);
        /* One cell step, gutter included. Everything below is expressed in these
           units, which is why a gesture can only ever produce whole cells. */
        const stepX = cw + GAP, stepY = ROW_H + GAP;
        const box = node.getBoundingClientRect();
        /* The lattice origin: where cell (0,0) actually starts in the viewport.
           Deriving it from the dragged node keeps the math independent of how
           far the board is scrolled. */
        const originX = box.left - base.x * stepX;
        const originY = box.top - base.y * stepY;

        const nodes = {}, painted = {};
        for (const mid of MOD_IDS) {
          const n = nodeOf(mid);
          if (n) { nodes[mid] = n; painted[mid] = { ...docRef.current.modules[mid] }; }
        }

        /* Lay the board out by writing grid slots straight to the DOM. No React
           render happens during a gesture: a re-render of seven modules (charts,
           tables, a heat map) per cell crossing is what made the old drag feel
           sticky. The integer layout is computed by settleAll, so what the
           pointer previews is exactly what a drop will commit. */
        const paint = (preview) => {
          const settled = preview ? settleAll(docRef.current.modules, id, preview) : docRef.current.modules;
          for (const mid of MOD_IDS) {
            const r = settled[mid], n = nodes[mid], p = painted[mid];
            if (!r || !n) continue;
            if (p && p.x === r.x && p.y === r.y && p.w === r.w && p.h === r.h) continue;
            /* Grid slots cannot be transitioned, so a module that the gesture
               pushed to a new slot would teleport — which is what made the board
               read as jumping. Grid lines give the new position instantly, so the
               old one is played back as a transform that settles to zero: the
               module slides. The dragged module is excluded, because its
               transform is the pointer tracker. */
            if (p && mid !== id && (p.x !== r.x || p.y !== r.y)) {
              const dx = (p.x - r.x) * stepX, dy = (p.y - r.y) * stepY;
              try {
                if (n.dsauGlide) n.dsauGlide.cancel();
                n.dsauGlide = n.animate(
                  [{ transform: `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0)` }, { transform: 'translate3d(0, 0, 0)' }],
                  { duration: 190, easing: 'cubic-bezier(.2, .8, .25, 1)' },
                );
              } catch (err) { /* no Web Animations: the slot update alone is correct */ }
            }
            n.style.gridColumn = `${r.x + 1} / span ${r.w}`;
            n.style.gridRow = `${r.y + 1} / span ${r.h}`;
            n.dataset.density = densityOf(cellPx(r, gw));
            painted[mid] = { ...r };
          }
          return settled;
        };

        /* The drop slot is drawn as an empty cell: a dashed block the dragged
           module will occupy. It makes the snap legible before letting go. */
        let slot = null;
        const showSlot = (r) => {
          if (!r) return;
          if (!slot) {
            slot = document.createElement('div');
            slot.className = 'dsau-slot';
            gridEl.appendChild(slot);
          }
          slot.style.gridColumn = `${r.x + 1} / span ${r.w}`;
          slot.style.gridRow = `${r.y + 1} / span ${r.h}`;
        };

        const st = {
          id, mode, cw, stepX, stepY, originX, originY, base: { ...base },
          startX: e.clientX, startY: e.clientY,
          moved: false, cellKey: '', rect: { ...base }, shown: { ...base }, raf: 0,
        };
        dragRef.current = st;
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}

        /* Pointer -> lattice. `Math.round` on a whole cell is the snap: the
           module jumps by exactly one cell when the pointer has travelled half
           of one, and the sub-cell remainder is passed to translate() so the
           block still tracks the cursor smoothly instead of stepping. */
        const rectOf = (ev) => {
          if (mode === 'move') {
            const left = box.left + (ev.clientX - st.startX);
            const top = box.top + (ev.clientY - st.startY);
            const x = clampN(Math.round((left - originX) / stepX), 0, COLS - st.base.w);
            const y = Math.max(0, Math.round((top - originY) / stepY));
            return { x, y, w: st.base.w, h: st.base.h };
          }
          const dx = ev.clientX - st.startX, dy = ev.clientY - st.startY;
          const w = clampN(st.base.w + Math.round(dx / stepX), MODULES[id].min.w, COLS - st.base.x);
          const h = clampN(st.base.h + Math.round(dy / stepY), MODULES[id].min.h, MAX_H);
          return { x: st.base.x, y: st.base.y, w, h };
        };

        const apply = (ev) => {
          st.raf = 0;
          if (dragRef.current !== st) return;
          const rect = rectOf(ev);
          const key = `${rect.x},${rect.y},${rect.w},${rect.h}`;
          if (key !== st.cellKey) {
            st.cellKey = key;
            st.rect = rect;
            st.shown = paint(rect)[id] || rect;
            showSlot(st.shown);
          }
          const shown = st.shown;
          if (mode === 'move') {
            /* Follow the pointer to the pixel, then let the cell do the snapping. */
            const left = box.left + (ev.clientX - st.startX);
            const top = box.top + (ev.clientY - st.startY);
            offset(id,
              left - (originX + shown.x * stepX),
              top - (originY + shown.y * stepY));
          } else {
            offset(id, 0, 0);
          }
        };

        const onMove = (ev) => {
          if (dragRef.current !== st) return;
          const adx = ev.clientX - st.startX, ady = ev.clientY - st.startY;
          if (!st.moved) {
            if (Math.abs(adx) + Math.abs(ady) < 4) return;
            st.moved = true;
            gridEl.classList.add('is-dragging');
            node.classList.add('is-drag-preview');
            showSlot(st.base);
          }
          const root = gridEl.closest('.dsau-root');
          if (root) {
            const EDGE = 64, STEP = 14;
            if (ev.clientY < EDGE) root.scrollTop -= STEP;
            else if (ev.clientY > window.innerHeight - EDGE) root.scrollTop += STEP;
          }
          /* One layout pass per frame, not per pointer event. */
          if (!st.raf) st.raf = requestAnimationFrame(() => apply(ev));
          ev.preventDefault();
        };

        const cleanup = () => {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
          window.removeEventListener('pointercancel', onCancel);
          window.removeEventListener('keydown', onKey, true);
          if (st.raf) cancelAnimationFrame(st.raf);
          st.raf = 0;
          gridEl.classList.remove('is-dragging');
          node.classList.remove('is-drag-preview');
          if (slot && slot.parentNode) slot.parentNode.removeChild(slot);
          offset(id, 0, 0);
        };

        const finish = (ev, cancelled) => {
          if (dragRef.current !== st) return;
          dragRef.current = null;
          const moved = st.moved;
          const rect = ev && moved ? rectOf(ev) : st.rect;
          cleanup();
          if (cancelled || !moved) {
            /* Aborted: put the board back exactly as it was, without a commit. */
            paint(null);
            return;
          }
          /* Commit the rect the slot showed. settleAll is idempotent on its own
             output, so this cannot shift the board on drop. */
          commit((cur) => ({ ...cur, modules: settleAll({ ...cur.modules, [id]: rect }, id, rect) }));
        };
        const onUp = (ev) => finish(ev, false);
        const onCancel = () => finish(null, true);
        // Escape aborts the gesture and leaves the board exactly as it was.
        const onKey = (ev) => {
          if (ev.key !== 'Escape') return;
          ev.preventDefault();
          ev.stopPropagation();
          finish(null, true);
        };

        window.addEventListener('pointermove', onMove, { passive: false });
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onCancel);
        window.addEventListener('keydown', onKey, true);
      }, [editing, measure, commit]);

      /* Keyboard: arrows move, Shift+arrows resize, Alt steps by 4, Esc exits. */
      const onKeyDown = React.useCallback((e) => {
        if (!editing) return;
        if (e.key === 'Escape') { setEditing(false); return; }
        const id = e.currentTarget && e.currentTarget.dataset ? e.currentTarget.dataset.mod : null;
        if (!id) return;
        const dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
        if (!dir) return;
        e.preventDefault();
        const step = e.altKey ? 4 : 1;
        const min = MODULES[id].min;
        commit((cur) => {
          const c = cur.modules[id];
          const next = e.shiftKey
            ? { ...c, w: clampN(c.w + dir[0] * step, min.w, COLS - c.x), h: clampN(c.h + dir[1] * step, min.h, MAX_H) }
            : { ...c, x: clampN(c.x + dir[0] * step, 0, COLS - c.w), y: Math.max(0, c.y + dir[1] * step) };
          return { ...cur, modules: settleAll({ ...cur.modules, [id]: next }, id, next) };
        });
      }, [editing, commit]);

      return { gridRef, gridW, rects: doc.modules, editing, setEditing, begin, onKeyDown, measure };
    }

    /* ============================================================
     * Undo / redo history
     * ------------------------------------------------------------
     * A stack of whole workbench documents (a few hundred bytes each), so
     * every mutation path — drag, resize, keyboard, card reorder, reset —
     * is undoable for free. Commits within 600ms merge, which turns a run
     * of keyboard nudges into a single undo step.
     * ============================================================ */
    function useHistory(initial) {
      const [present, setPresent] = React.useState(initial);
      /* The document lives in a ref as well: commit() must read the CURRENT
       * value even when two mutations land in the same tick, and persisting
       * must never happen inside a state updater (React may run those twice). */
      const presentRef = React.useRef(present);
      const pastRef = React.useRef([]);
      const futureRef = React.useRef([]);
      const lastAtRef = React.useRef(0);
      const [, force] = React.useReducer((x) => x + 1, 0);

      const apply = React.useCallback((next) => {
        presentRef.current = next;
        saveWB(next);
        setPresent(next);
      }, []);

      const commit = React.useCallback((fn) => {
        const cur = presentRef.current;
        const next = typeof fn === 'function' ? fn(cur) : fn;
        if (!next || next === cur) return;
        const now = Date.now();
        if (now - lastAtRef.current > 600) {
          pastRef.current = [...pastRef.current, cur].slice(-60);
          futureRef.current = [];
        }
        lastAtRef.current = now;
        apply(next);
        force();
      }, [apply]);

      const undo = React.useCallback(() => {
        if (!pastRef.current.length) return;
        const cur = presentRef.current;
        const prev = pastRef.current[pastRef.current.length - 1];
        pastRef.current = pastRef.current.slice(0, -1);
        futureRef.current = [cur, ...futureRef.current].slice(0, 60);
        lastAtRef.current = 0;
        apply(prev);
        force();
      }, [apply]);

      const redo = React.useCallback(() => {
        if (!futureRef.current.length) return;
        const cur = presentRef.current;
        const next = futureRef.current[0];
        futureRef.current = futureRef.current.slice(1);
        pastRef.current = [...pastRef.current, cur].slice(-60);
        lastAtRef.current = 0;
        apply(next);
        force();
      }, [apply]);

      /* Adopt a document from outside the undo history (the Host copy on load).
         It replaces the board without becoming an undo step, because the user
         did not perform it and stepping "back" into the factory layout would be
         indistinguishable from a reset. */
      const adopt = React.useCallback((next) => {
        presentRef.current = next;
        try { localStorage.setItem(WB_KEY, JSON.stringify(next)); } catch {}
        pastRef.current = [];
        futureRef.current = [];
        lastAtRef.current = 0;
        setPresent(next);
        force();
      }, []);

      React.useEffect(() => {
        const onKey = (e) => {
          const mod = e.metaKey || e.ctrlKey;
          if (!mod) return;
          const k = String(e.key).toLowerCase();
          if (k === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
          else if (k === 'y') { e.preventDefault(); redo(); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
      }, [undo, redo]);

      return {
        doc: present, commit, undo, redo, adopt,
        canUndo: pastRef.current.length > 0, canRedo: futureRef.current.length > 0,
      };
    }

    /* ============================================================
     * Card group
     * ------------------------------------------------------------
     * Reorder by pointer, hide / restore, and resize.
     * The drop index comes from the DOM (elementFromPoint), not from cached
     * rectangles, so it stays correct when the grid wraps or reflows. A
     * caret marks the seam the card will land on; hidden cards survive as
     * chips so a mis-click is always one click from being undone.
     *
     * Cards live in their own 12-column sub-grid inside a module, so a card's
     * width is its own property: resizing a module never touches a hand-picked
     * card width, and a card can be resized without touching the module.
     * ============================================================ */
    function CardGroup({ group, ids, labels, doc, commit, editing, className, defSpan, minCard, renderCard }) {
      const order = cardOrder(doc, group, ids);
      const st = cardState(doc, group);
      const hidden = st.hidden.filter((id) => ids.includes(id));
      const [dragId, setDragId] = React.useState(null);
      const [overId, setOverId] = React.useState(null);
      const [resizeId, setResizeId] = React.useState(null);
      const wrapRef = React.useRef(null);
      const dflt = clampN(Math.round(Number(defSpan)) || 4, CARD_MIN_SPAN, CARD_COLS);

      /* The sub-grid always has 12 columns, so a card's span is a SHARE of the
         module, not a pixel width. That is why a module could be shrunk and its
         cards stayed four-per-row in a third of the space, each one unreadable —
         the span never changed. Measuring the sub-grid lets the span be widened
         whenever the share would fall below a readable width, so narrowing a
         module re-flows its cards instead of squeezing them. */
      const [avail, setAvail] = React.useState(0);
      const worst = clampN(Math.round(Number(minCard)) || 0, 0, 480);
      React.useLayoutEffect(() => {
        const el = wrapRef.current;
        if (!el) return undefined;
        const read = () => {
          const w = el.getBoundingClientRect().width;
          if (w > 0) setAvail((prev) => (Math.abs(prev - w) > 0.5 ? w : prev));
        };
        read();
        if (typeof ResizeObserver === 'undefined') {
          window.addEventListener('resize', read);
          return () => window.removeEventListener('resize', read);
        }
        const ro = new ResizeObserver(read);
        ro.observe(el);
        return () => ro.disconnect();
      }, []);

      const spanOf = (id) => {
        const n = Math.round(Number(st.spans[id]));
        /* An explicit width is a decision, so it is honoured even when it makes a
           card narrower than the comfortable minimum — otherwise a saved 2-span
           is silently re-inflated to 3 on every load and the board looks like it
           forgot the change. The floor only shapes the DEFAULT span, where the
           reader has not chosen anything yet. */
        if (Number.isFinite(n)) return clampN(n, CARD_MIN_SPAN, CARD_COLS);
        const need = worst > 0 && avail > 0 ? Math.ceil((CARD_COLS * worst) / avail) : 0;
        return clampN(Math.max(dflt, need), CARD_MIN_SPAN, CARD_COLS);
      };

      const setOrder = (nextOrder) => commit((cur) => {
        const cur1 = cardState(cur, group);
        return { ...cur, cards: { ...cur.cards, [group]: { ...cur1, order: nextOrder } } };
      });
      const setSpan = (id, span) => commit((cur) => {
        const cur1 = cardState(cur, group);
        const spans = { ...cur1.spans, [id]: span };
        return { ...cur, cards: { ...cur.cards, [group]: { ...cur1, spans } } };
      });

      const toggle = (id) => commit((cur) => {
        const cur1 = cardState(cur, group);
        const set = new Set(cur1.hidden);
        if (set.has(id)) set.delete(id); else set.add(id);
        // Keep the full order so a restored card returns to its own slot.
        const full = [...cur1.order];
        for (const u of ids) if (!full.includes(u)) full.push(u);
        return { ...cur, cards: { ...cur.cards, [group]: { ...cur1, order: full, hidden: [...set] } } };
      });

      const begin = (e, id) => {
        if (!editing) return;
        if (e.button != null && e.button !== 0) return;
        if (e.target.closest && e.target.closest('button,a,select,input,textarea')) return;
        const wrap = wrapRef.current;
        if (!wrap || order.length < 2) return;
        const sx = e.clientX, sy = e.clientY;
        let started = false;
        let target = null;

        const onMove = (ev) => {
          if (!started && Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) < 5) return;
          // Only announce the drag once it is real: adding `is-dragging` marks the
          // group busy, and a busy group must not be hit-tested.
          if (!started) { started = true; setDragId(id); }
          const hit = document.elementFromPoint ? document.elementFromPoint(ev.clientX, ev.clientY) : null;
          const card = hit && hit.closest ? hit.closest('[data-card-id]') : null;
          const cid = card && wrap.contains(card) ? card.getAttribute('data-card-id') : null;
          target = cid && cid !== id ? cid : null;
          setOverId(target);
          ev.preventDefault();
        };
        const end = () => {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', end);
          window.removeEventListener('pointercancel', end);
          if (started && target) {
            const rest = order.filter((x) => x !== id);
            const to = rest.indexOf(target);
            if (to >= 0) { rest.splice(to, 0, id); setOrder(rest); }
          }
          setDragId(null);
          setOverId(null);
        };
        window.addEventListener('pointermove', onMove, { passive: false });
        window.addEventListener('pointerup', end);
        window.addEventListener('pointercancel', end);
      };

      // Drag the card's right edge horizontally; the sub-grid is measured once
      // per gesture and the span follows the pointer in whole columns.
      const beginResize = (e, id) => {
        if (!editing) return;
        if (e.button != null && e.button !== 0) return;
        e.stopPropagation();
        const wrap = wrapRef.current;
        const card = e.currentTarget && e.currentTarget.closest ? e.currentTarget.closest('[data-card-id]') : null;
        if (!wrap || !card) return;
        const style = window.getComputedStyle ? window.getComputedStyle(wrap) : null;
        /* Read the real gutter instead of assuming one. The stylesheet is the
           single source of truth for the card gap, and a hardcoded number that
           disagrees with it makes every drag land on the wrong column. The
           literal below only applies when computed styles are unavailable. */
        const readGap = style ? parseFloat(style.columnGap || style.gap) : NaN;
        const gap = Number.isFinite(readGap) ? readGap : 10;
        const cw = (wrap.getBoundingClientRect().width - gap * (CARD_COLS - 1)) / CARD_COLS;
        if (!(cw > 0)) return;
        const startX = e.clientX;
        const startSpan = spanOf(id);
        let live = startSpan;
        setResizeId(id);

        const onMove = (ev) => {
          const delta = Math.round((ev.clientX - startX) / (cw + gap));
          const next = clampN(startSpan + delta, CARD_MIN_SPAN, CARD_COLS);
          if (next !== live) {
            live = next;
            card.style.gridColumn = `span ${next}`;
          }
          ev.preventDefault();
        };
        const end = () => {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', end);
          window.removeEventListener('pointercancel', end);
          setResizeId(null);
          if (live !== startSpan) setSpan(id, live);
          else if (card.style) card.style.gridColumn = '';
        };
        window.addEventListener('pointermove', onMove, { passive: false });
        window.addEventListener('pointerup', end);
        window.addEventListener('pointercancel', end);
      };

      const spacing = (id) => ({ '--dsau-span': String(spanOf(id)) });

      return h('div', {
        ref: wrapRef,
        className: `dsau-cg ${className || ''}${editing ? ' is-editing' : ''}${dragId || resizeId ? ' is-busy' : ''}`,
      },
        order.map((id) => h('div', {
          key: id,
          'data-card-id': id,
          className: `dsau-cw${dragId === id ? ' is-dragging' : ''}${overId === id ? ' is-over' : ''}${resizeId === id ? ' is-resizing' : ''}`,
          style: spacing(id),
          onPointerDown: editing ? (e) => begin(e, id) : undefined,
        },
          renderCard(id),
          editing ? h('button', {
            type: 'button',
            className: 'dsau-cx',
            title: 'Hide',
            onPointerDown: (e) => e.stopPropagation(),
            onClick: (e) => { e.stopPropagation(); toggle(id); },
          }, '×') : null,
          editing ? h('span', {
            className: 'dsau-cr',
            title: 'Resize',
            onPointerDown: (e) => beginResize(e, id),
          }) : null,
        )),
        editing && hidden.length ? h('div', { className: 'dsau-crestore', style: { gridColumn: '1 / -1' } },
          hidden.map((id) => h('button', {
            type: 'button',
            key: id,
            className: 'dsau-crestore-b',
            onPointerDown: (e) => e.stopPropagation(),
            onClick: () => toggle(id),
          }, `+ ${(labels && labels.get(id)) || id}`)),
        ) : null,
      );
    }

    /* ============================================================
     * Module frame
     * ------------------------------------------------------------
     * The frame owns geometry and chrome. The body's density comes from the
     * settled cell size, so it re-lays-out when the cell changes rather
     * than being scaled by a transform.
     * ============================================================ */
    function Module({ id, rect, gridW, editing, dragging, label, onBegin, onKeyDown, children }) {
      const px = cellPx(rect, gridW);
      const density = densityOf(px);
      return h('section', {
        'data-mod': id,
        'data-density': density,
        role: 'region',
        'aria-label': label,
        tabIndex: editing ? 0 : -1,
        className: `dsau-mod${editing ? ' is-editing' : ''}${dragging ? ' is-drag-preview' : ''}`,
        style: { gridColumn: `${rect.x + 1} / span ${rect.w}`, gridRow: `${rect.y + 1} / span ${rect.h}` },
        onKeyDown: editing ? onKeyDown : undefined,
      },
        h('div', { className: 'dsau-mod-inner' }, children),
        editing ? h('div', { className: 'dsau-mod-chrome' },
          h('button', {
            type: 'button',
            className: 'dsau-grip',
            title: 'Drag to move · 拖动移动',
            'aria-label': `Move ${label}`,
            onPointerDown: (e) => { e.stopPropagation(); onBegin(e, id, 'move'); },
          }, h('svg', { viewBox: '0 0 14 14', width: 11, height: 11, fill: 'currentColor', 'aria-hidden': true },
            [3, 7, 11].map((y) => h('circle', { key: y, cx: 4, cy: y - 1, r: 1 })).concat(
              [3, 7, 11].map((y) => h('circle', { key: `b${y}`, cx: 9, cy: y - 1, r: 1 }))))),
          h('span', { className: 'dsau-mod-name' }, label),
          h('span', { className: 'dsau-mod-size' }, `${rect.w}×${rect.h}`),
        ) : null,
        editing ? h('span', {
          className: 'dsau-rz',
          title: 'Drag to resize · 拖动缩放',
          'aria-label': `Resize ${label}`,
          onPointerDown: (e) => { e.stopPropagation(); onBegin(e, id, 'resize'); },
        }, h('svg', { viewBox: '0 0 12 12', width: 10, height: 10, fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' },
          h('path', { d: 'M11 4.5 4.5 11M11 8.5 8.5 11' }))) : null,
      );
    }

    /* ============ CSS — "Precision Instrument" scale ============ */
    const css = `
      .dsau-root{height:100%;overflow:auto;box-sizing:border-box;padding:0 clamp(16px,2.4vw,32px) 20px;background:var(--dsw-alias-bg-base,#0A0E13);color:${C.textMd};font-size:14px;line-height:1.6}
      .dsau-root *{box-sizing:border-box;margin:0;padding:0}
      .dsau-root ::selection{background:${C.signalDeep};color:${C.textHi}}

      /* Top bar. It is sticky, so the board scrolls underneath it and it must
         therefore be opaque and paint above everything else. An earlier version
         ended its background in a transparent stop and used the raw token
         var(--dsw-alias-bg-base) with NO fallback: when that token is missing
         in the page context the whole declaration is invalid, the bar's
         background drops entirely, and the KPI cards bleed through it — text
         from the board reads on top of the title and the buttons. The fade now
         lives on a separate strip below the bar, and the colour carries a
         fallback in both places. */
      .dsau-top{position:sticky;top:0;z-index:30;display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap;padding:26px 0 10px;margin-bottom:14px;background:var(--dsw-alias-bg-base,#0A0E13);box-shadow:inset 0 -1px 0 ${C.lineSoft}}
      .dsau-top::after{content:'';position:absolute;top:100%;left:0;right:0;height:14px;background:linear-gradient(to bottom,var(--dsw-alias-bg-base,#0A0E13),transparent);pointer-events:none}
      .dsau-brand{display:flex;align-items:center;gap:12px;min-width:0}
      .dsau-mark{width:34px;height:34px;flex:0 0 34px;display:grid;place-items:center;border:1px solid ${C.lineStrong};border-radius:10px;background:${C.surface}}
      .dsau-mark svg{width:18px;height:18px}
      .dsau-eyebrow{font-size:10.5px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:${C.textFaint};line-height:1.4}
      .dsau-eyebrow .dot{color:${C.signalDim};padding:0 4px}
      .dsau-title{margin-top:1px;font-size:20px;font-weight:650;letter-spacing:-.02em;color:${C.textHi};line-height:1.22}
      .dsau-live{display:inline-flex;align-items:center;gap:7px;margin-left:8px;padding:5px 10px;border:1px solid ${C.line};border-radius:999px;background:${C.surface};font-size:11px;color:${C.textLo};white-space:nowrap}
      .dsau-live i{width:6px;height:6px;border-radius:50%;background:${C.ok};box-shadow:0 0 0 3px rgba(132,217,166,.12);animation:dsau-pulse 2.6s infinite}
      @keyframes dsau-pulse{0%,100%{opacity:1}50%{opacity:.45}}
      .dsau-controls{display:flex;align-items:center;gap:7px;flex-wrap:wrap}
      .dsau-seg{position:relative;display:inline-flex;padding:2px;gap:2px;background:${C.surface};border:1px solid ${C.line};border-radius:10px}
      .dsau-seg-pill{position:absolute;top:2px;left:2px;height:calc(100% - 4px);width:0;background:${C.surfaceHi};border:1px solid ${C.lineStrong};border-radius:8px;transition:transform .42s ${C.ease},width .42s ${C.ease};pointer-events:none}
      .dsau-seg button{position:relative;z-index:1;border:0;background:none;padding:5px 11px;font-size:12.5px;font-weight:550;color:${C.textLo};white-space:nowrap;border-radius:7px;cursor:pointer;transition:color .2s ease}
      .dsau-seg button:hover{color:${C.textHi}}
      .dsau-seg button.on{color:${C.textHi};font-weight:650}
      .dsau-selw{position:relative;display:inline-flex;align-items:center}
      .dsau-select{appearance:none;-webkit-appearance:none;padding:6px 28px 6px 11px;min-height:32px;background:${C.surface};border:1px solid ${C.line};border-radius:10px;font-size:12.5px;color:${C.textMd};cursor:pointer}
      .dsau-select:hover{border-color:${C.lineStrong}}
      .dsau-select option{background:${C.surface};color:${C.textHi}}
      .dsau-selw svg{position:absolute;right:10px;pointer-events:none;width:11px;height:11px;color:${C.textLo}}
      .dsau-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:32px;padding:6px 12px;border-radius:10px;font-size:12.5px;font-weight:600;white-space:nowrap;cursor:pointer;transition:background .2s ${C.ease},border-color .2s ${C.ease},color .2s ${C.ease},transform .2s ${C.ease};border:1px solid ${C.line};background:${C.surface};color:${C.textMd};text-decoration:none}
      .dsau-btn:active{transform:translateY(1px)}
      .dsau-btn:hover{background:${C.surfaceHi};border-color:${C.lineStrong};color:${C.textHi}}
      .dsau-btn.danger{background:transparent;border-color:rgba(238,129,119,.28);color:${C.danger}}
      .dsau-btn.danger:hover{background:rgba(238,129,119,.1);border-color:rgba(238,129,119,.55)}
      .dsau-btn.solid{background:${C.signal};border-color:${C.signal};color:${C.signalInk};font-weight:700}
      .dsau-btn.solid:hover{background:#D8F79A}
      .dsau-btn:focus-visible{outline:2px solid ${C.signal};outline-offset:2px}
      .dsau-btn:disabled{opacity:.5;cursor:not-allowed}

      /* overview band */
      .dsau-ov{display:grid;grid-template-columns:minmax(280px,.9fr) minmax(420px,1.6fr);grid-template-rows:minmax(0,1fr);gap:0;margin-bottom:0;background:${C.surface};border:1px solid ${C.lineSoft};border-radius:16px;overflow:hidden;animation:dsau-rise .6s ${C.ease} both}
      /* The overview band has two jobs: state the period total, and list the
         six supporting figures. They were rendered as two equal-weight
         columns, which made the band read as seven unrelated numbers. The
         primary column now sits on a lifted surface and carries the only
         large type; the KPI cells stay flat and drop to a supporting size. */
      .dsau-ov-pri{padding:20px 24px;position:relative;display:flex;flex-direction:column;justify-content:center;gap:9px;background:linear-gradient(155deg,${C.surfaceHi},${C.surface} 78%)}
      .dsau-ov-pri::after{content:"";position:absolute;right:0;top:14%;bottom:14%;width:1px;background:${C.line}}
      .dsau-hero{display:flex;align-items:baseline;gap:4px;margin-top:4px;font-family:${C.mono};font-variant-numeric:tabular-nums;letter-spacing:-.058em;line-height:1;color:${C.textHi}}
      .dsau-hero .num{font-size:46px;font-weight:600}
      .dsau-hero .unit{font-size:22px;font-weight:500;color:${C.signal};letter-spacing:-.01em}
      .dsau-hero-sub{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:12.5px;color:${C.textLo}}
      .dsau-delta{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:999px;font-family:${C.mono};font-size:12px;font-weight:600}
      .dsau-delta.up{background:rgba(203,242,126,.1);color:${C.signal}}
      .dsau-delta.down{background:rgba(238,129,119,.1);color:${C.danger}}
      .dsau-hero-sub .sep{color:${C.lineStrong}}
      /* the sparkline is the elastic part of the hero column, but stretch has a
         limit: the path is drawn in a 320x52 box, so a very tall cell scales it
         vertically far more than horizontally and every bump turns into a
         cliff. The band therefore grows with the cell but stops at 96px, and
         the column centres its stack so the leftover height splits above and
         below instead of pooling in one dead gap. */
      .dsau-spark-wrap{flex:1 1 auto;min-height:32px;max-height:96px;position:relative;margin-top:6px}
      .dsau-spark{width:100%;height:100%;display:block;overflow:visible}
      /* One hairline between cells: the grid shows through 1px gaps, so the
         lines follow the CARD positions instead of a fixed 3-per-row pattern. */
      .dsau-cg.dsau-kpis{gap:1px;background:${C.lineSoft}}
      .dsau-kpis>.dsau-cw{display:flex;min-width:0;min-height:0;background:${C.surface}}
      .dsau-kpis>.dsau-cw>.dsau-kpi{flex:1;min-width:0;background:transparent}
      .dsau-kpi{position:relative;padding:13px 16px;display:flex;flex-direction:column;justify-content:center;gap:4px;min-width:0;transition:background .22s ${C.ease};overflow:hidden}
      .dsau-kpis>.dsau-cw:hover>.dsau-kpi{background:${C.surfaceHi}}
      /* These six are a supporting readout, not six headlines. The accent became
         a hairline on the LEFT edge instead of a band across the top (a full
         band gave every cell the same visual weight as the hero figure), the
         label moved under the value, and the value dropped from 34px to 27px so
         the band reads as one hierarchy: one number large, six numbers small. */
      .dsau-kpi-bar{position:absolute;top:11px;bottom:11px;left:0;width:2px;display:block;opacity:.6;border-radius:0 2px 2px 0}
      .dsau-kpi-l{font-size:11px;color:${C.textLo};display:flex;align-items:center;gap:6px;white-space:nowrap;order:2}
      .dsau-kpi-l .tick{width:5px;height:5px;border-radius:50%;background:${C.lineStrong};flex:0 0 5px}
      .dsau-kpi-ic{width:12px;height:12px;flex:0 0 12px;opacity:.7}
      .dsau-kpi-v{font-family:${C.mono};font-variant-numeric:tabular-nums;font-size:23px;font-weight:550;line-height:1.08;letter-spacing:-.042em;color:${C.textHi};display:flex;align-items:baseline;gap:4px;order:1}
      .dsau-kpi-v .sfx{font-size:11.5px;font-weight:500;letter-spacing:0;color:${C.textLo}}
      .dsau-kpi-n{font-size:10px;color:${C.textFaint};font-family:${C.mono};letter-spacing:.01em;order:3}

      /* grid + panels */
      .dsau-grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:16px;margin-bottom:16px}
      .dsau-s4{grid-column:span 4}.dsau-s6{grid-column:span 6}.dsau-s8{grid-column:span 8}.dsau-s12{grid-column:span 12}
      .dsau-panel{position:relative;min-width:0;background:${C.surface};border:1px solid ${C.lineSoft};border-radius:14px;padding:15px 17px 16px;display:flex;flex-direction:column;transition:border-color .25s ${C.ease};animation:dsau-rise .62s ${C.ease} both}
      .dsau-panel:hover{border-color:${C.line}}
      .dsau-grid.g1 .dsau-panel:nth-child(1){animation-delay:.08s}
      .dsau-grid.g1 .dsau-panel:nth-child(2){animation-delay:.14s}
      .dsau-grid.g2 .dsau-panel:nth-child(1){animation-delay:.2s}
      .dsau-grid.g2 .dsau-panel:nth-child(2){animation-delay:.26s}
      .dsau-grid.g2 .dsau-panel:nth-child(3){animation-delay:.32s}
      @keyframes dsau-rise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
      .dsau-ph{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:13px}
      .dsau-pt{font-size:14.5px;font-weight:650;letter-spacing:-.01em;color:${C.textHi};line-height:1.32}
      .dsau-pd{margin:3px 0 0;font-size:11.5px;color:${C.textFaint}}
      .dsau-ptr{display:flex;align-items:center;gap:8px;flex:0 0 auto}
      .dsau-legend{display:flex;align-items:center;gap:16px;font-size:12px;color:${C.textLo};flex-wrap:wrap}
      .dsau-legend i{display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:6px;vertical-align:-1px}
      .dsau-mtoggle{display:inline-flex;padding:2px;background:${C.surface};border:1px solid ${C.line};border-radius:8px}
      .dsau-mtoggle button{border:0;background:none;color:${C.textFaint};font-size:11px;padding:5px 10px;border-radius:6px;font-weight:600;cursor:pointer;transition:all .2s ${C.ease}}
      .dsau-mtoggle button.on{background:${C.surfaceHi};color:${C.textHi}}

      /* charts */
      /* This must be a flex COLUMN: the chart box inside it is a flex item that
         stretches to fill, and without a flex parent it collapsed to the SVG's
         own height. That height came FROM the measurement, so the box measured
         itself and the chart stayed 140px tall inside a 430px cell, leaving the
         dead band under the bars. */
      .dsau-chart{position:relative;width:100%;flex:1 1 auto;min-height:0;display:flex;flex-direction:column}
      .dsau-chart svg{display:block;width:100%;height:100%;overflow:visible}
      /* The chart draws at the box's real pixel size (see useBoxSize) instead of
         stretching a fixed viewBox, so labels keep their proportions. This wrapper
         only provides the measurement box. */
      .dsau-chartbox{position:relative;flex:1 1 auto;min-height:0;width:100%;display:flex;align-items:stretch}
      .dsau-chartbox>svg{display:block;width:100%;height:100%}
      .dsau-grid-line{stroke:${C.line};stroke-width:1}
      .dsau-grid-line.base{stroke:${C.lineStrong}}
      .dsau-axis-base{stroke:${C.lineStrong};stroke-width:1}
      .dsau-axis-txt{fill:${C.textFaint};font-family:${C.mono};font-size:10px;letter-spacing:.02em}
      .dsau-axis-txt.x{dominant-baseline:auto}
      .dsau-axis-txt.x.hl{fill:${C.textHi}}
      .dsau-cross{stroke:${C.signalDim};stroke-width:1;stroke-dasharray:3 4;opacity:0;transition:opacity .15s}
      .dsau-cross.on{opacity:1}
      .dsau-hit{fill:transparent;cursor:crosshair}
      .dsau-bar{transition:opacity .18s ${C.ease},fill .18s ${C.ease}}
      .dsau-chart:hover .dsau-bar:not(:hover){opacity:.42}
      .dsau-bar:hover{opacity:1!important}
      .dsau-anno-line{stroke:${C.signalDim};stroke-width:1;stroke-dasharray:2 4;opacity:.55}
      .dsau-anno-box{fill:${C.surfaceHi};stroke:${C.lineStrong};stroke-width:1}
      .dsau-anno-txt{fill:${C.signalDim};font-family:${C.mono};font-size:10px;letter-spacing:.03em}

      /* tooltip */
      .dsau-tt{position:fixed;z-index:40;pointer-events:none;opacity:0;transform:translate(-50%,-100%) translateY(-10px);padding:9px 12px;background:${C.surfaceHi};border:1px solid ${C.lineStrong};border-radius:8px;box-shadow:0 12px 32px rgba(0,0,0,.45);font-size:12px;color:${C.textHi};white-space:nowrap;transition:opacity .14s ${C.ease}}
      .dsau-tt.on{opacity:1}
      .dsau-tt .tt-l{color:${C.textLo};font-size:11px;margin-bottom:3px}
      .dsau-tt .tt-v{font-family:${C.mono};font-size:14px;font-weight:600;font-variant-numeric:tabular-nums}

      /* donut */
      /* Centred on both axes: the ring and its legend are one composition, so
         whatever height the cell happens to be, the pair sits in the middle of
         it instead of hugging the top edge and leaving a dead band below. */
      .dsau-donut-b{display:flex;align-items:center;justify-content:center;gap:22px;flex:1 1 auto;min-height:0}
      .dsau-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:14px;padding-top:12px;border-top:1px solid ${C.lineSoft}}
      .dsau-chip{display:inline-flex;align-items:center;gap:6px;padding:4px 9px;border-radius:999px;background:${C.surfaceHi};border:1px solid ${C.lineSoft};font-size:11px;color:${C.textLo};white-space:nowrap}
      .dsau-chip i{width:5px;height:5px;border-radius:50%;background:${C.textFaint}}
      .dsau-chip.registered i{background:${C.azure}}
      .dsau-chip.active i{background:${C.signal}}
      .dsau-chip.active{color:${C.textMd};border-color:${C.line}}
      .dsau-chip.more{background:transparent;border-style:dashed;color:${C.textFaint};cursor:default}

      /* model bars — the list re-flows into as many columns as the cell allows,
         so a wide module reads horizontally instead of leaving dead space */
      /* The list fills its cell. Stretching each row was worse than the gap it
         fixed: a 430px cell gave four 125px rows with hollow space above and
         below every bar. Rows keep their natural height and the surplus is
         distributed BETWEEN them, so the rhythm evens out without inflating a
         single row. */
      .dsau-mlist{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));grid-auto-rows:min-content;gap:14px 22px;flex:1 1 auto;align-content:start;align-items:start;min-height:0}
      .dsau-mlist>.dsau-mrow{display:block;min-height:0}
      .dsau-mrow{min-width:0}
      .dsau-mrow-top{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:9px}
      .dsau-mname{flex:1 1 auto;min-width:0;font-size:13px;color:${C.textHi};font-weight:550;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .dsau-mtag{flex:0 0 auto;display:inline-grid;place-items:center;min-width:26px;height:18px;padding:0 5px;border:1px solid ${C.line};border-radius:6px;font-family:${C.mono};font-size:9.5px;font-weight:700;letter-spacing:.02em;background:${C.surfaceDeep};line-height:1}
      .dsau-mval{font-family:${C.mono};font-variant-numeric:tabular-nums;font-size:12px;color:${C.textMd};white-space:nowrap}
      .dsau-mtrack{height:7px;background:${C.surfaceHi};border-radius:999px;overflow:hidden;border:1px solid ${C.lineSoft}}
      .dsau-mfill{height:100%;border-radius:999px;transition:width .7s ${C.ease}}
      .dsau-mfoot{margin-top:auto;padding-top:12px;border-top:1px solid ${C.lineSoft};font-size:11px;color:${C.textFaint};display:flex;justify-content:space-between}

      /* heatmap — 7 weekdays × 12 two-hour slots */
      .dsau-heat{display:flex;flex-direction:column;flex:1 1 auto;min-height:0}
      /* The cells stretch to the panel height instead of sitting at a fixed 24px.
         Seven rows of 24px inside a 500px cell is what left the empty band under
         the map; min 22px keeps the short-module case readable and scrollable. */
      .dsau-heat-body{flex:1 1 auto;min-height:0;overflow:auto;padding-bottom:2px}
      .dsau-heat-grid{display:grid;grid-template-columns:44px repeat(12,minmax(18px,1fr));grid-auto-rows:minmax(10px,1fr);gap:4px;align-items:stretch;min-width:300px;height:100%}
      .dsau-heat-col{font-family:${C.mono};font-size:10px;color:${C.textFaint};text-align:center;align-self:end}
      .dsau-heat-row{font-size:11px;color:${C.textLo};text-align:right;padding-right:4px;white-space:nowrap;align-self:center}
      .dsau-heat-cell{height:auto;min-height:10px;border-radius:3px;background:#16212B;border:1px solid ${C.lineSoft};transition:transform .15s ${C.ease},border-color .15s ${C.ease};cursor:default}
      .dsau-heat-cell[data-lv="1"]{background:#2A4A3A}
      .dsau-heat-cell[data-lv="2"]{background:#3E7150}
      .dsau-heat-cell[data-lv="3"]{background:#5EA268}
      .dsau-heat-cell[data-lv="4"]{background:#CBF27E}
      .dsau-heat-cell:hover,.dsau-heat-cell:focus-visible{transform:scale(1.14);border-color:${C.textHi};outline:none}
      .dsau-heat-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:12px;flex-wrap:wrap;font-size:11px;color:${C.textFaint}}
      .dsau-heat-peak b{font-family:${C.mono};color:${C.signal};font-weight:600}
      .dsau-heat-legend{display:flex;align-items:center;gap:5px;font-size:10px}
      .dsau-heat-legend i{width:14px;height:10px;border-radius:2px;display:block}
      .dsau-heat-empty{font-size:12px;color:${C.textFaint};padding:24px 0}

      /* Ring + legend. One widget, two halves: the ring states the magnitude and
         the split, the series list beside it names the parts. Hovering either
         half fades the other so the pairing is legible without a tooltip. */
      .dsau-qhd{display:flex;align-items:center;gap:10px;margin:0;min-width:0}
      /* Ring and legend are centred against each other, and the whole strip
         fills the body, so every ring in a row lands on the same horizontal
         line no matter whether its card carries two series or four. */
      .dsau-ringw{display:flex;align-items:center;gap:12px;min-width:0;flex:1 1 auto}
      .dsau-ring{position:relative;display:flex;align-items:center;justify-content:center;flex:none}
      .dsau-ring svg{display:block;overflow:visible}
      .dsau-ring-t{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;pointer-events:none;padding:0 5px}
      /* Type inside the ring scales with the ring, not with the cell: one rule
         then works for the 104px donut and the 78px quota rings, and the number
         can no longer spill out of the circle it sits in. */
      .dsau-ring-v{font-family:${C.mono};font-size:calc(var(--dsau-ring,88px) * .145);font-weight:600;font-variant-numeric:tabular-nums;letter-spacing:-.03em;color:${C.textHi};line-height:1.05;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .dsau-ring-s{font-size:calc(var(--dsau-ring,88px) * .1);color:${C.textFaint};line-height:1.15;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      /* arcs sweep in one after another, so the order of the series is read */
      .dsau-ring-seg{transition:opacity .2s ${C.ease};animation:dsau-ring-in .55s ${C.ease} calc(var(--dsau-i,0) * 55ms) backwards}
      @keyframes dsau-ring-in{0%{stroke-dasharray:0 100}}
      .dsau-ring.is-dim .dsau-ring-seg{opacity:.3}
      .dsau-ring.is-dim .dsau-ring-seg.is-on{opacity:1}
      /* One row per series, always stacked. A wrapping flex container let a card
         with three limits put two of them side by side while the card next to it
         stacked four, so the legend column was a different shape in every cell
         and the eye could not scan down the row. A single column gives every
         card the same reading order: ring on the left, one series per line. */
      .dsau-rleg{display:flex;flex-direction:column;flex-wrap:nowrap;gap:4px;min-width:0;flex:1 1 auto;justify-content:flex-start;align-items:stretch}
      .dsau-rleg-row{display:flex;flex-direction:column;gap:0;padding:1px 5px;margin:0 -5px;border-radius:5px;cursor:default;min-width:0;max-width:100%;flex:0 0 auto;transition:background .18s ${C.ease},opacity .18s ${C.ease}}
      .dsau-rleg-row.is-on{background:${C.surfaceDeep}}
      .dsau-rleg-row.is-off{opacity:.5}
      .dsau-rleg-main{display:flex;align-items:center;gap:5px;min-width:0}
      .dsau-rleg-main i{width:6px;height:6px;border-radius:2px;flex:0 0 6px;display:block}
      .dsau-rleg-l{font-size:10.5px;font-weight:600;color:${C.textMd};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:0 1 auto;min-width:0}
      /* Right-aligned in the card, not after the label: a label of a different
         length used to shove its own percentage around, so a column of four
         limits had four different number positions. Pushing the number to the
         far edge makes one clean numeric column per card. */
      .dsau-rleg-p{font-family:${C.mono};font-size:10.5px;font-weight:700;font-variant-numeric:tabular-nums;flex:0 0 auto;margin-left:auto;padding-left:8px;text-align:right}
      .dsau-rleg-s{margin-left:11px;font-size:9.5px;line-height:1.25;color:${C.textFaint};font-family:${C.mono};overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .dsau-qhd-n{min-width:0;display:flex;flex-direction:column;gap:2px}
      .dsau-qhd-l{font-size:10.5px;color:${C.textFaint};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .dsau-qhd-v{font-family:${C.mono};font-size:20px;font-weight:600;font-variant-numeric:tabular-nums;letter-spacing:-.035em;line-height:1.05}
      .dsau-qhd-s{font-size:10px;color:${C.textFaint};font-family:${C.mono}}

      /* log search + provider pills */
      .dsau-search{display:inline-flex;align-items:center;gap:7px;height:32px;padding:0 10px;background:${C.surfaceDeep};border:1px solid ${C.line};border-radius:9px;transition:border-color .18s ${C.ease},background .18s ${C.ease}}
      .dsau-search:focus-within{border-color:${C.signal};background:${C.surface}}
      .dsau-search svg{width:13px;height:13px;flex:0 0 13px;color:${C.textFaint}}
      .dsau-search input{border:0;background:none;outline:none;color:${C.textHi};font-size:12px;font-family:inherit;width:170px;min-width:0}
      .dsau-search input::placeholder{color:${C.textFaint}}
      .dsau-search input::-webkit-search-cancel-button{cursor:pointer;filter:invert(.6)}
      .dsau-fpills{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:14px}
      .dsau-fpills button{border:1px solid ${C.line};background:transparent;color:${C.textLo};font-size:11px;font-weight:600;padding:4px 10px;border-radius:999px;cursor:pointer;transition:all .18s ${C.ease};font-family:inherit;white-space:nowrap}
      .dsau-fpills button:hover{color:${C.textHi};border-color:${C.lineStrong}}
      .dsau-fpills button.on{background:rgba(203,242,126,.12);border-color:rgba(203,242,126,.4);color:${C.signal}}
      .dsau-fpills button:focus-visible{outline:2px solid ${C.signal};outline-offset:1px}

      /* quota slots */
      /* cards are their own 12-column sub-grid: a card owns its span, so it can
         be resized independently of the module that contains it. */
      .dsau-cg{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:10px;align-items:stretch}
      .dsau-cg>.dsau-cw{grid-column:span var(--dsau-span,4);min-width:0}
      .dsau-quota-list{grid-auto-rows:max-content}
      .dsau-quota-list>.dsau-cw{display:flex;min-height:auto}
      .dsau-quota-list>.dsau-cw>.dsau-quota{flex:1;min-width:0}
      .dsau-quota{border:1px solid ${C.lineSoft};border-radius:12px;padding:9px 12px;background:${C.surfaceHi};display:flex;flex-direction:column;height:100%;position:relative;overflow:hidden;container-type:inline-size}
      /* The quota panel is denser than the other panels: its header is one short
         line and every card repeats the same structure, so full panel padding
         plus card padding was enough to push the last card under a scrollbar. */
      .dsau-quota-panel{padding:18px 18px 14px}
      .dsau-quota-panel .dsau-ph{margin-bottom:14px}
      .dsau-quota-rule{position:absolute;top:0;left:0;right:0;height:2px;opacity:.85}
      .dsau-quota.is-empty{background:transparent;border-style:dashed}
      .dsau-quota-h{display:flex;align-items:center;gap:7px;margin-bottom:6px}
      .dsau-quota-mark{flex:0 0 auto;display:inline-grid;place-items:center;min-width:24px;height:16px;padding:0 4px;border:1px solid ${C.line};border-radius:5px;background:${C.surfaceDeep};font-family:${C.mono};font-size:9px;font-weight:700;line-height:1;letter-spacing:.02em}
      .dsau-quota-n{font-size:13px;font-weight:600;color:${C.textHi};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;flex:0 1 auto}
      /* The metered body is centred in the card. Cards in one row share a height,
         and a short card left its figures stranded at the top under a large void;
         centring keeps every card's figure on the same visual line.
         The safe-center keyword is repeated on purpose: when the content is taller
         than the card it degrades to flex-start instead of clipping the top row,
         and a browser without support simply ignores the second declaration. */
      /* The body centres its content vertically. Anchoring it to the top left a
         card with a short legend with a tall void under it while the card beside
         it looked full, so a row read as bottom-heavy on the left and empty on
         the right. The safe-center keyword is repeated on purpose: when the
         content is taller than the card it degrades to flex-start instead of
         clipping the top row. The ring and its legend stay top-aligned to EACH
         OTHER — centring them separately would push a four-row legend's ring
         down past a two-row legend's ring again. */
      .dsau-qbody{display:flex;flex-direction:column;justify-content:center;justify-content:safe center;flex:1 1 auto;min-height:0}
      /* One meta band closes every card, so the cards in a row share the same
         bottom line whether they report money spent or local traffic. Rendering
         two different footers at two different heights was what made a row of
         cards look like five unrelated widgets. */
      .dsau-qmeta{display:flex;align-items:baseline;gap:6px;flex-wrap:nowrap;margin-top:auto;padding-top:6px;border-top:1px dashed ${C.line};font-size:10px;color:${C.textFaint};font-family:${C.mono};min-width:0;overflow:hidden}
      .dsau-qmeta-l{padding:1px 5px;border-radius:4px;background:${C.track};color:${C.textLo};letter-spacing:.02em;flex:0 0 auto;white-space:nowrap}
      .dsau-qmeta-v{color:${C.textMd};font-variant-numeric:tabular-nums;flex:0 0 auto;font-size:11px;font-weight:600}
      .dsau-qmeta-s{margin-left:auto;color:${C.textFaint};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:0 1 auto}
      .dsau-qmeta .sep{color:${C.lineStrong};flex:0 0 auto}
      .dsau-quota-s{display:inline-flex;align-items:center;gap:5px;font-size:11px;color:${C.textLo};white-space:nowrap;flex:0 0 auto}
      .dsau-quota-s i{width:6px;height:6px;border-radius:50%;background:${C.ok}}
      .dsau-quota-s.empty i{background:${C.textFaint}}
      /* A fixed right-hand slot keeps the header metric on the same x-position on
         every card. It used to be rendered only when a card had traffic, so the
         header of one card ended where the next one's number began. */
      .dsau-quota-m{margin-left:auto;min-width:44px;text-align:right;font-family:${C.mono};font-size:11px;color:${C.textMd};flex:0 0 auto}
      .dsau-quota-m.none{color:${C.textFaint}}
      .dsau-quota-empty-note{font-size:11px;color:${C.textFaint};line-height:1.6}
      .dsau-quota-foot{margin-top:12px;font-size:11px;color:${C.textFaint};font-family:${C.mono}}
      /* the tracker's own measurement, demoted to the shared meta band */
      .dsau-qlocal{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:auto;padding-top:5px;border-top:1px dashed ${C.line};font-size:10px;color:${C.textFaint};font-family:${C.mono}}
      .dsau-qlocal .sep{color:${C.lineStrong}}
      .dsau-qlocal-l{padding:1px 5px;border-radius:4px;background:${C.track};color:${C.textLo};letter-spacing:.02em}
      .dsau-qlocal-v{color:${C.textMd};font-variant-numeric:tabular-nums}
      /* The spend figure and the local-traffic figure are the same kind of thing
         — one quiet number under the ring — so they share a band, a rule and a
         baseline instead of being two differently styled footers. */
      .dsau-qspent{display:flex;align-items:baseline;gap:7px;margin-top:8px;padding-top:7px;border-top:1px solid ${C.lineSoft};min-width:0}
      .dsau-qspent-l{font-size:10.5px;color:${C.textLo};white-space:nowrap;flex:0 0 auto}
      .dsau-qspent-v{font-family:${C.mono};font-size:13px;font-weight:600;font-variant-numeric:tabular-nums;color:${C.textHi};letter-spacing:-.02em;flex:0 0 auto}
      .dsau-qspent-s{margin-left:auto;font-size:9.5px;color:${C.textFaint};font-family:${C.mono};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:0 1 auto}


    /* ============================================================
     * Layout-editing CSS (replaces the old transform-scaling block)
     * ------------------------------------------------------------
     * The module is a grid cell that always participates in layout. Content
     * is re-laid-out at the cell size (see [data-density]) instead of being
     * transform-scaled, so text never blurs and nothing is ever clipped.
     * ============================================================ */
    /* A cell's height is ROW_H and the gutter is GAP — both constants, so a
       module's pixel height depends only on its own row count. Nothing here may
       be derived from the viewport: see the note on the lattice. */
    .dsau-mods{position:relative;display:grid;grid-template-columns:repeat(${COLS},minmax(0,1fr));grid-auto-rows:${ROW_H}px;gap:${GAP}px;align-items:stretch;margin-bottom:12px}
    .dsau-mod{position:relative;min-width:0;min-height:0;display:block;border-radius:14px}
    .dsau-mod-inner{display:flex;flex-direction:column;height:100%;min-height:0;min-width:0}
    .dsau-mod-inner>*{flex:1 1 auto;min-height:0;min-width:0}
    .dsau-mod-inner>.dsau-panel,.dsau-mod-inner>.dsau-ov,.dsau-mod-inner>.dsau-quota-panel,.dsau-mod-inner>.dsau-table-panel{height:100%;margin:0}
    .dsau-mod-inner>.dsau-empty{display:flex;align-items:center;justify-content:center;height:100%;border:1px dashed ${C.line};border-radius:16px}
    /* A cell has a fixed height, so every body owns its overflow: charts shrink,
       lists and tables scroll. Nothing may spill over the neighbour. */
    .dsau-mod-inner{overflow:hidden}
    .dsau-mod-inner>.dsau-panel{overflow:hidden}
    .dsau-mod-inner .dsau-mlist{overflow-y:auto;min-height:0;justify-content:flex-start;flex:1 1 auto}
    .dsau-mod-inner .dsau-mfoot{flex:0 0 auto}
    .dsau-mod-inner>.dsau-table-panel>.dsau-scroll{flex:1 1 auto;min-height:0;overflow:auto}
    .dsau-mod-inner .dsau-quota-list{overflow-y:auto;min-height:0;flex:1 1 auto;align-content:start;padding-bottom:6px}
    /* A cell has a hard height, so a list that does not fit scrolls. The soft
       bottom edge makes that read as "more below" instead of a clipped glyph. */
    .dsau-mod-inner .dsau-quota-list,
    .dsau-mod-inner .dsau-mlist,
    .dsau-mod-inner>.dsau-table-panel>.dsau-scroll,
    .dsau-mod-inner .dsau-kpis{
      scrollbar-width:thin;
      mask-image:linear-gradient(to bottom,#000 calc(100% - 18px),transparent 100%);
      -webkit-mask-image:linear-gradient(to bottom,#000 calc(100% - 18px),transparent 100%);
    }
    .dsau-mod-inner .dsau-ov{min-height:0}
    .dsau-mod-inner .dsau-ov-pri{min-height:0;overflow:hidden}
    /* The KPI grid fills its cell: rows share the height equally instead of
       packing to the top, which used to leave a dead band under the last row
       whenever the module was taller than six cards needed. minmax keeps a
       floor so a short cell scrolls rather than squashing the figures. */
    .dsau-mod-inner .dsau-kpis{overflow-y:auto;min-height:0;align-content:stretch;grid-auto-rows:minmax(0,1fr)}

    /* ---- density: the cell size decides how much chrome the body keeps ----
       The sm tier is the one that has to WORK, not merely exist: a board
       compacted to one screen gives each module ~100–140px, and at md chrome
       (panel padding, a 14px title, a description line, a footer rule) that
       leaves a body too short to draw anything. So sm strips the decoration and
       keeps only the title and the data. */
    .dsau-mod[data-density="sm"] .dsau-panel,
    .dsau-mod[data-density="sm"] .dsau-quota-panel,
    .dsau-mod[data-density="sm"] .dsau-table-panel{padding:10px 12px 11px}
    .dsau-mod[data-density="sm"] .dsau-ph{margin-bottom:7px;gap:8px}
    .dsau-mod[data-density="sm"] .dsau-pt{font-size:12.5px}
    .dsau-mod[data-density="sm"] .dsau-pd{display:none}
    .dsau-mod[data-density="sm"] .dsau-eyebrow{font-size:10px}
    .dsau-mod[data-density="sm"] .dsau-ov-pri{padding:12px 14px}
    .dsau-mod[data-density="sm"] .dsau-hero .num{font-size:28px}
    .dsau-mod[data-density="sm"] .dsau-hero .unit{font-size:18px}
    .dsau-mod[data-density="sm"] .dsau-spark-wrap{height:30px;padding-top:4px}
    .dsau-mod[data-density="sm"] .dsau-kpi{padding:8px 10px;gap:2px}
    .dsau-mod[data-density="sm"] .dsau-kpi-v{font-size:17px}
    .dsau-mod[data-density="sm"] .dsau-kpi-l{font-size:10.5px}
    .dsau-mod[data-density="sm"] .dsau-donut-b{gap:12px;justify-content:flex-start}
    /* A cell this small cannot host a 104px ring beside a legend; the ring is
       shrunk to what the cell allows and the legend takes the rest. */
    .dsau-mod[data-density="sm"] .dsau-ring{--dsau-ring:56px}
    .dsau-mod[data-density="sm"] .dsau-rleg{gap:2px}
    /* The ring is the tallest thing a quota card holds, so the card body clips
       rather than letting the ring bleed over its own legend. */
    .dsau-mod[data-density="sm"] .dsau-qbody{overflow:hidden}
    .dsau-mod[data-density="sm"] .dsau-mtag{min-width:22px;height:15px;font-size:8.5px}
    .dsau-donut-b .dsau-ring{--dsau-ring:104px}
    .dsau-mod[data-density="sm"] .dsau-donut-b .dsau-ring{--dsau-ring:82px}
    .dsau-mod[data-density="sm"] .dsau-mlist{gap:9px}
    .dsau-mod[data-density="sm"] .dsau-mrow-top{margin-bottom:5px}
    .dsau-mod[data-density="sm"] .dsau-mfoot{margin-top:5px;padding-top:7px}
    .dsau-mod[data-density="sm"] .dsau-quota{padding:6px 9px}
    .dsau-mod[data-density="sm"] .dsau-quota-h{margin-bottom:3px}
    /* A card's width is its own business, so the card queries itself instead of
       the module. At 2 of 12 columns the name "DeepSeek Account" and the status
       chip could not both fit beside a 44px figure column, and the chip wrapped
       to two lines ("采 用 中") while the name was cut to "DeepSeek ...". The
       chip is the least informative of the three, so it is the one that goes. */
    @container (max-width: 300px){
      .dsau-quota-s{display:none}
      .dsau-quota-n{font-size:12px}
      .dsau-quota{padding:8px 10px}
    }
    @container (max-width: 240px){
      .dsau-quota-m{min-width:0;font-size:10px}
      .dsau-ringw{gap:8px}
    }
    .dsau-mod[data-density="sm"] .dsau-table{min-width:620px}
    .dsau-mod[data-density="sm"] .dsau-table th{padding:5px 8px;font-size:10px}
    .dsau-mod[data-density="sm"] .dsau-table td{padding:5px 8px;font-size:11.5px}
    .dsau-mod[data-density="sm"] .dsau-fpills{margin-bottom:7px}
    .dsau-mod[data-density="sm"] .dsau-scroll{margin:0 -12px;padding:0 12px}
    .dsau-mod[data-density="lg"] .dsau-panel{padding:28px}
    .dsau-mod[data-density="lg"] .dsau-ov-pri{padding:36px}
    .dsau-mod[data-density="lg"] .dsau-hero .num{font-size:64px}
    .dsau-mod[data-density="lg"] .dsau-kpi-v{font-size:30px}

    /* ---- editing chrome ---- */
    .dsau-mods.is-editing{user-select:none;-webkit-user-select:none}
    .dsau-mods.is-dragging{cursor:grabbing}
    .dsau-mods.is-editing>.dsau-mod{outline:1px solid ${C.lineSoft};outline-offset:-1px;transition:outline-color .16s ${C.ease}}
    .dsau-mods.is-editing>.dsau-mod:hover{outline-color:${C.lineStrong}}
    .dsau-mods.is-editing>.dsau-mod:focus-visible{outline:2px solid ${C.signal};outline-offset:-1px}
    .dsau-mod-chrome{position:absolute;top:0;left:0;right:0;height:26px;display:flex;align-items:center;gap:8px;padding:0 8px 0 4px;z-index:8;pointer-events:none;border-radius:16px 16px 0 0;background:linear-gradient(to bottom,rgba(10,14,19,.94),rgba(10,14,19,.66) 60%,transparent)}
      .dsau-mod-chrome>*{pointer-events:auto}
    .dsau-grip{display:inline-flex;align-items:center;justify-content:center;width:22px;height:18px;padding:0;border:0;border-radius:5px;background:transparent;color:${C.textFaint};cursor:grab;touch-action:none}
    .dsau-grip:hover{background:${C.surfaceHi};color:${C.signal}}
    .dsau-grip:active{cursor:grabbing}
    .dsau-mod-name{font-size:11px;color:${C.textFaint};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:.02em}
    .dsau-mods.is-editing>.dsau-mod:hover .dsau-mod-name{color:${C.textLo}}
    .dsau-mod-size{margin-left:auto;font-family:${C.mono};font-size:10px;letter-spacing:.04em;color:${C.textFaint};user-select:none}
    .dsau-mod:hover .dsau-mod-size{color:${C.textLo}}
    .dsau-rz{position:absolute;right:2px;bottom:2px;width:18px;height:18px;display:flex;align-items:center;justify-content:center;z-index:9;color:${C.textFaint};cursor:nwse-resize;border-radius:5px;touch-action:none}
    .dsau-rz:hover{color:${C.signal};background:rgba(203,242,126,.1)}
    .dsau-rz svg{pointer-events:none}
    /* the dragged module tracks the pointer; the siblings reflow underneath.
       grid-column/grid-row are not animatable, so the reflow is instant on
       purpose — no fake transition that would only pretend to animate. */
    .dsau-mod.is-drag-preview{z-index:45;pointer-events:none;border-radius:16px;box-shadow:0 22px 60px rgba(0,0,0,.6);outline:1.5px solid ${C.signal}!important;outline-offset:-1px;will-change:transform}
    .dsau-mod.is-drag-preview .dsau-mod-inner{opacity:.96}
    /* The empty landing cell. Drawn inside the grid, so it costs no layout of its
       own; a dashed signal outline says "this block goes here" before the drop. */
    .dsau-mods .dsau-slot{grid-auto-rows:auto;border-radius:16px;border:1.5px dashed ${C.signal};background:rgba(203,242,126,.06);pointer-events:none;z-index:1;animation:dsau-slot-in .12s ${C.ease} both}
    @keyframes dsau-slot-in{from{opacity:0;transform:scale(.985)}to{opacity:1;transform:none}}
    .dsau-mods.is-dragging>.dsau-mod:not(.is-drag-preview){opacity:.55;transition:opacity .15s ${C.ease}}
    .dsau-layout-hint{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 14px;margin-bottom:14px;border-radius:12px;border:1px dashed ${C.signalDeep};background:rgba(203,242,126,.05);font-size:12px;color:${C.textMd}}
    .dsau-layout-hint i{width:6px;height:6px;border-radius:50%;background:${C.signal};flex:0 0 6px}
    .dsau-layout-hint .kbd{margin-left:auto;font-family:${C.mono};font-size:10px;color:${C.textFaint};white-space:nowrap}
    .dsau-btn.accent{background:${C.signal};border-color:${C.signal};color:${C.signalInk};font-weight:700}
    .dsau-btn.accent:hover{background:#D8F79A;border-color:#D8F79A;color:${C.signalInk}}
    .dsau-btn.ghost{background:transparent;border-color:transparent;color:${C.textLo}}
    .dsau-btn.ghost:hover{background:${C.surfaceHi};color:${C.textHi}}
    .dsau-btn.ghost:disabled{opacity:.35}

    /* ---- card wrappers (reorder + hide/restore) ---- */
    .dsau-cw{position:relative;display:flex;min-width:0;min-height:0}
    .dsau-cw>*{flex:1 1 auto;min-width:0}
    /* quota cards share one row height (max-content, so nothing is clipped) —
       equal heights read as a grid, ragged ones read as an accident */
    .dsau-quota-list>.dsau-cw{align-items:stretch}
    .dsau-quota-list>.dsau-cw>*{width:100%}
    .dsau-mods.is-editing .dsau-cw{cursor:grab}
    .dsau-cw.is-dragging{opacity:.32}
    .dsau-cw.is-over::before{content:"";position:absolute;left:-3px;top:0;bottom:0;width:2px;border-radius:2px;background:${C.signal}}
    /* The hide control rides the card's own corner instead of sitting on top
       of its content: cards keep their metric in the top-right slot, so an
       overlaid button would either cover the number or squeeze the header. */
    .dsau-cx{position:absolute;top:-8px;right:-8px;z-index:6;width:18px;height:18px;display:grid;place-items:center;padding:0;border:1px solid ${C.lineStrong};border-radius:50%;background:${C.ink};color:${C.textLo};cursor:pointer;font-size:12px;line-height:1;box-shadow:0 2px 8px rgba(0,0,0,.5);opacity:0;transition:opacity .14s ease,color .14s ease,border-color .14s ease}
    .dsau-cw:hover>.dsau-cx,.dsau-cx:focus-visible{opacity:1}
    .dsau-cx:hover{border-color:${C.danger};color:${C.danger}}
    /* Card resize handle: a slim grip pinned to the card's bottom-right edge.
       It sits inside the card so it never collides with the hide button. */
    .dsau-cr{position:absolute;right:4px;bottom:4px;z-index:6;width:11px;height:11px;border-right:1.5px solid ${C.lineStrong};border-bottom:1.5px solid ${C.lineStrong};border-radius:0 0 3px 0;cursor:nwse-resize;touch-action:none;opacity:0;transition:opacity .14s ease,border-color .14s ease}
    .dsau-cw:hover>.dsau-cr,.dsau-cr:focus-visible{opacity:.9}
    /* Editing reveals every affordance at rest: a hover-only target is
       undiscoverable, and the user is explicitly arranging cards here. */
    .dsau-cg.is-editing .dsau-cr{opacity:.55}
    .dsau-cg.is-editing .dsau-cw:hover>.dsau-cr{opacity:1}
    .dsau-cg.is-editing .dsau-cx{opacity:.7}
    .dsau-cg.is-editing .dsau-cw:hover>.dsau-cx{opacity:1}
    .dsau-cr:hover{opacity:1;border-color:${C.signal}}
    .dsau-cw.is-resizing{outline:1px solid ${C.signal};outline-offset:1px;border-radius:12px}
    /* A gesture must not disable hit-testing: the drop target is found with
       elementFromPoint, so cards have to stay hit-testable while dragging.
       Only the tiny overlay buttons are muted. */
    .dsau-cg.is-busy .dsau-cw>.dsau-cx{pointer-events:none;opacity:0}
    .dsau-crestore{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:10px;padding-top:10px;border-top:1px dashed ${C.line};flex:1 1 100%}
    .dsau-crestore-b{display:inline-flex;align-items:center;gap:5px;padding:4px 9px;border-radius:999px;border:1px dashed ${C.lineStrong};background:transparent;color:${C.textLo};font-size:11px;cursor:pointer;font-family:inherit}
    .dsau-crestore-b:hover{border-color:${C.signal};color:${C.signal}}
    .dsau-kpis>.dsau-cw{min-height:0}
    .dsau-quota-list>.dsau-cw{min-width:0}
    .dsau-quota-list>.dsau-crestore{grid-column:1/-1}

      /* table */
      .dsau-quota-panel{padding-bottom:8px}
      .dsau-table-panel{padding-bottom:8px}
      /* The negative margin has to cancel the panel's own side padding exactly,
         or the table's scroll strip stops flush with the card edge. It read
         -24px while the panel padding became 17px, which left a 7px lip. */
      .dsau-scroll{overflow-x:auto;margin:0 -17px;padding:0 17px}
      .dsau-table{width:100%;border-collapse:collapse;font-size:13px;min-width:880px}
      .dsau-table th{text-align:left;padding:10px 14px;font-size:11px;font-weight:650;letter-spacing:.1em;text-transform:uppercase;color:${C.textFaint};border-bottom:1px solid ${C.line};white-space:nowrap;user-select:none}
      .dsau-table th.sortable{cursor:pointer;transition:color .2s}
      .dsau-table th.sortable:hover{color:${C.textHi}}
      .dsau-table th .dsau-arrow{opacity:0;margin-left:5px;font-size:9px;display:inline-block}
      .dsau-table th[aria-sort="ascending"] .dsau-arrow,.dsau-table th[aria-sort="descending"] .dsau-arrow{opacity:1;color:${C.signal}}
      .dsau-table th[aria-sort="descending"] .dsau-arrow{transform:rotate(180deg)}
      .dsau-table td{padding:11px 14px;border-bottom:1px solid ${C.lineSoft};color:${C.textMd};white-space:nowrap}
      .dsau-table tbody tr{transition:background .18s ${C.ease}}
      .dsau-table tbody tr:hover{background:${C.surfaceHi}}
      .dsau-table tbody tr:last-child td{border-bottom:0}
      .dsau-table td.num,.dsau-table th.num{text-align:right;font-family:${C.mono};font-variant-numeric:tabular-nums;font-size:12px}
      .dsau-table td.mono{font-family:${C.mono};font-size:12px;color:${C.textMd}}
      .dsau-table td.strong{color:${C.textHi};font-weight:550}
      .dsau-badge{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:999px;font-family:${C.mono};font-size:11px;font-weight:600;background:rgba(127,179,232,.1);color:${C.azure};border:1px solid rgba(127,179,232,.16)}
      .dsau-badge::before{content:"";width:5px;height:5px;border-radius:50%;background:currentColor}
      .dsau-badge.stop{background:rgba(162,179,191,.08);color:${C.textLo};border-color:${C.line}}
      /* A failed call is the one thing worth scanning for, so it gets the only
         warm badge in the column. */
      .dsau-badge.err{background:rgba(238,129,119,.12);color:${C.danger};border-color:rgba(238,129,119,.28)}
      .dsau-badge.trunc{background:rgba(239,181,108,.12);color:${C.warn};border-color:rgba(239,181,108,.26)}
      .dsau-table-empty{padding:48px 24px;text-align:center}
      .dsau-table-empty .te-icon{width:38px;height:38px;margin:0 auto 12px;display:grid;place-items:center;border:1px solid ${C.line};border-radius:12px;color:${C.textFaint}}
      .dsau-table-empty p{color:${C.textLo};font-size:13px}

      /* status bar */
      .dsau-statusbar{display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-top:24px;padding-top:16px;border-top:1px solid ${C.lineSoft};font-size:11px;color:${C.textFaint}}
      .dsau-statusbar .path{font-family:${C.mono};color:${C.textLo};overflow:hidden;text-overflow:ellipsis}
      .dsau-statusbar .push{margin-left:auto;display:flex;align-items:center;gap:16px}
      .dsau-statusbar b{color:${C.textMd};font-weight:600;font-family:${C.mono}}

      /* settings */
      .dsau-input{height:38px;flex:1 1 200px;min-width:0;border:1px solid ${C.line};background:${C.surfaceHi};color:${C.textHi};border-radius:12px;padding:0 12px;font-size:13px}
      .dsau-input:focus{border-color:${C.signal};outline:none}
      .dsau-note{font-size:11px;color:${C.textFaint};margin-top:8px}
      .dsau-empty{padding:48px 24px;text-align:center;color:${C.textFaint};font-size:13px}
      .dsau-meta{font-size:11px;color:${C.textFaint};margin-top:12px;word-break:break-all}

      @media(max-width:1180px){
        .dsau-ov{grid-template-columns:1fr}
        .dsau-ov-pri::after{display:none}
        .dsau-ov-pri{border-bottom:1px solid ${C.line}}
        .dsau-s8{grid-column:span 12}
        .dsau-s4{grid-column:span 6}
      }
      @media(max-width:760px){
        .dsau-top{position:static;padding-top:20px}
        .dsau-top::after{display:none}
        .dsau-title{font-size:16px}
        .dsau-live{display:none}
        .dsau-controls{width:100%}
        .dsau-seg{flex:1 1 100%;justify-content:space-between}
        .dsau-seg button{flex:1;padding:7px 6px}
        .dsau-selw{flex:1 1 auto}
        .dsau-select{width:100%}
        .dsau-s4,.dsau-s6,.dsau-s8,.dsau-s12{grid-column:span 12}
        .dsau-kpis>.dsau-cw{grid-column:span 6}
        .dsau-ov-pri,.dsau-panel{padding:16px}
        .dsau-hero .num{font-size:2.6rem}
        .dsau-scroll{margin:0 -16px;padding:0 16px}
      }

      /* the module grid collapses to one column on narrow screens */
      @media(max-width:900px){
        .dsau-mods{display:block}
        .dsau-mod{display:block;margin-bottom:16px;min-height:0;padding-top:0}
        .dsau-mod-chrome,.dsau-rz{display:none}
      }

      @media(prefers-reduced-motion:reduce){.dsau-root *{animation-duration:.01ms!important;transition-duration:.01ms!important}}
    `;

    /* ============ Components ============ */
    /* Provider share. This is the same widget as the quota ring — arcs, a total
       in the middle, a legend of square dots — because two ring charts that look
       and behave differently make the board feel assembled from parts. Only the
       grouping differs: the long tail collapses into one "others" arc so the
       ring never becomes a hairline pinwheel. */
    function Donut({ items, chips, t, tintOf }) {
      const positive = items.filter((x) => x.tokens > 0);
      const TOP = 6;
      const head = positive.slice(0, TOP);
      const tail = positive.slice(TOP);
      const tailTokens = tail.reduce((s, x) => s + x.tokens, 0);
      // Percentages are computed over the drawn set so the arcs always sum to 100%.
      const drawn = head.slice();
      if (tailTokens > 0) drawn.push({ name: t.others || 'Others', tokens: tailTokens, others: true });
      const drawnTotal = drawn.reduce((s, x) => s + x.tokens, 0);
      const top = drawn[0];
      /* The arcs walk the shared palette in rank order. A provider with no entry
         in the map (it can only be one the caller did not rank) takes its arc
         from the same sequence by position, so the ring is always a run of
         adjacent slots with no unrelated hue wedged into it. */
      const series = drawn.map((x, i) => ({
        key: x.name + '#' + i,
        value: x.tokens,
        color: x.others ? C.barMute : (tintOf && tintOf(x.name)) || slotColor(i),
        label: x.name,
        pct: `${(drawnTotal > 0 ? (x.tokens / drawnTotal) * 100 : 0).toFixed(1)}%`,
        sub: compact(x.tokens),
      }));
      return h('div', null,
        h('div', { className: 'dsau-donut-b' },
          h(Ring, {
            pct: drawnTotal > 0 ? (top.tokens / drawnTotal) * 100 : 0,
            size: 104,
            color: series.length ? series[0].color : C.signal,
            label: top && drawnTotal > 0 ? `${((top.tokens / drawnTotal) * 100).toFixed(1)}%` : '',
            sub: top ? top.name : undefined,
            series,
            compose: true,
          }),
        ),
        chips && chips.length > 0 ? h('div', { className: 'dsau-chips' },
          chips.map((c) => h('span', {
            key: c.id,
            className: `dsau-chip${c.more ? ' more' : ''}${c.active ? ' active' : c.registered ? ' registered' : ''}`,
            title: c.title || '',
          }, c.more ? null : h('i', { style: { background: (tintOf && tintOf(c.id)) || undefined } }),
            c.active ? `${c.label} · ${t.activeShort}` : c.label)),
        ) : null,
      );
    }

    /* The ring widget: one circle split into coloured arcs, a headline in the
       middle, the parts listed beside it. Radius and stroke live in a 42-unit
       viewBox whose radius is 15.9155, so the circumference is exactly 100 —
       dasharray lengths are then literally percentages and a shave of 0.7 is
       0.7% of the ring, so the gaps stay equal however the parts divide.
       Two arrangements, one appearance:
       - composition (compose=true): arcs are shares of a whole, so they fill the
         circle end to end. Used for credit packages and provider share.
       - independent limits (compose=false): several ceilings that do not sum to
         anything. Each gets an equal slice of the circle and fills only as far as
         its own consumption reaches, so all of them are still coloured arcs — an
         arc of length "half of its slice" means "half way to the limit". */
    function Ring({ pct, size, label, sub, color, series, compose }) {
      const S = size || 88;
      const CIRC = 100, R = 15.9155, CX = 21, SW = 4.2;
      const [hover, setHover] = React.useState(null);
      const v = clampN(Number(pct) || 0, 0, 100);
      /* Arcs are drawn from the non-zero parts, but the legend lists every part:
         a limit sitting at 0% is a real statement ("nothing used in this window
         yet"), and dropping its row would make the window look absent. */
      const list = series || [];
      const pos = list.filter((s) => (Number(s.value) || 0) > 0);
      const total = pos.reduce((a, s) => a + (Number(s.value) || 0), 0);
      const sectors = compose === false && list.length > 1;
      /* Composition counts every declared part, not just the non-empty ones: a
         wallet whose granted half is zero is still a composition of two sources,
         and drawing it as a plain gauge would claim it is a limit being consumed. */
      const many = !sectors && compose !== false && list.length > 1 && total > 0;
      const arc = (s, i, raw, off) => {
        const shave = Math.min(0.7, raw / 4);
        const len = Math.max(0.3, raw - shave * 2);
        const start = off + shave;
        return h('circle', {
          key: s.key != null ? s.key : i,
          cx: CX, cy: CX, r: R, fill: 'none',
          stroke: s.color, strokeWidth: SW, strokeLinecap: 'butt',
          strokeDasharray: `${len.toFixed(3)} ${(CIRC - len).toFixed(3)}`,
          strokeDashoffset: (-start).toFixed(3),
          transform: `rotate(-90 ${CX} ${CX})`,
          className: `dsau-ring-seg${hover === s.key ? ' is-on' : ''}`,
          style: { '--dsau-i': String(i), stroke: s.color },
          onMouseEnter: () => setHover(s.key),
        });
      };
      let arcs = null;
      if (sectors) {
        /* One equal slice per limit, filled in proportion to its own use. Every
           slice is also drawn as an empty slot, so a limit at 0% still owns a
           visible segment of the ring: an invisible sector would make the ring
           look like fewer limits than the legend lists. */
        /* The empty slot is drawn in the limit's OWN colour at low opacity, not
           in a neutral grey. A grey arc reads as an unidentified black chunk that
           matches no legend row; a tinted one reads as "this limit, nothing used
           yet" and pairs with its legend dot. */
        const span = CIRC / list.length;
        const ghost = (s, i) => {
          const shave = Math.min(0.7, span / 4);
          const len = Math.max(0.3, span - shave * 2);
          return h('circle', {
            key: 'g-' + (s.key != null ? s.key : i),
            cx: CX, cy: CX, r: R, fill: 'none',
            stroke: s.color, strokeWidth: SW, strokeLinecap: 'butt',
            strokeOpacity: 0.3,
            strokeDasharray: `${len.toFixed(3)} ${(CIRC - len).toFixed(3)}`,
            strokeDashoffset: (-(i * span + shave)).toFixed(3),
            transform: `rotate(-90 ${CX} ${CX})`,
            className: 'dsau-ring-slot',
          });
        };
        const out = [];
        list.forEach((s, i) => {
          out.push(ghost(s, i));
          const own = clampN(Number(s.value) || 0, 0, 100);
          if (own > 0) out.push(arc(s, i, (span * own) / 100, i * span));
        });
        arcs = out;
      } else if (many) {
        let acc = 0;
        arcs = list.map((s, i) => {
          const val = Number(s.value) || 0;
          if (val <= 0) return null;
          const raw = (val / total) * CIRC;
          const node = arc(s, i, raw, acc);
          acc += raw;
          return node;
        }).filter(Boolean);
      }
      const ring = h('div', {
        className: `dsau-ring${hover != null ? ' is-dim' : ''}`,
        /* The diameter is offered as a CSS custom property with the requested
           pixel size as the fallback, so a density tier can shrink the ring to
           whatever room the cell actually has. A ring sized only in JavaScript
           cannot know it was handed a 110px cell: the fixed 104px donut and the
           76px quota rings overflowed their modules and were clipped in half,
           taking the panel title with them. */
        style: {
          width: `var(--dsau-ring, ${S}px)`,
          height: `var(--dsau-ring, ${S}px)`,
          flex: `0 0 var(--dsau-ring, ${S}px)`,
        },
      },
        h('svg', { viewBox: `0 0 ${CX * 2} ${CX * 2}`, width: '100%', height: '100%', 'aria-hidden': 'true' },
          h('circle', { cx: CX, cy: CX, r: R, fill: 'none', stroke: C.track, strokeWidth: SW }),
          arcs || h('circle', {
            cx: CX, cy: CX, r: R, fill: 'none', stroke: color || C.signal, strokeWidth: SW,
            strokeLinecap: 'butt',
            strokeDasharray: `${Math.max(v, 0.6).toFixed(2)} ${(CIRC - Math.max(v, 0.6)).toFixed(2)}`,
            transform: `rotate(-90 ${CX} ${CX})`,
            style: { transition: `stroke-dasharray .6s ${C.ease}` },
          })),
        h('div', { className: 'dsau-ring-t' },
          label === '' || label == null ? null : h('span', { className: 'dsau-ring-v' }, label),
          sub ? h('span', { className: 'dsau-ring-s' }, sub) : null));
      const legend = list.length ? h('div', { className: 'dsau-rleg' },
        list.map((s, i) => {
          const on = hover === s.key;
          const pctText = s.pct != null ? s.pct
            : sectors ? `${Math.round(Number(s.value) || 0)}%`
            : `${(((Number(s.value) || 0) / total) * 100).toFixed(1)}%`;
          return h('div', {
            key: s.key != null ? s.key : i,
            className: `dsau-rleg-row${on ? ' is-on' : hover != null ? ' is-off' : ''}`,
            onMouseEnter: () => setHover(s.key),
            title: s.title || '',
          },
            h('div', { className: 'dsau-rleg-main' },
              /* A limit at 0 % draws a faint slot instead of a solid arc, so its
                 dot is faded to the same strength: the legend then points at the
                 tinted segment rather than at a colour that appears nowhere. */
              h('i', { style: { background: s.color, opacity: sectors && (Number(s.value) || 0) <= 0 ? 0.34 : 1 } }),
              h('span', { className: 'dsau-rleg-l' }, s.label),
              h('span', { className: 'dsau-rleg-p', style: { color: s.status || s.color } }, pctText)),
            s.sub ? h('div', { className: 'dsau-rleg-s' }, s.sub) : null);
        })) : null;
      return h('div', { className: 'dsau-ringw', onMouseLeave: () => setHover(null) }, ring, legend);
    }

    /* Window labels arrive from the provider as English keys ("Monthly total",
     * "5h limit"). Render them as a short, translated tag so the bar list reads
     * like a quota readout instead of a raw API dump. */
    function windowTag(w, t) {
      const raw = String(w.label || w.id || '').toLowerCase();
      const scope = /month/.test(raw) ? t.quotaMonth : /week/.test(raw) ? (t.wWeek || 'week') : /day/.test(raw) ? (t.wDay || 'day') : '';
      const kind = /total/.test(raw) ? (t.wTotal || 'total')
        : /code/.test(raw) ? (t.wCode || 'code')
        : /5h|5 h/.test(raw) ? (t.w5h || '5h')
        : '';
      if (kind) return scope ? `${scope} · ${kind}` : kind;
      const cleaned = String(w.label || '').replace(/^(monthly|weekly|daily)\s+/i, '').replace(/\s*limit$/i, '');
      return scope && cleaned ? `${scope} · ${cleaned}` : cleaned || String(w.id || '');
    }

    function QuotaList({ quotas, stats, providerNames, providerLabels, provider, orgUsage, budget, t, editing, doc, commit }) {
      const byProv = new Map((quotas || []).map((q) => [q.provider, q]));
      const ids = provider === '*'
        ? providerNames.filter((id) => byProv.has(id) || (stats.get(id) && stats.get(id).periodCalls > 0))
        : [provider];
      if (ids.length === 0) return h('div', { className: 'dsau-quota-empty-note' }, t.quotaEmptyNote);
      ids.sort((a, b) => (byProv.has(b) ? 1 : 0) - (byProv.has(a) ? 1 : 0) || (stats.get(b)?.periodCalls || 0) - (stats.get(a)?.periodCalls || 0) || a.localeCompare(b));
      const labelOf = (id) => {
        const l = providerLabels.get(id);
        return (l && (l.name || l.label)) || byProv.get(id)?.label || id;
      };
      const labels = new Map(ids.map((id) => [id, labelOf(id)]));
      let first = Infinity;
      for (const e of stats.values()) first = Math.min(first, e.first);
      const activeCount = ids.filter((id) => (stats.get(id)?.periodCalls || 0) > 0).length;

      // Providers meter very different things: a subscription has windows, a
      // credit plan has a package balance, a platform account has a wallet, an
      // org account has spend. Each card shows only what that provider meters,
      // and the tracker's own token counts collapse into one secondary line.
      const renderCard = (id) => {
        const q = byProv.get(id), local = stats.get(id), label = labels.get(id);
        /* No per-card accent any more: the header is chrome and stays signal
           green, and the colours that carry meaning are the ring arcs and their
           legend dots, which come from the shared slot order. Handing the card a
           second, hashed identity colour is what made five cards read as five
           unrelated widgets with five unrelated colour leads. */
        const org = id === 'openai' ? orgUsage : undefined;
        const credits = q && q.credits;
        const wallets = q && q.balances && q.balances.length ? q.balances : null;
        const windows = q && q.windows && q.windows.length ? q.windows : null;
        const error = q && !q.ok && !q.pending
          ? (q.error === 'no-credential' ? t.quotaNoCredential
            : (q.error === 'http-401' || q.error === 'http-403') ? t.quotaAuthFailed
            : q.error || t.quotaError)
          : '';
        const empty = !q && (!local || local.periodCalls === 0);
        const hasMeter = Boolean(credits || wallets || windows || (org && org.ok));
        const pctColor = (pct) => (pct >= 90 ? C.danger : pct >= 70 ? C.warn : C.signal);
        const moneyOf = (w, v) => (w.currency === 'CNY' ? '¥' : w.currency === 'USD' ? '$' : '') + (Number(v) || 0).toFixed(2);
        const fmtCredit = (v) => (Math.abs(v - Math.round(v)) < 1e-9 ? String(Math.round(v)) : v.toFixed(2).replace(/0+$/, '').replace(/\.$/, ''));
        /* Packages take their hues from the shared series order, so the first
           package is the same colour on every card and across sessions. */
        const pkgRows = credits ? (credits.accounts || []).slice(0, 4) : [];
        const pkgTint = (i) => seriesColor(i);
        const ringSegments = pkgRows.length > 1
          ? pkgRows.map((a, i) => ({
            key: `${a.packageName}-${i}`,
            value: Number(a.remain) || 0,
            color: pkgTint(i),
            label: a.packageName || t.creditsPackages,
            sub: `${fmtCredit(Number(a.remain) || 0)} / ${fmtCredit(Number(a.size) || 0)}`,
          }))
          : null;
        /* One headline number per card so the row scans as a table: quota-metered
           providers show the tightest window (that is the one that will bite),
           credit plans show remaining credits, wallets show money, org spend the
           month-to-date bill. */
        const worst = windows && windows.length
          ? windows.reduce((a, b) => ((Number(b.percentUsed) || 0) > (Number(a.percentUsed) || 0) ? b : a), windows[0])
          : null;
        const headline = worst ? Number(worst.percentUsed) || 0 : null;
        /* credits have no "used" counter but the packages carry their own size,
           so the ring can still show how much of the allocation is left */
        const creditSize = credits ? (credits.accounts || []).reduce((s, a) => s + (Number(a.size) || 0), 0) : 0;
        const creditLeft = creditSize > 0 ? clampN(((Number(credits.total) || 0) / creditSize) * 100, 0, 100) : null;
        const ringPct = headline != null ? headline
          : creditLeft != null ? creditLeft
          : (org && org.ok && budget > 0) ? clampN(((org.costUsd || 0) / budget) * 100, 0, 100)
          : 100;
        const ringLabel = headline != null ? `${Math.round(headline)}%`
          : creditLeft != null ? `${Math.round(creditLeft)}%`
          : (org && org.ok && budget > 0) ? `${Math.round(((org.costUsd || 0) / budget) * 100)}%`
          : undefined;
        const ringColor = headline != null ? pctColor(headline)
          : creditLeft != null ? (creditLeft <= 10 ? C.danger : creditLeft <= 30 ? C.warn : C.signal)
          : (org && org.ok && budget > 0) ? pctColor(((org.costUsd || 0) / budget) * 100)
          : C.signalDim;
        /* A composition ring needs a magnitude in the middle: the arcs say how the
           credits are split, and the number says how many are left. A percentage
           there would describe the ring, not the account. */
        /* Limits are series too, and they get their own arcs: one equal slice per
           limit, filled as far as that limit is consumed. Each slice needs its own
           colour or three 97% arcs merge into one red band — so the legend colour
           comes from the shared series order, while `status` (the number's colour)
           still turns red/warm from the usage, which is the thing worth shouting
           about. The order is fixed by the provider (month total, month code, 5h),
           not by how full the slices happen to be, so the arcs do not reshuffle
           between refreshes. */
        const windowSeries = windows && windows.length ? windows.map((w, i) => {
          const pct = Number.isFinite(w.percentUsed) ? w.percentUsed : 0;
          return {
            key: w.id || i,
            value: pct,
            color: seriesColor(i),
            status: pctColor(pct),
            label: windowTag(w, t),
            pct: `${pct.toFixed(0)}%`,
            sub: w.resetAt ? `${t.wReset} ${fmtCountdown(w.resetAt - Date.now())}` : undefined,
            title: `${pct.toFixed(1)}%`,
          };
        }) : null;
        const spendSeries = org && org.ok && budget > 0 ? [
          { key: 'spent', value: clampN(org.costUsd || 0, 0, budget), color: pctColor(((org.costUsd || 0) / budget) * 100), label: t.orgSpend, pct: fmtUsd(org.costUsd || 0), sub: `${t.budgetLabel || 'Budget'} ${fmtUsd(budget)}` },
        ] : null;
        /* A wallet has no ceiling to arc, but it does have parts: what was
           topped up versus what was granted. That is a real composition, so the
           card gets the same ring as every other card — and the same slot colours,
           so the first part is the same hue here as the first package or the first
           limit on the cards beside it. */
        const walletParts = wallets ? wallets[0] : null;
        const walletTotal = walletParts ? (walletParts.toppedUp || 0) + (walletParts.granted || 0) : 0;
        const walletSeries = walletTotal > 0 ? [
          { key: 'topup', value: walletParts.toppedUp || 0, color: seriesColor(0), label: t.balanceToppedUp, sub: moneyOf(walletParts, walletParts.toppedUp || 0) },
          { key: 'granted', value: walletParts.granted || 0, color: seriesColor(1), label: t.balanceGranted, sub: moneyOf(walletParts, walletParts.granted || 0) },
        ] : null;
        const walletMain = walletParts ? moneyOf(walletParts, walletTotal) : undefined;
        /* A wallet's remaining money is only half the story: the reader asked
           what has been SPENT. No provider reports that number, so the Host
           derives it from balance decreases between refreshes (see
           trackWalletSpend) — which means it is a real measurement that starts
           the day the tracker first saw the wallet, and the card says so rather
           than implying it is an all-time total. */
        const walletSpent = walletParts && Number.isFinite(walletParts.spent) ? walletParts.spent : null;
        const walletSince = walletParts && walletParts.since ? walletParts.since : null;
        const md = (ts) => { const d = new Date(ts); return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
        const series = ringSegments || windowSeries || walletSeries || spendSeries;
        /* The centre states the magnitude each card is about: credits left, money
           left, or the tightest limit in percent. A percentage under a
           composition arc would describe the ring, not the account. */
        const ringMain = ringSegments ? fmtCredit(credits.total || 0)
          : walletSeries ? walletMain
          : ringLabel;
        const ringSub = ringSegments ? t.creditsTotal
          : walletSeries ? `${t.balanceTotal} · ${walletParts.currency}`
          : (worst ? windowTag(worst, t) : undefined);

        return h('div', { className: `dsau-quota${empty ? ' is-empty' : ''}` },
          /* The header band is the same signal green on every card. Per-provider
             tints made five cards read as five unrelated widgets, and the header
             is chrome, not data — the colours that carry meaning live inside the
             ring and its legend. */
          h('div', { className: 'dsau-quota-rule', style: { background: C.signal } }),
          h('div', { className: 'dsau-quota-h' },
            h('span', { className: 'dsau-quota-mark', style: { color: C.signal, borderColor: C.signal } }, modelMark(label)),
            h('span', { className: 'dsau-quota-n', title: label }, label),
            error
              ? h('span', { className: 'dsau-quota-s', style: { color: C.warn } }, error)
              : h('span', { className: `dsau-quota-s${empty ? ' empty' : ''}` }, h('i', { style: { background: C.signal } }), t.quotaInUse),
            /* Always rendered, even when the card has no traffic: the slot is a
               fixed column on the right so the header of every card ends at the
               same place. Rendering it conditionally made a header without a
               figure collapse, which is why the five cards looked staggered. */
            h('span', { className: `dsau-quota-m${local && local.periodCalls > 0 ? '' : ' none'}` }, local && local.periodCalls > 0 ? compact(local.periodTokens) : '—'),
          ),
          empty ? h('div', { className: 'dsau-quota-empty-note' }, t.quotaEmptyNote) : null,

          /* The body is centred in whatever height the row gives it: cards in one
             row share the tallest card's height, so a card with one figure used to
             leave that figure stranded at the top under a large void. The body is a
             flex wrapper rather than centring the card itself so the footnote can
             still pin to the bottom with margin-top:auto. */
          h('div', { className: 'dsau-qbody' },

          /* head: ring + series legend. Everything that has parts — credit
             packages, subscription limits, wallet sources, month spend — gets the
             same widget, so the row reads as one repeated component instead of a
             different contrivance per provider. */
          !empty && (headline != null || credits || wallets || (org && org.ok)) ? h('div', { className: 'dsau-qhd' },
            h(Ring, {
              pct: ringPct, color: ringColor, label: ringMain, sub: ringSub, size: 76,
              series, compose: Boolean(ringSegments || walletSeries),
            }),
          ) : null,

          ),

          /* ONE meta band closes every card. Previously a wallet card ended with
             a full-strength "已使用" row and a quota card ended with a dashed
             "本地" footnote — two different bands in two different heights, so a
             row of five cards had five different bottom edges. They are the same
             kind of fact (a quiet number under the ring), so they now share the
             band, the rule and the baseline, and the first cell of the band is a
             chip whether it says 已使用 or 本地. */
          (walletSpent != null && !empty) || (local && !empty && (local.periodTokens > 0 || local.periodCalls > 0))
            ? h('div', {
              className: 'dsau-qmeta',
              title: walletSpent != null && walletSince
                ? `${t.balanceUsed} ${t.balanceUsedSince} ${new Date(walletSince).toLocaleString()}`
                : `${t.localPeriod} ${compact(local.periodTokens)} · ${local.periodCalls} | ${t.quotaMonth} ${compact(local.monthTokens)} · ${local.monthCalls} | ${t.quota5h} ${compact(local.h5Tokens)} · ${local.h5Calls}`,
            },
              walletSpent != null
                ? h(React.Fragment, null,
                  h('span', { className: 'dsau-qmeta-l' }, t.balanceUsed),
                  h('span', { className: 'dsau-qmeta-v' }, moneyOf(walletParts, walletSpent)),
                  walletSince ? h('span', { className: 'dsau-qmeta-s' }, `${t.balanceUsedSince} ${md(walletSince)}`) : null,
                )
                : h(React.Fragment, null,
                  h('span', { className: 'dsau-qmeta-l' }, t.localShort),
                  h('span', { className: 'dsau-qmeta-v' }, `${compact(local.periodTokens)} · ${local.periodCalls}`),
                  hasMeter ? null : h('span', { className: 'sep' }, '·'),
                  hasMeter ? null : h('span', { className: 'dsau-qmeta-s' }, `${t.quotaMonth} ${compact(local.monthTokens)}`),
                ),
            ) : null,
        );
      };

      return h(React.Fragment, null,
        h(CardGroup, { group: 'quota', ids, labels, doc, commit, editing, className: 'dsau-quota-list', defSpan: 3, minCard: 300, renderCard }),
        Number.isFinite(first) ? h('div', { className: 'dsau-quota-foot' }, `${t.quotaFootStart} ${fmtTime(first)} · ${t.quotaFootTracker} · ${activeCount}/${ids.length} ${t.quotaActive}`) : null,
      );
    }

    function Segmented({ options, value, onChange }) {
      const refs = React.useRef([]);
      const [pill, setPill] = React.useState({ x: 0, w: 0 });
      React.useLayoutEffect(() => {
        const idx = options.findIndex((o) => o[0] === value);
        const el = refs.current[idx];
        if (el) {
          const x = el.offsetLeft - 3, w = el.offsetWidth;
          setPill((p) => (p.x === x && p.w === w ? p : { x, w }));
        }
      }, [value, options]);
      return h('div', { className: 'dsau-seg', role: 'group' },
        h('span', { className: 'dsau-seg-pill', style: { transform: `translateX(${pill.x}px)`, width: pill.w } }),
        options.map(([v, l], i) => h('button', { key: v, ref: (el) => { refs.current[i] = el; }, className: value === v ? 'on' : '', 'aria-pressed': value === v, onClick: () => onChange(v) }, l)),
      );
    }

    /* ============ Aggregation ============ */
    function filterRecords(records, rangeDays, provider) {
      const cutoff = rangeDays > 0 ? Date.now() - rangeDays * 86400000 : 0;
      return records.filter((r) => {
        if (cutoff > 0 && (typeof r.ts !== 'number' || r.ts < cutoff)) return false;
        if (provider !== '*' && String(r.provider || 'unknown') !== provider) return false;
        return true;
      });
    }
    function aggregate(records, rangeDays) {
      let calls = 0, input = 0, output = 0, cacheRead = 0, failures = 0;
      const byDay = new Map(), byHour = Array(24).fill(0), byProvider = new Map(), byModel = new Map();
      // weekday (Mon=0) × two-hour slot (0..11), tracked for tokens and calls
      const heatT = Array.from({ length: 7 }, () => Array(12).fill(0));
      const heatC = Array.from({ length: 7 }, () => Array(12).fill(0));
      for (const r of records) {
        calls++; const rin = r.input || 0, rout = r.output || 0, rcache = r.cacheRead || 0;
        input += rin; output += rout; cacheRead += rcache;
        if (r.finish === 'error') failures++;
        const key = dayKey(r.ts);
        let d = byDay.get(key);
        if (!d) byDay.set(key, (d = { day: key, tokens: 0, calls: 0 }));
        d.tokens += rin + rout + rcache; d.calls++;
        const dt = new Date(r.ts);
        byHour[dt.getHours()]++;
        const wd = (dt.getDay() + 6) % 7, slot = dt.getHours() >> 1;
        heatT[wd][slot] += rin + rout + rcache; heatC[wd][slot]++;
        const bump = (map, name, tokens) => { let e = map.get(name); if (!e) map.set(name, (e = { name, calls: 0, tokens: 0 })); e.calls++; e.tokens += tokens; };
        bump(byProvider, String(r.provider || 'unknown'), rin + rout + rcache);
        bump(byModel, String(r.model || 'unknown'), rin + rout + rcache);
      }
      let days = [...byDay.values()].sort((a, b) => a.day < b.day ? -1 : 1);
      if (rangeDays > 0 && rangeDays <= 92) {
        const filled = [], now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - (rangeDays - 1) * 86400000;
        const index = new Map(days.map((d) => [d.day, d]));
        for (let i = 0; i < rangeDays; i++) { const k = dayKey(start + i * 86400000); filled.push(index.get(k) || { day: k, tokens: 0, calls: 0 }); }
        days = filled;
      } else if (days.length > 120) days = days.slice(-120);
      const sortDesc = (map) => [...map.values()].sort((a, b) => b.tokens - a.tokens);
      return { calls, input, output, cacheRead, failures, days, hours: byHour, heatT, heatC, providers: sortDesc(byProvider), models: sortDesc(byModel).slice(0, 10) };
    }
    function localStats(records, selected) {
      const map = new Map(), now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime(), h5Start = Date.now() - 5 * 3600000;
      for (const r of records) {
        if (typeof r.ts !== 'number') continue;
        const id = String(r.provider || 'unknown');
        let e = map.get(id); if (!e) map.set(id, (e = { monthTokens: 0, monthCalls: 0, h5Tokens: 0, h5Calls: 0, periodTokens: 0, periodCalls: 0, first: r.ts }));
        e.first = Math.min(e.first, r.ts);
        const tok = (r.input || 0) + (r.output || 0) + (r.cacheRead || 0) + (r.cacheWrite || 0);
        if (r.ts >= monthStart) { e.monthTokens += tok; e.monthCalls++; }
        if (r.ts >= h5Start) { e.h5Tokens += tok; e.h5Calls++; }
      }
      for (const r of selected) { const e = map.get(String(r.provider || 'unknown')); if (!e) continue; e.periodTokens += (r.input || 0) + (r.output || 0) + (r.cacheRead || 0) + (r.cacheWrite || 0); e.periodCalls++; }
      return map;
    }

    function smoothPath(pts) {
      if (pts.length < 2) return '';
      let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i-1] || pts[i], p1 = pts[i], p2 = pts[i+1], p3 = pts[i+2] || p2;
        d += ` C${(p1[0]+(p2[0]-p0[0])/6).toFixed(1)} ${(p1[1]+(p2[1]-p0[1])/6).toFixed(1)},${(p2[0]-(p3[0]-p1[0])/6).toFixed(1)} ${(p2[1]-(p3[1]-p1[1])/6).toFixed(1)},${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
      }
      return d;
    }

    function Sparkline({ days }) {
      const W = 320, H = 52, P = 4;
      const vals = days.map((d) => d.tokens);
      if (vals.length === 0) return null;
      const max = Math.max(...vals, 1) * 1.12;
      const X = (i) => P + i * (W - 2 * P) / Math.max(vals.length - 1, 1);
      const Y = (v) => H - P - (v / max) * (H - 2 * P);
      const pts = vals.map((v, i) => [X(i), Y(v)]);
      const line = smoothPath(pts);
      const last = pts[pts.length - 1];
      const area = pts.length > 1 ? `${line} L${last[0].toFixed(1)} ${H} L${P} ${H} Z` : '';
      return h('svg', { className: 'dsau-spark', viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'none', role: 'img', 'aria-label': 'sparkline' },
        h('defs', null, h('linearGradient', { id: 'dsau-sp-grad', x1: 0, y1: 0, x2: 0, y2: 1 },
          h('stop', { offset: '0%', stopColor: C.signal, stopOpacity: .22 }),
          h('stop', { offset: '100%', stopColor: C.signal, stopOpacity: 0 }))),
        area ? h('path', { d: area, fill: 'url(#dsau-sp-grad)' }) : null,
        pts.length > 1 ? h('path', { d: line, fill: 'none', stroke: C.signal, strokeWidth: 1.8, strokeLinejoin: 'round', strokeLinecap: 'round' }) : null,
        h('circle', { cx: last[0], cy: last[1], r: 3, fill: C.signal, stroke: C.ink, strokeWidth: 1.5 }),
      );
    }

    /* ============ Charts ============ */
    /* A chart drawn in a fixed 800x250 box and stretched with
       preserveAspectRatio:"none" gets its axis glyphs stretched with it — the
       labels end up wider than tall and the type looks smeared. Both charts
       therefore measure their own box and draw at that exact pixel size, so
       every glyph keeps its aspect and every hairline lands on a device pixel. */
    function useBoxSize(fallbackW, fallbackH, minH) {
      const ref = React.useRef(null);
      const [size, setSize] = React.useState({ w: fallbackW, h: fallbackH });
      React.useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return undefined;
        const read = () => {
          const r = el.getBoundingClientRect();
          const w = Math.max(200, Math.round(r.width));
          /* A floor of 150px kept the trend chart from ever becoming a strip, but
             it also meant the chart stopped shrinking while its module kept
             shrinking — the svg overflowed and the axes fell outside the panel.
             Now the floor only protects against a degenerate zero measurement;
             the chart genuinely compresses with its cell. */
          const h = Math.max(Math.min(minH, 72), Math.round(r.height));
          setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
        };
        read();
        let ro = null;
        try { ro = new ResizeObserver(read); ro.observe(el); } catch (err) { ro = null; }
        return () => { if (ro) ro.disconnect(); };
      }, [minH]);
      return [ref, size.w, size.h];
    }

    /* Axis ceilings land on values a reader can tally against. Two rules make
       that happen: the STEP is a round number (1/2/2.5/5 × 10ⁿ), and the top of
       the axis is the next whole multiple of that step — never 1.15× the peak,
       which produced labels like 63M / 188M / 250M that mean nothing. */
    const niceStep = (v) => {
      if (!(v > 0)) return 1;
      const base = Math.pow(10, Math.floor(Math.log10(v)));
      const n = v / base;
      const m = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
      return m * base;
    };
    function niceAxis(peak, wantTicks) {
      const want = Math.max(2, wantTicks || 4);
      const step = niceStep((peak * 1.06) / want);
      const top = Math.max(step, Math.ceil((peak * 1.06) / step) * step);
      const count = Math.max(1, Math.round(top / step));
      const ticks = [];
      for (let i = 0; i <= count; i++) ticks.push(i * step);
      return { max: top, ticks };
    }
    const axisVal = (v) => (v >= 1e6 ? `${(v / 1e6).toFixed(v >= 1e7 ? 0 : 1)}M` : v >= 1e3 ? `${Math.round(v / 1e3)}k` : String(Math.round(v)));

    function TrendChart({ days, annoDay, annoLabel, setTip, clearTip }) {
      const [hover, setHover] = React.useState(null);
      const [boxRef, W, H] = useBoxSize(800, 250, 150);
      const pad = { t: 26, r: 22, b: 32, l: 56 };
      const iw = Math.max(40, W - pad.l - pad.r), ih = Math.max(40, H - pad.t - pad.b);
      const peak = days.length ? Math.max(...days.map((d) => d.tokens)) : 0;
      const axis = niceAxis(peak, Math.max(3, Math.min(6, Math.round(ih / 52))));
      const max = axis.max;
      const X = (i) => pad.l + i * iw / Math.max(days.length - 1, 1);
      const Y = (v) => pad.t + ih - (v / max) * ih;
      const pts = days.map((d, i) => [X(i), Y(d.tokens)]);
      const line = smoothPath(pts);
      const area = pts.length > 1 ? `${line} L${X(days.length - 1).toFixed(1)} ${pad.t + ih} L${pad.l} ${pad.t + ih} Z` : '';
      /* x labels: at most ~7, always including the last day, so the right edge
         never floats unlabelled — and never two labels on top of each other. */
      const maxLabels = Math.max(2, Math.min(7, Math.floor(iw / 62)));
      const labelStep = Math.max(1, Math.ceil((days.length - 1) / Math.max(1, maxLabels - 1)));
      const labelIdx = new Set();
      for (let i = 0; i < days.length; i += labelStep) labelIdx.add(i);
      labelIdx.add(days.length - 1);
      const annoIdx = annoDay ? days.findIndex((d) => d.day === annoDay) : -1;
      const onMove = (e) => {
        const svg = e.currentTarget.ownerSVGElement;
        if (!svg) return;
        const r = svg.getBoundingClientRect();
        const vx = (e.clientX - r.left) / r.width * W;
        let idx = Math.round((vx - pad.l) / iw * (days.length - 1));
        idx = Math.max(0, Math.min(days.length - 1, idx));
        setHover(idx);
        const d = days[idx];
        if (d && setTip) setTip({ x: e.clientX, y: e.clientY - 6, label: d.day, value: `${fmtM(d.tokens)} Tokens · ${d.calls}` });
      };
      const onLeave = () => { setHover(null); if (clearTip) clearTip(); };
      return h('div', { className: 'dsau-chartbox', ref: boxRef },
        h('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img', 'aria-label': 'tokens per day' },
          h('defs', null, h('linearGradient', { id: 'dsau-tr-grad', x1: 0, y1: 0, x2: 0, y2: 1 },
            h('stop', { offset: '0%', stopColor: C.signal, stopOpacity: .32 }),
            h('stop', { offset: '62%', stopColor: C.signal, stopOpacity: .07 }),
            h('stop', { offset: '100%', stopColor: C.signal, stopOpacity: 0 }))),
          axis.ticks.map((v, i) => h('g', { key: `t${i}` },
            h('line', { className: 'dsau-grid-line' + (i === 0 ? ' base' : ''), x1: pad.l, y1: Y(v), x2: W - pad.r, y2: Y(v) }),
            h('text', { className: 'dsau-axis-txt y', x: pad.l - 11, y: Y(v) + 3.5, textAnchor: 'end' }, axisVal(v)))),
          Array.from(labelIdx).map((i) => {
            const anchor = i === 0 ? 'start' : i === days.length - 1 ? 'end' : 'middle';
            return h('text', {
              key: `x${i}`,
              className: 'dsau-axis-txt x',
              x: X(i),
              y: H - 10,
              textAnchor: anchor,
            }, days[i].day.slice(5));
          }),
          area ? h('path', { d: area, fill: 'url(#dsau-tr-grad)' }) : null,
          line ? h('path', { d: line, fill: 'none', stroke: C.signal, strokeWidth: 2, strokeLinejoin: 'round', strokeLinecap: 'round' }) : null,
          annoIdx >= 0 ? h('g', null,
            h('line', { className: 'dsau-anno-line', x1: X(annoIdx), y1: pad.t + 8, x2: X(annoIdx), y2: pad.t + ih }),
            h('g', { className: 'dsau-anno-badge', transform: `translate(${Math.min(X(annoIdx) + 8, W - pad.r - 96)},${pad.t - 12})` },
              h('rect', { className: 'dsau-anno-box', x: 0, y: -8, rx: 5, height: 17, width: Math.max(58, String(annoLabel || annoDay).length * 6.2 + 16) }),
              h('circle', { cx: 8, cy: 0.5, r: 2.5, fill: C.signalDim }),
              h('text', { className: 'dsau-anno-txt', x: 15, y: 3.5 }, annoLabel || days[annoIdx].day.slice(5))),
          ) : null,
          hover != null && pts[hover] ? h('g', null,
            h('line', { className: 'dsau-cross on', x1: pts[hover][0], y1: pad.t, x2: pts[hover][0], y2: pad.t + ih }),
            h('circle', { cx: pts[hover][0], cy: pts[hover][1], r: 4.5, fill: C.signal, stroke: C.ink, strokeWidth: 2 }),
            h('text', { className: 'dsau-axis-txt x hl', x: pts[hover][0], y: H - 10 }, days[hover].day.slice(5)),
          ) : null,
          pts.length > 0 && hover == null ? h('circle', { cx: pts[pts.length - 1][0], cy: pts[pts.length - 1][1], r: 4, fill: C.signal, stroke: C.ink, strokeWidth: 2 }) : null,
          h('rect', { className: 'dsau-hit', x: pad.l, y: pad.t, width: iw, height: ih, onMouseMove: onMove, onMouseLeave: onLeave }),
        ));
    }

    function HourlyChart({ hours, t, setTip, clearTip }) {
      const [boxRef, W, H] = useBoxSize(420, 210, 120);
      const pad = { t: 16, r: 10, b: 26, l: 34 };
      const iw = Math.max(40, W - pad.l - pad.r), ih = Math.max(40, H - pad.t - pad.b);
      const peakVal = hours.length ? Math.max(...hours) : 0;
      const axis = niceAxis(peakVal, 3);
      const max = axis.max;
      const Y = (v) => pad.t + ih - (v / max) * ih;
      const slot = iw / 24, bw = Math.max(3, slot * 0.58);
      const onBar = (i, v) => (e) => { if (setTip) setTip({ x: e.clientX, y: e.clientY - 6, label: `${String(i).padStart(2, '0')}:00 – ${String((i + 1) % 24).padStart(2, '0')}:00`, value: `${v} ${t.callsUnit}` }); };
      return h('div', { className: 'dsau-chartbox', ref: boxRef },
        h('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img', 'aria-label': 'calls per hour' },
          axis.ticks.map((v, i) => h('g', { key: `g${i}` },
            h('line', { className: 'dsau-grid-line' + (i === 0 ? ' base' : ''), x1: pad.l, y1: Y(v), x2: W - pad.r, y2: Y(v) }),
            h('text', { className: 'dsau-axis-txt y', x: pad.l - 8, y: Y(v) + 3.5, textAnchor: 'end' }, axisVal(v)),
          )),
          hours.map((v, i) => {
            const bh = v > 0 ? Math.max(2, (v / max) * ih) : 0;
            const peak = v === peakVal && v > 0;
            return h('rect', {
              key: i,
              className: 'dsau-bar' + (peak ? ' peak' : ''),
              x: pad.l + i * slot + (slot - bw) / 2,
              y: pad.t + ih - bh,
              width: bw,
              height: bh,
              rx: Math.min(3, bw / 2),
              fill: peak ? C.signal : C.barMute,
              onMouseMove: onBar(i, v),
              onMouseLeave: () => { if (clearTip) clearTip(); },
            }, h('title', null, `${i}:00 · ${v} ${t.callsUnit}`));
          }),
          [0, 6, 12, 18, 23].map((i) => h('text', {
            key: i,
            className: 'dsau-axis-txt x',
            x: pad.l + i * slot + slot / 2,
            y: H - 8,
            textAnchor: i === 0 ? 'start' : i === 23 ? 'end' : 'middle',
          }, `${String(i).padStart(2, '0')}`)),
        ));
    }

    /* ============ Heatmap ============ */
    const HEAT_LEVELS = ['#16212B', '#2A4A3A', '#3E7150', '#5EA268', '#CBF27E'];
    const WEEKDAYS = { en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], zh: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'] };

    function Heatmap({ heatT, heatC, mode, setTip, clearTip, t, lang }) {
      const grid = mode === 'calls' ? heatC : heatT;
      const cells = [];
      let max = 0, peak = { wd: 0, slot: 0, v: 0 };
      for (let wd = 0; wd < 7; wd++) for (let s = 0; s < 12; s++) {
        const v = grid[wd][s];
        if (v > max) max = v;
        if (v > peak.v) peak = { wd, slot: s, v };
      }
      const dayNames = WEEKDAYS[lang] || WEEKDAYS.en;
      if (max <= 0) return h('div', { className: 'dsau-heat-empty' }, t.heatEmpty);

      // Quantile cuts over the NON-ZERO cells only: most slots are empty, so
      // including the zeroes collapses every threshold to 0 and the whole map
      // renders as one bright band.
      const positive = [];
      for (let wd = 0; wd < 7; wd++) for (let s = 0; s < 12; s++) if (grid[wd][s] > 0) positive.push(grid[wd][s]);
      positive.sort((a, b) => a - b);
      const q = (p) => positive[Math.min(positive.length - 1, Math.max(0, Math.floor(positive.length * p)))] || 0;
      const cuts = [q(.25), q(.5), q(.75), q(.92)];
      const levelOf = (v) => (v <= 0 ? 0 : v <= cuts[0] ? 1 : v <= cuts[1] ? 2 : v <= cuts[2] ? 3 : 4);
      const fmtV = (v) => (mode === 'calls' ? `${v} ${t.callsUnit}` : `${compact(v)}`);

      // the header row needs the same 13th leading cell as the body rows, or
      // auto-placement pushes every row label into the last column
      cells.push(h('div', { key: 'corner', className: 'dsau-heat-corner' }));
      for (let hh = 0; hh < 24; hh += 2) {
        cells.push(h('div', { key: `c${hh}`, className: 'dsau-heat-col' }, `${String(hh).padStart(2, '0')}`));
      }
      const rows = [];
      for (let wd = 0; wd < 7; wd++) {
        rows.push(h('div', { key: `r${wd}`, className: 'dsau-heat-row' }, dayNames[wd]));
        for (let s = 0; s < 12; s++) {
          const v = grid[wd][s];
          const lv = levelOf(v);
          const lbl = `${dayNames[wd]} ${String(s * 2).padStart(2, '0')}:00–${String(s * 2 + 2).padStart(2, '0')}:00 · ${fmtV(v)}`;
          rows.push(h('div', {
            key: `c${wd}-${s}`,
            className: 'dsau-heat-cell',
            'data-lv': lv,
            role: 'img',
            'aria-label': lbl,
            title: lbl,
            tabIndex: 0,
            onMouseMove: (e) => { if (setTip) setTip({ x: e.clientX, y: e.clientY - 6, label: lbl.split(' · ')[0], value: fmtV(v) }); },
            onMouseLeave: () => { if (clearTip) clearTip(); },
            onFocus: (e) => { const r = e.target.getBoundingClientRect(); if (setTip) setTip({ x: r.left + r.width / 2, y: r.top, label: lbl.split(' · ')[0], value: fmtV(v) }); },
            onBlur: () => { if (clearTip) clearTip(); },
          }));
        }
      }
      const peakLabel = `${String(peak.slot * 2).padStart(2, '0')}:00–${String(peak.slot * 2 + 2).padStart(2, '0')}:00`;

      return h('div', { className: 'dsau-heat' },
        h('div', { className: 'dsau-heat-body' },
          h('div', { className: 'dsau-heat-grid' }, cells, rows)),
        h('div', { className: 'dsau-heat-foot' },
          h('span', { className: 'dsau-heat-peak' }, `${t.heatPeak} `, h('b', null, `${dayNames[peak.wd]} ${peakLabel}`), ` · ${fmtV(peak.v)}`),
          h('div', { className: 'dsau-heat-legend' },
            h('span', null, t.heatFew),
            HEAT_LEVELS.map((c, i) => h('i', { key: i, style: { background: c } })),
            h('span', null, t.heatMore))),
      );
    }

    /* ============ Workbench ============ */
    const KPI_LABEL_KEY = { calls: 'calls', tokens: 'tokens', cache: 'cache', failed: 'failures', providers: 'providers', cost: 'cost' };

    function Workbench(props) {
      const ctx = props.ctx;
      const [lang, setLang] = React.useState(() => detectLang(ctx));
      React.useEffect(() => { const l = ctx.get('locale'); if (l && l.subscribe) return l.subscribe(() => setLang(detectLang(ctx))); }, [ctx]);
      const t = DICTS[lang] || DICTS.en;

      const [state, setState] = React.useState({ status: 'loading', data: null });
      const [lastSync, setLastSync] = React.useState(null);
      const load = React.useCallback(async (force) => {
        try {
          const r = await fetch(force ? `${DATA_URL}?refresh=1` : DATA_URL, { credentials: 'same-origin' });
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          setState({ status: 'ready', data: await r.json() });
          setLastSync(Date.now());
        } catch (e) {
          setState((s) => ({ status: 'error', data: s.data, error: String((e && e.message) || e) }));
        }
      }, []);
      React.useEffect(() => { load(false); const tm = setInterval(() => load(false), 30000); return () => clearInterval(tm); }, [load]);

      const [range, setRange] = React.useState(30);
      const [provider, setProvider] = React.useState('*');
      const [modelMode, setModelMode] = React.useState('tokens');
      const [heatMode, setHeatMode] = React.useState('tokens');
      const [sort, setSort] = React.useState({ key: 'ts', dir: 'desc' });
      const [search, setSearch] = React.useState('');
      const [tableProvider, setTableProvider] = React.useState('*');
      const [tip, setTip] = React.useState(null);
      const clearTip = React.useCallback(() => setTip(null), []);

      const hist = useHistory(loadWB);
      const doc = hist.doc;
      const edit = useLayoutEditor(doc, hist.commit);
      const { gridRef, gridW, rects, editing } = edit;
      /* The Host copy wins over localStorage when it exists: it is the one that
         survives a cleared profile, a different browser, and the desktop shell.
         localStorage is only the fast path (it renders without waiting for the
         network) and the fallback when the Host has nothing saved. */
      React.useEffect(() => {
        let alive = true;
        (async () => {
          try {
            const r = await fetch(LAYOUT_URL, { credentials: 'same-origin' });
            if (!r.ok) return;
            const p = await r.json();
            if (!alive || !p || !p.layout || typeof p.layout !== 'object') return;
            /* The Host copy is adopted verbatim. It is the reader's board; this
               code does not reshape it (see the note above loadWB). */
            const next = normalizeWB(p.layout);
            if (JSON.stringify(next) === JSON.stringify(hist.doc)) return;
            hist.adopt(next);
          } catch {}
        })();
        return () => { alive = false; };
      }, []);

      const data = state.data;
      const allRecords = (data && Array.isArray(data.records)) ? data.records : [];
      const providerNames = React.useMemo(() => [...new Set(((data && data.providers) || []).map((p) => p.id))].sort(), [data]);
      const filtered = React.useMemo(() => filterRecords(allRecords, range, provider), [allRecords, range, provider]);
      const allFiltered = React.useMemo(() => filterRecords(allRecords, range, '*'), [allRecords, range]);
      const agg = React.useMemo(() => aggregate(filtered, range), [filtered, range]);
      const stats = React.useMemo(() => localStats(allRecords, allFiltered), [allRecords, allFiltered]);
      const providerLabels = React.useMemo(() => new Map(((data && data.providers) || []).map((p) => [p.id, p])), [data]);
      const totalTokens = agg.input + agg.output + agg.cacheRead;
      const estCost = React.useMemo(() => {
        let usd = 0;
        for (const r of filtered) {
          const tok = (r.input || 0) + (r.output || 0) + (r.cacheRead || 0);
          if (tok <= 0) continue;
          const p = String(r.provider || '');
          if (p.startsWith('kimi')) usd += (tok / 1e6) * 0.14;
          else if (p.startsWith('deepseek')) usd += (tok / 1e6) * 0.028;
          else usd += (tok / 1e6) * 0.05;
        }
        return usd;
      }, [filtered]);

      const ranges = React.useMemo(() => [[1, t.rangeToday], [7, t.range7], [30, t.range30], [0, t.rangeAll]], [t]);
      const delta = React.useMemo(() => {
        if (!range || range <= 0 || totalTokens <= 0) return null;
        const now = Date.now(), prevStart = now - 2 * range * 86400000, prevEnd = now - range * 86400000;
        let prev = 0;
        for (const r of allRecords) if (typeof r.ts === 'number' && r.ts >= prevStart && r.ts < prevEnd) prev += (r.input || 0) + (r.output || 0) + (r.cacheRead || 0);
        if (prev <= 0) return null;
        return ((totalTokens - prev) / prev) * 100;
      }, [allRecords, range, totalTokens]);

      const firstTs = React.useMemo(() => {
        let m = Infinity;
        for (const r of allRecords) if (typeof r.ts === 'number') m = Math.min(m, r.ts);
        return Number.isFinite(m) ? m : null;
      }, [allRecords]);
      const annoDay = firstTs ? dayKey(firstTs) : null;

      const activeProviders = React.useMemo(() => providerNames.filter((id) => { const l = stats.get(id); return l && l.periodCalls > 0; }).length, [providerNames, stats]);
      const quotaIds = React.useMemo(() => new Set(((data && data.quotas) || []).map((q) => q.provider)), [data]);
      /* Chips answer one question: "which providers feed this board?" So only
       * providers with real traffic (or a live quota) earn a chip; the idle
       * catalog entries collapse into a single "+N" counter instead of a wall
       * of grey pills that reads like noise.
       * The order is token rank, the same order the donut and the legend use, so
       * the chip row reads left-to-right in the same colour sequence as the ring
       * above it instead of in alphabetical order. */
      const chips = React.useMemo(() => {
        const rows = providerNames.map((id) => {
          const l = providerLabels.get(id);
          return { id, label: (l && (l.name || l.label)) || id, active: (stats.get(id)?.periodCalls || 0) > 0, registered: quotaIds.has(id) };
        });
        const live = rows.filter((c) => c.active || c.registered);
        const idle = rows.length - live.length;
        const rankOf = new Map(agg.providers.map((p, i) => [p.name, i]));
        const rank = (c) => (rankOf.has(c.id) ? rankOf.get(c.id) : 1000 + (c.active ? 0 : 1));
        const out = live.slice().sort((a, b) => rank(a) - rank(b) || a.label.localeCompare(b.label)).slice(0, 10);
        if (idle > 0) out.push({ id: '__idle', label: '+' + idle, active: false, registered: false, more: true, title: t.chipsIdle });
        return out;
      }, [providerNames, providerLabels, stats, quotaIds, t, agg.providers]);

      const modelRows = React.useMemo(() => {
        const rows = agg.models.filter((m) => (modelMode === 'tokens' ? m.tokens > 0 : m.calls > 0));
        return modelMode === 'tokens' ? rows : [...rows].sort((a, b) => b.calls - a.calls);
      }, [agg.models, modelMode]);
      const modelMax = Math.max(1, ...modelRows.map((m) => (modelMode === 'tokens' ? m.tokens : m.calls)));
      const modelTotal = modelRows.reduce((s, m) => s + (modelMode === 'tokens' ? m.tokens : m.calls), 0);

      /* Every ranked list on the board starts at PAL[0] and walks down it, so
         "first" looks the same in the donut, in its legend, in the provider
         chips and in the model bars. Providers and models are ranked in their
         own lists rather than sharing one running index: they never appear in
         the same chart, so a shared index would only make the top model a
         different colour than the top provider for no reader benefit. */
      const tints = React.useMemo(() => {
        const provRank = [];
        for (const p of agg.providers) if (p.tokens > 0) provRank.push(p.name);
        for (const id of providerNames) {
          if (!(quotaIds.has(id) || (stats.get(id)?.periodCalls || 0) > 0)) continue;
          if (!provRank.includes(id)) provRank.push(id);
        }
        return { provider: rankColors(provRank), model: rankColors(modelRows.map((m) => m.name)) };
      }, [providerNames, quotaIds, stats, agg.providers, modelRows]);

      /* provider display name — needed by the log filter before the table body
         is built, so it lives above the memo that searches it */
      const pLabelOf = React.useCallback((id) => {
        const m = providerLabels.get(id);
        return (m && (m.name || m.label)) || String(id || '—');
      }, [providerLabels]);

      const tableRows = React.useMemo(() => {
        const getters = {
          ts: (r) => r.ts || 0, provider: (r) => String(r.provider || ''), model: (r) => String(r.model || ''),
          input: (r) => r.input || 0, output: (r) => r.output || 0, cache: (r) => (r.cacheRead || 0) + (r.cacheWrite || 0),
          status: (r) => String(r.finish || ''), latency: (r) => r.durationMs || 0,
        };
        const get = getters[sort.key] || getters.ts;
        const q = search.trim().toLowerCase();
        const scoped = filtered.filter((r) => {
          if (tableProvider !== '*' && String(r.provider || 'unknown') !== tableProvider) return false;
          if (!q) return true;
          return [r.provider, r.model, r.finish, r.purpose, pLabelOf(r.provider)].some((v) => String(v || '').toLowerCase().includes(q));
        });
        return [...scoped].sort((a, b) => {
          const av = get(a), bv = get(b);
          if (typeof av === 'number' && typeof bv === 'number') return sort.dir === 'asc' ? av - bv : bv - av;
          return sort.dir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
        }).slice(0, 20);
      }, [filtered, sort, search, tableProvider, providerLabels]);

      /* Proved providers that actually appear in the current window — pills for
         catalog entries the user never called would be dead controls. */
      const logProviders = React.useMemo(() => {
        const seen = new Map();
        for (const r of filtered) {
          const id = String(r.provider || 'unknown');
          seen.set(id, (seen.get(id) || 0) + 1);
        }
        return [...seen.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map((e) => e[0]);
      }, [filtered]);

      const th = (key, label, numeric) => h('th', {
        className: `sortable${numeric ? ' num' : ''}`,
        'aria-sort': sort.key === key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none',
        onClick: () => setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' })),
      }, label, h('span', { className: 'dsau-arrow' }, '▲'));

      const clearAll = async () => {
        if (!window.confirm(t.clearConfirm)) return;
        try { await fetch(CLEAR_URL, { method: 'POST', credentials: 'same-origin' }); } catch {}
        load(true);
      };

      /* ---- module wrapper ---- */
      const mod = (id, children) => h(Module, {
        key: id,
        id,
        rect: rects[id],
        gridW,
        editing,
        // The drag preview class is written straight to the DOM during a
        // gesture, so React never re-renders the board mid-drag.
        dragging: false,
        label: t.mods[id],
        onBegin: edit.begin,
        onKeyDown: edit.onKeyDown,
      }, children);

      if (state.status === 'loading' && !data) {
        return h('div', { className: 'dsau-root' }, h('style', null, css), h('div', { className: 'dsau-empty' }, t.loading));
      }
      if (state.status === 'error' && !data) {
        return h('div', { className: 'dsau-root' }, h('style', null, css),
          h('div', { className: 'dsau-empty' },
            h('p', null, t.loadError),
            h('p', { className: 'dsau-meta' }, state.error || ''),
            h('button', { className: 'dsau-btn', onClick: () => load(false) }, t.retry)));
      }

      const tick = (color) => h('i', { className: 'tick', style: { background: color } });
      const kpiLabels = new Map(KPI_IDS.map((id) => [id, t[KPI_LABEL_KEY[id]] || id]));
      /* Per-metric glyph, drawn on a 24px grid so every card is optically the
         same weight. Paths are the ones the reference dashboard uses. */
      const KPI_ICON = {
        calls: 'M4 18V9M9 18V5M14 18v-6M19 18V7',
        tokens: 'M12 3v18M7 7l5-4 5 4M7 17l5 4 5-4',
        cache: 'M4 7h16v10H4zM4 7l3-3h10l3 3M9 12h6',
        failed: 'M12 8v5M12 16.2v.1M10.3 3.9 2.6 17.2A1.8 1.8 0 0 0 4.2 20h15.6a1.8 1.8 0 0 0 1.6-2.8L13.7 3.9a1.9 1.9 0 0 0-3.4 0Z',
        providers: 'M12 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM5 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2',
        cost: 'M12 5v14M15.5 8.2a3.4 3.4 0 0 0-3.1-1.7c-1.8 0-3 1-3 2.4 0 3.4 6.4 1.9 6.4 5.3 0 1.5-1.3 2.5-3.3 2.5a3.7 3.7 0 0 1-3.3-1.8',
      };
      const kpiIcon = (id, color) => h('svg', {
        className: 'dsau-kpi-ic', viewBox: '0 0 24 24', fill: 'none',
        stroke: color, strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round',
        'aria-hidden': 'true',
      }, h('path', { d: KPI_ICON[id] }));
      /* One card shape for all six metrics: accent bar, icon + label, big mono
         value, muted sub line. Keeping the skeleton in one place is what makes
         the band read as a single instrument panel.
         Every card wears the same brand signal on purpose. Six different accents
         turned the band into six unrelated widgets and made the board look
         rainbow-ish; one house colour makes the six read as one instrument, and
         leaves colour free to mean something where it is actually data. */
      const KPI_ACCENT = C.signal;
      const kpiCard = (id, accent, label, value, sub) => h('div', { className: 'dsau-kpi', 'data-accent': id },
        h('i', { className: 'dsau-kpi-bar', style: { background: accent } }),
        h('div', { className: 'dsau-kpi-l' }, kpiIcon(id, accent), h('span', null, label)),
        value,
        h('div', { className: 'dsau-kpi-n' }, sub));
      const renderKpi = (id) => {
        if (id === 'calls') return kpiCard(id, KPI_ACCENT, t.calls,
          h('div', { className: 'dsau-kpi-v' }, agg.calls),
          `${agg.calls - agg.failures} ${t.callsNote}`);
        if (id === 'tokens') return kpiCard(id, KPI_ACCENT, t.tokens,
          h('div', { className: 'dsau-kpi-v' }, (totalTokens / 1e6).toFixed(2), h('span', { className: 'sfx' }, 'M')),
          `${compact(agg.input)} / ${compact(agg.output)}`);
        if (id === 'cache') return kpiCard(id, KPI_ACCENT, t.cache,
          h('div', { className: 'dsau-kpi-v' }, (agg.cacheRead / 1e6).toFixed(2), h('span', { className: 'sfx' }, 'M')),
          `${totalTokens > 0 ? ((agg.cacheRead / totalTokens) * 100).toFixed(1) : 0}% ${t.cacheNote}`);
        if (id === 'failed') return kpiCard(id, KPI_ACCENT, t.failures,
          h('div', { className: 'dsau-kpi-v' }, agg.failures),
          `${agg.calls > 0 ? ((agg.failures / agg.calls) * 100).toFixed(1) : 0}% ${t.failuresNote}`);
        if (id === 'providers') return kpiCard(id, KPI_ACCENT, t.providers,
          h('div', { className: 'dsau-kpi-v' }, providerNames.length),
          `${activeProviders} ${t.activeShort} · ${quotaIds.size} ${t.registeredShort}`);
        if (id === 'cost') return kpiCard(id, KPI_ACCENT, t.cost,
          h('div', { className: 'dsau-kpi-v' }, fmtUsd(estCost)),
          t.costNote);
        return null;
      };

      const ovContent = h('div', { className: 'dsau-ov' },
        h('div', { className: 'dsau-ov-pri' },
          h('div', null,
            h('div', { className: 'dsau-eyebrow' }, t.heroTokens),
            h('div', { className: 'dsau-hero' },
              h('span', { className: 'num' }, (totalTokens / 1e6).toFixed(2)),
              h('span', { className: 'unit' }, t.heroUnit)),
            h('div', { className: 'dsau-hero-sub' },
              delta != null ? h('span', { className: `dsau-delta ${delta >= 0 ? 'up' : 'down'}` }, `${delta >= 0 ? '↑' : '↓'} ${Math.abs(delta).toFixed(1)}%`) : null,
              delta != null ? h('span', null, t.heroCompare) : null,
              delta != null ? h('span', { className: 'sep' }, '·') : null,
              h('span', null, `${t.heroIn} ${compact(agg.input)} / ${t.heroOut} ${compact(agg.output)}`)),
          ),
          agg.days.length > 0 ? h('div', { className: 'dsau-spark-wrap' }, h(Sparkline, { days: agg.days.slice(-14) })) : null,
        ),
        h(CardGroup, {
          group: 'kpi', ids: KPI_IDS, labels: kpiLabels, doc, commit: hist.commit, editing,
          className: 'dsau-kpis', defSpan: 4, minCard: 132, renderCard: renderKpi, 
        }),
      );

      const trendContent = h('div', { className: 'dsau-panel' },
        h('div', { className: 'dsau-ph' },
          h('div', null, h('div', { className: 'dsau-pt' }, t.dailyTitle), h('div', { className: 'dsau-pd' }, t.dailyDesc)),
          h('div', { className: 'dsau-ptr' },
            h('div', { className: 'dsau-legend' },
              h('span', null, h('i', { style: { background: C.signal } }), t.legendTokens),
              h('span', null, h('i', { style: { background: C.signalDim } }), t.legendOnboard)))),
        h('div', { className: 'dsau-chart' },
          h(TrendChart, { days: agg.days, annoDay, annoLabel: annoDay ? `${t.dataOnboard} ${annoDay.slice(5)}` : null, setTip, clearTip })));

      const donutContent = h('div', { className: 'dsau-panel' },
        h('div', { className: 'dsau-ph' },
          h('div', null, h('div', { className: 'dsau-pt' }, t.providerTitle), h('div', { className: 'dsau-pd' }, t.providerDesc)),
          h('div', { className: 'dsau-ptr' }, h('span', { className: 'dsau-eyebrow' }, `${fmtM(totalTokens)} TOKENS`))),
        h(Donut, { items: agg.providers.filter((x) => x.tokens > 0), chips, t, tintOf: (name) => tints.provider[name] }));

      const quotaContent = h('div', { className: 'dsau-panel dsau-quota-panel' },
        h('div', { className: 'dsau-ph' },
          h('div', null, h('div', { className: 'dsau-pt' }, t.quotaTitle), h('div', { className: 'dsau-pd' }, t.quotaDesc))),
        h(QuotaList, {
          quotas: data && data.quotas, stats, providerNames, providerLabels, provider,
          orgUsage: data && data.organizationUsage, budget: data && data.openaiBudgetUsd,
          t, editing, doc, commit: hist.commit,
        }));

      const hourlyContent = h('div', { className: 'dsau-panel' },
        h('div', { className: 'dsau-ph' },
          h('div', null, h('div', { className: 'dsau-pt' }, t.hourlyTitle), h('div', { className: 'dsau-pd' }, t.hourlyDesc)),
          h('div', { className: 'dsau-ptr' }, h('span', { className: 'dsau-eyebrow' }, `${t.peakLabel} `, h('span', { style: { color: C.signal } }, Math.max(...agg.hours))))),
        h('div', { className: 'dsau-chart' }, h(HourlyChart, { hours: agg.hours, t, setTip, clearTip })));

      const modelContent = h('div', { className: 'dsau-panel' },
        h('div', { className: 'dsau-ph' },
          h('div', null, h('div', { className: 'dsau-pt' }, t.modelTitle), h('div', { className: 'dsau-pd' }, t.modelDesc)),
          h('div', { className: 'dsau-ptr' }, h('div', { className: 'dsau-mtoggle', role: 'group' },
            h('button', { className: modelMode === 'tokens' ? 'on' : '', 'aria-pressed': modelMode === 'tokens', onClick: () => setModelMode('tokens') }, t.modelByTokens),
            h('button', { className: modelMode === 'calls' ? 'on' : '', 'aria-pressed': modelMode === 'calls', onClick: () => setModelMode('calls') }, t.modelByCalls)))),
        h('div', { className: 'dsau-mlist' },
          modelRows.map((m) => {
            const v = modelMode === 'tokens' ? m.tokens : m.calls;
            const pct = Math.max(v > 0 ? 2 : 0, (v / modelMax) * 100);
            const tint = tints.model[m.name] || slotColor(0);
            return h('div', { key: m.name, className: 'dsau-mrow' },
              h('div', { className: 'dsau-mrow-top' },
                h('span', { className: 'dsau-mtag', style: { color: tint, borderColor: tint } }, modelMark(m.name)),
                h('span', { className: 'dsau-mname' }, m.name),
                h('span', { className: 'dsau-mval' }, modelMode === 'tokens' ? `${(m.tokens / 1e6).toFixed(2)}M Tokens` : `${m.calls} ${t.callsUnit}`)),
              h('div', { className: 'dsau-mtrack' }, h('div', { className: 'dsau-mfill', style: { width: `${pct}%`, background: tint } })));
          })),
        h('div', { className: 'dsau-mfoot' },
          h('span', null, tpl(t.modelFootCount, { n: modelRows.length })),
          h('span', null, modelMode === 'tokens' ? `${(modelTotal / 1e6).toFixed(2)}M Tokens` : `${modelTotal} ${t.callsUnit}`)));

      const heatContent = h('div', { className: 'dsau-panel' },
        h('div', { className: 'dsau-ph' },
          h('div', null, h('div', { className: 'dsau-pt' }, t.heatTitle), h('div', { className: 'dsau-pd' }, t.heatDesc)),
          h('div', { className: 'dsau-ptr' }, h('div', { className: 'dsau-mtoggle', role: 'group' },
            h('button', { className: heatMode === 'tokens' ? 'on' : '', 'aria-pressed': heatMode === 'tokens', onClick: () => setHeatMode('tokens') }, t.heatTokens),
            h('button', { className: heatMode === 'calls' ? 'on' : '', 'aria-pressed': heatMode === 'calls', onClick: () => setHeatMode('calls') }, t.heatCalls)))),
        h(Heatmap, { heatT: agg.heatT, heatC: agg.heatC, mode: heatMode, setTip, clearTip, t, lang }));

      const pLabel = (id) => pLabelOf(id);
      const rowNodes = tableRows.map((r) => h('tr', { key: r.id },
        h('td', { className: 'mono strong' }, new Date(r.ts).toLocaleString()),
        h('td', null, pLabel(r.provider)),
        h('td', null, r.model || '—'),
        h('td', { className: 'num' }, compact(r.input || 0)),
        h('td', { className: 'num' }, compact(r.output || 0)),
        h('td', { className: 'num' }, compact((r.cacheRead || 0) + (r.cacheWrite || 0))),
        h('td', null, h('span', { className: `dsau-badge${badgeClass(r.finish)}` }, r.finish || 'stop')),
        h('td', { className: 'num' }, fmtDur(r.durationMs || 0))));

      const tableBody = tableRows.length === 0
        ? h('div', { className: 'dsau-table-empty' },
            h('div', { className: 'te-icon' }, h('svg', {
              width: 18, height: 18, viewBox: '0 0 18 18', fill: 'none',
              stroke: 'currentColor', strokeWidth: 1.4,
            }, h('path', { d: 'M3 4.5h12M3 9h12M3 13.5h7' }))),
            h('p', null, t.emptyTable))
        : h('div', { className: 'dsau-scroll' },
            h('table', { className: 'dsau-table' },
              h('thead', null, h('tr', null,
                th('ts', t.colTime), th('provider', t.colProvider), th('model', t.colModel),
                th('input', t.colInput, true), th('output', t.colOutput, true), th('cache', t.colCache, true),
                th('status', t.colStatus), th('latency', t.colDuration, true))),
              h('tbody', null, rowNodes)));

      const tableContent = h('div', { className: 'dsau-panel dsau-table-panel' },
        h('div', { className: 'dsau-ph' },
          h('div', null, h('div', { className: 'dsau-pt' }, t.recentTitle), h('div', { className: 'dsau-pd' }, tpl(t.tableDescTpl, { n: tableRows.length }))),
          h('div', { className: 'dsau-ptr' },
            h('label', { className: 'dsau-search' },
              h('svg', { viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, 'aria-hidden': 'true' },
                h('circle', { cx: 7, cy: 7, r: 4.4 }), h('path', { d: 'M10.4 10.4 14 14' })),
              h('input', {
                type: 'search', value: search, placeholder: t.searchPh,
                'aria-label': t.searchPh,
                onChange: (e) => setSearch(e.target.value),
              })),
            h('span', { className: 'dsau-eyebrow' }, tpl(t.recordCountTpl, { n: filtered.length })))),
        logProviders.length > 1 ? h('div', { className: 'dsau-fpills', role: 'group' },
          [['*', t.filterAll]].concat(logProviders.map((id) => [id, pLabel(id)])).map(([id, label]) => h('button', {
            key: id, className: tableProvider === id ? 'on' : '', 'aria-pressed': tableProvider === id,
            onClick: () => setTableProvider(id),
          }, label))) : null,
        tableBody);

      const emptyState = agg.calls === 0;
      const moduleList = emptyState
        ? [mod('ov', ovContent),
           h('div', { key: 'empty', className: 'dsau-mod-empty', style: { gridColumn: '1 / -1' } },
             h('div', { className: 'dsau-empty' }, t.empty))]
        : [mod('ov', ovContent), mod('trend', trendContent), mod('donut', donutContent),
           mod('quota', quotaContent), mod('hourly', hourlyContent), mod('model', modelContent),
           mod('heat', heatContent), mod('table', tableContent)];

      return h('div', { className: 'dsau-root' }, h('style', null, css),
        h('div', { className: 'dsau-top' },
          h('div', { className: 'dsau-brand' },
            h('div', { className: 'dsau-mark' }, h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: C.signal, strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }, h('path', { d: 'M3 14h4l2.5-7 4 12 2.5-6H21' }))),
            h('div', null, h('div', { className: 'dsau-eyebrow' }, t.eyebrow), h('div', { className: 'dsau-title' }, t.title)),
            h('span', { className: 'dsau-live' }, h('i', null), t.live)),
          h('div', { className: 'dsau-controls' },
            h(Segmented, { options: ranges, value: range, onChange: setRange }),
            h('span', { className: 'dsau-selw' },
              h('select', { className: 'dsau-select', value: provider, onChange: (e) => setProvider(e.target.value) },
                h('option', { value: '*' }, t.allProviders),
                providerNames.map((p) => h('option', { key: p, value: p }, p))),
              h('svg', { viewBox: '0 0 12 12', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5 }, h('path', { d: 'M2.5 4.5 6 8l3.5-3.5' }))),
            editing
              ? h(React.Fragment, null,
                  h('button', { className: 'dsau-btn ghost', title: t.undo, onClick: hist.undo, disabled: !hist.canUndo }, '↶'),
                  h('button', { className: 'dsau-btn ghost', title: t.redo, onClick: hist.redo, disabled: !hist.canRedo }, '↷'),
                  h('button', { className: 'dsau-btn', onClick: () => hist.commit(() => normalizeWB(defaultWB())) }, t.layoutReset),
                  h('button', { className: 'dsau-btn accent', onClick: () => edit.setEditing(false) }, t.layoutDone))
              : h('button', { className: 'dsau-btn', onClick: () => edit.setEditing(true) }, t.layoutEdit),
            h('button', { className: 'dsau-btn', onClick: () => load(true) }, t.refresh),
            h('a', { className: 'dsau-btn', href: EXPORT_URL, download: 'api-usage.json' }, t.export),
            h('button', { className: 'dsau-btn danger', onClick: clearAll }, t.clear))),
        editing ? h('div', { className: 'dsau-layout-hint' },
          h('i', null),
          h('span', null, t.layoutHint),
          h('span', { className: 'kbd' }, t.layoutHintShort)) : null,
        h('div', {
          className: `dsau-mods${editing ? ' is-editing' : ''}`,
          ref: gridRef,
        }, moduleList),
        h('div', { className: 'dsau-statusbar' },
          h('span', null, t.storageLocation),
          data && data.storageFile ? h('span', { className: 'path' }, data.storageFile) : null,
          h('span', { className: 'push' },
            h('span', null, `${t.recordsLabel} `, h('b', null, allRecords.length)),
            h('span', null, `${t.lastSync} `, h('b', null, lastSync ? fmtTime(lastSync) : '—')),
            h('span', null, `${t.telemetry}${data && data.pluginVersion ? ' v' + data.pluginVersion : ''}`))),
        h('div', { className: `dsau-tt${tip ? ' on' : ''}`, style: { left: tip ? tip.x : 0, top: tip ? tip.y : 0 } },
          tip ? h('div', { className: 'tt-l' }, tip.label) : null,
          tip ? h('div', { className: 'tt-v' }, tip.value) : null));
    }

    /* ============ Settings entry ============ */
    function AdminKeySection({ ctx }) {
      const [lang, setLang] = React.useState(() => detectLang(ctx));
      React.useEffect(() => { const l = ctx.get('locale'); if (l?.subscribe) return l.subscribe(() => setLang(detectLang(ctx))); }, [ctx]);
      const t = DICTS[lang] || DICTS.en;
      const [info, setInfo] = React.useState({ status: 'loading', configured: false, writable: true });
      const [draft, setDraft] = React.useState('');
      const [show, setShow] = React.useState(false);
      const [busy, setBusy] = React.useState(false);
      const [notice, setNotice] = React.useState(null);
      const [budget, setBudget] = React.useState(null);
      const [budgetDraft, setBudgetDraft] = React.useState('');

      const loadStatus = React.useCallback(async () => {
        try { const r = await fetch(DATA_URL, { credentials: 'same-origin' }); if (!r.ok) throw new Error(); const d = await r.json();
          const c = d.adminCredential || {}; setInfo({ status: 'ready', configured: c.configured === true, source: c.source, writable: c.writable !== false }); setBudget(Number.isFinite(d.openaiBudgetUsd) ? d.openaiBudgetUsd : null);
        } catch { setInfo((s) => ({ ...s, status: 'error' })); }
      }, []);
      React.useEffect(() => { loadStatus(); }, [loadStatus]);

      const post = async (action, value) => {
        const r = await fetch(ADMIN_URL, { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify(value === undefined ? { action } : { action, value }) });
        const p = await r.json().catch(() => null); if (!r.ok || !p?.ok) throw new Error(p?.error || 'failed'); return p;
      };
      const save = async () => { const v = draft.trim(); if (!v || v.length > 4096 || !/^[\x21-\x7E]+$/.test(v)) { setNotice({ ok: false, text: 'Invalid key' }); return; } setBusy(true); try { const r = await post('set', v); setInfo({ status: 'ready', configured: r.configured, source: r.source, writable: r.writable }); setDraft(''); setShow(false); setNotice({ ok: true, text: 'Saved' }); } catch { setNotice({ ok: false, text: 'Failed' }); } finally { setBusy(false); } };
      const remove = async () => { if (!window.confirm('Remove key?')) return; setBusy(true); try { const r = await post('unset'); setInfo({ status: 'ready', configured: r.configured, source: r.source, writable: r.writable }); setNotice({ ok: true, text: 'Removed' }); } catch { setNotice({ ok: false, text: 'Failed' }); } finally { setBusy(false); } };
      const saveBudget = async (clear) => { const v = clear ? null : Number(budgetDraft.trim()); if (!clear && (!Number.isFinite(v) || v <= 0)) { setNotice({ ok: false, text: 'Invalid' }); return; } setBusy(true); try { const r = await fetch(SETTINGS_URL, { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'set-budget', value: v }) }); const p = await r.json(); if (!p?.ok) throw new Error(); setBudget(p.openaiBudgetUsd ?? null); setBudgetDraft(''); setNotice({ ok: true, text: clear ? 'Cleared' : 'Saved' }); } catch { setNotice({ ok: false, text: 'Failed' }); } finally { setBusy(false); } };

      return h('div', { className: 'dsau-panel', style: { marginTop: 12 } }, h('style', null, css),
        h('div', { className: 'dsau-ph' }, h('div', null, h('div', { className: 'dsau-pt' }, t.adminSettingsTitle), h('div', { className: 'dsau-pd' }, t.adminSettingsHelp))),
        h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' } },
          h('input', { className: 'dsau-input', type: show ? 'text' : 'password', value: draft, autoComplete: 'new-password', placeholder: info.configured ? 'Configured' : t.adminSettingsPlaceholder, disabled: busy || info.status === 'error', onChange: (e) => { setDraft(e.target.value); setShow(false); } }),
          h('button', { className: 'dsau-btn', onClick: () => setShow(!show), disabled: !draft }, show ? '🙈' : '👁'),
          h('button', { className: 'dsau-btn solid', onClick: save, disabled: busy || !draft.trim() }, busy ? '…' : t.adminSettingsSave),
          info.configured ? h('button', { className: 'dsau-btn danger', onClick: remove, disabled: busy }, t.adminSettingsRemove) : null,
          h('span', { style: { fontSize: 11, color: info.configured ? C.ok : C.textFaint } }, info.configured ? `✓ ${info.source || ''}` : '— not set'),
        ),
        notice ? h('div', { className: 'dsau-note', style: { color: notice.ok ? C.ok : C.danger } }, notice.text) : null,
        h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 12, borderTop: `1px solid ${C.lineSoft}`, paddingTop: 12 } },
          h('span', { style: { fontSize: 12, color: C.textLo } }, t.budgetLabel),
          h('input', { className: 'dsau-input', style: { flex: '0 1 100px' }, value: budgetDraft, inputMode: 'decimal', placeholder: budget != null ? `$${budget}` : '50', disabled: busy, onChange: (e) => setBudgetDraft(e.target.value) }),
          h('button', { className: 'dsau-btn', onClick: () => saveBudget(false), disabled: busy || !budgetDraft.trim() }, t.budgetSave),
          budget != null ? h('button', { className: 'dsau-btn', onClick: () => saveBudget(true), disabled: busy }, t.budgetClear) : null,
          budget != null ? h('span', { style: { fontSize: 11, color: C.textFaint } }, fmtUsd(budget)) : null,
        ),
      );
    }

    /* ============ Icon & registration ============ */
    function PanelIcon(props) {
      const size = (props && props.size) || 20;
      return h('svg', { viewBox: '0 0 24 24', width: size, height: size, 'aria-hidden': true, style: { display: 'block' } },
        h('path', { d: 'M3 14h4l2.5-7 4 12 2.5-6H21', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }),
      );
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register(
          { name: 'sidebar.panellist', id: PANEL_ID, order: 20, label: () => (DICTS[detectLang(ctx)] || DICTS.en).panel }, PanelIcon));
        ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: PANEL_ID }, (props) => h(Workbench, { ...props, ctx })));
        ctx.slots.inject('settings.models.footer', () => ctx.slots.register(
          { name: 'settings.models.footer', id: 'api-usage-openai-admin', order: 0 }, () => h(AdminKeySection, { ctx })));
      },
    };
  },
});
