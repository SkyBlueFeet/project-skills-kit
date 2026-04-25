import path from "node:path";

import { readFile, writeFile } from "node:fs/promises";

import { LOCK_FILE } from "./constants.js";
import { copyFromTemplate, normalizeRelativePath, pathExists } from "./utils/fs.js";

/**
 * 单个已安装 skill 在 `skills.lock.json` 中的记录结构。
 *
 * @typedef {object} InstalledSkillRecord
 * @property {string} name skill 名称，通常由文件名去掉 `.md` 得到。
 * @property {string} file skill 文件相对路径，统一保存为 `/` 风格。
 * @property {string} installedAt 安装时间，ISO 时间字符串。
 */

/**
 * `skills.lock.json` 的数据结构。
 *
 * 该文件用于记录当前项目已安装的规范、技能和初始化参数，供 `sync`、`doctor`
 * 与后续增量命令复用。
 *
 * @typedef {object} SkillsLock
 * @property {number} version lock 文件结构版本。
 * @property {string} packageVersion 生成该 lock 时使用的 CLI 包版本。
 * @property {string} createdAt lock 创建时间，ISO 时间字符串。
 * @property {string} updatedAt lock 最近更新时间，ISO 时间字符串。
 * @property {string[]} languages 当前项目启用的语言规范标识列表。
 * @property {string | null} projectType 当前项目类型。
 * @property {boolean} includeClaude 是否启用了 `CLAUDE.md`。
 * @property {boolean} includeDocsGovernance 是否启用了文档治理相关目录与文档。
 * @property {"file" | "module" | "function" | null} codeIndexGranularity 代码索引粒度。
 * @property {InstalledSkillRecord[]} skills 已安装的 skill 清单。
 */

/**
 * 读取 `skills.lock.json`。
 *
 * @param {string} targetRoot
 * @returns {Promise<SkillsLock | null>}
 */
export async function readLock(targetRoot) {
  const lockPath = path.join(targetRoot, LOCK_FILE);
  if (!(await pathExists(lockPath))) {
    return null;
  }

  try {
    return JSON.parse(await readFile(lockPath, "utf8"));
  } catch {
    return null;
  }
}

/**
 * 写回 `skills.lock.json` 并刷新更新时间。
 *
 * @param {string} targetRoot
 * @param {SkillsLock} lock
 * @returns {Promise<void>}
 */
export async function writeLock(targetRoot, lock) {
  const lockPath = path.join(targetRoot, LOCK_FILE);
  lock.updatedAt = new Date().toISOString();
  await writeFile(lockPath, JSON.stringify(lock, null, 2), "utf8");
}

/**
 * 创建初始化阶段使用的 lock 对象。
 *
 * @param {string} packageVersion
 * @param {string[]} languages
 * @param {string | null} projectType
 * @param {boolean} includeClaude
 * @param {boolean} includeDocsGovernance
 * @param {"file" | "module" | "function" | null} codeIndexGranularity
 * @returns {SkillsLock}
 */
export function makeLock(
  packageVersion,
  languages,
  projectType,
  includeClaude,
  includeDocsGovernance,
  codeIndexGranularity
) {
  const now = new Date().toISOString();

  return {
    version: 1,
    packageVersion,
    createdAt: now,
    updatedAt: now,
    languages,
    projectType: projectType ?? null,
    includeClaude,
    includeDocsGovernance,
    codeIndexGranularity: codeIndexGranularity ?? null,
    skills: []
  };
}

/**
 * 向 lock 中登记已安装 skill，路径统一保存为 `/` 风格。
 *
 * @param {SkillsLock} lock
 * @param {string} skillFile
 * @returns {void}
 */
export function lockAddSkill(lock, skillFile) {
  const normalizedFile = normalizeRelativePath(skillFile);
  const alreadyInstalled = lock.skills.some((skill) => skill.file === normalizedFile);

  if (!alreadyInstalled) {
    lock.skills.push({
      name: path.basename(normalizedFile, ".md"),
      file: normalizedFile,
      installedAt: new Date().toISOString()
    });
  }
}

/**
 * 安装项目类型对应的验收 skill，并在 lock 中登记。
 *
 * @param {string} targetDir
 * @param {SkillsLock | null} lock
 * @param {string | undefined} skillPath
 * @returns {Promise<void>}
 */
export async function ensureAcceptanceSkillInstalled(targetDir, lock, skillPath) {
  if (!skillPath) {
    return;
  }

  await copyFromTemplate(targetDir, skillPath, false);
  await copyFromTemplate(targetDir, path.join("developers", "SKILLS", "README.md"), false);
  if (lock) {
    lockAddSkill(lock, skillPath);
  }
}
