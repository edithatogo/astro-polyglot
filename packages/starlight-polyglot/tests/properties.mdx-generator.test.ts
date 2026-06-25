/**
 * Property-based tests for transformToMDX and writeMDXPages.
 *
 * Uses @fast-check/vitest to verify invariants over random ASTModule inputs.
 */

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fc, test } from "@fast-check/vitest";
import { afterEach, beforeEach, describe, expect } from "vitest";
import {
  type ASTClass,
  type ASTFunction,
  type ASTModule,
  type ASTParameter,
  type ASTVariable,
  transformToMDX,
  writeMDXPages,
} from "../core/mdx-generator";

// ─── Arbitraries ──────────────────────────────────────────────────────────────

const arbitraryIdentifier = fc
  .string({ minLength: 1, maxLength: 24 })
  .filter((s) => s.trim().length > 0 && !s.includes("/"));

const arbitraryDocstring = fc.oneof(
  fc.constant(undefined),
  fc.constant(""),
  fc.string({ minLength: 1, maxLength: 200 }),
  fc.constantFrom(
    "Short doc.",
    "A longer docstring that spans multiple\nlines and has some detail.",
    "Handles edge cases like numbers 42 and symbols ©®™.",
  ),
);

const arbitraryParameter: fc.Arbitrary<ASTParameter> = fc.record({
  name: arbitraryIdentifier,
  type: fc.oneof(fc.constant(undefined), arbitraryIdentifier),
  description: fc.oneof(fc.constant(undefined), fc.string({ minLength: 1, maxLength: 100 })),
  default: fc.oneof(fc.constant(undefined), fc.string({ minLength: 1, maxLength: 20 })),
});

const arbitraryFunction: fc.Arbitrary<ASTFunction> = fc.record({
  name: arbitraryIdentifier,
  signature: fc.oneof(fc.constant(undefined), fc.string({ minLength: 1, maxLength: 120 })),
  docstring: arbitraryDocstring,
  parameters: fc.oneof(fc.constant(undefined), fc.array(arbitraryParameter, { maxLength: 8 })),
  return_type: fc.oneof(fc.constant(undefined), arbitraryIdentifier),
});

const arbitraryVariable: fc.Arbitrary<ASTVariable> = fc.record({
  name: arbitraryIdentifier,
  type: fc.oneof(fc.constant(undefined), arbitraryIdentifier),
  docstring: fc.oneof(fc.constant(undefined), fc.string({ minLength: 1, maxLength: 100 })),
});

const arbitraryClass: fc.Arbitrary<ASTClass> = fc.record({
  name: arbitraryIdentifier,
  docstring: arbitraryDocstring,
  methods: fc.oneof(fc.constant(undefined), fc.array(arbitraryFunction, { maxLength: 5 })),
  properties: fc.oneof(fc.constant(undefined), fc.array(arbitraryVariable, { maxLength: 5 })),
});

const arbitraryModule: fc.Arbitrary<ASTModule> = fc.record({
  name: arbitraryIdentifier,
  docstring: arbitraryDocstring,
  classes: fc.oneof(fc.constant(undefined), fc.array(arbitraryClass, { maxLength: 5 })),
  functions: fc.oneof(fc.constant(undefined), fc.array(arbitraryFunction, { maxLength: 5 })),
  variables: fc.oneof(fc.constant(undefined), fc.array(arbitraryVariable, { maxLength: 5 })),
});

const arbitraryModuleList: fc.Arbitrary<ASTModule[]> = fc.array(arbitraryModule, { maxLength: 10 });

const outputDirArbitrary = fc.constantFrom("api/test", "api/python", "docs/sdk", "api/go");

const languageArbitrary = fc.constantFrom(
  undefined as string | undefined,
  "python",
  "typescript",
  "rust",
  "go",
  "java",
);

// ─── Property: every page has valid frontmatter ───────────────────────────────

test.prop([arbitraryModuleList, outputDirArbitrary, languageArbitrary])(
  "every page has title, description, and sidebar in frontmatter",
  (modules, outputDir, language) => {
    const options = { outputDir, ...(language ? { language } : {}) };
    const output = transformToMDX(modules, options);

    for (const page of output.pages) {
      const fm = page.frontmatter;
      expect(fm).toHaveProperty("title");
      expect(typeof fm.title).toBe("string");
      expect((fm.title as string).length).toBeGreaterThan(0);

      expect(fm).toHaveProperty("description");
      expect(typeof fm.description).toBe("string");

      expect(fm).toHaveProperty("sidebar");
      expect(fm.sidebar as Record<string, unknown>).toHaveProperty("label");
      expect(typeof (fm.sidebar as { label: string }).label).toBe("string");

      expect(fm).toHaveProperty("pagefind");
      expect(fm.pagefind).toBe(true);

      expect(typeof page.body).toBe("string");
    }
  },
);

// ─── Property: page count = modules + classes + functions ─────────────────────

test.prop([arbitraryModuleList, outputDirArbitrary])(
  "page count equals modules + total classes + total functions",
  (modules, outputDir) => {
    const output = transformToMDX(modules, { outputDir });

    let expectedPages = 0;
    for (const mod of modules) {
      expectedPages += 1; // module page
      expectedPages += (mod.classes ?? []).length;
      expectedPages += (mod.functions ?? []).length;
    }

    expect(output.pages).toHaveLength(expectedPages);
  },
);

// ─── Property: sidebar items link to existing pages ───────────────────────────

test.prop([arbitraryModuleList, outputDirArbitrary])(
  "sidebar items always link to existing module pages",
  (modules, outputDir) => {
    const output = transformToMDX(modules, { outputDir });

    // Collect all generated page paths
    const pagePaths = new Set(output.pages.map((p) => p.path));

    for (const item of output.sidebar.items) {
      // Every sidebar link should map to a module page path
      const linkPath = item.link.replace(/\/$/, ".mdx");
      expect(pagePaths.has(linkPath)).toBe(true);
    }
  },
);

// ─── Property: empty modules produce empty output ─────────────────────────────

test.prop([outputDirArbitrary, languageArbitrary])(
  "empty module list produces empty pages and sidebar",
  (outputDir, language) => {
    const options = { outputDir, ...(language ? { language } : {}) };
    const output = transformToMDX([], options);

    expect(output.pages).toHaveLength(0);
    expect(output.sidebar.items).toHaveLength(0);
  },
);

// ─── Property: Unicode is preserved in docstrings ─────────────────────────────

test.prop([languageArbitrary])("unicode docstrings are preserved verbatim in output", (language) => {
  const unicodeDoc = "Hëllø Wörld 日本語 Русский العربية 🎉✨";
  const modules: ASTModule[] = [
    {
      name: "unicode_mod",
      docstring: unicodeDoc,
      classes: [{ name: "ŰnicödeCls", docstring: unicodeDoc }],
      functions: [{ name: "fünc", docstring: unicodeDoc }],
    },
  ];
  const options = { outputDir: "api/test", ...(language ? { language } : {}) };
  const output = transformToMDX(modules, options);

  expect(output.pages).toHaveLength(3);

  const modPage = output.pages.find((p) => p.path === "api/test/unicode_mod.mdx")!;
  expect(modPage.frontmatter.description).toBe(unicodeDoc);
  expect(modPage.body).toContain(unicodeDoc);

  const clsPage = output.pages.find((p) => p.frontmatter.title === "unicode_mod.ŰnicödeCls")!;
  expect(clsPage.frontmatter.description).toBe(unicodeDoc);

  const fnPage = output.pages.find((p) => p.frontmatter.title === "unicode_mod.fünc")!;
  expect(fnPage.frontmatter.description).toBe(unicodeDoc);
});

// ─── Property: module names are properly slugged ──────────────────────────────

test.prop([languageArbitrary])("module, class, and function names produce valid URL-safe paths", (language) => {
  const modules: ASTModule[] = [
    {
      name: "My Module Name",
      classes: [{ name: "My Class" }],
      functions: [{ name: "my Function" }],
    },
  ];
  const options = { outputDir: "api/test", ...(language ? { language } : {}) };
  const output = transformToMDX(modules, options);

  expect(output.pages).toHaveLength(3);

  // All paths should be lowercase and not contain spaces
  for (const page of output.pages) {
    expect(page.path).not.toMatch(/\s/);
    expect(page.path).toEqual(page.path.toLowerCase());
  }
});

// ─── Property: pagination option doesn't change page count ────────────────────

test.prop([arbitraryModuleList, fc.boolean()])(
  "pagination option does not affect the number of generated pages",
  (modules, pagination) => {
    const output = transformToMDX(modules, { outputDir: "api/test", pagination });

    let expectedPages = 0;
    for (const mod of modules) {
      expectedPages += 1;
      expectedPages += (mod.classes ?? []).length;
      expectedPages += (mod.functions ?? []).length;
    }

    expect(output.pages).toHaveLength(expectedPages);
  },
);

// ─── Property: each page path is unique ───────────────────────────────────────

test.prop([
  fc.uniqueArray(
    fc.string({ minLength: 1, maxLength: 24 }).filter((s) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(s)),
    { maxLength: 10, selector: (name) => name.toLowerCase() },
  ),
  outputDirArbitrary,
])("all generated page paths are unique", (moduleNames, outputDir) => {
  const modules: ASTModule[] = moduleNames.map((name) => ({ name }));
  const output = transformToMDX(modules, { outputDir });
  const paths = output.pages.map((p) => p.path);
  const uniquePaths = new Set(paths);
  expect(uniquePaths.size).toBe(paths.length);
});

// ─── Property: sidebar label is capitalized from language ─────────────────────

test.prop([arbitraryModuleList])("sidebar label is uppercase version of language when provided", (modules) => {
  const output = transformToMDX(modules, { outputDir: "api/test", language: "python" });
  expect(output.sidebar.label).toBe("PYTHON");
});

// ─── writeMDXPages integration properties ─────────────────────────────────────

describe("writeMDXPages property-based integration", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "starlight-polyglot-prop-"));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  test.prop([arbitraryModuleList])("written files correspond 1:1 to generated pages", async (modules) => {
    const output = transformToMDX(modules, { outputDir: "api/test", language: "python" });
    const written = await writeMDXPages(output, tempDir);
    expect(written).toHaveLength(output.pages.length);
  });

  test.prop([arbitraryModuleList])("every written file contains valid MDX frontmatter delimiters", async (modules) => {
    const output = transformToMDX(modules, { outputDir: "api/test", language: "python" });
    const written = await writeMDXPages(output, tempDir);

    for (const filePath of written) {
      const content = await fs.readFile(filePath, "utf-8");
      expect(content).toMatch(/^---\n/);
      expect(content).toMatch(/\n---\n\n/);
      expect(content).toContain("title:");
    }
  });
});
