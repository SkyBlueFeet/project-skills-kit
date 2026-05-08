import { cp, rm } from "node:fs/promises";
import path from "node:path";

import {
  PROJECT_TYPE_TO_ACCEPTANCE_SKILL,
  TEMPLATE_BASE,
  TEMPLATE_SKILLS_DIR,
  getPackageVersion
} from "../constants.js";
import {
  ensureAcceptanceSkillInstalled,
  governanceProfileDefaults,
  lockAddSkill,
  makeLock,
  normalizeGovernance,
  writeLock
} from "../lock.js";
import {
  isSkillEnabledByGovernance,
  tailorGovernanceDocs
} from "../governance-tailor.js";
import {
  applyLanguageSelection,
  inferProjectTypeFromPackageJson,
  readProjectPackageJson
} from "../project.js";
import { createSessionNote } from "../session.js";
import { listFilesRecursively, pathExists, removeIfExists } from "../utils/fs.js";

/** @typedef {import("../options.js").CliOptions} CliOptions */

const PROJECT_TYPE_CHOICES = [
  { name: "前端（React / Vue / 原生 Web 等）", value: "frontend" },
  { name: "Node.js 后端（Express / Koa / Fastify / NestJS 等）", value: "backend-node" },
  { name: "TypeScript 通用项目（CLI / SDK / 工具 / 共享库等）", value: "typescript-general" },
  { name: "JavaScript 通用项目（CLI / SDK / 工具 / 脚本 / 模块库等）", value: "javascript-general" },
  { name: "Java 后端（Spring Boot / Spring MVC 等）", value: "backend-java" },
  { name: "Python 项目（FastAPI / Django / 脚本等）", value: "python" },
  { name: "混合项目（多层分别验收）", value: "mixed" }
];

const GRANULARITY_CHOICES = [
  { name: "不启用", value: null },
  { name: "文件级（file）：文件路径 + 用途描述", value: "file" },
  { name: "模块级（module）：文件级 + 类/接口/导出符号", value: "module" },
  { name: "函数级（function）：模块级 + 函数/方法签名", value: "function" }
];

const GOVERNANCE_PROFILE_CHOICES = [
  { name: "推荐（recommended）：关闭会话留痕，保留质量检查，其他为建议", value: "recommended" },
  { name: "严格（strict）：保留当前全部强制收尾", value: "strict" },
  { name: "平衡（balanced）：保留主流程，部分收尾降级为建议", value: "balanced" },
  { name: "轻量（minimal）：只保留核心入口，默认不强制留痕/质检", value: "minimal" },
  { name: "关闭（off）：不启用治理配套", value: "off" }
];

const GOVERNANCE_MODE_CHOICES = [
  { name: "强制（required）", value: "required" },
  { name: "建议（optional）", value: "optional" },
  { name: "关闭（off）", value: "off" }
];

/**
 * 初始化一套新的 project-rules 文档模板。
 *
 * @param {CliOptions} options
 * @returns {Promise<void>}
 */
export async function runInit(options) {
  let prompts = null;
  if (!options.yes) {
    try {
      prompts = await import("@inquirer/prompts");
    } catch {
      throw new Error(
        "缺少依赖 @inquirer/prompts，请先执行 npm install 后再运行交互模式。"
      );
    }
  }

  const targetDir = options.yes
    ? path.resolve(options.target)
    : path.resolve(
        await prompts.input({
          message: "目标项目根目录",
          default: "."
        })
      );

  const selectedLanguages = options.yes
    ? (options.languages ?? ["typescript"])
    : await prompts.checkbox({
        message: "项目主要语言（多选）",
        choices: [
          { name: "TypeScript", value: "typescript", checked: true },
          { name: "JavaScript", value: "javascript" },
          { name: "Java", value: "java" },
          { name: "Python", value: "python" },
          { name: "Rust", value: "rust" },
          { name: "HTML/CSS", value: "web" }
        ],
        required: true
      });

  const inferredProjectType = inferProjectTypeFromPackageJson(
    await readProjectPackageJson(targetDir),
    selectedLanguages
  );
  const projectType = options.yes
    ? (options.projectType ?? null)
    : await prompts.select({
        message: inferredProjectType
          ? `项目类型（建议：基于 package.json 猜测为 ${inferredProjectType}，请人工确认）`
          : "项目类型（决定后续优先使用的收束验收文档）",
        choices: PROJECT_TYPE_CHOICES,
        default: options.projectType ?? inferredProjectType ?? undefined
      });

  const includeClaude = options.yes
    ? true
    : await prompts.confirm({
        message: "是否生成 CLAUDE.md？",
        default: true
      });

  let includeDocsGovernance = options.yes
    ? (options.governanceProfile === "off" ? false : true)
    : await prompts.confirm({
        message: "是否启用文档治理（SESSIONS、SKILLS、MODULE-BUSINESS-FILE-MAP）？",
        default: true
      });

  const governance = includeDocsGovernance
    ? await resolveGovernance(prompts, options)
    : governanceProfileDefaults("off");
  includeDocsGovernance = includeDocsGovernance && governance.profile !== "off";

  const codeIndexGranularity = options.yes
    ? (includeDocsGovernance ? (options.indexGranularity ?? null) : null)
    : includeDocsGovernance
      ? await prompts.select({
          message: "代码索引粒度（建立 developers/CODE-INDEX.md）",
          choices: GRANULARITY_CHOICES,
          default: null
        })
      : null;

  if (!(await pathExists(TEMPLATE_BASE))) {
    throw new Error(`模板目录不存在: ${TEMPLATE_BASE}`);
  }

  const templateRootReadme = path.join(TEMPLATE_BASE, "README.md");
  await cp(TEMPLATE_BASE, targetDir, {
    recursive: true,
    force: true,
    filter: (sourcePath) => path.resolve(sourcePath) !== path.resolve(templateRootReadme)
  });

  if (!includeClaude) {
    await removeIfExists(path.join(targetDir, "CLAUDE.md"));
  }

  if (!includeDocsGovernance) {
    await rm(path.join(targetDir, "developers", "SESSIONS"), {
      recursive: true,
      force: true
    });
    await rm(path.join(targetDir, "developers", "SKILLS"), {
      recursive: true,
      force: true
    });
    await removeIfExists(
      path.join(targetDir, "developers", "MODULE-BUSINESS-FILE-MAP.md")
    );
  }

  await applyLanguageSelection(targetDir, selectedLanguages, projectType);

  const lock = makeLock(
    getPackageVersion(),
    selectedLanguages,
    projectType,
    includeClaude,
    includeDocsGovernance,
    governance,
    codeIndexGranularity
  );

  if (includeDocsGovernance) {
    for (const file of await listFilesRecursively(TEMPLATE_SKILLS_DIR)) {
      if (!isSkillEnabledByGovernance(file, governance)) {
        continue;
      }
      lockAddSkill(lock, `developers/SKILLS/${file}`);
    }

    await ensureAcceptanceSkillInstalled(
      targetDir,
      lock,
      PROJECT_TYPE_TO_ACCEPTANCE_SKILL[projectType]
    );

  }
  await tailorGovernanceDocs(targetDir, governance, lock);
  await writeLock(targetDir, lock);

  const sessionPath = includeDocsGovernance && governance.sessionNotes !== "off"
    ? await createSessionNote(targetDir)
    : null;

  console.log("已完成 project-rules 初始化。");
  console.log(`目标目录: ${targetDir}`);
  console.log(`语言规范: ${selectedLanguages.join(", ")}`);
  console.log(`项目类型: ${projectType ?? "未指定"}`);
  console.log(`CLAUDE.md: ${includeClaude ? "已生成" : "未生成"}`);
  console.log(`文档治理: ${includeDocsGovernance ? "已启用" : "未启用"}`);
  console.log(`治理档位: ${includeDocsGovernance ? governance.profile : "off"}`);
  console.log(`代码索引粒度: ${codeIndexGranularity ?? "未启用"}`);
  console.log(`Lock 文件: ${path.join(targetDir, "skills.lock.json")}`);
  if (sessionPath) {
    console.log(`会话留痕文件: ${sessionPath}`);
  }
}

/**
 * 解析初始化时的治理配置，支持预设档位与细粒度覆盖。
 *
 * @param {typeof import("@inquirer/prompts") | null} prompts
 * @param {CliOptions} options
 * @returns {Promise<import("../lock.js").GovernanceConfig>}
 */
async function resolveGovernance(prompts, options) {
  if (options.yes) {
    return normalizeGovernance(
      {
        profile: options.governanceProfile ?? "recommended",
        sessionNotes: options.sessionNotesMode ?? undefined,
        qualityChecks: options.qualityChecksMode ?? undefined,
        planIndex: options.planIndexMode ?? undefined,
        skillRouter: options.routerMode ?? undefined
      },
      true
    );
  }

  const selectedProfile = await prompts.select({
    message: "文档治理重量档位",
    choices: GOVERNANCE_PROFILE_CHOICES,
    default: options.governanceProfile ?? "recommended"
  });
  let governance = governanceProfileDefaults(selectedProfile);

  const customize = await prompts.confirm({
    message: "是否进一步自定义治理开关（留痕/质检/计划索引/路由器）？",
    default: false
  });

  if (!customize) {
    return governance;
  }

  governance = {
    ...governance,
    sessionNotes: await prompts.select({
      message: "会话留痕（developers/SESSIONS）",
      choices: GOVERNANCE_MODE_CHOICES,
      default: governance.sessionNotes
    }),
    qualityChecks: await prompts.select({
      message: "质量检查收尾",
      choices: GOVERNANCE_MODE_CHOICES,
      default: governance.qualityChecks
    }),
    planIndex: await prompts.select({
      message: "计划索引维护（AGENTS.md）",
      choices: GOVERNANCE_MODE_CHOICES,
      default: governance.planIndex
    }),
    skillRouter: await prompts.select({
      message: "统一路由入口（SKILL_ROUTER.md）",
      choices: GOVERNANCE_MODE_CHOICES,
      default: governance.skillRouter
    })
  };

  return governance;
}
