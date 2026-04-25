import path from "node:path";

import { readFile } from "node:fs/promises";

import {
  ALL_STYLE_FILES,
  LANGUAGE_TO_STYLE_FILE,
  PROJECT_TYPES
} from "./constants.js";
import { pathExists, removeIfExists } from "./utils/fs.js";

/**
 * 按语言裁剪 `developers/CODE-STYLES` 中的规范文件。
 *
 * @param {string} targetRoot
 * @param {string[]} selectedLanguages
 * @returns {Promise<void>}
 */
export async function applyLanguageSelection(targetRoot, selectedLanguages) {
  const stylesDir = path.join(targetRoot, "developers", "CODE-STYLES");
  const keep = new Set();

  for (const language of selectedLanguages) {
    const mapped = LANGUAGE_TO_STYLE_FILE[language];
    if (Array.isArray(mapped)) {
      mapped.forEach((fileName) => keep.add(fileName));
      continue;
    }

    if (mapped) {
      keep.add(mapped);
    }
  }

  for (const fileName of ALL_STYLE_FILES) {
    const targetFile = path.join(stylesDir, fileName);
    if (!keep.has(fileName)) {
      await removeIfExists(targetFile);
    }
  }
}

/**
 * 读取目标项目的 `package.json`。
 *
 * @param {string} targetRoot
 * @returns {Promise<Record<string, any> | null>}
 */
export async function readProjectPackageJson(targetRoot) {
  const packageJsonPath = path.join(targetRoot, "package.json");
  if (!(await pathExists(packageJsonPath))) {
    return null;
  }

  try {
    return JSON.parse(await readFile(packageJsonPath, "utf8"));
  } catch {
    return null;
  }
}

/**
 * 基于 package.json 与语言选择推断项目类型，仅作为 init 的默认建议。
 *
 * @param {Record<string, any> | null} pkg
 * @param {string[]} [languages=[]]
 * @returns {string | null}
 */
export function inferProjectTypeFromPackageJson(pkg, languages = []) {
  if (!pkg) {
    return null;
  }

  const dependencies = collectPackageDeps(pkg);
  const hasAny = (names) => names.some((name) => dependencies.has(name));
  const hasBin = typeof pkg.bin === "string" || (pkg.bin && Object.keys(pkg.bin).length > 0);

  if (hasAny(["next", "nuxt", "react", "react-dom", "vue", "svelte", "@angular/core", "vite"])) {
    return "frontend";
  }
  if (hasAny(["express", "koa", "fastify", "@nestjs/core", "hono", "egg"])) {
    return "backend-node";
  }
  if (languages.includes("typescript")) {
    return "typescript-general";
  }
  if (languages.includes("javascript") || hasBin || pkg.type === "module" || pkg.main || pkg.exports) {
    return "javascript-general";
  }

  return null;
}

/**
 * 返回项目类型可选值列表，供错误信息和诊断输出复用。
 *
 * @returns {string}
 */
export function formatProjectTypeChoices() {
  return PROJECT_TYPES.join(", ");
}

/**
 * 将语言标识映射为一个或多个样式文件。
 *
 * @param {string} language
 * @returns {string[] | null}
 */
export function toStyleFiles(language) {
  const mapped = LANGUAGE_TO_STYLE_FILE[language];
  if (!mapped) {
    return null;
  }

  return Array.isArray(mapped) ? mapped : [mapped];
}

/**
 * 收集依赖键名，供项目类型推断使用。
 *
 * @param {Record<string, any>} pkg
 * @returns {Set<string>}
 */
function collectPackageDeps(pkg) {
  return new Set([
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.devDependencies ?? {}),
    ...Object.keys(pkg.peerDependencies ?? {}),
    ...Object.keys(pkg.optionalDependencies ?? {})
  ]);
}
