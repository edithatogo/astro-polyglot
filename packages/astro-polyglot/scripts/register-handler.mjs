#!/usr/bin/env node
const { readFileSync, writeFileSync } = await import("node:fs");
const { resolve, dirname } = await import("node:path");
const { fileURLToPath } = await import("node:url");

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, "..");

const lang = process.argv[2];
if (!lang) {
  console.error("Usage: node scripts/register-handler.mjs <language-name>");
  process.exit(1);
}

// 1. Add language to the Language union type in core/handler.ts
const handlerPath = resolve(pkgRoot, "core", "handler.ts");
let handlerContent = readFileSync(handlerPath, "utf-8");

const languageUnionRegex = /export type Language =\n([\s\S]*?);/;
const languageMatch = handlerContent.match(languageUnionRegex);
if (!languageMatch) {
  console.error("Could not find Language union type in core/handler.ts");
  process.exit(1);
}

const existingLanguages = languageMatch[1];
const langEntries = existingLanguages.split("\n").map(l => l.trim()).filter(Boolean);

const alreadyExists = langEntries.some(e => e.includes(`"${lang}"`));
if (alreadyExists) {
  console.error(`Language "${lang}" already exists in the Language union type`);
} else {
  // Find the last language entry and add after it
  const lastEntry = langEntries[langEntries.length - 1];
  const lastIndex = handlerContent.lastIndexOf(lastEntry);
  const insertPos = lastIndex + lastEntry.length;
  handlerContent =
    handlerContent.slice(0, insertPos) +
    `\n  | "${lang}"` +
    handlerContent.slice(insertPos);
  writeFileSync(handlerPath, handlerContent, "utf-8");
  console.log(`✓ Added "${lang}" to Language union type in core/handler.ts`);
}

// 2. Add import and handler entry to core/router.ts
const routerPath = resolve(pkgRoot, "core", "router.ts");
let routerContent = readFileSync(routerPath, "utf-8");

const importStatement = `import { ${lang}Handler } from "../handlers/${lang}";`;
if (!routerContent.includes(importStatement)) {
  // Find the last handler import and add after it
  const importRegex = /import \{ (\w+)Handler \} from "\.\.\/handlers\/\w+";/g;
  let lastImport;
  let match;
  while ((match = importRegex.exec(routerContent)) !== null) {
    lastImport = match[0];
  }
  if (lastImport) {
    const lastImportIndex = routerContent.lastIndexOf(lastImport);
    routerContent =
      routerContent.slice(0, lastImportIndex + lastImport.length) +
      "\n" + importStatement +
      routerContent.slice(lastImportIndex + lastImport.length);
    writeFileSync(routerPath, routerContent, "utf-8");
    console.log(`✓ Added import for ${lang}Handler in core/router.ts`);
  } else {
    console.error("Could not find handler imports in core/router.ts");
    process.exit(1);
  }
} else {
  console.log(`Import for ${lang}Handler already exists in core/router.ts`);
}

// Add to getHandlerMap()
const mapEntryRegex = /(\s+)(\/\/ Phase \d+ handlers.*)/;
const mapMatch = routerContent.match(mapEntryRegex);
if (mapMatch) {
  const mapEntry = `    ${lang}: registeredHandler("${lang}", ${lang}Handler),`;
  if (!routerContent.includes(mapEntry)) {
    // Find the last entry in getHandlerMap() and add after it
    const lastMapEntryRegex = /(\s+)(\w+): registeredHandler\("\w+", \w+Handler\),/g;
    let lastMapEntry;
    while ((match = lastMapEntryRegex.exec(routerContent)) !== null) {
      lastMapEntry = match[0];
    }
    if (lastMapEntry) {
      const lastEntryIndex = routerContent.lastIndexOf(lastMapEntry);
      routerContent =
        routerContent.slice(0, lastEntryIndex + lastMapEntry.length) +
        "\n" + mapEntry +
        routerContent.slice(lastEntryIndex + lastMapEntry.length);
      writeFileSync(routerPath, routerContent, "utf-8");
      console.log(`✓ Added ${lang} to getHandlerMap() in core/router.ts`);
    }
  }
}

// 3. Add config type to PolyglotConfig in core/router.ts
const configEntry = `  ${lang}?: HandlerConfig;`;
if (!routerContent.includes(configEntry)) {
  const configSection = routerContent.match(/export interface PolyglotConfig \{[\s\S]*?\n\}/);
  if (configSection) {
    const lastConfigEntryRegex = /(\s+)(\w+)\?: HandlerConfig;/g;
    let lastConfigEntry;
    while ((match = lastConfigEntryRegex.exec(configSection[0])) !== null) {
      lastConfigEntry = match[0];
    }
    if (lastConfigEntry) {
      const pos = routerContent.lastIndexOf(lastConfigEntry);
      routerContent =
        routerContent.slice(0, pos + lastConfigEntry.length) +
        "\n" + configEntry +
        routerContent.slice(pos + lastConfigEntry.length);
      writeFileSync(routerPath, routerContent, "utf-8");
      console.log(`✓ Added ${lang} config to PolyglotConfig in core/router.ts`);
    }
  }
}

console.log(`\n✓ Registration complete for "${lang}"`);
console.log("Next step: Run `pnpm build && pnpm lint && pnpm test && pnpm typecheck`");
