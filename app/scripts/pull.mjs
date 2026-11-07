// Gets your work from the other PC with one command, from the app folder:
//   npm run pull
// A plain git pull in Nyxa leaves the foliate fork behind, so this pulls both.
import { execFileSync } from "node:child_process";

const git = (folder, ...args) => execFileSync("git", args, { cwd: folder, encoding: "utf8" }).trim();
const run = (folder, ...args) => execFileSync("git", args, { cwd: folder, stdio: "inherit" });

// Check first, so we never stop halfway with only one repo pulled (lesson 18c).
const branch = git("foliate-js", "branch", "--show-current");
if (branch !== "nyxa") {
  console.error(`foliate-js is on "${branch || "no branch"}", not nyxa. Run: cd foliate-js, then git switch nyxa`);
  process.exit(1);
}

run("..", "pull");
run("foliate-js", "pull");
