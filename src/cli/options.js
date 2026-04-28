import { GOVERNANCE_PROFILES, PROJECT_TYPES } from "./constants.js";

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
 * @property {"recommended" | "strict" | "balanced" | "minimal" | "off" | null} governanceProfile
 * @property {"required" | "optional" | "off" | null} sessionNotesMode
 * @property {"required" | "optional" | "off" | null} qualityChecksMode
 * @property {"required" | "optional" | "off" | null} planIndexMode
 * @property {"required" | "optional" | "off" | null} routerMode
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
    governanceProfile: parseGovernanceProfile(args),
    sessionNotesMode: parseGovernanceMode(args, "--session-notes="),
    qualityChecksMode: parseGovernanceMode(args, "--quality-checks="),
    planIndexMode: parseGovernanceMode(args, "--plan-index="),
    routerMode: parseGovernanceMode(args, "--router="),
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
  console.log("  skills-kit init [--yes] [--languages=typescript,python] [--project-type=frontend|backend-node|typescript-general|javascript-general|backend-java|python|mixed] [--index-granularity=file|module|function] [--governance-profile=recommended|strict|balanced|minimal|off] [--session-notes=required|optional|off] [--quality-checks=required|optional|off] [--plan-index=required|optional|off] [--router=required|optional|off]");
  console.log("  skills-kit add <claude|language|skill|skill-pack> [name] [--target=.]");
  console.log("  skills-kit migrate [--check|--apply] [--target=.]");
  console.log("  skills-kit sync [--check|--apply] [--force] [--target=.]");
  console.log("  skills-kit doctor [--fix] [--target=.]");
  console.log("  skills-kit --help");
  console.log("");
  console.log("语言可选值: typescript, javascript, java, python, rust, web");
  console.log("项目类型可选值: frontend, backend-node, typescript-general, javascript-general, backend-java, python, mixed");
  console.log(`治理档位可选值: ${GOVERNANCE_PROFILES.join(", ")}`);
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

/**
 * @param {string[]} args
 * @returns {"recommended" | "strict" | "balanced" | "minimal" | "off" | null}
 */
function parseGovernanceProfile(args) {
  const profileArg = args.find((value) => value.startsWith("--governance-profile="));
  if (!profileArg) {
    return null;
  }

  const value = profileArg.slice("--governance-profile=".length).toLowerCase();
  return GOVERNANCE_PROFILES.includes(value) ? value : null;
}

/**
 * @param {string[]} args
 * @param {string} prefix
 * @returns {"required" | "optional" | "off" | null}
 */
function parseGovernanceMode(args, prefix) {
  const modeArg = args.find((value) => value.startsWith(prefix));
  if (!modeArg) {
    return null;
  }

  const value = modeArg.slice(prefix.length).toLowerCase();
  return ["required", "optional", "off"].includes(value) ? value : null;
}
