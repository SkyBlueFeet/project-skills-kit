# Repository Guidelines

## 项目定位

本仓库是项目规则与协作文档的模板源仓库，用于协助规范制定、模板维护与 CLI 开发。

- 规范模板的权威内容位于 `templates/base/`
- 根目录文件只描述本仓库自身的维护方式
- 目标项目需要的 `developers/**` 文档由 CLI 从 `templates/base/` 复制生成

---

## 维护入口

- 仓库说明：`README.md`
- 接入说明：`ONBOARDING.md`
- 模板入口：`templates/base/AGENTS.md`
- 会话留痕：`developers/SESSIONS/`

---

## 维护原则

- 修改规范文档时，优先改 `templates/base/**`，不要在根目录保留第二份同构副本。
- 根目录 `AGENTS.md`、`README.md`、`CLAUDE.md` 只保留模板制定、CLI 开发与仓库维护所需的最小说明。
- 未明确要求时，不主动改动 `docs/` 下的用户文档。
- 每次任务结束后，追加 `developers/SESSIONS/NOTE_YY_MM_DD.md` 留痕。
- 涉及计划状态变化时，只更新本文件中的计划索引。
- 对外接口或模板结构变更时，优先保证 CLI 与 `ONBOARDING.md` 一致。

---

## 计划索引

> 计划索引仅在本文件维护，供本仓库自用。

| 计划ID | 计划文档 | 最后更新时间 | 完成情况 | 验收状态 |
|---|---|---|---|---|
| PLAN-SKILLS-001 | `SKILLS-PLAN.md` | 2026-04-24 | 推进中 | 未验收 |
| — | 本仓库为规范模板，接入具体项目后在此登记计划 | — | — | — |
