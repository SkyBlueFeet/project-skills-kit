# 模块/业务/文件三维映射表

> 用途：让人类开发者与 AI 在最少上下文下快速定位“业务目标 -> 责任模块 -> 实际文件”。

## 核心映射

| 模块域 | 业务目标 | 关键文件 |
|---|---|---|
| 协作入口 | 定义 Agent 执行边界、协作规则、计划索引入口 | `AGENTS.md`, `CLAUDE.md` |
| 开发文档导航 | 提供开发文档总入口与按需读取路线 | `developers/INDEX.md` |
| 文档治理规则 | 规范文档归档、计划同步、留痕要求 | `developers/DOC-RULES.md` |
| 跨语言编码总则 | 统一设计、可维护性与质量门禁基线 | `developers/CODE-STYLE.md` |
| 语言规范 | 按项目语言栈启用细则规范 | `developers/CODE-STYLES/*_CODE-STYLE.md` |
| 上下文控制 | 约束最小读取集与 token 控制策略 | `developers/AI-CONTEXT-LOADING.md` |
| 操作技能 | 固化快照、质量检查等可执行流程 | `developers/SKILLS/*.md` |
| 计划分析 | 存放计划与方案分析结论 | `developers/ANALYSIS/*.md` |
| 质量报告 | 存放质量检查报告与结论 | `developers/REPORTS/*.md` |
| 变更留痕 | 记录每次改动目的、文件、验证结果 | `developers/SESSIONS/*.md` |
| 外部接入说明 | 面向接入方的开发文档 | `developers/DEVELOPERS/*.md` |
| 软件使用文档 | 面向软件使用者的文档 | `docs/INDEX.md`, `docs/**/*.md` |

## 快速定位规则

1. 先按“业务目标”定位模块域，再打开“关键文件”。
2. 涉及代码改动时，至少同时打开：`AGENTS.md`、`developers/INDEX.md`、对应语言规范。
3. 涉及文档或计划状态改动时，优先打开：`developers/DOC-RULES.md` 与当天 `developers/SESSIONS/NOTE_YY_MM_DD.md`。
