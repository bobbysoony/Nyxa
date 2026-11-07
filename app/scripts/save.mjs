// Saves your work in both repos with one command, from the app folder:
//   npm run save -- "What you changed"
// First your foliate fork (so its commit is on GitHub), then Nyxa,
// whose commit then points at that new foliate commit.
import { execFileSync } from "node:child_process";

const message = process.argv[2];
if (!message) {
  console.error('Add a message: npm run save -- "What you changed"');
  process.exit(1);
}

const git = (folder, ...args) => execFileSync("git", args, { cwd: folder, encoding: "utf8" }).trim();
const run = (folder, ...args) => execFileSync("git", args, { cwd: folder, stdio: "inherit" });

// 1. Your fork. Never commit on a detached HEAD (lesson 18c).
const branch = git("foliate-js", "branch", "--show-current");
if (branch !== "nyxa") {
  console.error(`foliate-js is on "${branch || "no branch"}", not nyxa. Run: cd foliate-js, then git switch nyxa`);
  process.exit(1);
}
if (git("foliate-js", "status", "--porcelain")) {
  run("foliate-js", "add", "-A");
  run("foliate-js", "commit", "-m", message);
}
run("foliate-js", "push");

// 2. Nyxa (the whole repo, so ".."), including the new foliate commit.
if (git("..", "status", "--porcelain")) {
  run("..", "add", "-A");
  run("..", "commit", "-m", message);
}
run("..", "push");