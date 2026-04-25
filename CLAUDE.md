# CLAUDE.md

本文件用于指导 Claude Code 维护本模板源仓库，并协助规范制定与 CLI 开发。

## 协作边界

- 模板规范正文位于 `templates/base/`。
- 根目录 `developers/` 仅保留会话留痕。
- 根目录说明文件只服务于模板维护与 CLI 开发，不承担目标项目文档中心角色。
- `docs/` 为用户文档，没有明确指令时不主动改动。

## 任务入口

- 仓库维护规则：`AGENTS.md`
- 新项目接入说明：`ONBOARDING.md`
- 模板入口：`templates/base/AGENTS.md`
- 会话留痕：`developers/SESSIONS/`

## 执行要求

- 规则或模板变更优先修改 `templates/base/**`。
- 避免在根目录恢复与模板同构的 `developers/**` 副本。
- 根目录说明文件应保持简洁，聚焦仓库维护、规范制定与 CLI 开发。
- 如无更具体约束，优先按 `AGENTS.md` 中的“规范目标”判断改动方向是否正确。
- 改动后补充当日会话记录。
- 涉及计划状态变化时，同步维护 `AGENTS.md` 中的计划索引。
