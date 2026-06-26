/**
 * astro-polyglot — Dynamic Version
 *
 * Exposes the package version at runtime. The `POLYGLOT_VERSION` identifier
 * is replaced at build time by tsup (`--define.POLYGLOT_VERSION`) so the
 * version is embedded directly into the bundle — no runtime `fs` reads,
 * no `require()` of `package.json`, and it works identically in ESM and CJS.
 *
 * During development (e.g. under vitest, which does not apply the define),
 * the fallback reads the version from the sibling `package.json` via a
 * statically known relative path.
 *
 * @module core/version
 */

declare const POLYGLOT_VERSION: string | undefined;

/**
 * The semantic version of the astro-polyglot package.
 *
 * Resolved in the following order:
 * 1. The build-time `--define.POLYGLOT_VERSION` injection (production bundles).
 * 2. A runtime fallback to `package.json#version` (tests / unbundled dev).
 * 3. `"0.0.0-dev"` if neither is available.
 */
export const VERSION: string =
  typeof POLYGLOT_VERSION !== "undefined" && POLYGLOT_VERSION ? POLYGLOT_VERSION : readVersionFallback();

/**
 * Resolve the version from `package.json` at module-evaluation time.
 * Kept lazy-ish via an IIFE so the `fs` import is only touched in the
 * fallback path (production bundles never reach here because the define
 * short-circuits the ternary above).
 */
function readVersionFallback(): string {
  try {
    // Lazy require to avoid bundler pulling in node:fs for the define path.
    // The path is resolved relative to this source file → ../package.json
    const { createRequire } = require("node:module") as {
      createRequire: (filename: string) => NodeRequire;
    };
    const requireFromHere = createRequire(import.meta.url);
    const pkg = requireFromHere("../package.json") as { version?: string };
    return pkg.version ?? "0.0.0-dev";
  } catch {
    return "0.0.0-dev";
  }
}
