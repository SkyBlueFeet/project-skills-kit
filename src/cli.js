#!/usr/bin/env node
import {
  access,
  cp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile
} from "node:fs/promises";
import { constants, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PACKAGE_ROOT = path.resolve(__dirname, "..");
const TEMPLATE_BASE = path.join(PACKAGE_ROOT, "templates", "base");
const TEMPLATE_SKILLS_DIR = path.join(TEMPLATE_BASE, "developers", "SKILLS");
const TEMPLATE_STYLES_DIR = path.join(TEMPLATE_BASE, "developers", "CODE-STYLES");
const REQUIRED_FILES = [
  "AGENTS.md",
  "developers/INDEX.md",
  "developers/SKILLS/SKILL_ROUTER.md"
];
const ALL_STYLE_FILES = [
  "TYPESCRIPT_CODE-STYLE.md",
  "JAVASCRIPT_CODE-STYLE.md",
  "JAVA_CODE-STYLE.md",
  "PYTHON_CODE-STYLE.md",
  "RUST_CODE-STYLE.md",
  "HTML_CODE-STYLE.md",
  "CSS_CODE-STYLE.md"
];
const DEFAULT_SYNC_EXCLUDES = new Set(["README.md"]);
const LOCK_FILE = "skills.lock.json";
const MIGRATION_PLAN_REFERENCE = "> 计划索引统一维护于 `AGENTS.md`，此处不重复。";
const PLAN_TABLE_HEADER = "| 计划ID | 计划文档 | 最后更新时间 | 完成情况 | 验收状态 |";
const PLAN_TABLE_DIVIDER = "|---|---|---|---|---|";
const MIGRATION_SOURCE_FILES = [
  "AGENTS.md",
  "CLAUDE.md",
  path.join("developers", "INDEX.md"),
  "README.md",
  "CONTRIBUTING.md"
];
const MIGRATION_SKIP_ADDS = new Set([
  "README.md",
  "AGENTS.md",
  "CLAUDE.md"
]);

const SKILL_PACKS = {
  core: [
    "SKILL_ROUTER.md",
    "SKILL_BOOTSTRAP.md",
    "SKILL_CODE_QUALITY_CHECK.md",
    "SKILL_SNAPSHOT.md"
  ],
  governance: [
    "SKILL_DOC_GOVERNANCE.md",
    "SKILL_CODE_GOVERNANCE.md",
    "SKILL_PLAN_INDEX.md",
    "SKILL_ACCEPTANCE.md"
  ],
  frontend: ["SKILL_ACCEPTANCE_FRONTEND.md"],
  "backend-node": ["SKILL_ACCEPTANCE_NODE_BACKEND.md"],
  "backend-java": ["SKILL_ACCEPTANCE_JAVA_BACKEND.md"],
  python: ["SKILL_ACCEPTANCE_PYTHON.md"]
};

const LANGUAGE_TO_STYLE_FILE = {
  typescript: "TYPESCRIPT_CODE-STYLE.md",
  javascript: "JAVASCRIPT_CODE-STYLE.md",
  java: "JAVA_CODE-STYLE.md",
  python: "PYTHON_CODE-STYLE.md",
  rust: "RUST_CODE-STYLE.md",
  web: ["HTML_CODE-STYLE.md", "CSS_CODE-STYLE.md"]
};

function parseArgs(argv) {
  const args = argv.slice(2);
  const flags = new Set(args.filter((value) => value.startsWith("--")));
  const positionals = args.filter((value) => !value.startsWith("--"));

  const targetArg = args.find((value) => value.startsWith("--target="));
  const languagesArg = args.find((value) => value.startsWith("--languages="));

  return {
    command: positionals[0] ?? "init",
    params: positionals.slice(1),
    yes: flags.has("--yes"),
    check: flags.has("--check"),
    apply: flags.has("--apply"),
    force: flags.has("--force"),
    fix: flags.has("--fix"),
    target: targetArg ? targetArg.slice("--target=".length) : ".",
    languages: languagesArg ? languagesArg.slice("--languages=".length).split(",").map((s) => s.trim().toLowerCase()) : null,
    indexGranularity: (() => {
      const arg = args.find((v) => v.startsWith("--index-granularity="));
      if (!arg) return null;
      const val = arg.slice("--index-granularity=".length).toLowerCase();
      return ["file", "module", "function"].includes(val) ? val : null;
    })(),
    help: flags.has("--help") || flags.has("-h")
  };
}

function formatTodayForNote(date) {
  const yy = String(date.getFullYear()).slice(2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `NOTE_${yy}_${mm}_${dd}.md`;
}

async function pathExists(targetPath) {
  try {
    await access(targetPath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function ensureFile(targetPath, content) {
  await mkdir(path.dirname(targetPath), { recursive: true });
  await writeFile(targetPath, content, "utf8");
}

async function copyFromTemplate(targetRoot, relativePath, force = true) {
  const source = path.join(TEMPLATE_BASE, relativePath);
  const destination = path.join(targetRoot, relativePath);
  await mkdir(path.dirname(destination), { recursive: true });
  if (!force && await pathExists(destination)) {
    console.log(`跳过（已存在）: ${relativePath}`);
    return;
  }
  await cp(source, destination, { force });
}

async function removeIfExists(targetPath) {
  if (await pathExists(targetPath)) {
    await rm(targetPath, { force: true });
  }
}

async function applyLanguageSelection(targetRoot, selectedLanguages) {
  const stylesDir = path.join(targetRoot, "developers", "CODE-STYLES");
  await mkdir(stylesDir, { recursive: true });

  const keep = new Set();
  for (const language of selectedLanguages) {
    const mapped = LANGUAGE_TO_STYLE_FILE[language];
    if (Array.isArray(mapped)) {
      mapped.forEach((entry) => keep.add(entry));
    } else {
      keep.add(mapped);
    }
  }

  const allStyleFiles = [
    ...ALL_STYLE_FILES
  ];

  for (const fileName of allStyleFiles) {
    const targetFile = path.join(stylesDir, fileName);
    if (!keep.has(fileName)) {
      await removeIfExists(targetFile);
    }
  }
}

async function createSessionNote(targetRoot) {
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

async function readLock(targetRoot) {
  const lockPath = path.join(targetRoot, LOCK_FILE);
  if (!(await pathExists(lockPath))) return null;
  try {
    return JSON.parse(await readFile(lockPath, "utf8"));
  } catch {
    return null;
  }
}

async function writeLock(targetRoot, lock) {
  const lockPath = path.join(targetRoot, LOCK_FILE);
  lock.updatedAt = new Date().toISOString();
  await writeFile(lockPath, JSON.stringify(lock, null, 2), "utf8");
}

function makeLock(packageVersion, languages, includeClaude, includeDocsGovernance, codeIndexGranularity) {
  const now = new Date().toISOString();
  return {
    version: 1,
    packageVersion,
    createdAt: now,
    updatedAt: now,
    languages,
    includeClaude,
    includeDocsGovernance,
    codeIndexGranularity: codeIndexGranularity ?? null,
    skills: []
  };
}

function lockAddSkill(lock, skillFile) {
  const already = lock.skills.some((s) => s.file === skillFile);
  if (!already) {
    lock.skills.push({ name: path.basename(skillFile, ".md"), file: skillFile, installedAt: new Date().toISOString() });
  }
}

function getPackageVersion() {
  try {
    const pkg = JSON.parse(readFileSync(path.join(PACKAGE_ROOT, "package.json"), "utf8"));
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

async function runInit(options) {
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

  const GRANULARITY_CHOICES = [
    { name: "不启用", value: null },
    { name: "文件级（file）：文件路径 + 用途描述", value: "file" },
    { name: "模块级（module）：文件级 + 类/接口/导出符号", value: "module" },
    { name: "函数级（function）：模块级 + 函数/方法签名", value: "function" }
  ];
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

  // 写入 lock 文件
  const lock = makeLock(getPackageVersion(), selectedLanguages, includeClaude, includeDocsGovernance, codeIndexGranularity);
  if (includeDocsGovernance) {
    for (const file of await listTemplateFiles(TEMPLATE_SKILLS_DIR)) {
      lockAddSkill(lock, `developers/SKILLS/${file}`);
    }
  }
  await writeLock(targetDir, lock);

  let sessionPath = null;
  if (includeDocsGovernance) {
    sessionPath = await createSessionNote(targetDir);
  }

  console.log("已完成 project-rules 初始化。");
  console.log(`目标目录: ${targetDir}`);
  console.log(`语言规范: ${selectedLanguages.join(", ")}`);
  console.log(`CLAUDE.md: ${includeClaude ? "已生成" : "未生成"}`);
  console.log(`文档治理: ${includeDocsGovernance ? "已启用" : "未启用"}`);
  console.log(`代码索引粒度: ${codeIndexGranularity ?? "未启用"}`);
  console.log(`Lock 文件: ${path.join(targetDir, LOCK_FILE)}`);
  if (sessionPath) {
    console.log(`会话留痕文件: ${sessionPath}`);
  }
}

function toStyleFiles(language) {
  const mapped = LANGUAGE_TO_STYLE_FILE[language];
  if (!mapped) {
    return null;
  }
  return Array.isArray(mapped) ? mapped : [mapped];
}

async function runAdd(options) {
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
    const styleFiles = toStyleFiles(name.toLowerCase());
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
    // 更新 lock
    const lock = await readLock(targetDir);
    if (lock) {
      if (!lock.languages.includes(name.toLowerCase())) {
        lock.languages.push(name.toLowerCase());
      }
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
    const relPath = path.join("developers", "SKILLS", skillFile);
    await copyFromTemplate(targetDir, relPath, false);
    await copyFromTemplate(targetDir, path.join("developers", "SKILLS", "README.md"), false);
    // 更新 lock
    const lock = await readLock(targetDir);
    if (lock) {
      lockAddSkill(lock, relPath.replace(/\\/g, "/"));
      await writeLock(targetDir, lock);
    }
    console.log(`已添加技能: ${skillFile}`);
    return;
  }

  if (resource === "skill-pack") {
    if (!name) {
      const packNames = Object.keys(SKILL_PACKS).join(", ");
      throw new Error(`请指定 skill-pack 名称。可选: ${packNames}`);
    }
    const packFiles = SKILL_PACKS[name.toLowerCase()];
    if (!packFiles) {
      const packNames = Object.keys(SKILL_PACKS).join(", ");
      throw new Error(`未知 skill-pack: ${name}。可选: ${packNames}`);
    }
    const lock = await readLock(targetDir);
    for (const skillFile of packFiles) {
      const relPath = `developers/SKILLS/${skillFile}`;
      const source = path.join(TEMPLATE_SKILLS_DIR, skillFile);
      if (!(await pathExists(source))) {
        console.log(`跳过（模板不存在）: ${skillFile}`);
        continue;
      }
      await copyFromTemplate(targetDir, relPath, false);
      if (lock) lockAddSkill(lock, relPath);
    }
    await copyFromTemplate(targetDir, path.join("developers", "SKILLS", "README.md"), false);
    if (lock) await writeLock(targetDir, lock);
    console.log(`已安装 skill-pack: ${name}（${packFiles.length} 个技能）`);
    return;
  }

  throw new Error(`不支持的 add 资源: ${resource}。支持: claude, language <name>, skill <name>`);
}

async function listTemplateFiles(dir, root = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await listTemplateFiles(abs, root);
      files.push(...nested);
      continue;
    }
    files.push(path.relative(root, abs));
  }
  return files;
}

async function readText(filePath) {
  return readFile(filePath, "utf8");
}

function normalizeText(value) {
  return value.replace(/\r\n/g, "\n");
}

function normalizeRelativePath(relativePath) {
  return relativePath.replace(/\\/g, "/");
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

  const templateFiles = await listTemplateFiles(TEMPLATE_BASE);
  const additions = [];

  for (const relativePath of templateFiles) {
    const normalizedRelativePath = normalizeRelativePath(relativePath);
    const isStyleFile = normalizedRelativePath.startsWith("developers/CODE-STYLES/");
    if (DEFAULT_SYNC_EXCLUDES.has(relativePath) || isStyleFile || MIGRATION_SKIP_ADDS.has(normalizedRelativePath)) {
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

async function runMigrate(options) {
  const targetDir = path.resolve(options.target);
  const modeCheck = options.check || !options.apply;
  const context = await loadMigrationContext(targetDir);
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

async function runSync(options) {
  const targetDir = path.resolve(options.target);
  const modeCheck = options.check || !options.apply;
  const allowOverwrite = options.force;

  // lock 版本感知提示
  const lock = await readLock(targetDir);
  const currentVersion = getPackageVersion();
  if (lock && lock.packageVersion !== currentVersion) {
    console.log(`提示: lock 记录版本 ${lock.packageVersion}，当前包版本 ${currentVersion}，建议检查更新。`);
  }

  const templateFiles = await listTemplateFiles(TEMPLATE_BASE);
  const managed = templateFiles.filter((entry) => !DEFAULT_SYNC_EXCLUDES.has(entry));

  const added = [];
  const updated = [];
  const conflict = [];
  const unchanged = [];

  for (const relativePath of managed) {
    const isStyleFile = path.normalize(relativePath).startsWith(
      path.normalize("developers/CODE-STYLES/")
    );
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
      console.log(`  - ${item}`);
    }
  }
  if (updated.length > 0) {
    console.log("updated:");
    for (const item of updated) {
      console.log(`  - ${item}`);
    }
  }
  if (conflict.length > 0) {
    console.log("conflict:");
    for (const item of conflict) {
      console.log(`  - ${item}`);
    }
    if (modeCheck) {
      console.log("提示: 使用 --apply --force 可覆盖冲突文件。");
    }
  }
}

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

async function checkMarkdownLinks(targetDir, files) {
  const broken = [];
  for (const file of files) {
    const abs = path.join(targetDir, file);
    if (!(await pathExists(abs))) {
      continue;
    }
    const content = await readFile(abs, "utf8");
    const links = extractLocalLinks(content);
    const baseDir = path.dirname(abs);
    for (const link of links) {
      const resolved = path.resolve(baseDir, link);
      if (!(await pathExists(resolved))) {
        broken.push(`${file} -> ${link}`);
      }
    }
  }
  return broken;
}

async function runDoctor(options) {
  const targetDir = path.resolve(options.target);
  const errors = [];
  const warnings = [];
  const fixed = [];

  for (const requiredFile of REQUIRED_FILES) {
    const abs = path.join(targetDir, requiredFile);
    if (!(await pathExists(abs))) {
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

  const filesToCheckLinks = [
    "AGENTS.md",
    "CLAUDE.md",
    "developers/INDEX.md",
    "developers/DOC-RULES.md"
  ];
  const brokenLinks = await checkMarkdownLinks(targetDir, filesToCheckLinks);
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
      warnings.push("CLAUDE.md 含计划索引表，建议仅引用 AGENTS.md，可执行 project-rules-kit migrate --check。");
    }
  }

  const indexPath = path.join(targetDir, "developers", "INDEX.md");
  if (await pathExists(indexPath)) {
    const index = await readFile(indexPath, "utf8");
    if (index.includes("| 计划ID |")) {
      warnings.push("developers/INDEX.md 含计划索引表，建议仅引用 AGENTS.md，可执行 project-rules-kit migrate --check。");
    }
  }

  const docRulesPath = path.join(targetDir, "developers", "DOC-RULES.md");
  if (await pathExists(docRulesPath)) {
    const docRules = await readFile(docRulesPath, "utf8");
    // 检测旧口径：三处同步列表模式（连续出现三个文件的列表项）
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

  // 计划索引口径冲突检测：CLAUDE.md / INDEX.md 不应含独立计划索引表
  const planIndexFiles = [
    { file: "CLAUDE.md", label: "CLAUDE.md" },
    { file: "developers/INDEX.md", label: "developers/INDEX.md" }
  ];
  for (const { file, label } of planIndexFiles) {
    const abs = path.join(targetDir, file);
    if (await pathExists(abs)) {
      const content = await readFile(abs, "utf8");
      if (content.includes("| 计划ID |") || content.includes("| 计划id |")) {
        warnings.push(
          `口径冲突: ${label} 含独立计划索引表，计划索引应仅维护于 AGENTS.md。建议执行 project-rules-kit migrate --check。`
        );
      }
    }
  }

  // SKILL_ROUTER 存在性检测（已在 REQUIRED_FILES 覆盖错误级别，此处补充修复建议）
  const routerPath = path.join(targetDir, "developers", "SKILLS", "SKILL_ROUTER.md");
  if (!(await pathExists(routerPath)) && options.fix) {
    const templateSource = path.join(TEMPLATE_BASE, "developers", "SKILLS", "SKILL_ROUTER.md");
    if (await pathExists(templateSource)) {
      await copyFromTemplate(targetDir, "developers/SKILLS/SKILL_ROUTER.md", false);
      fixed.push("已补齐: developers/SKILLS/SKILL_ROUTER.md");
    }
  }

  // Skill 链路可达性检测：检查 SKILL_ROUTER 中引用的所有 Skill 链接是否存在
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

  // lock 一致性检测：lock 中记录的 skill 文件是否实际存在
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

    // 代码索引检测：lock 启用了代码索引但文档缺失
    if (lock.codeIndexGranularity) {
      const codeIndexPath = path.join(targetDir, "developers", "CODE-INDEX.md");
      if (!(await pathExists(codeIndexPath))) {
        warnings.push(
          `代码索引文档缺失: developers/CODE-INDEX.md（粒度: ${lock.codeIndexGranularity}）。` +
          `请按 developers/SKILLS/SKILL_CODE_INDEX.md 建立索引，` +
          `或执行 npx @skybluefeet/skills-kit add skill code-index 确认技能已安装。`
        );
      }
    }
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

function printHelp() {
  console.log("project-rules-kit");
  console.log("");
  console.log("用法:");
  console.log("  project-rules-kit init [--yes] [--languages=typescript,python] [--index-granularity=file|module|function]");
  console.log("  project-rules-kit add <claude|language|skill|skill-pack> [name] [--target=.]");
  console.log("  project-rules-kit migrate [--check|--apply] [--target=.]");
  console.log("  project-rules-kit sync [--check|--apply] [--force] [--target=.]");
  console.log("  project-rules-kit doctor [--fix] [--target=.]");
  console.log("  project-rules-kit --help");
  console.log("");
  console.log("语言可选值: typescript, javascript, java, python, rust, web");
  console.log("skill-pack 可选值: core, governance, frontend, backend-node, backend-java, python");
}

async function main() {
  const options = parseArgs(process.argv);
  if (options.help) {
    printHelp();
    return;
  }

  if (options.command === "init") {
    await runInit(options);
    return;
  }
  if (options.command === "add") {
    await runAdd(options);
    return;
  }
  if (options.command === "migrate") {
    await runMigrate(options);
    return;
  }
  if (options.command === "sync") {
    await runSync(options);
    return;
  }
  if (options.command === "doctor") {
    await runDoctor(options);
    return;
  }

  printHelp();
  console.error(`\n错误: 不支持的命令 "${options.command}"`);
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(`执行失败: ${error.message}`);
  process.exitCode = 1;
});
