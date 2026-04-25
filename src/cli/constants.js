import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * 当前模块文件的绝对路径。
 *
 * 仅用于在 ESM 环境下推导包根目录，不对外导出。
 *
 * @type {string}
 */
const currentFile = fileURLToPath(import.meta.url);

/**
 * 当前模块所在目录。
 *
 * 与 `currentFile` 配合使用，用于稳定计算 `PACKAGE_ROOT`。
 *
 * @type {string}
 */
const currentDir = path.dirname(currentFile);

/**
 * 当前 npm 包根目录。
 *
 * 通过 `import.meta.url` 反推得到，避免依赖运行时工作目录，
 * 从而保证作为 npm bin、仓库脚本或跨平台直接执行时都能定位正确。
 *
 * @type {string}
 */
export const PACKAGE_ROOT = path.resolve(currentDir, "..", "..");

/**
 * 规范模板根目录，所有初始化、同步和迁移操作都以此为模板源。
 *
 * @type {string}
 */
export const TEMPLATE_BASE = path.join(PACKAGE_ROOT, "templates", "base");

/**
 * 技能模板目录。
 *
 * 供 `init`、`add skill`、`doctor --fix` 等命令复用，避免在多个模块中重复拼接路径。
 *
 * @type {string}
 */
export const TEMPLATE_SKILLS_DIR = path.join(TEMPLATE_BASE, "developers", "SKILLS");

/**
 * `doctor` 命令使用的最小必需文件清单。
 *
 * 缺失这些文件通常意味着规则体系尚未完成初始化或已出现结构损坏。
 *
 * @type {string[]}
 */
export const REQUIRED_FILES = [
  "AGENTS.md",
  "developers/INDEX.md",
  "developers/SKILLS/SKILL_ROUTER.md"
];

/**
 * 所有可被裁剪或补装的语言规范文件名。
 *
 * `init` 会按语言选择删除未启用项，`doctor` 会据此判断当前项目是否至少启用了一份语言规范。
 *
 * @type {string[]}
 */
export const ALL_STYLE_FILES = [
  "TYPESCRIPT_CODE-STYLE.md",
  "JAVASCRIPT_CODE-STYLE.md",
  "JAVA_CODE-STYLE.md",
  "PYTHON_CODE-STYLE.md",
  "RUST_CODE-STYLE.md",
  "HTML_CODE-STYLE.md",
  "CSS_CODE-STYLE.md"
];

/**
 * `sync` 时默认不纳入托管覆盖的模板文件。
 *
 * 这些文件通常更可能包含项目自定义内容，不适合直接按模板强制同步。
 *
 * @type {Set<string>}
 */
export const DEFAULT_SYNC_EXCLUDES = new Set(["README.md"]);

/**
 * 规则安装状态锁文件名。
 *
 * @type {string}
 */
export const LOCK_FILE = "skills.lock.json";

/**
 * 旧结构迁移后写入文档中的计划索引引用说明。
 *
 * @type {string}
 */
export const MIGRATION_PLAN_REFERENCE = "> 计划索引统一维护于 `AGENTS.md`，此处不重复。";

/**
 * 计划索引 Markdown 表头。
 *
 * @type {string}
 */
export const PLAN_TABLE_HEADER = "| 计划ID | 计划文档 | 最后更新时间 | 完成情况 | 验收状态 |";

/**
 * 计划索引 Markdown 分隔行。
 *
 * @type {string}
 */
export const PLAN_TABLE_DIVIDER = "|---|---|---|---|---|";

/**
 * 迁移旧项目时需要读取的历史入口文件。
 *
 * 这些文件用于抽取旧项目事实、计划索引和补充说明，再合并到新模板口径中。
 *
 * @type {string[]}
 */
export const MIGRATION_SOURCE_FILES = [
  "AGENTS.md",
  "CLAUDE.md",
  path.join("developers", "INDEX.md"),
  "README.md",
  "CONTRIBUTING.md"
];

/**
 * 迁移时不应作为“缺失模板补齐”自动新增的根级文件。
 *
 * 这类文件会单独走 merge / slim / rewrite 流程，避免与自动补齐逻辑冲突。
 *
 * @type {Set<string>}
 */
export const MIGRATION_SKIP_ADDS = new Set([
  "README.md",
  "AGENTS.md",
  "CLAUDE.md"
]);

/**
 * 预定义 skill-pack 到技能文件列表的映射。
 *
 * `add skill-pack <name>` 会根据该映射批量安装技能模板。
 *
 * @type {Record<string, string[]>}
 */
export const SKILL_PACKS = {
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

/**
 * CLI 支持的项目类型枚举。
 *
 * 用于参数校验、交互选择与 doctor 诊断提示。
 *
 * @type {string[]}
 */
export const PROJECT_TYPES = [
  "frontend",
  "backend-node",
  "typescript-general",
  "javascript-general",
  "backend-java",
  "python",
  "mixed"
];

/**
 * 项目类型到对应验收 skill 文件的映射。
 *
 * 当项目类型明确后，`init` 与 `doctor --fix` 会据此补齐对应的收束验收文档。
 *
 * @type {Record<string, string>}
 */
export const PROJECT_TYPE_TO_ACCEPTANCE_SKILL = {
  frontend: "developers/SKILLS/SKILL_ACCEPTANCE_FRONTEND.md",
  "backend-node": "developers/SKILLS/SKILL_ACCEPTANCE_NODE_BACKEND.md",
  "typescript-general": "developers/SKILLS/SKILL_ACCEPTANCE_TYPESCRIPT.md",
  "javascript-general": "developers/SKILLS/SKILL_ACCEPTANCE_JAVASCRIPT.md",
  "backend-java": "developers/SKILLS/SKILL_ACCEPTANCE_JAVA_BACKEND.md",
  python: "developers/SKILLS/SKILL_ACCEPTANCE_PYTHON.md"
};

/**
 * 语言标识到代码规范文件的映射。
 *
 * 值可能是单个文件名，也可能是一组文件名，例如 `web` 同时映射到 HTML 与 CSS 规范。
 *
 * @type {Record<string, string | string[]>}
 */
export const LANGUAGE_TO_STYLE_FILE = {
  typescript: "TYPESCRIPT_CODE-STYLE.md",
  javascript: "JAVASCRIPT_CODE-STYLE.md",
  java: "JAVA_CODE-STYLE.md",
  python: "PYTHON_CODE-STYLE.md",
  rust: "RUST_CODE-STYLE.md",
  web: ["HTML_CODE-STYLE.md", "CSS_CODE-STYLE.md"]
};

/**
 * 读取当前安装包版本，避免命令执行时依赖外部环境变量。
 *
 * @returns {string}
 */
export function getPackageVersion() {
  try {
    const packageJson = JSON.parse(
      readFileSync(path.join(PACKAGE_ROOT, "package.json"), "utf8")
    );
    return packageJson.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}
