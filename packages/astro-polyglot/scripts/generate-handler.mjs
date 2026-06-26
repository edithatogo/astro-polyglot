#!/usr/bin/env node
const { mkdirSync, writeFileSync, existsSync } = await import("node:fs");
const { resolve, dirname } = await import("node:path");
const { fileURLToPath } = await import("node:url");

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, "..");

const lang = process.argv[2];
if (!lang) {
  console.error("Usage: node scripts/generate-handler.mjs <language-name>");
  process.exit(1);
}

const handlerPath = resolve(pkgRoot, "handlers", `${lang}.ts`);
if (existsSync(handlerPath)) {
  console.error(`Handler already exists at ${handlerPath}`);
  process.exit(1);
}

const fixturesDir = resolve(pkgRoot, "tests", "fixtures", lang);
const testDir = resolve(pkgRoot, "tests", "conformance");
const testPath = resolve(testDir, `${lang}.test.ts`);

const handlerContent = `import { transformToMDX, type ASTModule } from "../core/mdx-generator";
import type { BaseHandlerOptions, Handler, ValidationResult } from "../core/plugin";

interface ${capitalize(lang)}HandlerOptions extends BaseHandlerOptions {
  entryPoints: string[];
}

export const ${lang}Handler: Handler = {
  name: "${lang}",

  async generate(options) {
    const opts = options as unknown as ${capitalize(lang)}HandlerOptions;
    const entryPoints = opts.entryPoints;

    if (!entryPoints || entryPoints.length === 0) {
      throw new Error("${capitalize(lang)} handler requires at least one entryPoint");
    }

    throw new Error("${capitalize(lang)} handler not yet implemented");
  },

  async validate(_sourcePath): Promise<ValidationResult> {
    return { valid: false, errors: ["${capitalize(lang)} handler not yet implemented"] };
  },
};
`;

const testContent = `import { describeConformance } from "../helpers/conformance";
import path from "node:path";

describeConformance("${lang}", "Standard", [
  path.resolve(import.meta.dirname, "..", "fixtures", "${lang}", "sample.${lang}"),
]);
`;

mkdirSync(resolve(pkgRoot, "handlers"), { recursive: true });
mkdirSync(fixturesDir, { recursive: true });
mkdirSync(testDir, { recursive: true });
writeFileSync(handlerPath, handlerContent, "utf-8");
writeFileSync(testPath, testContent, "utf-8");

console.log(`✓ Created handler: ${handlerPath}`);
console.log(`✓ Created fixture dir: ${fixturesDir}/`);
console.log(`✓ Created conformance test: ${testPath}`);
console.log("");
console.log("Next steps:");
console.log(`  1. Add fixture file(s) to ${fixturesDir}/`);
console.log(`  2. Implement generate() in ${handlerPath}`);
console.log(`  3. Run: node scripts/register-handler.mjs ${lang}`);
console.log(`  4. Test: pnpm test:conformance`);

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
