# Repository Guidelines

## 项目定位

本文件用于指导AI Agent工具在本仓库中的协作方式。

核心目标：
- 快速定位模块、业务与代码文件
- 让 AI 与开发者在最小上下文下高效协作
- 维持代码质量、可维护性、可扩展性
- 用按需加载控制 token 成本

---

## 文档分层

- `developers/`：面向 AI 与人类开发者的规范、技能、分析、报告、留痕。
- `docs/`：面向软件使用者的文档。
- 未特别说明时，Agent 不主动改动 `docs/`。

---

## 任务入口

> **任何任务开始前，首先读 [`developers/SKILLS/SKILL_ROUTER.md`](developers/SKILLS/SKILL_ROUTER.md)**，确认读取集与收尾要求。

### 快速路由

| 当前情形 | 立即查阅 |
|---|---|
| **所有任务（统一入口）** | `developers/SKILLS/SKILL_ROUTER.md` |
| 浏览开发文档目录 | `developers/INDEX.md` |
| 新项目初始化 | `developers/SKILLS/SKILL_BOOTSTRAP.md` |
| 控制上下文读取与 token 成本 | `developers/AI-CONTEXT-LOADING.md` |
| 代码编辑任务（强制遵守语言规范） | `developers/CODE-STYLE.md` + `developers/CODE-STYLES/` 对应语言规范 |
| 新建或修改文档 | `developers/DOC-RULES.md` |
| 功能修改后做质量验收 | `developers/SKILLS/SKILL_CODE_QUALITY_CHECK.md` |
| 判定计划目标是否完成（收束验收） | `developers/SKILLS/SKILL_ACCEPTANCE.md` → 按技术栈路由到对应专项文档 |
| 代码快照不存在或引用失效 | `developers/SKILLS/SKILL_SNAPSHOT.md` |

---

## 文档读取策略

启动时必读：
- `AGENTS.md`（本文件）

按任务按需读取：
- `developers/INDEX.md`
- `developers/DOC-RULES.md`
- `developers/CODE-STYLE.md`
- 对应语言规范：`developers/CODE-STYLES/*_CODE-STYLE.md`
- `developers/AI-CONTEXT-LOADING.md`
- `developers/SKILLS/*.md`

历史按需读取：
- `developers/SESSIONS/`
- `developers/ANALYSIS/`
- `developers/REPORTS/`

---

## 通用原则

- **规范先行**：改动前先读 `SKILL_ROUTER.md` 确认读取集，再执行修改。
- **完成即收尾**：任务完成后按 `SKILL_ROUTER.md` 中对应行的"完成后必做"逐项执行，不可跳过。
- **留痕必做**：每次任务结束后追加 `developers/SESSIONS/NOTE_YY_MM_DD.md`（文件不存在时从 TEMPLATE.md 复制）。
- **计划单源**：计划索引仅在本文件（`AGENTS.md`）维护，创建/更新/完成/撤销时同步更新此处。
- **兼容优先**：对外接口变更必须版本化或提供兼容迁移路径。
- **注释有约束**：修改代码时同步检查 `developers/CODE-STYLE.md` 与对应语言细则中的注释/JSDoc 要求；导出函数、共享常量、配置映射、关键数据结构如存在边界或隐含约束，不得省略必要文档注释。

---

## 计划索引

> **权威来源**：计划索引仅在本文件（`AGENTS.md`）维护，其他文件引用此处。适用于 Claude Code、OpenCode、Codex 等所有 AI 工具。

| 计划ID | 计划文档 | 最后更新时间 | 完成情况 | 验收状态 |
|---|---|---|---|---|
| PLAN-SKILLS-001 | `SKILLS-PLAN.md` | 2026-04-22 | 规划中 | 未验收 |
| — | 本仓库为规范模板，接入具体项目后在此登记计划 | — | — | — |
