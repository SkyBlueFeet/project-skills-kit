import path from "node:path";

import { readFile, readdir } from "node:fs/promises";

import {
  ALL_STYLE_FILES,
  PROJECT_TYPES,
  PROJECT_TYPE_TO_ACCEPTANCE_SKILL,
  REQUIRED_FILES,
  TEMPLATE_BASE,
  getPackageVersion
} from "../constants.js";
import {
  ensureAcceptanceSkillInstalled,
  readLock,
  writeLock
} from "../lock.js";
import {
  formatProjectTypeChoices,
  inferProjectTypeFromPackageJson,
  readProjectPackageJson
} from "../project.js";
import { copyFromTemplate, pathExists } from "../utils/fs.js";

/** @typedef {import("../options.js").CliOptions} CliOptions */

/**
 * 对目标项目执行结构诊断，并在需要时补齐可自动修复的缺失项。
 *
 * @param {CliOptions} options
 * @returns {Promise<void>}
 */
export async function runDoctor(options) {
  const targetDir = path.resolve(options.target);
  const errors = [];
  const warnings = [];
  const fixed = [];

  for (const requiredFile of REQUIRED_FILES) {
    const absolutePath = path.join(targetDir, requiredFile);
    if (!(await pathExists(absolutePath))) {
      errors.push(`缺失必需文件: ${requiredFile}`);
      if (options.fix) {
        const templateSource = path.join(TEMPLATE_BASE, requiredFile);
        if (await pathExists(templateSource)) {
          await copyFromTemplate(targetDir, requiredFile, false);
          fixed.push(`已补齐: ${requiredFile}`);
        }
      }
    }
  }

  const brokenLinks = await checkMarkdownLinks(targetDir, [
    "AGENTS.md",
    "CLAUDE.md",
    "developers/INDEX.md",
    "developers/DOC-RULES.md"
  ]);
  for (const item of brokenLinks) {
    if (item.includes("developers/INDEX.md -> ./CODE-STYLES/")) {
      warnings.push(`可选语言规范未安装: ${item}`);
      continue;
    }
    errors.push(`链接失效: ${item}`);
  }

  const claudePath = path.join(targetDir, "CLAUDE.md");
  if (await pathExists(claudePath)) {
    const claude = await readFile(claudePath, "utf8");
    if (claude.includes("| 计划ID |")) {
      warnings.push("CLAUDE.md 含计划索引表，建议仅引用 AGENTS.md，可执行 skills-kit migrate --check。");
    }
  }

  const indexPath = path.join(targetDir, "developers", "INDEX.md");
  if (await pathExists(indexPath)) {
    const index = await readFile(indexPath, "utf8");
    if (index.includes("| 计划ID |")) {
      warnings.push("developers/INDEX.md 含计划索引表，建议仅引用 AGENTS.md，可执行 skills-kit migrate --check。");
    }
  }

  const docRulesPath = path.join(targetDir, "developers", "DOC-RULES.md");
  if (await pathExists(docRulesPath)) {
    const docRules = await readFile(docRulesPath, "utf8");
    const oldPatternRegex = /-\s*`AGENTS\.md`[\s\S]*?-\s*`CLAUDE\.md`[\s\S]*?-\s*`developers\/INDEX\.md`/;
    if (oldPatternRegex.test(docRules)) {
      warnings.push(
        "DOC-RULES 计划索引维护仍为三处同步，若已改为 AGENTS 单源，建议统一口径。"
      );
    }
  }

  const sessionsTemplate = path.join(
    targetDir,
    "developers",
    "SESSIONS",
    "TEMPLATE.md"
  );
  if (!(await pathExists(sessionsTemplate))) {
    warnings.push("缺失 developers/SESSIONS/TEMPLATE.md，无法标准化会话留痕。");
    if (options.fix) {
      const templateSource = path.join(
        TEMPLATE_BASE,
        "developers",
        "SESSIONS",
        "TEMPLATE.md"
      );
      if (await pathExists(templateSource)) {
        await copyFromTemplate(targetDir, "developers/SESSIONS/TEMPLATE.md", false);
        fixed.push("已补齐: developers/SESSIONS/TEMPLATE.md");
      }
    }
  }

  const stylesDir = path.join(targetDir, "developers", "CODE-STYLES");
  if (await pathExists(stylesDir)) {
    const styleEntries = await readdir(stylesDir);
    const enabled = styleEntries.filter((entry) => ALL_STYLE_FILES.includes(entry));
    if (enabled.length === 0) {
      warnings.push("developers/CODE-STYLES 下没有启用任何语言规范文件。");
    }
  }

  for (const { file, label } of [
    { file: "CLAUDE.md", label: "CLAUDE.md" },
    { file: "developers/INDEX.md", label: "developers/INDEX.md" }
  ]) {
    const absolutePath = path.join(targetDir, file);
    if (await pathExists(absolutePath)) {
      const content = await readFile(absolutePath, "utf8");
      if (content.includes("| 计划ID |") || content.includes("| 计划id |")) {
        warnings.push(
          `口径冲突: ${label} 含独立计划索引表，计划索引应仅维护于 AGENTS.md。建议执行 skills-kit migrate --check。`
        );
      }
    }
  }

  const routerPath = path.join(targetDir, "developers", "SKILLS", "SKILL_ROUTER.md");
  if (!(await pathExists(routerPath)) && options.fix) {
    const templateSource = path.join(TEMPLATE_BASE, "developers", "SKILLS", "SKILL_ROUTER.md");
    if (await pathExists(templateSource)) {
      await copyFromTemplate(targetDir, "developers/SKILLS/SKILL_ROUTER.md", false);
      fixed.push("已补齐: developers/SKILLS/SKILL_ROUTER.md");
    }
  }

  if (await pathExists(routerPath)) {
    const routerContent = await readFile(routerPath, "utf8");
    const skillLinks = extractLocalLinks(routerContent);
    const skillsDir = path.dirname(routerPath);
    for (const link of skillLinks) {
      const resolved = path.resolve(skillsDir, link);
      if (link.endsWith(".md") && !(await pathExists(resolved))) {
        warnings.push(`Skill 链路不可达: SKILL_ROUTER.md -> ${link}`);
      }
    }
  }

  const lock = await readLock(targetDir);
  if (lock) {
    const currentVersion = getPackageVersion();
    if (lock.packageVersion !== currentVersion) {
      warnings.push(`skills.lock.json 版本 ${lock.packageVersion} 与当前包版本 ${currentVersion} 不一致，建议运行 sync --check。`);
    }

    for (const skill of lock.skills) {
      const skillAbs = path.join(targetDir, skill.file);
      if (!(await pathExists(skillAbs))) {
        errors.push(`lock 记录的 Skill 文件缺失: ${skill.file}`);
      }
    }

    if (lock.codeIndexGranularity) {
      const codeIndexPath = path.join(targetDir, "developers", "CODE-INDEX.md");
      if (!(await pathExists(codeIndexPath))) {
        warnings.push(
          `代码索引文档缺失: developers/CODE-INDEX.md（粒度: ${lock.codeIndexGranularity}）。` +
            "请按 developers/SKILLS/SKILL_CODE_INDEX.md 建立索引，" +
            "或执行 npx skills-kit add skill code-index 确认技能已安装。"
        );
      }
    }

    const inferredProjectType = inferProjectTypeFromPackageJson(
      await readProjectPackageJson(targetDir),
      lock.languages ?? []
    );
    if (!lock.projectType) {
      warnings.push(
        inferredProjectType
          ? `skills.lock.json 缺少 projectType。基于 package.json 的建议值为 ${inferredProjectType}；可选值: ${formatProjectTypeChoices()}。请由 Agent 或维护者确认后填写。`
          : `skills.lock.json 缺少 projectType。可选值: ${formatProjectTypeChoices()}。请由 Agent 或维护者根据项目形态判定。`
      );
    } else {
      if (!PROJECT_TYPES.includes(lock.projectType)) {
        warnings.push(`skills.lock.json 中 projectType 非法: ${lock.projectType}`);
      }

      if (inferredProjectType && inferredProjectType !== lock.projectType && lock.projectType !== "mixed") {
        warnings.push(
          `projectType 与 package.json 猜测结果不一致：lock=${lock.projectType}，guess=${inferredProjectType}。请确认项目类型是否填写正确。`
        );
      }

      const requiredAcceptanceSkill = PROJECT_TYPE_TO_ACCEPTANCE_SKILL[lock.projectType];
      if (requiredAcceptanceSkill) {
        const hasSkill = lock.skills.some((skill) => skill.file === requiredAcceptanceSkill);
        if (!hasSkill) {
          warnings.push(`项目类型 ${lock.projectType} 缺少对应验收技能：${requiredAcceptanceSkill}。`);
          if (options.fix) {
            await ensureAcceptanceSkillInstalled(targetDir, lock, requiredAcceptanceSkill);
            fixed.push(`已补齐项目类型对应验收技能: ${requiredAcceptanceSkill}`);
          }
        }
      }
    }
  }

  if (lock && options.fix && fixed.length > 0) {
    await writeLock(targetDir, lock);
  }

  console.log("doctor 结果");
  console.log(`错误: ${errors.length}`);
  console.log(`告警: ${warnings.length}`);
  console.log(`已修复: ${fixed.length}`);
  if (errors.length > 0) {
    console.log("errors:");
    for (const item of errors) {
      console.log(`  - ${item}`);
    }
  }
  if (warnings.length > 0) {
    console.log("warnings:");
    for (const item of warnings) {
      console.log(`  - ${item}`);
    }
  }
  if (fixed.length > 0) {
    console.log("fixed:");
    for (const item of fixed) {
      console.log(`  - ${item}`);
    }
  }

  if (errors.length > 0) {
    process.exitCode = 1;
  }
}

/**
 * 提取 Markdown 中的本地链接，忽略 http(s) 与 mailto。
 *
 * @param {string} markdown
 * @returns {string[]}
 */
function extractLocalLinks(markdown) {
  const links = [];
  const regex = /\[[^\]]*]\(([^)]+)\)/g;
  let match = regex.exec(markdown);

  while (match) {
    const target = match[1].trim();
    if (
      target &&
      !target.startsWith("http://") &&
      !target.startsWith("https://") &&
      !target.startsWith("mailto:")
    ) {
      links.push(target.split("#")[0]);
    }
    match = regex.exec(markdown);
  }

  return links;
}

/**
 * 校验一组 Markdown 文件中的本地链接是否可达。
 *
 * @param {string} targetDir
 * @param {string[]} files
 * @returns {Promise<string[]>}
 */
async function checkMarkdownLinks(targetDir, files) {
  const broken = [];

  for (const file of files) {
    const absolutePath = path.join(targetDir, file);
    if (!(await pathExists(absolutePath))) {
      continue;
    }

    const content = await readFile(absolutePath, "utf8");
    const links = extractLocalLinks(content);
    const baseDir = path.dirname(absolutePath);
    for (const link of links) {
      const resolved = path.resolve(baseDir, link);
      if (!(await pathExists(resolved))) {
        broken.push(`${file} -> ${link}`);
      }
    }
  }

  return broken;
}
