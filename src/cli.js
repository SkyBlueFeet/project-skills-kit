#!/usr/bin/env node

import { main } from "./cli/main.js";

main().catch((error) => {
  console.error(`执行失败: ${error.message}`);
  process.exitCode = 1;
});
