// Runs the Vite CLI. Vite cannot work in a directory whose path contains "#"
// (it treats "#" as a URL fragment, e.g. "D:/Supply Chain/# Project For SCM MERN").
// In that case this script runs Vite through a directory junction / symlink in the
// OS temp folder whose path has no "#". vite.config.js sets
// resolve.preserveSymlinks so Vite keeps using that path. Elsewhere it simply runs Vite.
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function linkWithoutHash() {
  const link = path.join(os.tmpdir(), `procurex-${createHash("sha1").update(root).digest("hex").slice(0, 10)}`);
  if (link.includes("#")) throw new Error(`Temporary folder path also contains "#": ${link}`);
  let target = null;
  try {
    target = fs.realpathSync(link);
  } catch {
    // link does not exist yet or is broken
  }
  if (target === fs.realpathSync(root)) return link;
  try {
    fs.unlinkSync(link); // removes only a stale link, never a real folder's contents
  } catch {
    // nothing to remove
  }
  fs.symlinkSync(root, link, "junction"); // "junction" needs no admin rights on Windows; ignored elsewhere
  return link;
}

const cwd = root.includes("#") ? linkWithoutHash() : root;
// Load Vite itself through the same path; --preserve-symlinks keeps Node from resolving
// the junction back to the "#" path (Vite serves its dev client from its own location).
const nodeFlags = [];
if (cwd !== root) {
  console.log(`[procurex] Project path contains "#"; running Vite from ${cwd}`);
  nodeFlags.push("--preserve-symlinks", "--preserve-symlinks-main");
}
const viteBin = path.join(cwd, "node_modules", "vite", "bin", "vite.js");

const child = spawn(process.execPath, [...nodeFlags, viteBin, ...process.argv.slice(2)], { cwd, stdio: "inherit" });
child.on("exit", (code, signal) => process.exit(signal ? 1 : code ?? 0));
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => child.kill(sig));
