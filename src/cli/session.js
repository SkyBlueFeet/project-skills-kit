import path from "node:path";

import { readFile } from "node:fs/promises";

import { ensureFile, pathExists } from "./utils/fs.js";

/**
 * 生成当天会话记录文件名。
 *
 * @param {Date} date
 * @returns {string}
 */
export function formatTodayForNote(date) {
  const yy = String(date.getFullYear()).slice(2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `NOTE_${yy}_${mm}_${dd}.md`;
}

/**
 * 确保当天的 SESSIONS 留痕文件存在，并返回绝对路径。
 *
 * @param {string} targetRoot
 * @returns {Promise<string>}
 */
export async function createSessionNote(targetRoot) {
  const noteFile = formatTodayForNote(new Date());
  const targetPath = path.join(targetRoot, "developers", "SESSIONS", noteFile);

  if (await pathExists(targetPath)) {
    return targetPath;
  }

  const templatePath = path.join(
    targetRoot,
    "developers",
    "SESSIONS",
    "TEMPLATE.md"
  );
  const template = await readFile(templatePath, "utf8");
  await ensureFile(targetPath, template.replace("NOTE_YY_MM_DD", noteFile.replace(".md", "")));
  return targetPath;
}
