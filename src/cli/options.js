import { PROJECT_TYPES } from "./constants.js";

/**
 * @typedef {object} CliOptions
 * @property {string} command
 * @property {string[]} params
 * @property {boolean} yes
 * @property {boolean} check
 * @property {boolean} apply
 * @property {boolean} force
 * @property {boolean} fix
 * @property {string} target
 * @property {string[] | null} languages
 * @property {string | null} projectType
 * @property {"file" | "module" | "function" | null} indexGranularity
 * @property {boolean} help
 */

/**
 * 解析命令行参数，保留原有 CLI 参数格式。
 *
 * @param {string[]} argv
 * @returns {CliOptions}
 */
export function parseArgs(argv) {
  const args = argv.slice(2);
  const flags = new Set(args.filter((value) => value.startsWith("--")));
  const positionals = args.filter((value) => !value.startsWith("--"));

  const targetArg = args.find((value) => value.startsWith("--target="));
  const languagesArg = args.find((value) => value.startsWith("--languages="));
  const projectTypeArg = args.find((value) => value.startsWith("--project-type="));

  return {
    command: positionals[0] ?? "init",
    params: positionals.slice(1),
    yes: flags.has("--yes"),
    check: flags.has("--check"),
    apply: flags.has("--apply"),
    force: flags.has("--force"),
    fix: flags.has("--fix"),
    target: targetArg ? targetArg.slice("--target=".length) : ".",
    languages: languagesArg
      ? languagesArg
          .slice("--languages=".length)
          .split(",")
          .map((value) => value.trim().toLowerCase())
      : null,
    projectType: parseProjectType(projectTypeArg),
    indexGranularity: parseIndexGranularity(args),
    help: flags.has("--help") || flags.has("-h")
  };
}

/**
 * 输出帮助信息。
 *
 * @returns {void}
 */
export function printHelp() {
  console.log("skills-kit");
  console.log("");
  console.log("用法:");
  console.log("  skills-kit init [--yes] [--languages=typescript,python] [--project-type=frontend|backend-node|typescript-general|javascript-general|backend-java|python|mixed] [--index-granularity=file|module|function]");
  console.log("  skills-kit add <claude|language|skill|skill-pack> [name] [--target=.]");
  console.log("  skills-kit migrate [--check|--apply] [--target=.]");
  console.log("  skills-kit sync [--check|--apply] [--force] [--target=.]");
  console.log("  skills-kit doctor [--fix] [--target=.]");
  console.log("  skills-kit --help");
  console.log("");
  console.log("语言可选值: typescript, javascript, java, python, rust, web");
  console.log("项目类型可选值: frontend, backend-node, typescript-general, javascript-general, backend-java, python, mixed");
  console.log("skill-pack 可选值: core, governance, frontend, backend-node, backend-java, python");
}

/**
 * @param {string | undefined} projectTypeArg
 * @returns {string | null}
 */
function parseProjectType(projectTypeArg) {
  if (!projectTypeArg) {
    return null;
  }

  const value = projectTypeArg.slice("--project-type=".length).trim().toLowerCase();
  return PROJECT_TYPES.includes(value) ? value : null;
}

/**
 * @param {string[]} args
 * @returns {"file" | "module" | "function" | null}
 */
function parseIndexGranularity(args) {
  const granularityArg = args.find((value) => value.startsWith("--index-granularity="));
  if (!granularityArg) {
    return null;
  }

  const value = granularityArg.slice("--index-granularity=".length).toLowerCase();
  return ["file", "module", "function"].includes(value) ? value : null;
}
