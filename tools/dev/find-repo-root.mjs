#!/usr/bin/env node
/**
 * Finds the gymbro repo root by walking up from CWD until a package.json
 * with name "gymbro" OR with workspaces/monorepo structure is found.
 * Prints absolute path to STDOUT. Exits with code 1 if not found.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const cwd = process.cwd();

function looksLikeMonorepo(pkg) {
  if (!pkg || typeof pkg !== "object") return false;
  if (pkg.name === "gymbro") return true;
  if (pkg.workspaces) return true;
  return false;
}

function findUp(startDir) {
  let dir = startDir;
  while (true) {
    const pkgPath = path.join(dir, "package.json");
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
        if (looksLikeMonorepo(pkg)) return dir;
      } catch {}
    }
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

const root = findUp(cwd);
if (!root) {
  console.error(
    "[gymbro] Could not locate repo root. Make sure you are inside the gymbro repository.\n" +
    "Tip: `cd ~/Projects/gymbro` then re-run your command."
  );
  process.exit(1);
}

process.stdout.write(root);
