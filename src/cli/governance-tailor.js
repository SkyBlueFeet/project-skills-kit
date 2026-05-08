import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { pathExists, removeIfExists, normalizeRelativePath } from "./utils/fs.js";

const GOVERNANCE_TAILORABLE_FILES = new Set([
  "AGENTS.md",
  "CLAUDE.md",
  "developers/AI-CONTEXT-LOADING.md",
  "developers/CODE-STYLE.md",
  "developers/DOC-RULES.md",
  "developers/INDEX.md",
  "developers/SKILLS/README.md",
  "developers/SKILLS/SKILL_ACCEPTANCE.md",
  "developers/SKILLS/SKILL_BOOTSTRAP.md",
  "developers/SKILLS/SKILL_CODE_GOVERNANCE.md",
  "developers/SKILLS/SKILL_CODE_INDEX.md",
  "developers/SKILLS/SKILL_CODE_QUALITY_CHECK.md",
  "developers/SKILLS/SKILL_DOC_GOVERNANCE.md",
  "developers/SKILLS/SKILL_PLAN_INDEX.md",
  "developers/SKILLS/SKILL_ROUTER.md"
]);

/**
 * 判断当前项目是否完全关闭文档治理配套。
 *
 * @param {import("./lock.js").GovernanceConfig} governance
 * @returns {boolean}
 */
export function isGovernanceProfileOff(governance) {
  return governance.profile === "off";
}

/**
 * 判断某个技能模板是否应随当前治理配置一并启用。
 *
 * @param {string} skillFile
 * @param {import("./lock.js").GovernanceConfig} governance
 * @returns {boolean}
 */
export function isSkillEnabledByGovernance(skillFile, governance) {
  if (isGovernanceProfileOff(governance)) {
    return false;
  }

  if (skillFile === "SKILL_ROUTER.md" && governance.skillRouter === "off") {
    return false;
  }

  if (skillFile === "SKILL_PLAN_INDEX.md" && governance.planIndex === "off") {
    return false;
  }

  if (skillFile === "SKILL_CODE_QUALITY_CHECK.md" && governance.qualityChecks === "off") {
    return false;
  }

  return true;
}

/**
 * 判断模板文件是否属于“会被治理开关二次裁剪”的文档。
 *
 * @param {string} relativePath
 * @param {import("./lock.js").GovernanceConfig} governance
 * @returns {boolean}
 */
export function isTailoredByGovernance(relativePath, governance) {
  const normalized = normalizeRelativePath(relativePath);
  return GOVERNANCE_TAILORABLE_FILES.has(normalized);
}

/**
 * 根据治理配置判断模板文件是否仍应纳入同步范围。
 *
 * `off` profile 会删除整套 `developers/SKILLS`、`developers/SESSIONS`
 * 与模块映射表；sync 必须尊重该结构，不能把它们重新加回目标项目。
 *
 * @param {string} relativePath
 * @param {import("./lock.js").GovernanceConfig} governance
 * @returns {boolean}
 */
export function isManagedByGovernance(relativePath, governance) {
  const normalized = normalizeRelativePath(relativePath);

  if (isGovernanceProfileOff(governance)) {
    return (
      !normalized.startsWith("developers/SKILLS/") &&
      !normalized.startsWith("developers/SESSIONS/") &&
      normalized !== "developers/MODULE-BUSINESS-FILE-MAP.md"
    );
  }

  if (governance.skillRouter === "off" && normalized === "developers/SKILLS/SKILL_ROUTER.md") {
    return false;
  }

  if (governance.planIndex === "off" && normalized === "developers/SKILLS/SKILL_PLAN_INDEX.md") {
    return false;
  }

  if (
    governance.qualityChecks === "off" &&
    normalized === "developers/SKILLS/SKILL_CODE_QUALITY_CHECK.md"
  ) {
    return false;
  }

  if (governance.sessionNotes === "off" && normalized.startsWith("developers/SESSIONS/")) {
    return false;
  }

  return true;
}

/**
 * 对指定模板文本应用治理裁剪逻辑。
 *
 * @param {string} content
 * @param {import("./lock.js").GovernanceConfig} governance
 * @param {string} relativePath
 * @returns {string}
 */
export function tailorContentByGovernance(content, governance, relativePath) {
  return applyGovernanceTailoring(content, governance, normalizeRelativePath(relativePath));
}

/**
 * 按治理开关裁剪目标项目中的模板内容，避免关闭项仍留在文档里反复触发 Agent。
 *
 * @param {string} targetDir
 * @param {import("./lock.js").GovernanceConfig} governance
 * @param {import("./lock.js").SkillsLock} lock
 * @returns {Promise<void>}
 */
export async function tailorGovernanceDocs(targetDir, governance, lock) {
  const removedFiles = new Set();

  if (isGovernanceProfileOff(governance)) {
    await rm(path.join(targetDir, "developers", "SESSIONS"), {
      recursive: true,
      force: true
    });
    await rm(path.join(targetDir, "developers", "SKILLS"), {
      recursive: true,
      force: true
    });
    await removeGovernanceFile(
      targetDir,
      removedFiles,
      "developers/MODULE-BUSINESS-FILE-MAP.md"
    );
  } else if (governance.sessionNotes === "off") {
    await rm(path.join(targetDir, "developers", "SESSIONS"), {
      recursive: true,
      force: true
    });
  }

  if (governance.skillRouter === "off") {
    await removeGovernanceFile(targetDir, removedFiles, "developers/SKILLS/SKILL_ROUTER.md");
  }

  if (governance.planIndex === "off") {
    await removeGovernanceFile(targetDir, removedFiles, "developers/SKILLS/SKILL_PLAN_INDEX.md");
  }

  if (governance.qualityChecks === "off") {
    await removeGovernanceFile(
      targetDir,
      removedFiles,
      "developers/SKILLS/SKILL_CODE_QUALITY_CHECK.md"
    );
  }

  for (const relativePath of GOVERNANCE_TAILORABLE_FILES) {
    const absolutePath = path.join(targetDir, relativePath);
    if (!(await pathExists(absolutePath))) {
      continue;
    }

    let content = await readFile(absolutePath, "utf8");
    content = applyGovernanceTailoring(content, governance, relativePath);
    await writeFile(absolutePath, content, "utf8");
  }

  if (removedFiles.size > 0) {
    lock.skills = isGovernanceProfileOff(governance)
      ? []
      : lock.skills.filter((skill) => !removedFiles.has(normalizeRelativePath(skill.file)));
  }
}

async function removeGovernanceFile(targetDir, removedFiles, relativePath) {
  await removeIfExists(path.join(targetDir, relativePath));
  removedFiles.add(normalizeRelativePath(relativePath));
}

function applyGovernanceTailoring(content, governance, relativePath) {
  let next = content;

  if (relativePath === "developers/SKILLS/SKILL_ROUTER.md") {
    next = tailorRouterContent(next, governance);
  }
  if (relativePath === "developers/INDEX.md") {
    next = tailorIndexContent(next, governance);
  }
  if (relativePath === "AGENTS.md") {
    next = tailorAgentsContent(next, governance);
  }
  if (relativePath === "CLAUDE.md") {
    next = tailorClaudeContent(next, governance);
  }
  if (relativePath === "developers/AI-CONTEXT-LOADING.md") {
    next = tailorAiContextLoadingContent(next, governance);
  }
  if (relativePath === "developers/DOC-RULES.md") {
    next = tailorDocRulesContent(next, governance);
  }
  if (relativePath === "developers/CODE-STYLE.md") {
    next = tailorCodeStyleContent(next, governance);
  }
  if (relativePath === "developers/SKILLS/SKILL_BOOTSTRAP.md") {
    next = tailorBootstrapSkillContent(next, governance);
  }
  if (relativePath === "developers/SKILLS/README.md") {
    next = tailorSkillsReadmeContent(next, governance);
  }
  if (relativePath === "developers/SKILLS/SKILL_CODE_GOVERNANCE.md") {
    next = tailorCodeGovernanceSkillContent(next, governance);
  }
  if (relativePath === "developers/SKILLS/SKILL_CODE_INDEX.md") {
    next = tailorCodeIndexSkillContent(next, governance);
  }
  if (relativePath === "developers/SKILLS/SKILL_CODE_QUALITY_CHECK.md") {
    next = tailorCodeQualityCheckSkillContent(next, governance);
  }
  if (relativePath === "developers/SKILLS/SKILL_DOC_GOVERNANCE.md") {
    next = tailorDocGovernanceSkillContent(next, governance);
  }
  if (relativePath === "developers/SKILLS/SKILL_PLAN_INDEX.md") {
    next = tailorPlanIndexSkillContent(next, governance);
  }
  if (relativePath === "developers/SKILLS/SKILL_ACCEPTANCE.md") {
    next = tailorAcceptanceSkillContent(next, governance);
  }

  return cleanupMarkdown(next);
}

function tailorIndexContent(content, governance) {
  const governanceOff = isGovernanceProfileOff(governance);
  const aiQuickRows = [];
  if (governance.skillRouter !== "off") {
    aiQuickRows.push("| **所有任务（统一入口）** | [SKILLS/SKILL_ROUTER.md](./SKILLS/SKILL_ROUTER.md) |");
  }
  if (!governanceOff) {
    aiQuickRows.push("| 新项目初始化 | [SKILLS/SKILL_BOOTSTRAP.md](./SKILLS/SKILL_BOOTSTRAP.md) |");
  }
  aiQuickRows.push("| 代码编辑任务（强制遵守语言/场景规范） | [CODE-STYLE.md](./CODE-STYLE.md) + [CODE-STYLES/](./CODE-STYLES/) 对应语言/场景规范 |");
  aiQuickRows.push("| 文档维护 | [DOC-RULES.md](./DOC-RULES.md) |");
  if (governance.qualityChecks !== "off") {
    aiQuickRows.push("| 质量验收 | [SKILLS/SKILL_CODE_QUALITY_CHECK.md](./SKILLS/SKILL_CODE_QUALITY_CHECK.md) |");
  }
  if (!governanceOff) {
    aiQuickRows.push("| 快照管理 | [SKILLS/SKILL_SNAPSHOT.md](./SKILLS/SKILL_SNAPSHOT.md) |");
  }
  aiQuickRows.push("| token 节省策略 | [AI-CONTEXT-LOADING.md](./AI-CONTEXT-LOADING.md) |");

  const aiQuickIntro = governanceOff
    ? "> 当前项目未启用治理配套，按任务直接查阅 developers 根层规范。"
    : governance.skillRouter !== "off"
      ? "> **任何任务开始前，首先读 [SKILLS/SKILL_ROUTER.md](./SKILLS/SKILL_ROUTER.md)**，确认读取集与完成后必做事项。"
      : "> 当前项目未启用统一路由器，按任务直接查阅对应规范或技能文档。";

  const skillRows = [];
  if (!governanceOff) {
    if (governance.skillRouter !== "off") {
      skillRows.push("| [SKILLS/SKILL_ROUTER.md](./SKILLS/SKILL_ROUTER.md) | **任务路由器（统一入口）** | 所有任务开始前 |");
    }
    skillRows.push("| [SKILLS/SKILL_BOOTSTRAP.md](./SKILLS/SKILL_BOOTSTRAP.md) | 新项目初始化与最低可用检查 | init 后、迁移后、首次接入 |");
    skillRows.push("| [SKILLS/SKILL_DOC_GOVERNANCE.md](./SKILLS/SKILL_DOC_GOVERNANCE.md) | 文档治理（新建/修改/归档流程） | 任何文档变更时 |");
    skillRows.push("| [SKILLS/SKILL_CODE_GOVERNANCE.md](./SKILLS/SKILL_CODE_GOVERNANCE.md) | 代码治理（改动流程 + 语言/场景规范路由） | 功能实现、修复、重构时 |");
    if (governance.planIndex !== "off") {
      skillRows.push("| [SKILLS/SKILL_PLAN_INDEX.md](./SKILLS/SKILL_PLAN_INDEX.md) | 计划索引管理（生命周期操作） | 计划创建/更新/完成/撤销时 |");
    }
    skillRows.push("| [SKILLS/SKILL_SNAPSHOT.md](./SKILLS/SKILL_SNAPSHOT.md) | 代码快照管理（Repomix） | 无上下文、快照失效、新建分析前 |");
    skillRows.push("| [SKILLS/SKILL_CODE_INDEX.md](./SKILLS/SKILL_CODE_INDEX.md) | 代码索引建立与维护 | 项目初始化后、结构变更后、索引过期时 |");
    if (governance.qualityChecks !== "off") {
      skillRows.push("| [SKILLS/SKILL_CODE_QUALITY_CHECK.md](./SKILLS/SKILL_CODE_QUALITY_CHECK.md) | 通用代码质量检查 | 功能完成验收、提交前自检、阶段巡检 |");
    }
    if (governance.planIndex !== "off") {
      skillRows.push("| [SKILLS/SKILL_ACCEPTANCE.md](./SKILLS/SKILL_ACCEPTANCE.md) | 计划目标验收（入口） | 计划里程碑/全量完成时判定目标是否兑现 |");
    }
    skillRows.push("| [SKILLS/SKILL_ACCEPTANCE_NODE_BACKEND.md](./SKILLS/SKILL_ACCEPTANCE_NODE_BACKEND.md) | Node.js 后端验收 | Express / Koa / NestJS 等 |");
    skillRows.push("| [SKILLS/SKILL_ACCEPTANCE_FRONTEND.md](./SKILLS/SKILL_ACCEPTANCE_FRONTEND.md) | 前端验收 | React / Vue / 原生 Web 等 |");
    skillRows.push("| [SKILLS/SKILL_ACCEPTANCE_TYPESCRIPT.md](./SKILLS/SKILL_ACCEPTANCE_TYPESCRIPT.md) | TypeScript 通用项目验收 | CLI / SDK / 工具 / 共享库等 |");
    skillRows.push("| [SKILLS/SKILL_ACCEPTANCE_JAVASCRIPT.md](./SKILLS/SKILL_ACCEPTANCE_JAVASCRIPT.md) | JavaScript 通用项目验收 | CLI / SDK / 工具 / 脚本 / 模块库等 |");
    skillRows.push("| [SKILLS/SKILL_ACCEPTANCE_JAVA_BACKEND.md](./SKILLS/SKILL_ACCEPTANCE_JAVA_BACKEND.md) | Java 后端验收 | Spring Boot / Spring MVC 等 |");
    skillRows.push("| [SKILLS/SKILL_ACCEPTANCE_PYTHON.md](./SKILLS/SKILL_ACCEPTANCE_PYTHON.md) | Python 验收 | FastAPI / Django / Flask / 脚本 / 数据处理等 |");
  }

  const historyRows = [
    "| [ANALYSIS/](./ANALYSIS/) | 代码与需求分析目录（按主题命名：`ANALYSIS_[主题].md`） |",
    "| [REPORTS/](./REPORTS/) | 代码质量检查报告目录（按时间生成 `CODE_QUALITY_REPORT_*.md`） |"
  ];
  if (governance.sessionNotes !== "off") {
    historyRows.push("| [SESSIONS/](./SESSIONS/) | 变更留痕目录（按日期命名：`NOTE_YY_MM_DD.md`） |");
    historyRows.push("| [SESSIONS/TEMPLATE.md](./SESSIONS/TEMPLATE.md) | NOTE 文件模板 |");
  }

  let next = content;
  next = next.replace(
    /## 计划索引[\s\S]*?---(\r?\n){2}## AI 快速入口/u,
    governance.planIndex !== "off"
      ? "## 计划索引\n\n> 计划索引统一维护于根目录 [`AGENTS.md`](../AGENTS.md)（所有 AI 工具均可读取），此处不重复。\n" +
        (governance.sessionNotes !== "off" ? "> 关联会话记录见 [SESSIONS/](./SESSIONS/)。\n" : "") +
        "\n---\n\n## AI 快速入口"
      : "## AI 快速入口"
  );
  next = next.replace(
    /## AI 快速入口[\s\S]*?---(\r?\n){2}## 模块定位/u,
    [
      "## AI 快速入口",
      "",
      aiQuickIntro,
      "",
      "| 任务 | 优先阅读 |",
      "|---|---|",
      ...aiQuickRows,
      "",
      "---",
      "",
      "## 模块定位"
    ].join("\n")
  );
  if (governanceOff) {
    next = next.replace(
      /## 模块定位[\s\S]*?---(\r?\n){2}## 技能（Agent 操作手册）/u,
      [
        "## 模块定位",
        "",
        "> 当前项目未启用模块业务文件映射表；需要定位代码时，优先使用代码检索工具和项目自身文档。",
        "",
        "---",
        "",
        "## 技能（Agent 操作手册）"
      ].join("\n")
    );
  }
  next = next.replace(
    /## 技能（Agent 操作手册）[\s\S]*?---(\r?\n){2}## 规范与治理/u,
    governanceOff
      ? [
          "## 技能（Agent 操作手册）",
          "",
          "> 当前项目未启用治理 Skill 目录；按上方快速入口直接查阅规范文档。",
          "",
          "---",
          "",
          "## 规范与治理"
        ].join("\n")
      : [
          "## 技能（Agent 操作手册）",
          "",
          "| 技能文档 | 用途 | 适用场景 |",
          "|---|---|---|",
          ...skillRows,
          "",
          "完整技能列表见 [SKILLS/README.md](./SKILLS/README.md)。",
          "",
          "---",
          "",
          "## 规范与治理"
        ].join("\n")
  );
  next = next.replace(
    /## 历史记录（按需查阅）[\s\S]*$/u,
    [
      "## 历史记录（按需查阅）",
      "",
      "| 文档 | 说明 |",
      "|---|---|",
      ...historyRows
    ].join("\n")
  );
  return next;
}

function tailorAgentsContent(content, governance) {
  let next = content;
  next = next.replace(
    /## 任务入口[\s\S]*?---(\r?\n){2}## 文档读取策略/u,
    `${buildAgentsTaskEntry(governance)}\n\n---\n\n## 文档读取策略`
  );
  next = next.replace(
    /## 文档读取策略[\s\S]*?---(\r?\n){2}## 通用原则/u,
    `${buildAgentsReadingStrategy(governance)}\n\n---\n\n## 通用原则`
  );
  if (governance.planIndex === "off") {
    next = next.replace(/## 通用原则[\s\S]*$/u, buildAgentsPrinciples(governance));
  } else {
    next = next.replace(
      /## 通用原则[\s\S]*?---(\r?\n){2}## 计划索引/u,
      `${buildAgentsPrinciples(governance)}\n\n---\n\n## 计划索引`
    );
  }
  return next;
}

function tailorClaudeContent(content, governance) {
  const taskEntries = [
    "- 开发索引：`developers/INDEX.md`",
    "- 文档规则：`developers/DOC-RULES.md`",
    "- 代码规范：`developers/CODE-STYLE.md` + `developers/CODE-STYLES/*_CODE-STYLE.md`（语言/场景）",
    "- 按需加载：`developers/AI-CONTEXT-LOADING.md`"
  ];
  if (governance.sessionNotes !== "off") {
    taskEntries.push("- 会话留痕：`developers/SESSIONS/`");
  }

  const requirements = [
    "- 优先按\"最小读取集\"完成任务，避免全量扫描。"
  ];
  if (governance.sessionNotes !== "off") {
    requirements.push("- 改动后必须补充当日会话记录。");
  }
  if (governance.planIndex !== "off") {
    requirements.push("- 涉及计划状态变化时，同步维护计划索引（见 `AGENTS.md`）。");
  }

  let next = content.replace(
    /## 任务入口[\s\S]*?## 执行要求/u,
    ["## 任务入口", "", ...taskEntries, "", "## 执行要求"].join("\n")
  );
  next = next.replace(
    /## 执行要求[\s\S]*?(?=## 计划索引|$)/u,
    ["## 执行要求", "", ...requirements, ""].join("\n")
  );

  if (governance.planIndex === "off") {
    next = next.replace(/## 计划索引[\s\S]*$/u, "");
  } else {
    next = next.replace(
      /## 计划索引[\s\S]*$/u,
      [
        "## 计划索引",
        "",
        "> 计划索引统一维护于 `AGENTS.md`，此处不重复。"
      ].join("\n")
    );
  }

  return next;
}

function tailorSkillsReadmeContent(content, governance) {
  const diffRows = [
    "| 技能文档 | `developers/SKILLS/` | 怎么做：可执行步骤 |",
    "| 分析文档 | `developers/ANALYSIS/` | 为什么：方案与结论 |"
  ];
  if (governance.sessionNotes !== "off") {
    diffRows.push("| 会话文档 | `developers/SESSIONS/` | 做了什么：变更留痕 |");
  }

  const skillRows = [];
  if (governance.skillRouter !== "off") {
    skillRows.push("| [SKILL_ROUTER.md](./SKILL_ROUTER.md) | **任务路由器（统一入口）** | 所有任务开始前 |");
  }
  skillRows.push("| [SKILL_BOOTSTRAP.md](./SKILL_BOOTSTRAP.md) | 新项目初始化与最低可用检查 | init 后、迁移后、首次接入 |");
  skillRows.push("| [SKILL_DOC_GOVERNANCE.md](./SKILL_DOC_GOVERNANCE.md) | 文档治理（新建/修改/归档流程） | 任何文档变更时 |");
  skillRows.push("| [SKILL_CODE_GOVERNANCE.md](./SKILL_CODE_GOVERNANCE.md) | 代码治理（改动流程 + 语言/场景规范路由） | 功能实现、修复、重构时 |");
  if (governance.planIndex !== "off") {
    skillRows.push("| [SKILL_PLAN_INDEX.md](./SKILL_PLAN_INDEX.md) | 计划索引管理（生命周期操作） | 计划创建/更新/完成/撤销时 |");
  }
  skillRows.push("| [SKILL_SNAPSHOT.md](./SKILL_SNAPSHOT.md) | 代码快照管理（Repomix） | 无上下文、快照失效、新建分析前 |");
  skillRows.push("| [SKILL_CODE_INDEX.md](./SKILL_CODE_INDEX.md) | 代码索引建立与维护 | 项目初始化后、结构变更后、索引过期时 |");
  if (governance.qualityChecks !== "off") {
    skillRows.push("| [SKILL_CODE_QUALITY_CHECK.md](./SKILL_CODE_QUALITY_CHECK.md) | 通用代码质量检查 | 功能完成验收、提交前自检、阶段巡检 |");
  }
  if (governance.planIndex !== "off") {
    skillRows.push("| [SKILL_ACCEPTANCE.md](./SKILL_ACCEPTANCE.md) | 计划目标验收（总则与路由） | 计划里程碑/全量完成时，判定目标是否兑现 |");
  }
  skillRows.push("| [SKILL_ACCEPTANCE_NODE_BACKEND.md](./SKILL_ACCEPTANCE_NODE_BACKEND.md) | Node.js 后端验收 | Express / Koa / Fastify / NestJS 等项目 |");
  skillRows.push("| [SKILL_ACCEPTANCE_FRONTEND.md](./SKILL_ACCEPTANCE_FRONTEND.md) | 前端验收 | React / Vue / 原生 Web / 小程序等项目 |");
  skillRows.push("| [SKILL_ACCEPTANCE_TYPESCRIPT.md](./SKILL_ACCEPTANCE_TYPESCRIPT.md) | TypeScript 通用项目验收 | CLI / SDK / 工具 / 共享库等项目 |");
  skillRows.push("| [SKILL_ACCEPTANCE_JAVASCRIPT.md](./SKILL_ACCEPTANCE_JAVASCRIPT.md) | JavaScript 通用项目验收 | CLI / SDK / 工具 / 脚本 / 模块库等项目 |");
  skillRows.push("| [SKILL_ACCEPTANCE_JAVA_BACKEND.md](./SKILL_ACCEPTANCE_JAVA_BACKEND.md) | Java 后端验收 | Spring Boot / Spring MVC / Spring Cloud 等项目 |");
  skillRows.push("| [SKILL_ACCEPTANCE_PYTHON.md](./SKILL_ACCEPTANCE_PYTHON.md) | Python 验收 | FastAPI / Django / Flask / 脚本 / 数据处理等项目 |");

  let next = content.replace(
    /## 与其他文档的区别[\s\S]*?## 当前技能列表/u,
    [
      "## 与其他文档的区别",
      "",
      "| 类型 | 目录 | 定位 |",
      "|---|---|---|",
      ...diffRows,
      "",
      "## 当前技能列表"
    ].join("\n")
  );
  next = next.replace(
    /## 当前技能列表[\s\S]*$/u,
    [
      "## 当前技能列表",
      "",
      "| 技能文档 | 用途 | 适用场景 |",
      "|---|---|---|",
      ...skillRows
    ].join("\n")
  );
  return next;
}

function buildAgentsTaskEntry(governance) {
  const governanceOff = isGovernanceProfileOff(governance);
  const intro = governanceOff
    ? "> 当前项目未启用治理配套，按任务直接查阅 developers 根层规范。"
    : governance.skillRouter !== "off"
      ? "> **任何任务开始前，首先读 [`developers/SKILLS/SKILL_ROUTER.md`](developers/SKILLS/SKILL_ROUTER.md)**，确认读取集与收尾要求。"
      : "> 当前项目未启用统一路由器，按任务直接查阅对应规范或技能文档。";

  const rows = [];
  if (governance.skillRouter !== "off") {
    rows.push("| **所有任务（统一入口）** | `developers/SKILLS/SKILL_ROUTER.md` |");
  }
  rows.push("| 浏览开发文档目录 | `developers/INDEX.md` |");
  rows.push("| 控制上下文读取与 token 成本 | `developers/AI-CONTEXT-LOADING.md` |");
  rows.push("| 代码编辑任务（强制遵守语言/场景规范） | `developers/CODE-STYLE.md` + `developers/CODE-STYLES/` 对应语言/场景规范 |");
  rows.push("| 新建或修改文档 | `developers/DOC-RULES.md` |");
  if (!governanceOff) {
    rows.splice(1, 0, "| 新项目初始化 | `developers/SKILLS/SKILL_BOOTSTRAP.md` |");
  }
  if (governance.qualityChecks !== "off") {
    rows.push("| 功能修改后做质量验收 | `developers/SKILLS/SKILL_CODE_QUALITY_CHECK.md` |");
  }
  if (governance.planIndex !== "off") {
    rows.push("| 判定计划目标是否完成（收束验收） | `developers/SKILLS/SKILL_ACCEPTANCE.md` → 按技术栈路由到对应专项文档 |");
  }
  if (!governanceOff) {
    rows.push("| 代码快照不存在或引用失效 | `developers/SKILLS/SKILL_SNAPSHOT.md` |");
  }

  return [
    "## 任务入口",
    "",
    intro,
    "",
    "### 快速路由",
    "",
    "| 当前情形 | 立即查阅 |",
    "|---|---|",
    ...rows
  ].join("\n");
}

function buildAgentsReadingStrategy(governance) {
  const history = ["- `developers/ANALYSIS/`", "- `developers/REPORTS/`"];
  if (governance.sessionNotes !== "off") {
    history.unshift("- `developers/SESSIONS/`");
  }

  const taskDocs = [
    "- `developers/INDEX.md`",
    "- `developers/DOC-RULES.md`",
    "- `developers/CODE-STYLE.md`",
    "- 对应语言/场景规范：`developers/CODE-STYLES/*_CODE-STYLE.md`",
    "- `developers/AI-CONTEXT-LOADING.md`"
  ];
  if (!isGovernanceProfileOff(governance)) {
    taskDocs.push("- `developers/SKILLS/*.md`");
  }

  return [
    "## 文档读取策略",
    "",
    "启动时必读：",
    "- `AGENTS.md`（本文件）",
    "",
    "按任务按需读取：",
    ...taskDocs,
    "",
    "历史按需读取：",
    ...history
  ].join("\n");
}

function buildAgentsPrinciples(governance) {
  const items = [];
  if (governance.skillRouter !== "off") {
    items.push("- **规范先行**：改动前先读 `SKILL_ROUTER.md` 确认读取集，再执行修改。");
    items.push("- **完成即收尾**：任务完成后按 `SKILL_ROUTER.md` 中对应行的\"完成后必做\"逐项执行，不可跳过。");
  }
  if (governance.sessionNotes !== "off") {
    items.push("- **留痕必做**：每次任务结束后追加 `developers/SESSIONS/NOTE_YY_MM_DD.md`（文件不存在时从 TEMPLATE.md 复制）。");
  }
  if (governance.planIndex !== "off") {
    items.push("- **计划单源**：计划索引仅在本文件（`AGENTS.md`）维护，创建/更新/完成/撤销时同步更新此处。");
  }
  items.push("- **兼容优先**：对外接口变更必须版本化或提供兼容迁移路径。");
  items.push("- **注释有约束**：修改代码时同步检查 `developers/CODE-STYLE.md` 与对应语言/场景细则中的注释/JSDoc 要求；导出函数、共享常量、配置映射、关键数据结构如存在边界或隐含约束，不得省略必要文档注释。");

  return ["## 通用原则", "", ...items].join("\n");
}

function tailorAiContextLoadingContent(content, governance) {
  const governanceOff = isGovernanceProfileOff(governance);
  const taskRows = [
    buildAiContextTaskRow(
      "代码修改",
      "`AGENTS.md` + `developers/CODE-STYLE.md` + `developers/CODE-STYLES/` 对应语言/场景规范",
      governance.qualityChecks !== "off"
        ? "`developers/SKILLS/SKILL_CODE_QUALITY_CHECK.md`"
        : "—"
    ),
    buildAiContextTaskRow(
      "文档修改",
      "`AGENTS.md` + `developers/DOC-RULES.md`",
      "`developers/INDEX.md`"
    )
  ];

  if (governance.planIndex !== "off") {
    taskRows.push(
      buildAiContextTaskRow(
        "计划状态更新",
        "`AGENTS.md` + `developers/INDEX.md` + `developers/DOC-RULES.md`",
        "`developers/ANALYSIS/ANALYSIS_*.md`"
      )
    );
  }

  if (governance.sessionNotes !== "off") {
    taskRows.push(
      buildAiContextTaskRow(
        "历史追溯",
        "`AGENTS.md` + `developers/SESSIONS/NOTE_YY_MM_DD.md`",
        "`developers/REPORTS/` 文件"
      )
    );
  } else {
    taskRows.push(
      buildAiContextTaskRow(
        "历史追溯",
        "`AGENTS.md` + `developers/ANALYSIS/README.md`",
        "`developers/REPORTS/` 文件"
      )
    );
  }

  taskRows.push(
    buildAiContextTaskRow(
      "快照/无上下文接入",
      governanceOff
        ? "`AGENTS.md` + `developers/INDEX.md`"
        : "`AGENTS.md` + `developers/SKILLS/SKILL_SNAPSHOT.md`",
      "`snapshots/` 快照"
    ),
    buildAiContextTaskRow(
      "查询代码完成情况 / 代码修改",
      "上述最小读取集 + 条件读取代码快照（见第 3 节）",
      "—"
    )
  );

  return content.replace(
    /## 2\. 任务到文档路由[\s\S]*?## 3\. 读取约束（强制）[\s\S]*?### 3\.1 代码快照条件读取规则/u,
    [
      "## 2. 任务到文档路由",
      "",
      "| 任务类型 | 最小读取集 | 可选补充 |",
      "|---|---|---|",
      ...taskRows,
      "",
      "## 3. 读取约束（强制）",
      "",
      "- 禁止”先全量读所有文档再行动”。",
      "- 对单次任务，优先在最小读取集内完成。",
      "",
      "### 3.1 代码快照条件读取规则"
    ].join("\n")
  );
}

function buildAiContextTaskRow(task, minimum, optional) {
  return `| ${task} | ${minimum} | ${optional} |`;
}

function tailorDocRulesContent(content, governance) {
  const governanceOff = isGovernanceProfileOff(governance);
  const directoryRows = [
    "| `developers/` | 面向 AI 与人类开发者的协作规范与过程文档 | `INDEX.md`、`DOC-RULES.md`、`CODE-STYLE.md` |"
  ];
  if (governance.sessionNotes !== "off") {
    directoryRows.push("| `developers/SESSIONS/` | 每次改动后的留痕记录 | `NOTE_YY_MM_DD.md`、`TEMPLATE.md` |");
  }
  directoryRows.push(
    "| `developers/ANALYSIS/` | 需求、方案、代码分析文档 | `ANALYSIS_*.md` |",
    "| `developers/REPORTS/` | 质量检查报告 | `CODE_QUALITY_REPORT_*.md` |",
    "| `developers/PLANS/` | 计划文档与计划模板 | `PLAN_*.md`、`TEMPLATE.md` |"
  );
  if (!governanceOff) {
    directoryRows.push("| `developers/SKILLS/` | Agent 可执行操作手册 | `SKILL_*.md` |");
  }
  directoryRows.push("| `docs/` | 面向软件使用者的文档 | `INDEX.md` 与产品使用文档 |");

  const sections = [];
  let sectionNumber = 1;
  const addSection = (title, lines) => {
    sections.push("", `### 3.${sectionNumber++} ${title}`, "", ...lines);
  };

  addSection(
    "规范文档（`developers/` 根层）",
    [
      "- 适用范围：长期稳定规则与目录索引。",
      "- 命名规则：全大写短横线风格（例如 `CODE-STYLE.md`）。"
    ]
  );

  if (governance.sessionNotes !== "off") {
    addSection(
      "会话记录（`developers/SESSIONS/`）",
      [
        "- 命名：`NOTE_YY_MM_DD.md`，同一天追加。",
        "- 每条记录必须包含：时间、改动目的、改动内容、改动文件、验证结果、后续事项。"
      ]
    );
  }

  addSection(
    "分析文档（`developers/ANALYSIS/`）",
    [
      "- 命名：`ANALYSIS_[主题].md`。",
      "- 必须包含：版本锚点、参考代码表、结论/建议。"
    ]
  );
  addSection(
    "质量报告（`developers/REPORTS/`）",
    [
      "- 命名：`CODE_QUALITY_REPORT_YYYY-MM-DD_HH-mm-ss.md`。",
      "- 必须包含：报告元信息、检查标准、自动化检查结果、结论与建议、关键命令输出摘录。"
    ]
  );
  if (!governanceOff) {
    addSection(
      "技能文档（`developers/SKILLS/`）",
      [
        "- 命名：`SKILL_[主题].md`。",
        "- 必须包含：适用场景、执行命令、预期结果、失败处理建议。"
      ]
    );
  }
  addSection(
    "计划文档（`developers/PLANS/`）",
    [
      "- 命名：`PLAN_[主题]_[序号].md`，或与 `AGENTS.md` 中计划 ID 一致的可识别文件名。",
      "- 推荐从 `developers/PLANS/TEMPLATE.md` 复制创建。",
      "- 必须包含：目标、分阶段任务、DoD、验收结论。"
    ]
  );

  if (governance.planIndex !== "off") {
    addSection(
      "计划索引维护规范（强制）",
      [
        "计划状态变化（创建、更新、完成、撤销）时，**仅**在 `AGENTS.md` 中维护计划索引。",
        "",
        "- 权威源：`AGENTS.md`（唯一）",
        "- `CLAUDE.md`、`developers/INDEX.md` 等文件不重复维护计划表格，只写“见 `AGENTS.md` 计划索引”。",
        "- 操作步骤见 [`developers/SKILLS/SKILL_PLAN_INDEX.md`](./SKILLS/SKILL_PLAN_INDEX.md)。"
      ]
    );
  }

  addSection(
    "多语言/场景规范维护（强制）",
    [
      "- 总则：`developers/CODE-STYLE.md`。",
      "- 语言/场景细则：`developers/CODE-STYLES/*_CODE-STYLE.md`。",
      "- 发生语言级或前后端场景级规则变更时，必须同步更新对应细则。"
    ]
  );
  addSection(
    "CHANGELOG 维护规范（强制）",
    [
      "项目发布版本时必须维护 `CHANGELOG.md`：",
      "- 格式规范见 `developers/CHANGELOG-RULES.md`。",
      "- 版本号遵循语义化版本（Semantic Versioning）。",
      "- 每个版本需包含版本锚点元信息（创建时间、更新时间、代码快照日期、Git 分支/Commit）。",
      "- 变更记录需关联 Git Commit Hash（7 位）、Issue 编号或 PR 编号。",
      "- 发布前必须将 `[Unreleased]` 更新为实际版本号与日期。"
    ]
  );
  addSection(
    "AI 按需加载与 token 控制（强制）",
    [
      "- 执行任务时遵循 `developers/AI-CONTEXT-LOADING.md`。",
      "- 禁止预先全量读取全部文档。"
    ]
  );

  const forbid = [
    "- 禁止无任务需求时主动改动 `docs/` 软件使用文档。",
    "- 禁止文档索引出现不存在链接。"
  ];
  if (governance.sessionNotes !== "off") {
    forbid.unshift("- 禁止只改代码不补 `developers/SESSIONS/` 留痕。");
  }
  if (governance.planIndex !== "off") {
    forbid.splice(forbid.length - 1, 0, "- 禁止更新计划状态但不同步 `AGENTS.md` 计划索引（唯一权威源）。");
  }

  let next = content.replace(
    /## 1\. 目录分类与归档规则[\s\S]*?---(\r?\n){2}## 2\. 文档版本锚点规范/u,
    [
      "## 1. 目录分类与归档规则",
      "",
      "| 子目录 | 存放内容 | 典型文件 |",
      "|---|---|---|",
      ...directoryRows,
      "",
      "---",
      "",
      "## 2. 文档版本锚点规范"
    ].join("\n")
  );

  next = next.replace(
    /## 3\. 各类文档规范[\s\S]*?---(\r?\n){2}## 4\. 通用禁止事项/u,
    [
      "## 3. 各类文档规范",
      ...sections,
      "",
      "---",
      "",
      "## 4. 通用禁止事项"
    ].join("\n")
  );

  next = next.replace(
    /## 4\. 通用禁止事项[\s\S]*$/u,
    ["## 4. 通用禁止事项", "", ...forbid].join("\n")
  );

  return next;
}

function tailorCodeStyleContent(content, governance) {
  const sections = [
    "## 4. 文档同步（强制）",
    "",
    "- 涉及跨语言接口变更时，必须同步更新：",
    "  - `README.md`",
    "  - 相关示例",
    "  - 对应语言/场景规范或分析文档"
  ];

  if (governance.sessionNotes !== "off") {
    sections.splice(
      2,
      0,
      "- 每次改动后在 `developers/SESSIONS/NOTE_YY_MM_DD.md` 追加记录。"
    );
  }

  let replacement = sections.join("\n");
  if (governance.qualityChecks !== "off") {
    replacement +=
      "\n\n## 5. 质量门禁（建议基线）\n\n" +
      "- 每种语言至少执行：格式化、静态检查、单测（如适用）。\n" +
      "- 对高风险变更（接口、并发、序列化协议）补充回归验证。\n" +
      "- 具体命令以各语言/场景规范文档为准。";
  }

  return content.replace(/## 4\. 文档与留痕（强制）[\s\S]*$/u, replacement);
}

function tailorBootstrapSkillContent(content, governance) {
  const required = [
    "- [ ] `AGENTS.md` 存在"
  ];
  if (governance.planIndex !== "off") {
    required[0] = "- [ ] `AGENTS.md` 存在，且包含计划索引表";
  }
  required.push("- [ ] `developers/INDEX.md` 存在");
  if (governance.skillRouter !== "off") {
    required[1] = "- [ ] `developers/INDEX.md` 存在，且包含 SKILL_ROUTER 入口";
    required.push("- [ ] `developers/SKILLS/SKILL_ROUTER.md` 存在");
  }
  if (governance.qualityChecks !== "off") {
    required.push("- [ ] `developers/SKILLS/SKILL_CODE_QUALITY_CHECK.md` 存在");
  }
  if (governance.sessionNotes !== "off") {
    required.push("- [ ] `developers/SESSIONS/TEMPLATE.md` 存在");
  }

  const optional = ["- [ ] `CLAUDE.md`（Claude Code 用户需要）"];
  if (governance.planIndex !== "off") {
    optional.push("- [ ] `developers/SKILLS/SKILL_ACCEPTANCE.md`（有计划验收需求时）");
    optional.push("- [ ] `developers/PLANS/TEMPLATE.md`（有计划管理需求时，建议保留）");
  }
  optional.push("- [ ] `developers/CODE-INDEX.md`（启用代码索引时；粒度见 `skills.lock.json` → `codeIndexGranularity`，建立方式见 [`SKILL_CODE_INDEX.md`](./SKILL_CODE_INDEX.md)）");

  const done = [];
  if (governance.sessionNotes !== "off") {
    done.push("1. 在 `developers/SESSIONS/NOTE_YY_MM_DD.md` 追加初始化记录（改动范围、验收结论）。");
  }
  if (governance.planIndex !== "off") {
    done.push(`${done.length + 1}. 若已创建项目计划，在 \`AGENTS.md\` 计划索引登记。`);
  }
  if (done.length === 0) {
    done.push("1. 根据项目当前治理配置，确认初始化结果与 `skills.lock.json.governance` 一致。");
  }

  let next = content.replace(
    /### 必需文件[\s\S]*?### 语言(?:\/场景)?规范/u,
    ["### 必需文件", "", ...required, "", "### 语言/场景规范"].join("\n")
  );
  next = next.replace(
    /### 可选文件[\s\S]*?---(\r?\n){2}## 验收判定/u,
    ["### 可选文件", "", ...optional, "", "---", "", "## 验收判定"].join("\n")
  );
  next = next.replace(
    /## 完成后必做[\s\S]*$/u,
    ["## 完成后必做", "", ...done].join("\n")
  );
  return next;
}

function tailorCodeIndexSkillContent(content, governance) {
  const step4Title = governance.sessionNotes !== "off" ? "### Step 4：会话留痕" : "### Step 4：结果记录";
  const step4Intro = governance.sessionNotes !== "off"
    ? "在 `developers/SESSIONS/NOTE_YY_MM_DD.md` 追加记录："
    : "在本次任务结果或质量报告中记录索引更新结论，至少包含：";

  let next = content.replace(
    /### Step 4：[^\n]*[\s\S]*?```[\s\S]*?```/u,
    [
      step4Title,
      "",
      step4Intro,
      "",
      "```",
      "### [代码索引] 建立 / 更新索引",
      "- 时间：YYYY-MM-DD HH:mm",
      "- 粒度：file / module / function",
      "- 覆盖范围：…",
      "- 结论：完成 / 部分完成（说明：…）",
      "```"
    ].join("\n")
  );

  if (governance.qualityChecks === "off") {
    next = next.replace(
      "- `SKILL_CODE_QUALITY_CHECK.md` 巡检发现索引与实际代码不一致时。",
      "- 发现索引与实际代码不一致时（如巡检或人工检查）。"
    );
  }

  const relatedRows = [
    "| [`SKILL_SNAPSHOT.md`](./SKILL_SNAPSHOT.md) | 无上下文时先生成快照，再建立索引 |"
  ];
  if (governance.qualityChecks !== "off") {
    relatedRows.push("| [`SKILL_CODE_QUALITY_CHECK.md`](./SKILL_CODE_QUALITY_CHECK.md) | 巡检时检查索引是否过期 |");
  }
  relatedRows.push("| [`AI-CONTEXT-LOADING.md`](../AI-CONTEXT-LOADING.md) | 利用代码索引控制 token 读取策略 |");

  next = next.replace(
    /## 相关文档[\s\S]*$/u,
    [
      "## 相关文档",
      "",
      "| 文档 | 用途 |",
      "|---|---|",
      ...relatedRows
    ].join("\n")
  );
  return next;
}

function tailorCodeQualityCheckSkillContent(content, governance) {
  const steps = [
    "1. 根据项目语言栈选择对应检查命令（格式化、静态检查、单测、构建）。",
    "2. 运行最小必需命令集并记录结果。",
    "3. 对失败项进行修复后完整复检。"
  ];
  if (governance.sessionNotes !== "off") {
    steps.push("4. 在 `developers/SESSIONS/NOTE_YY_MM_DD.md` 追加检查结论。");
  } else {
    steps.push("4. 在任务结果或质量报告中记录检查结论。");
  }

  const criteria = [
    "- 已执行当前项目所需的格式化/静态检查/测试/构建。",
    "- 关键改动路径至少覆盖 1 条成功路径与 1 条失败路径验证。",
    "- 已检查本次改动是否满足 `developers/CODE-STYLE.md` 与对应语言/场景细则中的注释/JSDoc 约束；新增或修改的导出函数、共享常量、配置映射、关键数据结构在必要时已补结构化文档注释。"
  ];
  if (governance.sessionNotes !== "off") {
    criteria.push("- 结果可复现，并完成会话留痕。");
  } else {
    criteria.push("- 结果可复现，并在任务结果或质量报告中完成记录。");
  }

  let next = content.replace(
    /## 执行步骤[\s\S]*?---(\r?\n){2}## 参考命令模板（按项目启用）/u,
    ["## 执行步骤", "", ...steps, "", "---", "", "## 参考命令模板（按项目启用）"].join("\n")
  );
  next = next.replace(
    /## 判定标准[\s\S]*?---(\r?\n){2}## 失败处理建议/u,
    ["## 判定标准", "", ...criteria, "", "---", "", "## 失败处理建议"].join("\n")
  );
  return next;
}

function tailorPlanIndexSkillContent(content, governance) {
  const createSteps = [
    "1. 新建计划文档（如 `FEATURE-PLAN.md`），写明目标、分阶段任务、DoD。",
    "   - 推荐直接复制 `developers/PLANS/TEMPLATE.md` 作为起始模板，并补齐计划 ID、状态与验收结论占位。",
    "2. 在 `AGENTS.md` 计划索引表中新增一行：",
    "   - 计划ID：`PLAN-[主题]-[下一个序号]`",
    "   - 完成情况：`规划中`",
    "   - 验收状态：`未验收`"
  ];
  if (governance.sessionNotes !== "off") {
    createSteps.push("3. 追加会话留痕。");
  }

  const updateSteps = [
    "1. 在 `AGENTS.md` 计划索引找到对应行。",
    "2. 更新\"完成情况\"和\"最后更新时间\"。"
  ];
  if (governance.sessionNotes !== "off") {
    updateSteps.push("3. 追加会话留痕，注明当次变更内容。");
  }

  const finishSteps = [
    "1. 执行 [`SKILL_ACCEPTANCE.md`](./SKILL_ACCEPTANCE.md) 收束验收。",
    "2. 将验收结论写入对应计划文档的“验收结论”区块。",
    "3. 验收通过后，在 `AGENTS.md` 计划索引更新：",
    "   - 完成情况：`全部完成`",
    "   - 验收状态：`已验收`"
  ];
  if (governance.sessionNotes !== "off") {
    finishSteps.push("4. 追加会话留痕，包含验收动作与结论摘要。");
  }

  const cancelSteps = [
    "1. 在 `AGENTS.md` 计划索引更新：",
    "   - 完成情况：`已撤销（原因：…）`",
    "   - 验收状态：`不适用`",
    "2. 计划文档**保留不删除**，顶部增加撤销说明。"
  ];
  if (governance.sessionNotes !== "off") {
    cancelSteps.push("3. 追加会话留痕。");
  }

  const doneSteps = [
    "1. **更新 `AGENTS.md` 计划索引**（以上操作步骤即为此项）。"
  ];
  if (governance.sessionNotes !== "off") {
    doneSteps.push(
      "2. **会话留痕**：在 `developers/SESSIONS/NOTE_YY_MM_DD.md` 追加：",
      "",
      "```",
      "### [计划管理] [操作类型：创建/更新/完成/撤销] [计划ID]",
      "- 时间：YYYY-MM-DD HH:mm",
      "- 操作详情：…",
      "- 当前状态：完成情况 / 验收状态",
      "- 遗留事项：…",
      "```"
    );
  } else {
    doneSteps.push("2. **结果记录**：在任务结果或质量报告中记录本次计划状态变更。");
  }

  const faqs = [
    "**Q：计划文档放在哪里？**  ",
    "A：无固定目录要求，推荐放在项目根目录或 `developers/PLANS/`。若项目已接入本模板，优先复制 `developers/PLANS/TEMPLATE.md` 创建新计划；重要的是 `AGENTS.md` 中的路径指向正确。",
    ""
  ];
  if (governance.sessionNotes !== "off") {
    faqs.push(
      "**Q：同一天有多个计划状态变更怎么记？**  ",
      "A：追加到同一天的 SESSIONS 文件，每个变更单独一个 `###` 条目。",
      ""
    );
  } else {
    faqs.push(
      "**Q：同一天有多个计划状态变更怎么记？**  ",
      "A：在同一次任务结果中按条目列出每次变更，并写明最终状态。",
      ""
    );
  }
  faqs.push(
    "**Q：已有项目计划索引分散在多处怎么迁移？**  ",
    "A：执行 `doctor` 识别冲突位置 → 将内容合并到 `AGENTS.md` → 删除其他文件中的计划表格 → 补充留痕。"
  );

  let next = content.replace(
    /### 创建计划[\s\S]*?### 更新计划进度/u,
    ["### 创建计划", "", ...createSteps, "", "### 更新计划进度"].join("\n")
  );
  next = next.replace(
    /### 更新计划进度[\s\S]*?### 完成计划（全部）/u,
    ["### 更新计划进度", "", ...updateSteps, "", "### 完成计划（全部）"].join("\n")
  );
  next = next.replace(
    /### 完成计划（全部）[\s\S]*?### 撤销计划/u,
    ["### 完成计划（全部）", "", ...finishSteps, "", "### 撤销计划"].join("\n")
  );
  next = next.replace(
    /### 撤销计划[\s\S]*?---(\r?\n){2}## 完成后必做/u,
    ["### 撤销计划", "", ...cancelSteps, "", "---", "", "## 完成后必做"].join("\n")
  );
  next = next.replace(
    /## 完成后必做[\s\S]*?---(\r?\n){2}## doctor 检测项/u,
    ["## 完成后必做", "", ...doneSteps, "", "---", "", "## doctor 检测项"].join("\n")
  );
  next = next.replace(/## 常见问题[\s\S]*$/u, ["## 常见问题", "", ...faqs].join("\n"));

  return next;
}

function tailorAcceptanceSkillContent(content, governance) {
  const step6 = governance.planIndex !== "off"
    ? "6. 如通过，仅更新 `AGENTS.md` 中对应计划索引的验收状态为\"已验收\""
    : "6. 如通过，在对应计划文档中标记验收状态为\"已验收\"（如项目仍维护计划索引则同步更新）";
  const step7 = governance.sessionNotes !== "off"
    ? "7. 在 `developers/SESSIONS/NOTE_YY_MM_DD.md` 追加会话留痕，记录本次验收动作与结果摘要"
    : "7. 在任务结果或质量报告中记录本次验收动作与结果摘要";

  return content.replace(
    /## 执行流程[\s\S]*?---(\r?\n){2}## 技术栈路由/u,
    [
      "## 执行流程",
      "",
      "```",
      "1. 读取当前计划文档，列出所有目标条目",
      "2. 按技术栈路由到对应专项验收文档（见下表）",
      "3. 逐条核对目标，填写验收结论",
      "4. 输出\"验收通过 / 部分通过 / 不通过\"判定",
      "5. 将验收结论写入对应计划文档的验收结论区块",
      step6,
      step7,
      "```",
      "",
      "---",
      "",
      "## 技术栈路由"
    ].join("\n")
  );
}

function tailorCodeGovernanceSkillContent(content, governance) {
  const steps = [
    "### Step 1：语言/场景规范路由",
    "",
    "根据改动涉及的文件类型，读取对应语言规范；若项目属于前端或后端应用，还必须追加读取对应场景规范：",
    "",
    "| 文件类型 | 读取规范 |",
    "|---|---|",
    "| `.ts` / `.tsx` | `developers/CODE-STYLES/TYPESCRIPT_CODE-STYLE.md` |",
    "| `.js` / `.mjs` / `.cjs` | `developers/CODE-STYLES/JAVASCRIPT_CODE-STYLE.md` |",
    "| `.java` | `developers/CODE-STYLES/JAVA_CODE-STYLE.md` |",
    "| `.py` | `developers/CODE-STYLES/PYTHON_CODE-STYLE.md` |",
    "| `.rs` | `developers/CODE-STYLES/RUST_CODE-STYLE.md` |",
    "| `.html` | `developers/CODE-STYLES/HTML_CODE-STYLE.md` |",
    "| `.css` / `.scss` | `developers/CODE-STYLES/CSS_CODE-STYLE.md` |",
    "| 多语言混合 | 按各文件类型分别路由 |",
    "",
    "| 应用场景 | 追加读取规范 |",
    "|---|---|",
    "| 前端应用 / 页面 / 组件 / Hook / Composable | `developers/CODE-STYLES/FRONTEND_CODE-STYLE.md` |",
    "| 后端服务 / API / 任务 / 消息消费 / 数据访问 | `developers/CODE-STYLES/BACKEND_CODE-STYLE.md` |",
    "",
    "通用约束始终适用：`developers/CODE-STYLE.md`（总则）。语言规范与场景规范冲突时，以更具体的场景规范为准。",
    "",
    "### Step 2：改动前核查",
    "",
    "- [ ] 改动范围是否最小化（不引入与任务无关的改动）？",
    "- [ ] 对外接口是否有变更？若有，是否版本化或提供兼容路径？",
    "- [ ] 是否有外部输入？若有，是否在进入核心逻辑前完成校验？",
    "",
    "### Step 3：改动中约束",
    "",
    "- 单一职责：每个函数/模块职责可用一句话说明。",
    "- 命名语义化：避免缩写堆叠，名称体现用途。",
    "- 错误可追踪：错误信息包含可定位字段（参数名、路径、模块、阶段）。",
    "- 不留临时代码：调试用 `console.log` / `print` / 注释块在提交前清除。"
  ];

  if (governance.qualityChecks !== "off") {
    steps.push(
      "",
      "### Step 4：质量门禁",
      "",
      "改动完成后执行 [`SKILL_CODE_QUALITY_CHECK.md`](./SKILL_CODE_QUALITY_CHECK.md) 对应命令：",
      "",
      "| 语言 | 最小必检项 |",
      "|---|---|",
      "| TypeScript / JavaScript | `npm run lint` → `npm run test` → `npm run build` |",
      "| Python | `ruff check .` → `pytest` |",
      "| Java | `mvn -q test` |",
      "| Rust | `cargo fmt -- --check` → `cargo clippy` → `cargo test` |",
      "",
      "**高风险变更**（接口、并发、序列化协议）额外要求：",
      "- 覆盖 1 条成功路径 + 1 条失败路径验证",
      "- 补充回归验证"
    );
  }

  steps.push(
    "",
    `### Step ${governance.qualityChecks !== "off" ? "5" : "4"}：接口变更同步`,
    "",
    "若改动涉及对外接口（API、协议、公共函数签名），必须同步更新：",
    "- `README.md`（如有接口说明）",
    "- 相关示例代码",
    "- 对应语言/场景规范或分析文档",
    "",
    `### Step ${governance.qualityChecks !== "off" ? "6" : "5"}：代码索引同步`,
    "",
    "**前置判断**：读取 `skills.lock.json` 中的 `codeIndexGranularity`。",
    "- 若为 `null` 或字段缺失 → 跳过本步骤。",
    "- 若有值 → 必须执行以下操作。",
    "",
    "**判断本次改动是否影响索引**：",
    "",
    "| 改动类型 | 是否需要更新索引 |",
    "|---|---|",
    "| 新增 / 删除 / 重命名文件或目录 | **必须更新** |",
    "| 新增 / 删除 / 重命名类、接口、枚举、公共函数 | **必须更新**（module / function 粒度） |",
    "| 修改函数签名（参数 / 返回类型） | **必须更新**（function 粒度） |",
    "| 仅修改函数内部实现，签名不变 | 无需更新 |",
    "| 仅修改注释、格式 | 无需更新 |",
    "",
    "**更新方式**：按 [`SKILL_CODE_INDEX.md`](./SKILL_CODE_INDEX.md) Step 2-3 仅更新受影响条目，**无需全量重建**。更新后同步文档头部\"最后更新\"日期。"
  );

  const done = [];
  let doneIndex = 1;
  if (governance.qualityChecks !== "off") {
    done.push(`${doneIndex++}. **质量检查**：执行 Step 4 质量门禁，记录结论。`);
  }
  done.push(`${doneIndex++}. **代码索引同步**：执行 Step ${governance.qualityChecks !== "off" ? "6" : "5"}，若有更新则在${governance.sessionNotes !== "off" ? "会话留痕" : "结果说明"}中注明。`);
  if (governance.sessionNotes !== "off") {
    done.push(`${doneIndex++}. **会话留痕**：在 \`developers/SESSIONS/NOTE_YY_MM_DD.md\` 追加记录。`);
  }
  if (governance.planIndex !== "off") {
    done.push(`${doneIndex++}. **计划进度更新**：在 \`AGENTS.md\` 计划索引更新当前任务对应的计划状态。`);
  }

  let next = content.replace(
    /## 执行流程[\s\S]*?---(\r?\n){2}## 完成后必做/u,
    ["## 执行流程", "", ...steps, "", "---", "", "## 完成后必做"].join("\n")
  );
  next = next.replace(
    /## 完成后必做[\s\S]*?---(\r?\n){2}## 常见问题/u,
    ["## 完成后必做", "", ...done, "", "---", "", "## 常见问题"].join("\n")
  );
  const faqs = [
    "**Q：改动很小（单行修复），是否需要全套流程？**  ",
    `A：Step 1-3 必须，Step 4${governance.qualityChecks !== "off" ? " 可简化（人工确认即可），Step 5 按实际情况判断。" : " 按实际情况判断。"}${governance.sessionNotes !== "off" ? "会话留痕不可省略。" : ""}`,
    "",
    "**Q：语言或场景规范文件不存在怎么办？**  ",
    "A：语言规范执行 `npx @skybluefeet/skills-kit add language <name>` 安装；场景规范从模板 `developers/CODE-STYLES/` 补齐，或使用总则 `CODE-STYLE.md` 作为基线。"
  ];
  if (governance.sessionNotes !== "off") {
    faqs.push(
      "",
      "**Q：多人协作，接口变更如何协调？**  ",
      "A：接口变更必须在 SESSIONS 留痕并注明影响范围，让团队成员可以通过 SESSIONS 感知。"
    );
  }
  next = next.replace(/## 常见问题[\s\S]*$/u, ["## 常见问题", "", ...faqs].join("\n"));
  return next;
}

function tailorDocGovernanceSkillContent(content, governance) {
  const step1Rows = [
    "| 规范文档 | `developers/` 根层 | 全大写短横线，如 `CODE-STYLE.md` |",
    "| 技能文档 | `developers/SKILLS/` | `SKILL_[主题].md` |",
    "| 分析文档 | `developers/ANALYSIS/` | `ANALYSIS_[主题].md` |",
    "| 质量报告 | `developers/REPORTS/` | `CODE_QUALITY_REPORT_YYYY-MM-DD_HH-mm-ss.md` |"
  ];
  if (governance.sessionNotes !== "off") {
    step1Rows.push("| 会话留痕 | `developers/SESSIONS/` | `NOTE_YY_MM_DD.md` |");
  }

  const done = ["1. **DOC-RULES 合规检查**：确认以上 Step 1-5 均通过。"];
  if (governance.sessionNotes !== "off") {
    done.push("2. **会话留痕**：在 `developers/SESSIONS/NOTE_YY_MM_DD.md` 追加记录。");
  }

  let next = content.replace(
    /### Step 1：确认文档类型与归档位置[\s\S]*?### Step 2：检查版本锚点要求/u,
    [
      "### Step 1：确认文档类型与归档位置",
      "",
      "| 文档类型 | 归档目录 | 命名规则 |",
      "|---|---|---|",
      ...step1Rows,
      "",
      "### Step 2：检查版本锚点要求"
    ].join("\n")
  );
  next = next.replace(
    /## 完成后必做[\s\S]*?---(\r?\n){2}## 常见问题/u,
    ["## 完成后必做", "", ...done, "", "---", "", "## 常见问题"].join("\n")
  );
  const faqs = [
    "**Q：修改规范文档后需要同步哪些地方？**  ",
    `A：视改动范围：若影响 Skill 文档中的引用，同步更新对应 Skill；若影响索引链接，更新 \`INDEX.md\`${governance.planIndex !== "off" ? "；计划索引变更只更新 `AGENTS.md`。" : "。"}`,
    "",
    "**Q：分析文档要不要更新 INDEX.md？**  ",
    "A：分析文档通常不在 INDEX.md 主表中列出，但如果是重要的长期参考文档，可在\"分析与报告\"区块补充。"
  ];
  if (governance.sessionNotes !== "off") {
    faqs.push(
      "",
      "**Q：SESSIONS 文件当天已存在怎么办？**  ",
      "A：同一天的记录追加到同一个文件末尾，不新建文件。"
    );
  }
  next = next.replace(/## 常见问题[\s\S]*$/u, ["## 常见问题", "", ...faqs].join("\n"));
  return next;
}

function tailorRouterContent(content, governance) {
  let next = content;
  next = next.replace(
    /## 任务路由表[\s\S]*?---(\r?\n){2}## 完成后必做——操作细则/u,
    `${buildRouterTable(governance)}\n\n---\n\n## 完成后必做——操作细则`
  );
  next = next.replace(
    /## 完成后必做——操作细则[\s\S]*?---(\r?\n){2}## 必做 vs 按需/u,
    `${buildRouterOperations(governance)}\n\n---\n\n## 必做 vs 按需`
  );
  next = next.replace(
    /## 相关文档[\s\S]*$/u,
    buildRouterRelatedDocs(governance)
  );
  return next;
}

function buildRouterTable(governance) {
  const codeActions = [];
  if (governance.qualityChecks !== "off") {
    codeActions.push("质量检查");
  }
  codeActions.push("代码索引同步");
  if (governance.sessionNotes !== "off") {
    codeActions.push("会话留痕");
  }
  if (governance.planIndex !== "off") {
    codeActions.push("计划进度更新");
  }

  const docActions = ["DOC-RULES 合规检查"];
  if (governance.sessionNotes !== "off") {
    docActions.push("会话留痕");
  }

  const rows = [
    `| **功能实现** | \`AGENTS.md\` → 对应语言/场景规范 | CODE-STYLE 强制遵守 | ${formatActionChain(codeActions)} |`,
    `| **问题修复 / Bug Fix** | \`AGENTS.md\` → 对应语言/场景规范 | 定位根因再改动，不引入新问题 | ${formatActionChain(codeActions)} |`,
    `| **方案设计 / 文档输出** | \`AGENTS.md\` → \`DOC-RULES.md\` | 遵守文档命名与版本锚点规则 | ${formatActionChain(docActions)} |`,
    `| **文档修改** | \`AGENTS.md\` → \`DOC-RULES.md\` | 不改动 \`docs/\` 除非明确授权 | ${formatActionChain(docActions)} |`
  ];

  if (governance.planIndex !== "off") {
    const planActions = governance.sessionNotes !== "off"
      ? ["在 `AGENTS.md` 计划索引登记", "会话留痕"]
      : ["在 `AGENTS.md` 计划索引登记"];
    const planUpdateActions = governance.sessionNotes !== "off"
      ? ["更新 `AGENTS.md` 计划索引", "会话留痕"]
      : ["更新 `AGENTS.md` 计划索引"];
    const acceptanceActions = ["验收结论写入计划文档", "更新 `AGENTS.md` 计划索引状态"];
    if (governance.sessionNotes !== "off") {
      acceptanceActions.push("会话留痕");
    }

    rows.push(
      `| **计划创建** | \`AGENTS.md\`（计划索引部分） | 计划 ID 唯一，格式符合索引规范 | ${formatActionChain(planActions)} |`,
      `| **计划进度更新** | \`AGENTS.md\`（计划索引部分） | 仅更新 \`AGENTS.md\` 计划索引，不在其他文件重复 | ${formatActionChain(planUpdateActions)} |`,
      `| **计划完成 / 验收** | \`AGENTS.md\` → \`SKILL_ACCEPTANCE.md\` | 按技术栈路由到对应专项验收文档 | ${formatActionChain(acceptanceActions)} |`
    );
  }

  if (governance.qualityChecks !== "off") {
    const inspectionActions = [governance.sessionNotes !== "off" ? "检查结论追加到 SESSIONS" : "检查结论写入任务结果"];
    if (governance.sessionNotes !== "off") {
      inspectionActions.push("会话留痕");
    }
    rows.push(
      `| **代码质量巡检** | \`SKILL_CODE_QUALITY_CHECK.md\` | 按项目语言栈执行对应命令 | ${formatActionChain(inspectionActions)} |`
    );
  }

  const bootstrapActions = ["Bootstrap 验收"];
  if (governance.sessionNotes !== "off") {
    bootstrapActions.push("会话留痕");
  }
  rows.push(
    `| **新项目初始化** | \`SKILL_BOOTSTRAP.md\` | 按 Bootstrap 检查清单逐项确认 | ${formatActionChain(bootstrapActions)} |`
  );

  if (governance.sessionNotes !== "off") {
    rows.push(
      "| **上下文重建 / 快照** | `SKILL_SNAPSHOT.md` | 快照生成后才开始其他任务 | ① 会话留痕（注明快照状态） |"
    );
  }

  const codeIndexActions = ["更新 `developers/CODE-INDEX.md`"];
  if (governance.sessionNotes !== "off") {
    codeIndexActions.push("会话留痕");
  }
  rows.push(
    `| **代码索引维护** | \`SKILL_CODE_INDEX.md\` | 粒度由 \`skills.lock.json\` 决定；无索引文档时先建立全量索引 | ${formatActionChain(codeIndexActions)} |`
  );

  return [
    "## 任务路由表",
    "",
    "| 任务类型 | 执行前最小读取集 | 执行约束 | 完成后必做 |",
    "|---|---|---|---|",
    ...rows
  ].join("\n");
}

function buildRouterOperations(governance) {
  const detailLinks = [
    "> 各\"完成后必做\"动作的详细操作步骤，见对应治理 Skill：",
    "> - 代码改动 → [`SKILL_CODE_GOVERNANCE.md`](./SKILL_CODE_GOVERNANCE.md)",
    "> - 文档变更 → [`SKILL_DOC_GOVERNANCE.md`](./SKILL_DOC_GOVERNANCE.md)"
  ];
  if (governance.planIndex !== "off") {
    detailLinks.push("> - 计划管理 → [`SKILL_PLAN_INDEX.md`](./SKILL_PLAN_INDEX.md)");
  }

  const sections = ["## 完成后必做——操作细则", "", ...detailLinks, ""];
  const stepLabels = ["①", "②", "③", "④"];
  let idx = 0;

  if (governance.qualityChecks !== "off") {
    const qualityResultDestination = governance.sessionNotes !== "off"
      ? "按 [`SKILL_CODE_QUALITY_CHECK.md`](./SKILL_CODE_QUALITY_CHECK.md) 执行，将结论追加到当日 SESSIONS 文件。"
      : "按 [`SKILL_CODE_QUALITY_CHECK.md`](./SKILL_CODE_QUALITY_CHECK.md) 执行，将结论写入任务结果或质量报告。";
    sections.push(
      `### ${stepLabels[idx++]} 质量检查`,
      "",
      qualityResultDestination,
      ""
    );
  }

  const codeGovernanceStep = governance.qualityChecks !== "off" ? "6" : "5";
  sections.push(
    `### ${stepLabels[idx++]} 代码索引同步`,
    "",
    "仅当 `skills.lock.json` 中 `codeIndexGranularity` 有值时执行。",
    `按 [\`SKILL_CODE_GOVERNANCE.md\`](./SKILL_CODE_GOVERNANCE.md) Step ${codeGovernanceStep} 判断本次改动是否影响索引，受影响时更新 \`developers/CODE-INDEX.md\`。`,
    ""
  );

  if (governance.sessionNotes !== "off") {
    sections.push(
      `### ${stepLabels[idx++]} 会话留痕`,
      "",
      "在 `developers/SESSIONS/NOTE_YY_MM_DD.md` 追加本次任务记录，包含：",
      "",
      "```",
      "### [任务类型] [简述]",
      "- 时间：YYYY-MM-DD HH:mm",
      "- 改动范围：…",
      "- 结论：完成 / 部分完成（说明：…）",
      "- 遗留事项：…",
      "```",
      "",
      "若当日文件不存在，从 `developers/SESSIONS/TEMPLATE.md` 复制后再追加。",
      ""
    );
  }

  if (governance.planIndex !== "off") {
    sections.push(
      `### ${stepLabels[idx++]} 计划进度更新`,
      "",
      "在 `AGENTS.md` 的计划索引表中更新对应行的\"完成情况\"与\"最后更新时间\"。  ",
      "计划索引是**唯一权威源**，不在其他文件重复维护。",
      ""
    );
  }

  return sections.join("\n").trimEnd();
}

function buildRouterRelatedDocs(governance) {
  const rows = [
    "| [`SKILL_BOOTSTRAP.md`](./SKILL_BOOTSTRAP.md) | 新项目初始化与最低可用检查 |"
  ];
  if (governance.qualityChecks !== "off") {
    rows.push("| [`SKILL_CODE_QUALITY_CHECK.md`](./SKILL_CODE_QUALITY_CHECK.md) | 质量检查执行步骤 |");
  }
  if (governance.planIndex !== "off") {
    rows.push("| [`SKILL_ACCEPTANCE.md`](./SKILL_ACCEPTANCE.md) | 计划目标验收（总则与路由） |");
  }
  rows.push(
    "| [`SKILL_SNAPSHOT.md`](./SKILL_SNAPSHOT.md) | 代码快照管理 |",
    "| [`SKILL_CODE_INDEX.md`](./SKILL_CODE_INDEX.md) | 代码索引建立与维护 |"
  );

  return [
    "## 相关文档",
    "",
    "| 文档 | 用途 |",
    "|---|---|",
    ...rows
  ].join("\n");
}

function formatActionChain(actions) {
  return actions.map((action, index) => `${index + 1 === 1 ? "①" : index + 1 === 2 ? "②" : index + 1 === 3 ? "③" : "④"} ${action}`).join(" → ");
}

function cleanupMarkdown(content) {
  return content
    .replace(/\r\n{3,}/g, "\r\n\r\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/---\r\n\r\n---/g, "---")
    .trimEnd()
    .concat("\n");
}
