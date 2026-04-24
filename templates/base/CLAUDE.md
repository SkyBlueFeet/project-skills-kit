# CLAUDE.md

本文件用于指导 Claude Code 在本仓库中的协作方式。

## 协作边界

- `developers/`：开发协作文档，允许按规则读取和维护。
- `docs/`：软件使用文档；没有明确指令时不主动改动。

## 任务入口

- 开发索引：`developers/INDEX.md`
- 文档规则：`developers/DOC-RULES.md`
- 代码规范：`developers/CODE-STYLE.md` + `developers/CODE-STYLES/*_CODE-STYLE.md`
- 按需加载：`developers/AI-CONTEXT-LOADING.md`
- 会话留痕：`developers/SESSIONS/`

## 执行要求

- 优先按”最小读取集”完成任务，避免全量扫描。
- 改动后必须补充当日会话记录。
- 涉及计划状态变化时，同步维护计划索引（见 `AGENTS.md`）。

## 计划索引

> 计划索引统一维护于 `AGENTS.md`，此处不重复。
