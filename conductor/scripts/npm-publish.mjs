#!/usr/bin/env node
/**
 * Safe npm publication preflight for astro-polyglot.
 *
 * This script intentionally never reads local token files and never runs an
 * actual publish. Use the GitHub Actions release/manual publish workflows for
 * authenticated publication with npm provenance.
 */
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(scriptDir, "../..");
const packageDir = resolve(rootDir, "packages/astro-polyglot");

function run(command, args, options = {}) {
  console.log(`$ ${command} ${args.join(" ")}`);
  return execFileSync(command, args, {
    cwd: options.cwd ?? rootDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: options.timeout ?? 120_000,
  });
}

function main() {
  console.log("=== astro-polyglot npm publication preflight ===\n");

  run("pnpm", ["--filter", "astro-polyglot", "build"]);

  const packOutput = run("npm", ["pack", "--dry-run", "--json"], { cwd: packageDir });
  const [packResult] = JSON.parse(packOutput);
  console.log(
    [
      `Package: ${packResult.name}@${packResult.version}`,
      `Tarball size: ${packResult.size} bytes`,
      `Unpacked size: ${packResult.unpackedSize} bytes`,
      `File count: ${packResult.files.length}`,
    ].join("\n"),
  );

  const leakedBuildOutput = packResult.files.some((file) => file.path.includes("/target/"));
  if (leakedBuildOutput) {
    throw new Error("Package preflight failed: Rust target build output is included in the tarball.");
  }

  let registryView = "not published";
  try {
    registryView = run("npm", ["view", "astro-polyglot", "version", "--json"], {
      cwd: packageDir,
      timeout: 30_000,
    }).trim();
  } catch {
    // npm view exits non-zero before the package exists.
  }

  console.log(`Registry version: ${registryView}`);
  console.log("\nPreflight complete. Publish through GitHub Actions, not this local script.");
}

main();
