# project-rules

本仓库是项目规则与协作文档的模板源，用于沉淀规范、维护模板，并通过 CLI 生成目标项目中的 `AGENTS.md`、`CLAUDE.md`、`developers/**` 等文档。

## 仓库定位

- `templates/base/` 是规范模板的权威源。
- 根目录文件只用于协助规范制定、模板维护与 `project-rules-kit` CLI 开发。
- 根目录不再维护一套与模板同构的 `developers/**` 副本。
- 目标项目使用的规则文档由 CLI 从模板复制生成，再按项目实际情况裁剪。

## 文档规范概览

这套规范主要解决三类问题：

1. 为 Agent 提供稳定的任务入口、读取顺序和收尾要求。
2. 为开发者提供代码规范、文档规范、质量检查和留痕机制。
3. 在不同项目中复用同一套模板，避免每个仓库重复造轮子。

规范体系的基本结构如下：

- `AGENTS.md`：目标项目中的协作总入口，说明任务入口、通用原则和计划索引。
- `CLAUDE.md`：Claude Code 的补充约束，强调协作边界和执行要求。
- `developers/INDEX.md`：开发文档导航入口。
- `developers/CODE-STYLE.md` 与 `developers/CODE-STYLES/*`：代码规范总则与语言细则。
- `developers/DOC-RULES.md`：文档新增、修改、索引维护规则。
- `developers/SKILLS/*.md`：针对初始化、快照、质量检查、验收等任务的操作手册。
- `developers/SESSIONS/`：会话留痕，记录每次任务的目的、改动、验证结果与后续事项。

## 仓库结构

- `templates/base/`：模板正文，供目标项目复制使用。
- `src/cli.js`：CLI 入口，负责初始化、增量添加、迁移、同步与诊断。
- `ONBOARDING.md`：说明如何把模板接入新项目。
- `AGENTS.md`、`CLAUDE.md`：本仓库自身维护规则，不等同于目标项目最终文档。
- `developers/SESSIONS/`：本仓库维护过程的留痕记录。

## 简单使用说明

常见使用方式：

1. 在新项目中执行 `project-rules-kit init`，生成一套基础规则文档。
2. 根据项目技术栈裁剪语言规范和技能文档。
3. 在后续演进中，通过 `add`、`migrate`、`sync`、`doctor` 维护规则结构一致性。

常用命令：

- `project-rules-kit init`：初始化一套规则模板。
- `project-rules-kit add`：补充语言规范或技能包。
- `project-rules-kit migrate`：将旧结构迁移到当前模板约定。
- `project-rules-kit sync`：把现有项目同步到最新模板结构。
- `project-rules-kit doctor`：检查缺失项、引用问题和结构异常。

## 维护原则

- 修改规则、技能、代码规范时，优先更新 `templates/base/**`。
- 根目录说明文件保持精简，只解释仓库自身如何维护。
- 模板结构变更时，同时核对 CLI 行为与 `ONBOARDING.md` 说明。
- 每次非平凡改动后，在 `developers/SESSIONS/` 追加会话留痕。
