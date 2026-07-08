import { spawnSync } from "node:child_process";
import { join } from "node:path";

const command = join(
  process.cwd(),
  "node_modules",
  ".bin",
  process.platform === "win32" ? "next.cmd" : "next",
);
const result = spawnSync(command, ["build"], {
  env: {
    ...process.env,
    BUILD_TARGET: "android",
  },
  shell: process.platform === "win32",
  stdio: "inherit",
});

if (result.error) {
  console.error(result.error);
}

process.exit(result.status ?? 1);
