// PostToolUse hook: formats every TypeScript/CSS/JSON file Claude writes or edits with Prettier.
import { spawnSync } from "node:child_process";

let input = "";
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => {
  const file = JSON.parse(input || "{}").tool_input?.file_path ?? "";
  if (/\.(ts|tsx|css|json)$/.test(file) && !file.includes("node_modules")) {
    spawnSync("npx", ["--yes", "prettier", "--write", "--log-level", "silent", file], { stdio: "ignore" });
  }
});
