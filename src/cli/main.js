import { runAdd } from "./commands/add.js";
import { runDoctor } from "./commands/doctor.js";
import { runInit } from "./commands/init.js";
import { runMigrate } from "./commands/migrate.js";
import { runSync } from "./commands/sync.js";
import { parseArgs, printHelp } from "./options.js";

/**
 * 命令名到处理器的分发表。
 *
 * 新命令只需在此注册，无需继续扩展主入口中的条件分支。
 *
 * @type {Record<string, (options: import("./options.js").CliOptions) => Promise<void>>}
 */
const COMMAND_HANDLERS = {
  init: runInit,
  add: runAdd,
  migrate: runMigrate,
  sync: runSync,
  doctor: runDoctor
};

/**
 * CLI 主入口：解析参数后分发到对应命令处理器。
 *
 * @param {string[]} [argv=process.argv]
 * @returns {Promise<void>}
 */
export async function main(argv = process.argv) {
  const options = parseArgs(argv);
  if (options.help) {
    printHelp();
    return;
  }

  const handler = COMMAND_HANDLERS[options.command];
  if (!handler) {
    printHelp();
    console.error(`\n错误: 不支持的命令 "${options.command}"`);
    process.exitCode = 1;
    return;
  }

  await handler(options);
}
