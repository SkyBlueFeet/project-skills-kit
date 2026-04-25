# 技能目录

本目录存放可供 Agent 直接查阅的操作技能文档。每份技能文档描述何时使用、具体命令、预期结果。

## 命名规则

- `SKILL_[主题].md`

## 与其他文档的区别

| 类型 | 目录 | 定位 |
|---|---|---|
| 技能文档 | `developers/SKILLS/` | 怎么做：可执行步骤 |
| 分析文档 | `developers/ANALYSIS/` | 为什么：方案与结论 |
| 会话文档 | `developers/SESSIONS/` | 做了什么：变更留痕 |

## 当前技能列表

| 技能文档 | 用途 | 适用场景 |
|---|---|---|
| [SKILL_ROUTER.md](./SKILL_ROUTER.md) | **任务路由器（统一入口）** | 所有任务开始前 |
| [SKILL_BOOTSTRAP.md](./SKILL_BOOTSTRAP.md) | 新项目初始化与最低可用检查 | init 后、迁移后、首次接入 |
| [SKILL_DOC_GOVERNANCE.md](./SKILL_DOC_GOVERNANCE.md) | 文档治理（新建/修改/归档流程） | 任何文档变更时 |
| [SKILL_CODE_GOVERNANCE.md](./SKILL_CODE_GOVERNANCE.md) | 代码治理（改动流程 + 语言规范路由） | 功能实现、修复、重构时 |
| [SKILL_PLAN_INDEX.md](./SKILL_PLAN_INDEX.md) | 计划索引管理（生命周期操作） | 计划创建/更新/完成/撤销时 |
| [SKILL_SNAPSHOT.md](./SKILL_SNAPSHOT.md) | 代码快照管理（Repomix） | 无上下文、快照失效、新建分析前 |
| [SKILL_CODE_QUALITY_CHECK.md](./SKILL_CODE_QUALITY_CHECK.md) | 通用代码质量检查 | 功能完成验收、提交前自检、阶段巡检 |
| [SKILL_ACCEPTANCE.md](./SKILL_ACCEPTANCE.md) | 计划目标验收（总则与路由） | 计划里程碑/全量完成时，判定目标是否兑现 |
| [SKILL_ACCEPTANCE_NODE_BACKEND.md](./SKILL_ACCEPTANCE_NODE_BACKEND.md) | Node.js 后端验收 | Express / Koa / Fastify / NestJS 等项目 |
| [SKILL_ACCEPTANCE_FRONTEND.md](./SKILL_ACCEPTANCE_FRONTEND.md) | 前端验收 | React / Vue / 原生 Web / 小程序等项目 |
| [SKILL_ACCEPTANCE_TYPESCRIPT.md](./SKILL_ACCEPTANCE_TYPESCRIPT.md) | TypeScript 通用项目验收 | CLI / SDK / 工具 / 共享库等项目 |
| [SKILL_ACCEPTANCE_JAVASCRIPT.md](./SKILL_ACCEPTANCE_JAVASCRIPT.md) | JavaScript 通用项目验收 | CLI / SDK / 工具 / 脚本 / 模块库等项目 |
| [SKILL_ACCEPTANCE_JAVA_BACKEND.md](./SKILL_ACCEPTANCE_JAVA_BACKEND.md) | Java 后端验收 | Spring Boot / Spring MVC / Spring Cloud 等项目 |
| [SKILL_ACCEPTANCE_PYTHON.md](./SKILL_ACCEPTANCE_PYTHON.md) | Python 验收 | FastAPI / Django / Flask / 脚本 / 数据处理等项目 |
