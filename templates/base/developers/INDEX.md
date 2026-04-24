# 开发协作文档索引（developers）

> 本文件是 `developers/` 目录索引，面向 AI 与人类开发者。
> 软件使用类文档位于 `docs/`，默认不由 Agent 主动改动。

---

## 计划索引

> 计划索引统一维护于根目录 [`AGENTS.md`](../AGENTS.md)（所有 AI 工具均可读取），此处不重复。
> 关联会话记录见 [SESSIONS/](./SESSIONS/)。

---

## AI 快速入口

> **任何任务开始前，首先读 [SKILLS/SKILL_ROUTER.md](./SKILLS/SKILL_ROUTER.md)**，确认读取集与完成后必做事项。

| 任务 | 优先阅读 |
|---|---|
| **所有任务（统一入口）** | [SKILLS/SKILL_ROUTER.md](./SKILLS/SKILL_ROUTER.md) |
| 新项目初始化 | [SKILLS/SKILL_BOOTSTRAP.md](./SKILLS/SKILL_BOOTSTRAP.md) |
| 代码编辑任务（强制遵守语言规范） | [CODE-STYLE.md](./CODE-STYLE.md) + [CODE-STYLES/](./CODE-STYLES/) 对应语言规范 |
| 文档维护 | [DOC-RULES.md](./DOC-RULES.md) |
| 质量验收 | [SKILLS/SKILL_CODE_QUALITY_CHECK.md](./SKILLS/SKILL_CODE_QUALITY_CHECK.md) |
| 快照管理 | [SKILLS/SKILL_SNAPSHOT.md](./SKILLS/SKILL_SNAPSHOT.md) |
| token 节省策略 | [AI-CONTEXT-LOADING.md](./AI-CONTEXT-LOADING.md) |

---

## 模块定位

| 文档 | 说明 |
|---|---|
| [MODULE-BUSINESS-FILE-MAP.md](./MODULE-BUSINESS-FILE-MAP.md) | 模块/业务/文件三维映射表（统一定位入口） |

---

## 技能（Agent 操作手册）

| 技能文档 | 用途 | 适用场景 |
|---|---|---|
| [SKILLS/SKILL_ROUTER.md](./SKILLS/SKILL_ROUTER.md) | **任务路由器（统一入口）** | 所有任务开始前 |
| [SKILLS/SKILL_BOOTSTRAP.md](./SKILLS/SKILL_BOOTSTRAP.md) | 新项目初始化与最低可用检查 | init 后、迁移后、首次接入 |
| [SKILLS/SKILL_DOC_GOVERNANCE.md](./SKILLS/SKILL_DOC_GOVERNANCE.md) | 文档治理（新建/修改/归档流程） | 任何文档变更时 |
| [SKILLS/SKILL_CODE_GOVERNANCE.md](./SKILLS/SKILL_CODE_GOVERNANCE.md) | 代码治理（改动流程 + 语言规范路由） | 功能实现、修复、重构时 |
| [SKILLS/SKILL_PLAN_INDEX.md](./SKILLS/SKILL_PLAN_INDEX.md) | 计划索引管理（生命周期操作） | 计划创建/更新/完成/撤销时 |
| [SKILLS/SKILL_SNAPSHOT.md](./SKILLS/SKILL_SNAPSHOT.md) | 代码快照管理（Repomix） | 无上下文、快照失效、新建分析前 |
| [SKILLS/SKILL_CODE_INDEX.md](./SKILLS/SKILL_CODE_INDEX.md) | 代码索引建立与维护 | 项目初始化后、结构变更后、索引过期时 |
| [SKILLS/SKILL_CODE_QUALITY_CHECK.md](./SKILLS/SKILL_CODE_QUALITY_CHECK.md) | 通用代码质量检查 | 功能完成验收、提交前自检、阶段巡检 |
| [SKILLS/SKILL_ACCEPTANCE.md](./SKILLS/SKILL_ACCEPTANCE.md) | 计划目标验收（入口） | 计划里程碑/全量完成时判定目标是否兑现 |
| [SKILLS/SKILL_ACCEPTANCE_NODE_BACKEND.md](./SKILLS/SKILL_ACCEPTANCE_NODE_BACKEND.md) | Node.js 后端验收 | Express / Koa / NestJS 等 |
| [SKILLS/SKILL_ACCEPTANCE_FRONTEND.md](./SKILLS/SKILL_ACCEPTANCE_FRONTEND.md) | 前端验收 | React / Vue / 原生 Web 等 |
| [SKILLS/SKILL_ACCEPTANCE_JAVA_BACKEND.md](./SKILLS/SKILL_ACCEPTANCE_JAVA_BACKEND.md) | Java 后端验收 | Spring Boot / Spring MVC 等 |
| [SKILLS/SKILL_ACCEPTANCE_PYTHON.md](./SKILLS/SKILL_ACCEPTANCE_PYTHON.md) | Python 验收 | FastAPI / Django / Flask / 脚本 / 数据处理等 |

完整技能列表见 [SKILLS/README.md](./SKILLS/README.md)。

---

## 规范与治理

| 文档 | 说明 |
|---|---|
| [DOC-RULES.md](./DOC-RULES.md) | 文档维护规则、版本锚点与留痕规范 |
| [CHANGELOG-RULES.md](./CHANGELOG-RULES.md) | CHANGELOG 文档格式、版本管理与维护流程 |
| [CODE-STYLE.md](./CODE-STYLE.md) | 跨语言代码规范总则 |
| [CODE-STYLES/RUST_CODE-STYLE.md](./CODE-STYLES/RUST_CODE-STYLE.md) | Rust 规范（按项目启用） |
| [CODE-STYLES/TYPESCRIPT_CODE-STYLE.md](./CODE-STYLES/TYPESCRIPT_CODE-STYLE.md) | TypeScript 规范（按项目启用） |
| [CODE-STYLES/JAVASCRIPT_CODE-STYLE.md](./CODE-STYLES/JAVASCRIPT_CODE-STYLE.md) | JavaScript 规范（按项目启用） |
| [CODE-STYLES/JAVA_CODE-STYLE.md](./CODE-STYLES/JAVA_CODE-STYLE.md) | Java 规范（按项目启用） |
| [CODE-STYLES/PYTHON_CODE-STYLE.md](./CODE-STYLES/PYTHON_CODE-STYLE.md) | Python 规范（按项目启用） |
| [CODE-STYLES/HTML_CODE-STYLE.md](./CODE-STYLES/HTML_CODE-STYLE.md) | HTML 规范（按项目启用） |
| [CODE-STYLES/CSS_CODE-STYLE.md](./CODE-STYLES/CSS_CODE-STYLE.md) | CSS 规范（按项目启用） |
| [AI-CONTEXT-LOADING.md](./AI-CONTEXT-LOADING.md) | AI 按需加载与 token 节省策略 |

---

## 外部接入（开发者视角）

| 文档 | 说明 |
|---|---|
| [DEVELOPERS/README.md](./DEVELOPERS/README.md) | 二次开发/外部接入文档说明 |

---

## 分析与报告

| 文档 | 说明 |
|---|---|
| [ANALYSIS/README.md](./ANALYSIS/README.md) | 分析文档命名、模板与版本锚点要求 |
| [REPORTS/README.md](./REPORTS/README.md) | 质量报告命名、章节、字段与判定标准 |

---

## 历史记录（按需查阅）

| 文档 | 说明 |
|---|---|
| [ANALYSIS/](./ANALYSIS/) | 代码与需求分析目录（按主题命名：`ANALYSIS_[主题].md`） |
| [REPORTS/](./REPORTS/) | 代码质量检查报告目录（按时间生成 `CODE_QUALITY_REPORT_*.md`） |
| [SESSIONS/](./SESSIONS/) | 变更留痕目录（按日期命名：`NOTE_YY_MM_DD.md`） |
| [SESSIONS/TEMPLATE.md](./SESSIONS/TEMPLATE.md) | NOTE 文件模板 |
