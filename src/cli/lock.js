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
 * @property {GovernanceConfig} governance 文档治理开关配置。
 * @property {"file" | "module" | "function" | null} codeIndexGranularity 代码索引粒度。
 * @property {InstalledSkillRecord[]} skills 已安装的 skill 清单。
 */

/**
 * 单个治理项的强度。
 *
 * - `required`：保留现有强制约束
 * - `optional`：保留文档/流程，但 doctor 降级为提示
 * - `off`：不再作为治理要求
 *
 * @typedef {"required" | "optional" | "off"} GovernanceMode
 */

/**
 * 文档治理开关。
 *
 * @typedef {object} GovernanceConfig
 * @property {"recommended" | "strict" | "balanced" | "minimal" | "off"} profile 预设档位，便于快速套用。
 * @property {GovernanceMode} skillRouter 是否强制以 `SKILL_ROUTER.md` 作为统一入口。
 * @property {GovernanceMode} sessionNotes 是否强制会话留痕。
 * @property {GovernanceMode} qualityChecks 是否强制质量检查收尾。
 * @property {GovernanceMode} planIndex 是否强制维护 `AGENTS.md` 计划索引。
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
    const lock = JSON.parse(await readFile(lockPath, "utf8"));
    return normalizeLock(lock);
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
  lock.governance = normalizeGovernance(lock.governance, lock.includeDocsGovernance);
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
 * @param {GovernanceConfig | null | undefined} governance
 * @param {"file" | "module" | "function" | null} codeIndexGranularity
 * @returns {SkillsLock}
 */
export function makeLock(
  packageVersion,
  languages,
  projectType,
  includeClaude,
  includeDocsGovernance,
  governance,
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
    governance: normalizeGovernance(governance, includeDocsGovernance),
    codeIndexGranularity: codeIndexGranularity ?? null,
    skills: []
  };
}

/**
 * 根据预设档位生成默认治理开关。
 *
 * @param {"recommended" | "strict" | "balanced" | "minimal" | "off" | null | undefined} profile
 * @returns {GovernanceConfig}
 */
export function governanceProfileDefaults(profile) {
  switch (profile) {
    case "recommended":
      return {
        profile: "recommended",
        skillRouter: "optional",
        sessionNotes: "off",
        qualityChecks: "required",
        planIndex: "optional"
      };
    case "balanced":
      return {
        profile: "balanced",
        skillRouter: "required",
        sessionNotes: "optional",
        qualityChecks: "optional",
        planIndex: "required"
      };
    case "minimal":
      return {
        profile: "minimal",
        skillRouter: "optional",
        sessionNotes: "off",
        qualityChecks: "off",
        planIndex: "optional"
      };
    case "off":
      return {
        profile: "off",
        skillRouter: "off",
        sessionNotes: "off",
        qualityChecks: "off",
        planIndex: "off"
      };
    case "strict":
      return {
        profile: "strict",
        skillRouter: "required",
        sessionNotes: "required",
        qualityChecks: "required",
        planIndex: "required"
      };
    default:
      return {
        profile: "recommended",
        skillRouter: "optional",
        sessionNotes: "off",
        qualityChecks: "required",
        planIndex: "optional"
      };
  }
}

/**
 * 归一化治理配置，兼容旧 lock 或部分字段缺失的情况。
 *
 * @param {Partial<GovernanceConfig> | null | undefined} governance
 * @param {boolean} includeDocsGovernance
 * @returns {GovernanceConfig}
 */
export function normalizeGovernance(governance, includeDocsGovernance = true) {
  if (!includeDocsGovernance) {
    return governanceProfileDefaults("off");
  }

  const profile = includeDocsGovernance
    ? (governance?.profile ?? "recommended")
    : "off";
  const defaults = governanceProfileDefaults(profile);

  return {
    profile: defaults.profile,
    skillRouter: governance?.skillRouter ?? defaults.skillRouter,
    sessionNotes: governance?.sessionNotes ?? defaults.sessionNotes,
    qualityChecks: governance?.qualityChecks ?? defaults.qualityChecks,
    planIndex: governance?.planIndex ?? defaults.planIndex
  };
}

/**
 * 对读取到的 lock 做兼容性补齐。
 *
 * @param {Partial<SkillsLock>} lock
 * @returns {SkillsLock}
 */
function normalizeLock(lock) {
  return {
    version: lock.version ?? 1,
    packageVersion: lock.packageVersion ?? "0.0.0",
    createdAt: lock.createdAt ?? new Date().toISOString(),
    updatedAt: lock.updatedAt ?? new Date().toISOString(),
    languages: Array.isArray(lock.languages) ? lock.languages : [],
    projectType: lock.projectType ?? null,
    includeClaude: lock.includeClaude ?? true,
    includeDocsGovernance: lock.includeDocsGovernance ?? true,
    governance: normalizeGovernance(lock.governance, lock.includeDocsGovernance ?? true),
    codeIndexGranularity: lock.codeIndexGranularity ?? null,
    skills: Array.isArray(lock.skills) ? lock.skills : []
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
