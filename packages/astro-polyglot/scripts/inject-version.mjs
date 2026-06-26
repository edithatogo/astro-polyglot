#!/usr/bin/env node
/**
 * astro-polyglot — Build-time version injection
 *
 * Reads `version` from the package's own `package.json` and prints a
 * tsup-compatible `--define` argument that replaces the `POLYGLOT_VERSION`
 * identifier at build time. This embeds the version directly into the
 * bundle (both ESM and CJS) without any runtime `fs` reads.
 *
 * Usage:
 *   tsup index.ts $(node scripts/inject-version.mjs)
 *
 * The script outputs, e.g.:
 *   --define.POLYGLOT_VERSION=0.1.0
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const pkgPath = join(here, "..", "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));

if (!pkg.version || !/^\d+\.\d+\.\d+/.test(pkg.version)) {
  console.error(`[inject-version] Invalid or missing "version" in ${pkgPath}`);
  process.exit(1);
}

process.stdout.write(`--define.POLYGLOT_VERSION='"${pkg.version}"'`);
