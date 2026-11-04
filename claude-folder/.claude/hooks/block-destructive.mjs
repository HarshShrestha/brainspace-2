// PreToolUse hook: blocks destructive shell commands on protected files, databases and git history.
// Exit code 2 tells Claude Code to block the command and show the message to the model.
let input = "";
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => {
  const command = JSON.parse(input || "{}").tool_input?.command ?? "";

  const alwaysBlocked = [/dropDatabase/, /git push (--force|-f)\b/, /git reset --hard/];
  for (const pattern of alwaysBlocked) {
    if (pattern.test(command)) {
      console.error(`BLOCKED: destructive command not allowed (${pattern})`);
      process.exit(2);
    }
  }

  const protectedPaths = [".env", "package-lock.json", ".git/", "docs/"];
  const destructive = ["rm ", "rm -", "unlink ", "truncate ", "> "];
  if (destructive.some((d) => command.includes(d))) {
    const hit = protectedPaths.find((p) => command.includes(p) && !command.includes(".env.example"));
    if (hit) {
      console.error(`BLOCKED: Cannot run destructive command on protected file: ${hit}`);
      process.exit(2);
    }
  }
});
