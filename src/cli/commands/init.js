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
  lockAddSkill,
  makeLock,
  writeLock
} from "../lock.js";
import {
  applyLanguageSelection,
  inferProjectTypeFromPackageJson,
  readProjectPackageJson
} from "../project.js";
import { createSessionNote } from "../session.js";
import { listFilesRecursively, pathExists, removeIfExists } from "../utils/fs.js";

/** @typedef {import("../options.js").CliOptions} CliOptions */

/**
 * `init` 交互模式下展示的项目类型候选项。
 *
 * `value` 必须与 `PROJECT_TYPES` 保持一致，`name` 用于向用户解释每类项目的典型场景。
 *
 * @type {{ name: string, value: string }[]}
 */
const PROJECT_TYPE_CHOICES = [
  { name: "前端（React / Vue / 原生 Web 等）", value: "frontend" },
  { name: "Node.js 后端（Express / Koa / Fastify / NestJS 等）", value: "backend-node" },
  { name: "TypeScript 通用项目（CLI / SDK / 工具 / 共享库等）", value: "typescript-general" },
  { name: "JavaScript 通用项目（CLI / SDK / 工具 / 脚本 / 模块库等）", value: "javascript-general" },
  { name: "Java 后端（Spring Boot / Spring MVC 等）", value: "backend-java" },
  { name: "Python 项目（FastAPI / Django / 脚本等）", value: "python" },
  { name: "混合项目（多层分别验收）", value: "mixed" }
];

/**
 * `init` 中代码索引粒度的交互选项。
 *
 * 该值最终会写入 `skills.lock.json`，供后续索引维护和 doctor 检查复用。
 *
 * @type {{ name: string, value: "file" | "module" | "function" | null }[]}
 */
const GRANULARITY_CHOICES = [
  { name: "不启用", value: null },
  { name: "文件级（file）：文件路径 + 用途描述", value: "file" },
  { name: "模块级（module）：文件级 + 类/接口/导出符号", value: "module" },
  { name: "函数级（function）：模块级 + 函数/方法签名", value: "function" }
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
    ? process.cwd()
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

  const includeDocsGovernance = options.yes
    ? true
    : await prompts.confirm({
        message: "是否启用文档治理（SESSIONS、SKILLS、MODULE-BUSINESS-FILE-MAP）？",
        default: true
      });

  const codeIndexGranularity = options.yes
    ? (options.indexGranularity ?? null)
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

  await cp(TEMPLATE_BASE, targetDir, { recursive: true, force: true });

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

  await applyLanguageSelection(targetDir, selectedLanguages);

  const lock = makeLock(
    getPackageVersion(),
    selectedLanguages,
    projectType,
    includeClaude,
    includeDocsGovernance,
    codeIndexGranularity
  );

  if (includeDocsGovernance) {
    for (const file of await listFilesRecursively(TEMPLATE_SKILLS_DIR)) {
      lockAddSkill(lock, `developers/SKILLS/${file}`);
    }

    await ensureAcceptanceSkillInstalled(
      targetDir,
      lock,
      PROJECT_TYPE_TO_ACCEPTANCE_SKILL[projectType]
    );
  }
  await writeLock(targetDir, lock);

  const sessionPath = includeDocsGovernance
    ? await createSessionNote(targetDir)
    : null;

  console.log("已完成 project-rules 初始化。");
  console.log(`目标目录: ${targetDir}`);
  console.log(`语言规范: ${selectedLanguages.join(", ")}`);
  console.log(`项目类型: ${projectType ?? "未指定"}`);
  console.log(`CLAUDE.md: ${includeClaude ? "已生成" : "未生成"}`);
  console.log(`文档治理: ${includeDocsGovernance ? "已启用" : "未启用"}`);
  console.log(`代码索引粒度: ${codeIndexGranularity ?? "未启用"}`);
  console.log(`Lock 文件: ${path.join(targetDir, "skills.lock.json")}`);
  if (sessionPath) {
    console.log(`会话留痕文件: ${sessionPath}`);
  }
}
