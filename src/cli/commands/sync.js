import path from "node:path";

import {
  DEFAULT_SYNC_EXCLUDES,
  TEMPLATE_BASE,
  getPackageVersion
} from "../constants.js";
import { readLock } from "../lock.js";
import { normalizeText } from "../text.js";
import {
  copyFromTemplate,
  isRelativePathInDir,
  listFilesRecursively,
  normalizeRelativePath,
  pathExists,
  readText
} from "../utils/fs.js";

/** @typedef {import("../options.js").CliOptions} CliOptions */

/**
 * 将目标项目与当前模板做结构同步。
 *
 * @param {CliOptions} options
 * @returns {Promise<void>}
 */
export async function runSync(options) {
  const targetDir = path.resolve(options.target);
  const modeCheck = options.check || !options.apply;
  const allowOverwrite = options.force;

  const lock = await readLock(targetDir);
  const currentVersion = getPackageVersion();
  if (lock && lock.packageVersion !== currentVersion) {
    console.log(`提示: lock 记录版本 ${lock.packageVersion}，当前包版本 ${currentVersion}，建议检查更新。`);
  }

  const templateFiles = await listFilesRecursively(TEMPLATE_BASE);
  const managed = templateFiles.filter((entry) => !DEFAULT_SYNC_EXCLUDES.has(entry));

  const added = [];
  const updated = [];
  const conflict = [];
  const unchanged = [];

  for (const relativePath of managed) {
    const isStyleFile = isRelativePathInDir(relativePath, path.join("developers", "CODE-STYLES"));
    const source = path.join(TEMPLATE_BASE, relativePath);
    const destination = path.join(targetDir, relativePath);
    const exists = await pathExists(destination);

    if (!exists) {
      if (isStyleFile) {
        continue;
      }

      added.push(relativePath);
      if (!modeCheck) {
        await copyFromTemplate(targetDir, relativePath, true);
      }
      continue;
    }

    const [sourceText, destinationText] = await Promise.all([
      readText(source),
      readText(destination)
    ]);
    if (normalizeText(sourceText) === normalizeText(destinationText)) {
      unchanged.push(relativePath);
      continue;
    }

    if (!modeCheck && allowOverwrite) {
      await copyFromTemplate(targetDir, relativePath, true);
      updated.push(relativePath);
    } else {
      conflict.push(relativePath);
    }
  }

  console.log(`sync 模式: ${modeCheck ? "check" : "apply"}`);
  console.log(`新增: ${added.length}`);
  console.log(`更新: ${updated.length}`);
  console.log(`冲突: ${conflict.length}`);
  console.log(`一致: ${unchanged.length}`);

  if (added.length > 0) {
    console.log("added:");
    for (const item of added) {
      console.log(`  - ${normalizeRelativePath(item)}`);
    }
  }
  if (updated.length > 0) {
    console.log("updated:");
    for (const item of updated) {
      console.log(`  - ${normalizeRelativePath(item)}`);
    }
  }
  if (conflict.length > 0) {
    console.log("conflict:");
    for (const item of conflict) {
      console.log(`  - ${normalizeRelativePath(item)}`);
    }
    if (modeCheck) {
      console.log("提示: 使用 --apply --force 可覆盖冲突文件。");
    }
  }
}
