#!/usr/bin/env node
const { writeFileSync, existsSync, mkdirSync } = await import("node:fs");
const { resolve, dirname } = await import("node:path");
const { fileURLToPath } = await import("node:url");

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, "..");

const lang = process.argv[2];
const standard = process.argv[3] ?? "Standard";

if (!lang) {
  console.error("Usage: node scripts/generate-conformance.mjs <language-name> [standard-name]");
  process.exit(1);
}

const testDir = resolve(pkgRoot, "tests", "conformance");
const testPath = resolve(testDir, `${lang}.test.ts`);

if (existsSync(testPath)) {
  console.error(`Conformance test already exists at ${testPath}`);
  process.exit(1);
}

const content = `import { describeConformance } from "../helpers/conformance";
import path from "node:path";

describeConformance("${lang}", "${standard}", [
  path.resolve(import.meta.dirname, "..", "fixtures", "${lang}", "sample.${lang}"),
]);
`;

mkdirSync(testDir, { recursive: true });
writeFileSync(testPath, content, "utf-8");

console.log(`✓ Created conformance test: ${testPath}`);
