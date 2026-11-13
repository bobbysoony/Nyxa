// Moves unfinished work between PCs through the Sync branch, without committing on main.
// From the app folder:
//   npm run sync        on the PC you're leaving: sends your changes to Sync
//   npm run sync:get    on the PC you're coming to: puts them back as uncommitted changes
// Sync is always "main + your changes", made fresh each time, so it never needs merging.
import { execFileSync } from "node:child_process";

const git = (...args) => execFileSync("git", args, { cwd: "..", encoding: "utf8" }).trim();
const run = (...args) => execFileSync("git", args, { cwd: "..", stdio: "inherit" });
const shortHash = (ref) => git("rev-parse", "--short", ref);

// Only Nyxa's own files: git can't carry foliate's unsaved changes in a Nyxa commit.
const files = ["--", ".", ":(exclude)app/foliate-js"];

if (process.argv[2] === "get") {
  if (git("status", "--porcelain", ...files)) {
    console.error("You have changes here already. Save or undo them first, so nothing gets mixed up.");
    process.exit(1);
  }
  run("fetch", "origin", "Sync");
  // Your changes only fit on the commit they were made on.
  if (git("rev-parse", "HEAD") !== git("rev-parse", "FETCH_HEAD^")) {
    console.error(`Sync was made on ${shortHash("FETCH_HEAD^")}, you're on ${shortHash("HEAD")}. Run npm run pull first.`);
    process.exit(1);
  }
  const diff = execFileSync("git", ["diff", "--binary", "HEAD", "FETCH_HEAD", ...files], { cwd: "..", encoding: "utf8" });
  if (!diff) {
    console.log("Sync has no changes on it.");
    process.exit(0);
  }
  execFileSync("git", ["apply"], { cwd: "..", input: diff, stdio: ["pipe", "inherit", "inherit"] });
  console.log("Done: your changes are here, uncommitted. Carry on, then npm run save when it's finished.");
} else {
  if (git("-C", "app/foliate-js", "status", "--porcelain")) {
    console.warn("Heads up: foliate-js has unsaved changes, and they won't go with this sync.");
  }
  // A spare index (git's staging area), so your real one on main isn't touched.
  const env = { ...process.env, GIT_INDEX_FILE: git("rev-parse", "--path-format=absolute", "--git-path", "sync-index") };
  const git2 = (...args) => execFileSync("git", args, { cwd: "..", encoding: "utf8", env }).trim();
  git2("read-tree", "HEAD");
  git2("add", "-A");
  const tree = git2("write-tree");
  const commit = git("commit-tree", tree, "-p", "HEAD", "-m", `Sync ${new Date().toLocaleString()}`);
  // --force: Sync is rebuilt from main every time, so its old copy is meant to be replaced.
  run("push", "--force", "origin", `${commit}:refs/heads/Sync`);
  console.log("Sent to Sync. On the other PC: npm run pull, then npm run sync:get");
}
