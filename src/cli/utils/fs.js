import { constants } from "node:fs";
import {
  access,
  cp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile
} from "node:fs/promises";
import path from "node:path";

import { TEMPLATE_BASE } from "../constants.js";

/**
 * 判断目标路径是否存在。
 *
 * @param {string} targetPath
 * @returns {Promise<boolean>}
 */
export async function pathExists(targetPath) {
  try {
    await access(targetPath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * 确保父目录存在后写入文件。
 *
 * @param {string} targetPath
 * @param {string} content
 * @returns {Promise<void>}
 */
export async function ensureFile(targetPath, content) {
  await mkdir(path.dirname(targetPath), { recursive: true });
  await writeFile(targetPath, content, "utf8");
}

/**
 * 从模板目录复制单个文件到目标项目。
 *
 * @param {string} targetRoot
 * @param {string} relativePath
 * @param {boolean} [force=true]
 * @returns {Promise<void>}
 */
export async function copyFromTemplate(targetRoot, relativePath, force = true) {
  const source = path.join(TEMPLATE_BASE, relativePath);
  const destination = path.join(targetRoot, relativePath);

  await mkdir(path.dirname(destination), { recursive: true });
  if (!force && (await pathExists(destination))) {
    console.log(`跳过（已存在）: ${normalizeRelativePath(relativePath)}`);
    return;
  }

  await cp(source, destination, { force });
}

/**
 * 若目标存在则删除。
 *
 * @param {string} targetPath
 * @returns {Promise<void>}
 */
export async function removeIfExists(targetPath) {
  if (await pathExists(targetPath)) {
    await rm(targetPath, { force: true, recursive: true });
  }
}

/**
 * 递归读取目录中的所有文件，相对路径保持为当前操作系统风格。
 *
 * @param {string} dir
 * @param {string} [root=dir]
 * @returns {Promise<string[]>}
 */
export async function listFilesRecursively(dir, root = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFilesRecursively(absolutePath, root)));
      continue;
    }

    files.push(path.relative(root, absolutePath));
  }

  return files;
}

/**
 * 读取 UTF-8 文本文件。
 *
 * @param {string} filePath
 * @returns {Promise<string>}
 */
export async function readText(filePath) {
  return readFile(filePath, "utf8");
}

/**
 * 将相对路径统一为 `/`，便于输出与 lock 文件持久化。
 *
 * @param {string} relativePath
 * @returns {string}
 */
export function normalizeRelativePath(relativePath) {
  return relativePath.replace(/\\/g, "/");
}

/**
 * 判断相对路径是否位于指定目录之下，避免平台分隔符差异导致误判。
 *
 * @param {string} relativePath
 * @param {string} directory
 * @returns {boolean}
 */
export function isRelativePathInDir(relativePath, directory) {
  const normalizedPath = path.normalize(relativePath);
  const normalizedDirectory = path.normalize(directory);

  return normalizedPath === normalizedDirectory || normalizedPath.startsWith(`${normalizedDirectory}${path.sep}`);
}
