# project-rules

本仓库是项目规则与协作文档的模板源，用于沉淀规范、维护模板，并通过 CLI 生成目标项目中的 `AGENTS.md`、`CLAUDE.md`、`developers/**` 等文档。

## 仓库定位

- `templates/base/` 是规范模板的权威源。
- 根目录文件只用于协助规范制定、模板维护与 `skills-kit` CLI 开发。
- 根目录不再维护一套与模板同构的 `developers/**` 副本。
- 目标项目使用的规则文档由 CLI 从模板复制生成，再按项目实际情况裁剪。

## 文档规范概览

这套规范主要解决三类问题：

1. 为 Agent 提供稳定的任务入口、读取顺序和收尾要求。
2. 为开发者提供代码规范、文档规范、质量检查和留痕机制。
3. 在不同项目中复用同一套模板，避免每个仓库重复造轮子。

这套规范最终希望达到的效果是：

1. 让程序员快速看懂项目结构、业务逻辑和代码实现，并能定位到对应文件。
2. 让 Agent 快速理解项目背景、技术栈、文档目录、规范约束与代码位置，并在改动后完成必要留痕。
3. 让多语言项目可以直接复用一套可执行的代码规范与协作约束。
4. 在保证以上能力的前提下，通过按需加载控制上下文体积与 token 成本。

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
- `src/cli.js`：CLI 可执行入口，仅负责启动主程序。
- `src/cli/`：CLI 模块目录，按命令、共享常量、文件工具和项目推断拆分实现。
- `ONBOARDING.md`：说明如何把模板接入新项目。
- `AGENTS.md`、`CLAUDE.md`：本仓库自身维护规则，不等同于目标项目最终文档。
- `developers/SESSIONS/`：本仓库维护过程的留痕记录。

CLI 模块拆分后，入口关系如下：

- `src/cli/main.js`：参数解析与命令分发。
- `src/cli/commands/*.js`：`init`、`add`、`migrate`、`sync`、`doctor` 的具体实现。
- `src/cli/constants.js`、`project.js`、`lock.js`、`session.js`、`utils/fs.js`：复用常量与基础能力。

跨平台兼容策略：

- 全部路径拼接统一使用 Node.js 的 `path` API，避免写死分隔符。
- 持久化到 `skills.lock.json` 或控制台的相对路径统一归一化为 `/`，减少不同系统输出差异。
- CI 使用 `ubuntu-latest`、`macos-latest`、`windows-latest` 三平台矩阵执行 CLI 冒烟检查。

## 简单使用说明

常见使用方式：

1. 在新项目中执行 `skills-kit init`，生成一套基础规则文档。
2. 根据项目技术栈裁剪语言规范和技能文档。
3. 在后续演进中，通过 `add`、`migrate`、`sync`、`doctor` 维护规则结构一致性。

常用命令：

- `skills-kit init`：初始化一套规则模板。
- `skills-kit add`：补充语言规范或技能包。
- `skills-kit migrate`：将旧结构迁移到当前模板约定。
- `skills-kit sync`：把现有项目同步到最新模板结构。
- `skills-kit doctor`：检查缺失项、引用问题和结构异常。

## 安装与发布

本仓库已经整理为标准 npm CLI 包，核心发布信息在 [`package.json`](/E:/公司项目/agent/project-rules/package.json) 中维护：

- 包名：`@skybluefeet/skills-kit`
- 可执行命令：`skills-kit`
- 仓库地址：`https://github.com/SkyBlueFeet/project-skills-kit`
- 发布范围：public scoped package

本地安装与使用：

```bash
npm install -g @skybluefeet/skills-kit
skills-kit --help
```

不全局安装，直接一次性运行：

```bash
npx @skybluefeet/skills-kit init
```

如果希望明确写出实际执行的 bin 命令，可以使用：

```bash
npm exec --package=@skybluefeet/skills-kit -- skills-kit init
```

在当前仓库内做本地开发调试时，使用：

```bash
node ./src/cli.js --help
```

发布前基线检查：

```bash
npm run check
npm run pack:check
```

仓库内的 `.npmrc` 仅从环境变量 `NODE_AUTH_TOKEN` 读取 token，不再在仓库中保存明文凭据。通过 GitHub Actions 发布时，只需要在仓库 Secrets 中配置 `NPM_TOKEN`。

## 模板文件与 CLI 命令对应关系

- `init`
  从 `templates/base/` 复制一套基础模板到目标项目，默认生成 `AGENTS.md`、`developers/INDEX.md`、`developers/CODE-STYLE.md`、`developers/DOC-RULES.md` 等基础文件。
  可选生成 `CLAUDE.md`，可按语言裁剪 `developers/CODE-STYLES/*`，并在初始化时选择 `projectType`；CLI 基于 `package.json` 的项目类型猜测仅作为建议，不会替代人工选择。启用文档治理时会保留 `developers/SKILLS/`、`developers/SESSIONS/`、`developers/MODULE-BUSINESS-FILE-MAP.md`，并写入 `skills.lock.json`。

- `add`
  按需从模板中补充单项内容。
  `add claude` 会补充 `CLAUDE.md`；`add language <name>` 会补充对应语言规范；`add skill <name>` 和 `add skill-pack <name>` 会补充 `developers/SKILLS/` 下的技能文档，并同步更新 `skills.lock.json`。

- `migrate`
  面向旧项目结构做迁移收口。
  重点处理 `AGENTS.md`、`CLAUDE.md`、`developers/INDEX.md` 三个入口文件，并补齐当前模板中缺失的基础文件；执行 `--apply` 时会为被改写文件生成 `.bak` 备份。

- `sync`
  用当前 `templates/base/` 对目标项目做模板同步。
  会检查大多数模板文件是否缺失或与模板不一致，默认只报告差异；使用 `--apply --force` 时可覆盖冲突文件。`README.md` 不参与同步，缺失的语言规范文件也不会被自动补装。

- `doctor`
  对目标项目做结构诊断。
  会检查必需文件、Markdown 本地链接、计划索引口径、`SKILL_ROUTER` 链路、`skills.lock.json` 一致性，以及 `developers/SESSIONS/TEMPLATE.md`、`developers/CODE-INDEX.md` 等关键配套文件；同时校验 `projectType` 与验收 skill 是否匹配。使用 `--fix` 时会尝试补齐部分缺失项，包括项目类型对应的验收 skill。

## 维护原则

- 修改规则、技能、代码规范时，优先更新 `templates/base/**`。
- 根目录说明文件保持精简，只解释仓库自身如何维护。
- 模板结构变更时，同时核对 CLI 行为与 `ONBOARDING.md` 说明。
- 判断改动是否合理时，以“是否更接近 README / AGENTS 中定义的规范目标”为优先标准。
- 每次非平凡改动后，在 `developers/SESSIONS/` 追加会话留痕。
