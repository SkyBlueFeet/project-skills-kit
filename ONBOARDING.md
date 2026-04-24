# 将 project-rules 应用到新项目

本文档说明如何将本仓库的规范体系接入一个新的实际项目。

---

## 1. 概念说明

本仓库（`project-rules`）是**规范源**，不与具体项目绑定。
新项目应将所需的规范文件**复制或引用**到自己的仓库中，按需裁剪，不必全盘照搬。

---

## 2. 接入步骤

### 步骤一：明确目标项目的技术栈与协作方式

在接入前先确认：

- 主要语言（TypeScript / Java / Python / …）
- 是否使用 AI 辅助开发（Claude Code / Cursor / 其他）
- 是否需要文档治理（会话留痕、分析报告、质量检查）

---

### 步骤二：复制所需文件到目标仓库

| 文件/目录 | 用途 | 是否必选 |
|---|---|---|
| `AGENTS.md` | Agent 行为约束总入口 | 必选 |
| `CLAUDE.md` | Claude Code 专用配置 | Claude Code 用户必选 |
| `developers/INDEX.md` | 开发文档导航索引 | 强烈推荐 |
| `developers/DOC-RULES.md` | 文档维护规则 | 推荐 |
| `developers/CODE-STYLE.md` | 代码规范总则 | 推荐 |
| `developers/CODE-STYLES/<语言>_CODE-STYLE.md` | 对应语言的代码细则 | 按需选取 |
| `developers/AI-CONTEXT-LOADING.md` | AI 按需加载策略 | 推荐 |
| `developers/SKILLS/SKILL_SNAPSHOT.md` | 代码快照操作手册 | 按需 |
| `developers/SKILLS/SKILL_CODE_QUALITY_CHECK.md` | 质量检查操作手册 | 按需 |
| `developers/SESSIONS/TEMPLATE.md` | 会话留痕模板 | 推荐 |

目录结构建议保持一致，便于 Agent 按既有路径路由。

---

### 步骤三：按项目实际情况裁剪与修改

复制后必须做的修改：

1. **`AGENTS.md`**：更新"计划索引"初始行，删除"待登记"占位符，按实际项目首个计划填入或留空说明。
2. **`CLAUDE.md`**：如有项目专属约束（如禁止修改某目录），在此追加。
3. **`developers/INDEX.md`**：清空示例条目，按实际模块与文档结构重建索引。
4. **语言规范**：只保留项目实际使用的语言规范文件，删除无关语言文件，避免 Agent 误读。

---

### 步骤四：补充项目特有文档

按需在 `developers/` 下新建：

- `MODULE-BUSINESS-FILE-MAP.md`：模块/业务/文件三维映射表（强烈推荐，有助于 AI 快速定位代码）
- `ANALYSIS/ANALYSIS_[主题].md`：首次需求或架构分析
- `SESSIONS/NOTE_YY_MM_DD.md`：从接入当天开始记录留痕

---

### 步骤五：验证 Agent 入口可用

确认以下路径在目标仓库中存在且内容正确：

```
AGENTS.md           ← Agent 启动必读
developers/INDEX.md ← 文档导航
```

如使用 Claude Code，额外确认：

```
CLAUDE.md           ← 任务入口与约束
```

---

## 3. 语言规范按需使用说明

`developers/CODE-STYLES/` 下提供多语言规范，彼此**独立**，不与项目绑定。
使用方式：

- 在目标项目的 `AGENTS.md` 或 `developers/CODE-STYLE.md` 中声明"当前项目启用语言"。
- Agent 执行代码任务时，仅读取已声明语言对应的规范文件。

示例声明（在目标项目 `developers/CODE-STYLE.md` 顶部）：

```
## 当前项目启用语言规范
- TypeScript：developers/CODE-STYLES/TYPESCRIPT_CODE-STYLE.md
- Python：developers/CODE-STYLES/PYTHON_CODE-STYLE.md
```

---

## 4. 脚手架初始化工具——实现方案

> 当前仓库已落地 MVP：
> - `package.json`
> - `src/cli.js`（`init / add / migrate / sync / doctor` 命令）
> - `templates/base/`（规范模板文件）

### 4.1 目标

提供一个可执行脚本（CLI），让开发者无需手动复制文件，通过交互式问答生成适配目标项目的规范子集。

### 4.2 技术选型

| 维度 | 选择 | 理由 |
|---|---|---|
| 运行环境 | Node.js（`tsx` / `ts-node`） | 无需编译、跨平台、生态丰富 |
| 交互库 | `@inquirer/prompts` | 官方维护、ESM 友好、无多余依赖 |
| 文件操作 | Node.js 内置 `fs/promises` | 零依赖 |
| 分发方式 | `npx @skybluefeet/skills-kit init` 或本地 `node src/cli.js init` | 低门槛接入 |

### 4.3 目录规划

```
project-rules/
├── src/
│   └── cli.js           ← 脚手架入口（可执行）
├── templates/            ← 模板文件（对应 developers/ 中可复制的文件）
│   └── base/
│       ├── AGENTS.md
│       ├── CLAUDE.md
│       ├── developers/*
│       └── docs/INDEX.md
└── package.json          ← 声明 bin 入口
```

### 4.4 交互流程设计

```
$ npx @skybluefeet/skills-kit init

? 目标项目根目录（默认当前目录）: ./
? 项目主要语言（多选）:
  ◉ TypeScript
  ◯ JavaScript
  ◉ Python
  ◯ Java
  ◯ Rust
  ◯ HTML/CSS
? 使用哪个 AI 工具？（多选）:
  ◉ Claude Code（生成 CLAUDE.md）
  ◯ OpenCode / Codex / 其他（仅生成 AGENTS.md）
? 是否启用文档治理（会话留痕 / 分析报告 / 质量检查）? Yes

✔ 生成 AGENTS.md
✔ 生成 CLAUDE.md
✔ 生成 developers/INDEX.md
✔ 生成 developers/CODE-STYLE.md
✔ 生成 developers/CODE-STYLES/TYPESCRIPT_CODE-STYLE.md
✔ 生成 developers/CODE-STYLES/PYTHON_CODE-STYLE.md
✔ 生成 developers/DOC-RULES.md
✔ 生成 developers/AI-CONTEXT-LOADING.md
✔ 生成 developers/SESSIONS/TEMPLATE.md
✔ 生成 developers/MODULE-BUSINESS-FILE-MAP.md（框架模板）

完成！下一步：
  1. 打开 AGENTS.md，确认协作边界与计划索引格式
  2. 打开 developers/MODULE-BUSINESS-FILE-MAP.md，按实际模块填写
  3. 开始第一次会话留痕：developers/SESSIONS/NOTE_YY_MM_DD.md
```

### 4.5 核心逻辑（`src/cli.js`）

```js
import { checkbox, confirm, input } from '@inquirer/prompts'
import { cp, mkdir, readFile, rm, writeFile } from 'fs/promises'
import { resolve } from 'path'

const TEMPLATE_DIR = new URL('../templates/base/', import.meta.url).pathname

async function main() {
  const targetDir = resolve(await input({ message: '目标项目根目录', default: '.' }))
  const languages = await checkbox({ message: '项目主要语言', choices: [...] })
  const tools    = await checkbox({ message: '使用哪个 AI 工具', choices: [...] })
  const useDocs  = await confirm({ message: '是否启用文档治理' })

  // 必选文件
  // 先复制模板全集，再按选项裁剪
  await cp(TEMPLATE_DIR, targetDir, { recursive: true, force: true })
  if (!tools.includes('claude')) await rm(`${targetDir}/CLAUDE.md`, { force: true })
  await pruneLanguageStyles(targetDir, languages)
  if (!useDocs) await rm(`${targetDir}/developers/SESSIONS`, { recursive: true, force: true })
  if (useDocs) await createTodaySessionNote(targetDir)

  console.log('\n完成！...')
}

main()
```

### 4.6 实现里程碑

| 阶段 | 内容 | 交付物 |
|---|---|---|
| M1 | 本地脚本可运行，支持文件复制与语言选择 | `src/cli.js` + `templates/` |
| M2 | 生成带占位符的 `MODULE-BUSINESS-FILE-MAP.md` 框架 | 模板文件 |
| M3 | 发布为 npm 包，支持 `npx @skybluefeet/skills-kit init` | `package.json` bin 配置 |
| M4 | 支持差量更新（已存在文件时询问是否覆盖） | `--update` 标志 |

### 4.7 计划登记

> 脚手架实现计划在启动开发前，在 `AGENTS.md` 计划索引中登记计划ID与文档路径。

---

## 5. 参考入口

| 目标 | 文档 |
|---|---|
| 了解规范体系全貌 | `README.md` |
| 查阅 Agent 行为约束 | `AGENTS.md` |
| 查阅开发文档目录 | `developers/INDEX.md` |
| 查阅代码规范 | `developers/CODE-STYLE.md` |
| 查阅文档维护规则 | `developers/DOC-RULES.md` |
