<div align="center">

# API Usage Tracker

> 记录每一次模型 API 调用，并在 [DeepSeek Harness（DSH）](https://github.com/deepseek-ai/deepseek-harness) Web GUI 的侧边栏工作台中，按时间、提供方、模型等维度展示用量、配额、余额与花费。

[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![runtime](https://img.shields.io/badge/runtime-DSH%20bundle-brightgreen.svg)](https://github.com/deepseek-ai/deepseek-harness)
[![node](https://img.shields.io/badge/node-%E2%89%A518-339933.svg)](https://nodejs.org/)
[![version](https://img.shields.io/badge/version-3.23.0-orange.svg)](package.json)

**一个运行在 DSH 内的本地用量统计插件：逐次记录模型调用，在侧边栏里看清每一个 token、每一份配额与余额。**

> 本文为中文版 · [查看英文版](README.en.md)

</div>

---

## 目录

- [简介](#简介)
- [功能特性](#功能特性)
- [安装与启用](#安装与启用)
- [快速上手](#快速上手)
- [工作台模块](#工作台模块)
- [数据与隐私](#数据与隐私)
- [开发与校验](#开发与校验)
- [常见问题](#常见问题)
- [安全说明](#安全说明)
- [许可证](#许可证)

## 简介

API Usage Tracker 是一个**本地 DSH 插件包（Cordis bundle）**——既不是独立应用，也不是 Python 项目。它挂在 DSH 的 `llm/stream` 事件上，每次模型调用追加一条精简的元数据记录到本地 JSONL 文件，并在 DSH Web GUI 侧栏提供一个可交互的工作台。

由于运行在 DSH 内部，它还能复用你已登录的会话读取剩余配额与钱包余额——这些服务无需在本插件里另填密钥。可选地，配置 OpenAI Admin Key 后可展示组织级的用量与费用。

> **零运行时依赖**：Preact、Cordis 与模块加载器均由 DSH 宿主提供，无需 `npm install`。

## 功能特性

- **逐次调用记录**：每次 LLM 调用生成一条 JSONL 记录（时间、提供方、模型、会话、用途、输入/输出/缓存/推理 token、结束原因、耗时）。只含元数据，不含提示词或回复正文。
- **八模块工作台**：总览、用量趋势、提供方占比、配额与余额、按时段请求数、模型分布、活跃度热力图、最近调用；模块可拖拽/缩放，布局自动保存到 Host。
- **自适应提供方占比图**：饼图会测量自身单元格，将图例按可用宽度自动排成多列；空间不足时才缩小圆环、最后才丢弃注释标签。模块再窄再矮，也不会把提供方裁掉。
- **配额与余额探测**：支持 Kimi Coding、Kimi Coding Global、DeepSeek 官方、DeepSeek 账号、MiniMax 国内版、WorkBuddy——复用 DSH 已登录会话；结果缓存 2 分钟，可在工具栏强制刷新。
- **钱包余额可视化**：提供方钱包（充值 + 赠送）以组合圆环呈现，中间显示金额；负数余额会以警示色显示为债务，并正确格式化为 `-¥0.03`（而非 `¥-0.03`）。
- **OpenAI 组织用量与费用**：按月（UTC）查询用量与成本，可配置月度预算进度条；使用保存在 DSH 凭据中的 Admin Key。
- **本地花费追踪**：对只返回余额的服务，通过余额下降在本地累计花费（`spend.json`）。
- **导出与清空**：一键导出 JSON 快照、一键清空本地调用记录。
- **权限感知的布局编辑**：拖拽手柄与模块名浮层只在编辑时或鼠标悬停/键盘聚焦时出现，不会与模块自身标题重叠。
- **双语界面**：英文 / 中文，跟随 DSH 上下文自动切换。

## 安装与启用

1. **插件管理器（推荐）**：调用 `plugin_manager`，参数 `action: "install_bundle"`，`target` 为本目录的**绝对路径**。
2. **Web GUI**：**插件 → 添加插件 → 本地目录**，选择包含 `package.json` 的本文件夹。

重启 DSH 或刷新 Web GUI，左侧栏会出现 **API usage tracker / API 用量统计** 面板（柱状图图标，order 20），点击即可打开工作台。

详细说明见 [`docs/usage.md`](docs/usage.md)；插件如何接入宿主见 [`docs/architecture.md`](docs/architecture.md)。

## 快速上手

1. 安装并启用插件（见上），打开侧栏面板。
2. 在工具栏选择时间范围、强制刷新配额、导出 JSON 或清空本地记录。
3. 拖拽模块边缘可调整大小，布局会自动保存。
4. **（可选）配置 OpenAI Admin Key**：在“模型”区域底部，或 **设置 → 模型** 中，找到 **OpenAI Admin Key** 卡片，粘贴密钥并保存。

密钥通过 DSH 凭据系统以引用名 `OPENAI_ADMIN_KEY` 保存，**只写不读**：插件不会把密钥回显到界面、写入日志或落盘到项目里；清除也从同一张卡片操作。

## 工作台模块

工作台是一个 24 列网格，包含八个模块：

| 模块 ID | 名称 | 内容 |
| --- | --- | --- |
| `ov` | 总览 | 调用总数、token 总量、近期活动 |
| `trend` | 用量趋势 | 请求与 token 随时间变化 |
| `donut` | 提供方占比 | 自适应的各提供方用量饼图 |
| `quota` | 配额与余额 | 各服务剩余额度窗口与钱包余额 |
| `hourly` | 请求时段 | 每天按小时的调用直方图 |
| `model` | 模型 | 按模型拆分的 token 使用 |
| `heat` | 活跃度 | 时段 × 星期的活跃热力图 |
| `table` | 最近调用 | 每次调用的时间、提供方、模型、token、耗时 |

## 项目结构与标准模板对照

本项目遵循常见开源工程的标准结构；由于是 DSH 插件包，Python 专属条目做了等价适配：

| 标准模板条目 | 本项目 | 说明 |
| --- | --- | --- |
| `.github/workflows/` | ✅ `.github/workflows/ci.yml` | Node 语法/清单检查 + 测试 |
| `docs/` | ✅ `docs/usage.md`、`docs/architecture.md` | 使用指南与架构说明 |
| `scripts/` | ✅ `scripts/check-bundle.js` | 零依赖的清单与文件完整性校验 |
| `src/your_package/` | ✅ 根目录 `index.js` / `client.js` | DSH 插件包约定源码位于根目录，无 `src/` 层 |
| `tests/` | ✅ `test/bundle.test.js`、`test/README.md` | 轻量测试 |
| `.env.example` | ✅ | 仅列变量名，**不含真实密钥** |
| `.gitignore` | ✅ | 忽略 `.env`、运行时数据、构建产物 |
| `CHANGELOG.md` | ✅ | 版本变更记录（Keep a Changelog 格式） |
| `CONTRIBUTING.md` | ✅ | 贡献与安装指南 |
| `LICENSE` | ✅ | MIT |
| `README.md` | ✅ 本文件 + `README.en.md` | 中文入口 + 英文独立版 |
| `pyproject.toml` | ➡️ `package.json` | JS 等价：`exports` + `dsh.bundle.patch` + `dsh.client` |
| `Dockerfile` | ➖ 不适用 | 插件运行在 DSH 宿主内，无需容器化 |

完整目录：

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
├── README.md            # 中文版
├── README.en.md         # 英文版
├── package.json
├── cordis.patch.yml
├── index.js             # Host 端：记录、配额探测、路由
├── client.js            # Web 端：侧栏面板、工作台、密钥卡片
├── locale/
│   ├── en.json
│   └── zh.json
└── icon.svg
```

## 数据与隐私

Host 端把数据写在 DSH 配置目录下（优先级 `DSH_PROFILE_DIR` → `DSH_HOME` → `~/.deepseek-harness`）：

```
<profile>/api-usage-tracker/
├── records.jsonl   # 每次调用一条元数据记录（不含 prompt / 回复正文）
├── settings.json   # OpenAI 月度预算（openaiBudgetUsd）
├── layout.json     # 工作台布局
└── spend.json      # 本地累计花费
```

- `records.jsonl` 上限 50,000 行，超出后丢弃最旧记录。
- **所有数据仅存于本机**，记录只含元数据。
- 清空记录只删除 `records.jsonl`；导出会生成当前数据的 JSON 快照。

## 开发与校验

无需 `npm install`。使用任意 Node.js ≥ 18：

```bash
node --check index.js
node --check client.js
node scripts/check-bundle.js     # 校验清单与文件完整性
node --test test/*.test.js       # 运行测试（无第三方依赖）
```

CI 在 `ubuntu-latest` 上使用 Node 20 执行清单校验与测试。贡献前请阅读 [`CONTRIBUTING.md`](CONTRIBUTING.md)，行为变更请同步更新 [`CHANGELOG.md`](CHANGELOG.md)。

## 常见问题

- **插件安装后侧栏没有面板？** 确认 `package.json` 中 `files[]` 包含 `index.js`、`client.js`、`cordis.patch.yml`、`icon.svg`、`locale/*.json`；可运行 `node scripts/check-bundle.js` 自检，然后重启 DSH 或刷新 Web GUI。
- **配额显示为不可用？** 配额探测复用 DSH 已登录会话，请先在 DSH 中登录对应提供方；结果有 2 分钟缓存，可用工具栏的刷新按钮强制更新。
- **OpenAI 用量不显示？** 请确认已设置 Admin Key（见[快速上手](#快速上手)）；密钥为只写引用，界面无法回读，只能重新设置或清除。

## 安全说明

- 源码中不含任何真实凭据；Admin Key 通过 DSH 凭据引用管理，单向设置/清除，绝不回显给客户端。
- `.env.example` 仅列出环境变量名；`.env` 已被 `.gitignore` 忽略。
- 客户端所有请求均为同源的 Host 路由（`/api-usage-tracker/*`）；对上游服务的调用由 Host 完成。
- `apply(ctx)` 返回的 disposer 会释放所有监听器与路由，卸载插件不会留下残留。

## 许可证

[MIT](LICENSE) © 2026 API Usage Tracker contributors.
