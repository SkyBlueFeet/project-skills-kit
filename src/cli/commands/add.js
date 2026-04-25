import path from "node:path";

import { SKILL_PACKS, TEMPLATE_SKILLS_DIR } from "../constants.js";
import { lockAddSkill, readLock, writeLock } from "../lock.js";
import { toStyleFiles } from "../project.js";
import {
  copyFromTemplate,
  normalizeRelativePath,
  pathExists
} from "../utils/fs.js";

/** @typedef {import("../options.js").CliOptions} CliOptions */

/**
 * 向目标项目增量添加规范、技能或技能包。
 *
 * @param {CliOptions} options
 * @returns {Promise<void>}
 */
export async function runAdd(options) {
  const targetDir = path.resolve(options.target);
  const [resource, name] = options.params;

  if (!resource) {
    throw new Error("add 命令缺少参数。示例: add language python");
  }

  if (resource === "claude") {
    await copyFromTemplate(targetDir, "CLAUDE.md", false);
    console.log("已添加: CLAUDE.md");
    return;
  }

  if (resource === "language") {
    if (!name) {
      throw new Error("请指定语言。示例: add language python");
    }

    const normalizedLanguage = name.toLowerCase();
    const styleFiles = toStyleFiles(normalizedLanguage);
    if (!styleFiles) {
      throw new Error(`不支持的语言: ${name}`);
    }

    for (const styleFile of styleFiles) {
      await copyFromTemplate(
        targetDir,
        path.join("developers", "CODE-STYLES", styleFile),
        false
      );
    }

    const lock = await readLock(targetDir);
    if (lock && !lock.languages.includes(normalizedLanguage)) {
      lock.languages.push(normalizedLanguage);
      await writeLock(targetDir, lock);
    }

    console.log(`已添加语言规范: ${name}`);
    return;
  }

  if (resource === "skill") {
    if (!name) {
      throw new Error("请指定 skill 名称。示例: add skill code-quality-check");
    }

    const normalized = name
      .toUpperCase()
      .replace(/-/g, "_")
      .replace(/^SKILL_/, "");
    const skillFile = `SKILL_${normalized}.md`;
    const source = path.join(TEMPLATE_SKILLS_DIR, skillFile);
    if (!(await pathExists(source))) {
      throw new Error(`未找到技能模板: ${skillFile}`);
    }

    const relativePath = path.join("developers", "SKILLS", skillFile);
    await copyFromTemplate(targetDir, relativePath, false);
    await copyFromTemplate(targetDir, path.join("developers", "SKILLS", "README.md"), false);

    const lock = await readLock(targetDir);
    if (lock) {
      lockAddSkill(lock, relativePath);
      await writeLock(targetDir, lock);
    }

    console.log(`已添加技能: ${skillFile}`);
    return;
  }

  if (resource === "skill-pack") {
    if (!name) {
      throw new Error(`请指定 skill-pack 名称。可选: ${Object.keys(SKILL_PACKS).join(", ")}`);
    }

    const packFiles = SKILL_PACKS[name.toLowerCase()];
    if (!packFiles) {
      throw new Error(`未知 skill-pack: ${name}。可选: ${Object.keys(SKILL_PACKS).join(", ")}`);
    }

    const lock = await readLock(targetDir);
    for (const skillFile of packFiles) {
      const relativePath = path.join("developers", "SKILLS", skillFile);
      const source = path.join(TEMPLATE_SKILLS_DIR, skillFile);
      if (!(await pathExists(source))) {
        console.log(`跳过（模板不存在）: ${skillFile}`);
        continue;
      }

      await copyFromTemplate(targetDir, relativePath, false);
      if (lock) {
        lockAddSkill(lock, normalizeRelativePath(relativePath));
      }
    }

    await copyFromTemplate(targetDir, path.join("developers", "SKILLS", "README.md"), false);
    if (lock) {
      await writeLock(targetDir, lock);
    }

    console.log(`已安装 skill-pack: ${name}（${packFiles.length} 个技能）`);
    return;
  }

  throw new Error("不支持的 add 资源: " + resource + "。支持: claude, language <name>, skill <name>, skill-pack <name>");
}
