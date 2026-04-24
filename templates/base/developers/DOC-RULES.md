# 文档维护规则

> 本文件是跨项目通用的文档管理规范，约束 `developers/` 与 `docs/` 的边界、格式与更新要求。

---

## 1. 目录分类与归档规则

| 子目录 | 存放内容 | 典型文件 |
|---|---|---|
| `developers/` | 面向 AI 与人类开发者的协作规范与过程文档 | `INDEX.md`、`DOC-RULES.md`、`CODE-STYLE.md` |
| `developers/SESSIONS/` | 每次改动后的留痕记录 | `NOTE_YY_MM_DD.md`、`TEMPLATE.md` |
| `developers/ANALYSIS/` | 需求、方案、代码分析文档 | `ANALYSIS_*.md` |
| `developers/REPORTS/` | 质量检查报告 | `CODE_QUALITY_REPORT_*.md` |
| `developers/SKILLS/` | Agent 可执行操作手册 | `SKILL_*.md` |
| `docs/` | 面向软件使用者的文档 | `INDEX.md` 与产品使用文档 |

---

## 2. 文档版本锚点规范

分析文档（`developers/ANALYSIS/`）和质量报告（`developers/REPORTS/`）必须带版本锚点。

### 2.1 版本锚点字段

| 字段 | 必填 | 说明 |
|---|---|---|
| `创建时间` | 是 | `YYYY-MM-DD HH:mm +08:00` |
| `最后更新` | 是 | `YYYY-MM-DD HH:mm +08:00` |
| `代码快照日期` | 是 | `YYYY-MM-DD` |
| `Git 分支` | 是（有 git 时） | 如 `main` |
| `Git Commit` | 是（有 git 时） | hash 前 7 位 |

---

## 3. 各类文档规范

### 3.1 规范文档（`developers/` 根层）

- 适用范围：长期稳定规则与目录索引。
- 命名规则：全大写短横线风格（例如 `CODE-STYLE.md`）。
- 规则变更后需同步记录到当天 `SESSIONS`。

### 3.2 会话记录（`developers/SESSIONS/`）

- 命名：`NOTE_YY_MM_DD.md`，同一天追加。
- 每条记录必须包含：时间、改动目的、改动内容、改动文件、验证结果、后续事项。

### 3.3 分析文档（`developers/ANALYSIS/`）

- 命名：`ANALYSIS_[主题].md`。
- 必须包含：版本锚点、参考代码表、结论/建议。

### 3.4 质量报告（`developers/REPORTS/`）

- 命名：`CODE_QUALITY_REPORT_YYYY-MM-DD_HH-mm-ss.md`。
- 必须包含：报告元信息、检查标准、自动化检查结果、结论与建议、关键命令输出摘录。

### 3.5 技能文档（`developers/SKILLS/`）

- 命名：`SKILL_[主题].md`。
- 必须包含：适用场景、执行命令、预期结果、失败处理建议。

### 3.6 计划索引维护规范（强制）

计划状态变化（创建、更新、完成、撤销）时，**仅**在 `AGENTS.md` 中维护计划索引。

- 权威源：`AGENTS.md`（唯一）
- `CLAUDE.md`、`developers/INDEX.md` 等文件不重复维护计划表格，只写“见 `AGENTS.md` 计划索引”。
- 操作步骤见 [`developers/SKILLS/SKILL_PLAN_INDEX.md`](./SKILLS/SKILL_PLAN_INDEX.md)。

### 3.7 多语言规范维护（强制）

- 总则：`developers/CODE-STYLE.md`。
- 语言细则：`developers/CODE-STYLES/*_CODE-STYLE.md`。
- 发生语言级规则变更时，必须同步更新对应细则。

### 3.8 CHANGELOG 维护规范（强制）

项目发布版本时必须维护 `CHANGELOG.md`：
- 格式规范见 `developers/CHANGELOG-RULES.md`。
- 版本号遵循语义化版本（Semantic Versioning）。
- 每个版本需包含版本锚点元信息（创建时间、更新时间、代码快照日期、Git 分支/Commit）。
- 变更记录需关联 Git Commit Hash（7 位）、Issue 编号或 PR 编号。
- 发布前必须将 `[Unreleased]` 更新为实际版本号与日期。

### 3.9 AI 按需加载与 token 控制（强制）

- 执行任务时遵循 `developers/AI-CONTEXT-LOADING.md`。
- 禁止预先全量读取全部文档。

---

## 4. 通用禁止事项

- 禁止只改代码不补 `developers/SESSIONS/` 留痕。
- 禁止更新计划状态但不同步 `AGENTS.md` 计划索引（唯一权威源）。
- 禁止无任务需求时主动改动 `docs/` 软件使用文档。
- 禁止文档索引出现不存在链接。
