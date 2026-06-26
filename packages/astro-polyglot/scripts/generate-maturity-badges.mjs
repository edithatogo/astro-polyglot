#!/usr/bin/env node
/**
 * Generates markdown maturity badges for all language handlers.
 * Reads maturity levels from a config file and outputs badge markdown.
 *
 * Usage: node scripts/generate-maturity-badges.mjs [--json]
 */

const { readFileSync, writeFileSync } = await import("node:fs");
const { resolve, dirname } = await import("node:path");
const { fileURLToPath } = await import("node:url");

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, "..");

const maturityConfigPath = resolve(pkgRoot, "scripts", "handler-maturity.json");

const defaultMaturity = {
  python: "stable",
  typescript: "stable",
  rust: "stable",
  go: "stable",
  csharp: "stable",
  java: "stable",
  kotlin: "stable",
  cpp: "beta",
  swift: "beta",
  r: "stable",
  julia: "beta",
  scala: "beta",
  ruby: "beta",
  dart: "beta",
  php: "beta",
  elixir: "beta",
  stata: "experimental",
  sas: "experimental",
};

let maturity;
try {
  maturity = JSON.parse(readFileSync(maturityConfigPath, "utf-8"));
} catch {
  maturity = defaultMaturity;
}

const badgeColors = {
  stable: "brightgreen",
  beta: "yellow",
  experimental: "orange",
  deprecated: "red",
  unknown: "lightgrey",
};

const badges = Object.entries(maturity)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([lang, level]) => {
    const color = badgeColors[level] ?? badgeColors.unknown;
    return `![${lang}](https://img.shields.io/badge/${lang}-${level}-${color})`;
  });

const output = badges.join("\n");

const isJson = process.argv.includes("--json");
if (isJson) {
  console.log(JSON.stringify(maturity, null, 2));
} else {
  console.log(output);
}

const outputPath = resolve(pkgRoot, "HANDLER_MATURITY.md");
writeFileSync(outputPath, `# Handler Maturity\n\n${output}\n`);
console.log(`\n✓ Badges written to ${outputPath}`);
