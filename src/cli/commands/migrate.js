import { cp } from "node:fs/promises";
import path from "node:path";

import {
  DEFAULT_SYNC_EXCLUDES,
  MIGRATION_PLAN_REFERENCE,
  MIGRATION_SKIP_ADDS,
  MIGRATION_SOURCE_FILES,
  PLAN_TABLE_DIVIDER,
  PLAN_TABLE_HEADER,
  TEMPLATE_BASE
} from "../constants.js";
import { normalizeText } from "../text.js";
import {
  copyFromTemplate,
  ensureFile,
  isRelativePathInDir,
  listFilesRecursively,
  normalizeRelativePath,
  pathExists,
  readText
} from "../utils/fs.js";

/** @typedef {import("../options.js").CliOptions} CliOptions */

/**
 * `migrate` 阶段准备写入的文件变更项。
 *
 * @typedef {object} MigrationWrite
 * @property {string} relativePath 目标文件相对路径。
 * @property {"merge" | "create" | "slim" | "rewrite"} action 本次写入动作类型。
 * @property {string} content 即将写入的目标内容。
 */

/**
 * 旧项目迁移时收集出的上下文数据。
 *
 * @typedef {object} MigrationContext
 * @property {Record<string, string>} sourceFiles 已读取到的旧项目入口文件内容。
 * @property {string} nextAgents 迁移后应写入的 `AGENTS.md` 内容。
 * @property {string | null} nextClaude 迁移后应写入的 `CLAUDE.md` 内容。
 * @property {string | null} nextIndex 迁移后应写入的 `developers/INDEX.md` 内容。
 * @property {string[]} additions 需要从模板补齐的缺失文件列表。
 */

/**
 * 将旧版项目入口文件迁移到当前模板口径。
 *
 * @param {CliOptions} options
 * @returns {Promise<void>}
 */
export async function runMigrate(options) {
  const targetDir = path.resolve(options.target);
  const modeCheck = options.check || !options.apply;
  const context = await loadMigrationContext(targetDir);
  /** @type {MigrationWrite[]} */
  const writes = [];
  const agentsPath = "AGENTS.md";
  const claudePath = "CLAUDE.md";
  const indexPath = path.join("developers", "INDEX.md");

  if (normalizeText(context.sourceFiles[agentsPath] ?? "") !== normalizeText(context.nextAgents)) {
    writes.push({
      relativePath: agentsPath,
      action: context.sourceFiles[agentsPath] ? "merge" : "create",
      content: context.nextAgents
    });
  }

  if (
    context.nextClaude &&
    normalizeText(context.sourceFiles[claudePath] ?? "") !== normalizeText(context.nextClaude)
  ) {
    writes.push({
      relativePath: claudePath,
      action: "slim",
      content: context.nextClaude
    });
  }

  if (
    context.nextIndex &&
    normalizeText(context.sourceFiles[indexPath] ?? "") !== normalizeText(context.nextIndex)
  ) {
    writes.push({
      relativePath: indexPath,
      action: "rewrite",
      content: context.nextIndex
    });
  }

  console.log(`migrate 模式: ${modeCheck ? "check" : "apply"}`);
  console.log(`目标目录: ${targetDir}`);
  console.log(`写入: ${writes.length}`);
  console.log(`补齐: ${context.additions.length}`);

  if (writes.length > 0) {
    console.log("write:");
    for (const item of writes) {
      console.log(`  - [${item.action}] ${normalizeRelativePath(item.relativePath)}`);
    }
  }
  if (context.additions.length > 0) {
    console.log("add:");
    for (const item of context.additions) {
      console.log(`  - ${normalizeRelativePath(item)}`);
    }
  }

  if (modeCheck) {
    if (writes.length === 0 && context.additions.length === 0) {
      console.log("无需迁移，当前项目已符合旧项目接入口径。");
    } else {
      console.log("提示: 使用 --apply 执行迁移，并为被修改文件生成 .bak 备份。");
    }
    return;
  }

  let appliedWrites = 0;

  for (const item of writes) {
    if (await writeMigratedFile(targetDir, item.relativePath, item.content)) {
      appliedWrites += 1;
    }
  }

  for (const relativePath of context.additions) {
    await copyFromTemplate(targetDir, relativePath, false);
  }

  console.log(`已写入: ${appliedWrites}`);
  console.log(`已补齐: ${context.additions.length}`);
}

/**
 * 汇总旧项目入口文件内容，生成迁移所需的上下文。
 *
 * @param {string} targetDir
 * @returns {Promise<MigrationContext>}
 */
async function loadMigrationContext(targetDir) {
  const sourceFiles = {};

  for (const relativePath of MIGRATION_SOURCE_FILES) {
    const absolutePath = path.join(targetDir, relativePath);
    if (await pathExists(absolutePath)) {
      sourceFiles[relativePath] = await readText(absolutePath);
    }
  }

  const [templateAgents, templateClaude] = await Promise.all([
    readText(path.join(TEMPLATE_BASE, "AGENTS.md")),
    readText(path.join(TEMPLATE_BASE, "CLAUDE.md"))
  ]);
  const agentsPath = "AGENTS.md";
  const claudePath = "CLAUDE.md";
  const indexPath = path.join("developers", "INDEX.md");

  const legacyFacts = dedupeLines([
    ...extractCustomListLines(sourceFiles[agentsPath] ?? "", templateAgents, 10),
    ...(sourceFiles["README.md"] ? ["- 项目说明文档：`README.md`"] : []),
    ...(sourceFiles["CONTRIBUTING.md"] ? ["- 协作流程文档：`CONTRIBUTING.md`"] : [])
  ]).slice(0, 12);
  const claudeNotes = extractCustomListLines(sourceFiles[claudePath] ?? "", templateClaude, 10);
  const mergedPlanTable = buildMergedPlanTable([
    sourceFiles[agentsPath],
    sourceFiles[claudePath],
    sourceFiles[indexPath]
  ]);
  const nextAgents = buildMergedAgents({
    templateAgents,
    legacyFacts,
    mergedPlanTable
  });
  const nextClaude = sourceFiles[claudePath]
    ? buildSlimClaude({ templateClaude, claudeNotes })
    : null;
  const nextIndex = sourceFiles[indexPath]
    ? rewritePlanReferenceDocument(sourceFiles[indexPath])
    : null;

  const templateFiles = await listFilesRecursively(TEMPLATE_BASE);
  const additions = [];

  for (const relativePath of templateFiles) {
    const normalizedRelativePath = normalizeRelativePath(relativePath);
    const isStyleFile = isRelativePathInDir(relativePath, path.join("developers", "CODE-STYLES"));
    if (
      DEFAULT_SYNC_EXCLUDES.has(relativePath) ||
      isStyleFile ||
      MIGRATION_SKIP_ADDS.has(normalizedRelativePath)
    ) {
      continue;
    }

    const destination = path.join(targetDir, relativePath);
    if (!(await pathExists(destination))) {
      additions.push(relativePath);
    }
  }

  return {
    sourceFiles,
    nextAgents,
    nextClaude,
    nextIndex,
    additions
  };
}

/**
 * 写入迁移结果；已有文件会先生成 `.bak` 备份。
 *
 * @param {string} targetDir
 * @param {string} relativePath
 * @param {string} content
 * @returns {Promise<boolean>}
 */
async function writeMigratedFile(targetDir, relativePath, content) {
  const absolutePath = path.join(targetDir, relativePath);
  const exists = await pathExists(absolutePath);

  if (exists) {
    const current = await readText(absolutePath);
    if (normalizeText(current) === normalizeText(content)) {
      return false;
    }

    await cp(absolutePath, `${absolutePath}.bak`, { force: true });
  }

  await ensureFile(absolutePath, content);
  return true;
}

function isPlanTableHeaderLine(line) {
  return line.trim().startsWith("|") && /计划id/i.test(line);
}

function isMarkdownTableDivider(line) {
  return /^(\|\s*:?-{3,}:?\s*)+\|?$/.test(line.trim());
}

function trimBoundaryEmptyLines(lines) {
  let start = 0;
  let end = lines.length;

  while (start < end && lines[start].trim() === "") {
    start += 1;
  }
  while (end > start && lines[end - 1].trim() === "") {
    end -= 1;
  }

  return lines.slice(start, end);
}

function splitMarkdownSections(markdown) {
  const lines = normalizeText(markdown).split("\n");
  const preambleLines = [];
  const sections = [];
  let currentSection = null;

  for (const line of lines) {
    if (line.startsWith("## ")) {
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = {
        heading: line,
        title: line.slice(3).trim(),
        lines: []
      };
      continue;
    }

    if (currentSection) {
      currentSection.lines.push(line);
    } else {
      preambleLines.push(line);
    }
  }

  if (currentSection) {
    sections.push(currentSection);
  }

  return { preambleLines, sections };
}

function joinMarkdownSections(parsed) {
  const blocks = [];
  const preambleLines = trimBoundaryEmptyLines(parsed.preambleLines);

  if (preambleLines.length > 0) {
    blocks.push(preambleLines.join("\n"));
  }

  for (const section of parsed.sections) {
    const bodyLines = trimBoundaryEmptyLines(section.lines);
    const lines = [section.heading];

    if (bodyLines.length > 0) {
      lines.push("");
      lines.push(...bodyLines);
    }

    blocks.push(lines.join("\n"));
  }

  return `${blocks.join("\n\n").trimEnd()}\n`;
}

function dedupeLines(lines) {
  const seen = new Set();
  const result = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    result.push(trimmed);
  }

  return result;
}

function removePlanTableBlocks(markdown) {
  const lines = normalizeText(markdown).split("\n");
  const result = [];
  let skipping = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (!skipping && isPlanTableHeaderLine(line)) {
      skipping = true;
      continue;
    }

    if (skipping) {
      if (trimmed.startsWith("|")) {
        continue;
      }
      if (trimmed === "") {
        continue;
      }
      skipping = false;
    }

    result.push(line);
  }

  return result.join("\n");
}

function extractPlanRows(markdown) {
  const lines = normalizeText(markdown).split("\n");
  const startIndex = lines.findIndex((line) => isPlanTableHeaderLine(line));

  if (startIndex === -1) {
    return [];
  }

  const rows = [];

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line.startsWith("|")) {
      break;
    }
    if (isMarkdownTableDivider(line) || isPlanTableHeaderLine(line)) {
      continue;
    }
    rows.push(line);
  }

  return dedupeLines(rows);
}

function replacePlanTable(markdown, nextTable) {
  const lines = normalizeText(markdown).split("\n");
  const startIndex = lines.findIndex((line) => isPlanTableHeaderLine(line));

  if (startIndex === -1) {
    return markdown;
  }

  let endIndex = startIndex;
  while (endIndex < lines.length && lines[endIndex].trim().startsWith("|")) {
    endIndex += 1;
  }

  lines.splice(startIndex, endIndex - startIndex, ...nextTable.split("\n"));
  return `${lines.join("\n").trimEnd()}\n`;
}

function normalizeListLine(line) {
  const trimmed = line.trim();
  if (trimmed.startsWith("- ")) {
    return trimmed;
  }
  if (trimmed.startsWith("* ")) {
    return `- ${trimmed.slice(2).trim()}`;
  }
  if (/^\d+\.\s+/.test(trimmed)) {
    return `- ${trimmed.replace(/^\d+\.\s+/, "")}`;
  }
  return trimmed;
}

function extractCustomListLines(markdown, templateMarkdown, limit = 12) {
  if (!markdown) {
    return [];
  }

  const templateLines = new Set(
    normalizeText(templateMarkdown)
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
  );
  const customLines = [];
  const withoutPlanTables = removePlanTableBlocks(markdown);

  for (const line of normalizeText(withoutPlanTables).split("\n")) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("|")) {
      continue;
    }
    if (!/^(-|\*|\d+\.)\s+/.test(trimmed)) {
      continue;
    }

    const normalizedLine = normalizeListLine(trimmed);
    if (templateLines.has(normalizedLine) || customLines.includes(normalizedLine)) {
      continue;
    }

    customLines.push(normalizedLine);
    if (customLines.length >= limit) {
      break;
    }
  }

  return customLines;
}

function prependSection(markdown, anchorHeading, title, lines) {
  if (lines.length === 0) {
    return `${normalizeText(markdown).trimEnd()}\n`;
  }

  const sectionBlock = [`## ${title}`, "", ...lines].join("\n");
  const anchor = `## ${anchorHeading}`;
  const normalized = normalizeText(markdown);

  if (normalized.includes(anchor)) {
    return normalized.replace(anchor, `${sectionBlock}\n\n${anchor}`);
  }

  return `${normalized.trimEnd()}\n\n${sectionBlock}\n`;
}

function rewritePlanReferenceDocument(markdown) {
  const normalized = normalizeText(markdown);
  const hadPlanTable = extractPlanRows(normalized).length > 0;
  const parsed = splitMarkdownSections(removePlanTableBlocks(normalized));
  let hasPlanSection = false;

  for (const section of parsed.sections) {
    if (section.title === "计划索引") {
      section.lines = [MIGRATION_PLAN_REFERENCE];
      hasPlanSection = true;
    }
  }

  if (!hasPlanSection && hadPlanTable) {
    parsed.sections.push({
      heading: "## 计划索引",
      title: "计划索引",
      lines: [MIGRATION_PLAN_REFERENCE]
    });
  }

  return joinMarkdownSections(parsed);
}

function buildMergedPlanTable(contents) {
  const rows = [];

  for (const content of contents) {
    for (const row of extractPlanRows(content ?? "")) {
      if (!rows.includes(row)) {
        rows.push(row);
      }
    }
  }

  if (rows.length === 0) {
    return null;
  }

  return [PLAN_TABLE_HEADER, PLAN_TABLE_DIVIDER, ...rows].join("\n");
}

function buildMergedAgents({ templateAgents, legacyFacts, mergedPlanTable }) {
  let content = normalizeText(templateAgents);
  content = prependSection(content, "文档分层", "项目专属事实（从旧项目迁入）", legacyFacts);

  if (mergedPlanTable) {
    content = replacePlanTable(content, mergedPlanTable);
  }

  return `${content.trimEnd()}\n`;
}

function buildSlimClaude({ templateClaude, claudeNotes }) {
  let content = normalizeText(templateClaude);
  content = prependSection(content, "计划索引", "项目附加提示（从旧项目迁入）", claudeNotes);
  return `${content.trimEnd()}\n`;
}
