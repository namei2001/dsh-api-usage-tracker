# API Usage Tracker（DSH API 用量统计）

> 一个 [DSH（agent runtime）](https://github.com/) 插件包：记录每一次模型 API 调用，并在侧边栏工作台中按时间、提供方、模型等维度统计用量、配额与花费。

![license](https://img.shields.io/badge/license-MIT-blue.svg)
![runtime](https://img.shields.io/badge/runtime-DSH%20plugin-brightgreen.svg)

## 简介

这个插件挂在 DSH 的 `llm/stream` 事件上，把每次模型调用的关键元数据写入本地
JSONL 记录，并在 Web GUI 中提供一个可自由排布的工作台来展示这些数据。它还能
读取你在 DSH 中已登录服务的剩余配额/余额，并在配置了 OpenAI Admin Key 后展示
组织级的用量与费用。

**它不是普通的 Python 项目**：它遵循 DSH 的 **插件包（Cordis bundle）** 规范，
本质是一个纯 JavaScript（ESM）包，因此本项目中的 `pyproject.toml`、`src/`、
`Dockerfile` 等模板条目被适配为等价的插件工程结构（见下方[结构对照](#项目结构与标准模板对照)）。

## 功能特性

- **逐次调用记录**：每次 LLM 调用生成一条 JSONL 记录（时间、提供方、模型、会话、用途、输入/输出/缓存 token、结束原因、耗时）。
- **八模块工作台**：总览、用量趋势、提供方占比、配额与余额、按时段请求数、模型分布、活跃度热力图、最近调用；模块可拖拽/缩放，布局自动保存。
- **配额与余额探测**：支持 Kimi Coding、Kimi Coding Global、DeepSeek 官方、DeepSeek 账号、MiniMax 国内版、WorkBuddy（复用 DSH 已登录会话，无需在本插件里填写这些服务的密钥）。
- **OpenAI 组织用量/费用**：按月（UTC）查询用量与成本，可配置月度预算进度条。
- **本地花费追踪**：对于只返回余额的服务，通过余额下降累加出“已花费”（仅本地统计）。
- **数据导出与清空**：一键导出 JSON 快照、清空本地调用记录。
- **双语界面**：英文 / 中文自动切换。

## 快速开始

### 安装

这是一个**本地 DSH 插件包**，不能独立运行。

1. 通过插件管理器安装（推荐）：使用 `plugin_manager`，`action: "install_bundle"`，`target` 为本目录的**绝对路径**；
2. 或在 Web GUI 中：**插件 → 添加插件 → 本地目录**，选择包含 `package.json` 的本文件夹。

启用插件后重启 DSH 或刷新 Web GUI，左侧栏会出现 **API usage tracker / API 用量统计** 面板，点击即可打开工作台。

### 配置 OpenAI Admin Key（可选）

在工作台的“模型”区域底部（或 **设置 → 模型** 页脚）找到 **OpenAI Admin Key** 卡片，粘贴密钥并保存。密钥存入 DSH 凭据系统（引用名 `OPENAI_ADMIN_KEY`），**只写不读**：插件不会把密钥回显到界面或写入日志。清除也从同一张卡片操作。

> 更详细的逐步说明见 [`docs/usage.md`](docs/usage.md)。

## 界面速览

| 区域 | 内容 |
| --- | --- |
| 侧栏面板 | 工作台入口（柱状图图标，固定在侧栏列表 order 20） |
| 总览 `ov` | 调用总数、token 总量、近期活动 |
| 用量趋势 `trend` | 请求与 token 随时间变化 |
| 提供方占比 `donut` | 各提供方用量饼图 |
| 配额与余额 `quota` | 各服务剩余额度窗口与钱包余额 |
| 请求时段 `hourly` | 每天按小时的调用直方图 |
| 模型 `model` | 按模型拆分的 token 使用 |
| 活跃度 `heat` | 时段 × 星期的活跃热力图 |
| 最近调用 `table` | 每次调用的时间、提供方、模型、token、耗时 |

## 项目结构与标准模板对照

标准 Python 项目模板与本插件包结构的对应关系如下：

| 标准模板条目 | 本项目 | 说明 |
| --- | --- | --- |
| `.github/workflows/` | ✅ `.github/workflows/ci.yml` | Node 语法检查 + `node:test` |
| `docs/` | ✅ `docs/usage.md`、`docs/architecture.md` | 使用指南与架构说明 |
| `scripts/` | ✅ `scripts/check-bundle.js` | 无需依赖的清单/结构校验脚本 |
| `src/your_package/` | ✅ 根目录 `index.js` / `client.js` | DSH 插件包约定源码位于根目录，无 `src/` 层 |
| `tests/` | ✅ `test/bundle.test.js` | `node:test` 轻量测试 |
| `.env.example` | ✅ | 仅列变量名，**不含真实密钥** |
| `.gitignore` | ✅ | 忽略 `.env`、运行时数据、构建产物 |
| `CHANGELOG.md` | ✅ | 版本变更记录 |
| `CONTRIBUTING.md` | ✅ | 贡献与安装指南 |
| `LICENSE` | ✅ | MIT |
| `README.md` | ✅ 本文件 | 项目门面 |
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
├── README.md
├── package.json
├── cordis.patch.yml
├── index.js            # Host 端：记录、配额探测、路由
├── client.js           # Web 端：侧栏面板、工作台、密钥卡片
├── locale/
│   ├── en.json
│   └── zh.json
└── icon.svg
```

## 数据与方法

Host 端把数据写在 DSH 配置目录下（优先级 `DSH_PROFILE_DIR` → `DSH_HOME` → `~/.deepseek-harness`）：

```
<profile>/api-usage-tracker/
├── records.jsonl   # 每次调用一条记录（不含 prompt / 回复正文）
├── settings.json   # OpenAI 月度预算
├── layout.json     # 工作台布局
└── spend.json      # 本地累计花费
```

`records.jsonl` 上限 50,000 行（超出后丢弃最旧记录）。**所有数据仅存于本机**；
记录只包含元数据，不含提示词或响应正文。清空记录只删除 `records.jsonl`。

## 开发与校验

无需 `npm install`（运行时依赖由 DSH 宿主提供）。使用任意 Node.js ≥ 18：

```bash
node --check index.js
node --check client.js
node scripts/check-bundle.js     # 校验清单与文件完整性
node --test test/*.test.js       # 运行测试（无第三方依赖）
```

详情见 [`CONTRIBUTING.md`](CONTRIBUTING.md) 与 [`docs/architecture.md`](docs/architecture.md)。

## 安全说明

- 源码中不含任何真实凭据；Admin Key 通过 DSH 凭据引用管理，单向设置/清除。
- `.env.example` 仅列出环境变量名；`.env` 已被 `.gitignore` 忽略。
- 客户端所有请求均为同源的 Host 路由；对上游服务的调用由 Host 完成。

## 许可证

[MIT](LICENSE) © 2026 API Usage Tracker contributors
