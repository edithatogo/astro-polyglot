/**
 * Property-based tests for the MDX generator using fast-check.
 *
 * These tests verify invariants that should hold for ALL possible
 * ASTModule inputs, not just the hand-picked examples in the
 * conventional test suite.
 *
 * @module tests/properties/mdx-generator.property
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { transformToMDX } from '../../core/mdx-generator';
import type { ASTModule, ASTClass, ASTFunction, ASTParameter, ASTVariable } from '../../core/mdx-generator';

// ─── Arbitraries (fast-check data generators) ──────────────────────

const languageArb: fc.Arbitrary<string> = fc.constantFrom(
  'python', 'typescript', 'rust', 'r', 'julia', 'csharp', 'go',
  'java', 'kotlin', 'cpp', 'swift', 'ruby', 'dart', 'php', 'elixir',
);

const identifierArb: fc.Arbitrary<string> = fc
  .string({ minLength: 1, maxLength: 40 })
  .filter((s) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s));

const docstringArb: fc.Arbitrary<string> = fc.oneof(
  fc.constant(undefined),
  fc.constant(''),
  fc.string({ minLength: 1, maxLength: 200 }),
);

const typeArb: fc.Arbitrary<string> = fc.oneof(
  fc.constant('int'),
  fc.constant('string'),
  fc.constant('float'),
  fc.constant('boolean'),
  fc.constant('void'),
  fc.constant('number'),
  fc.constant('array'),
  fc.constant('object'),
);

const parameterArb: fc.Arbitrary<ASTParameter> = fc.record({
  name: identifierArb,
  type: fc.oneof(typeArb, fc.constant(undefined)),
  description: fc.oneof(fc.string({ minLength: 1, maxLength: 100 }), fc.constant(undefined)),
  default: fc.oneof(fc.string({ minLength: 1, maxLength: 20 }), fc.constant(undefined)),
});

const functionArb: fc.Arbitrary<ASTFunction> = fc.record({
  name: identifierArb,
  signature: fc.oneof(fc.string({ minLength: 1, maxLength: 100 }), fc.constant(undefined)),
  docstring: docstringArb,
  parameters: fc.oneof(fc.array(parameterArb, { maxLength: 5 }), fc.constant(undefined)),
  return_type: fc.oneof(typeArb, fc.constant(undefined)),
});

const variableArb: fc.Arbitrary<ASTVariable> = fc.record({
  name: identifierArb,
  type: fc.oneof(typeArb, fc.constant(undefined)),
  docstring: docstringArb,
});

const classArb: fc.Arbitrary<ASTClass> = fc.record({
  name: identifierArb,
  docstring: docstringArb,
  methods: fc.oneof(fc.array(functionArb, { maxLength: 5 }), fc.constant(undefined)),
  properties: fc.oneof(fc.array(variableArb, { maxLength: 5 }), fc.constant(undefined)),
});

const moduleArb: fc.Arbitrary<ASTModule> = fc.record({
  name: identifierArb,
  docstring: docstringArb,
  classes: fc.oneof(fc.array(classArb, { maxLength: 5 }), fc.constant(undefined)),
  functions: fc.oneof(fc.array(functionArb, { maxLength: 5 }), fc.constant(undefined)),
  variables: fc.oneof(fc.array(variableArb, { maxLength: 5 }), fc.constant(undefined)),
});

const modulesArrayArb: fc.Arbitrary<ASTModule[]> = fc.array(moduleArb, { maxLength: 10 });

const outputDirArb: fc.Arbitrary<string> = fc
  .string({ minLength: 1, maxLength: 30 })
  .filter((s) => /^[a-zA-Z0-9_/]+$/.test(s) && !s.startsWith('/') && !s.endsWith('/'));

// ─── Property tests ─────────────────────────────────────────────────

describe('transformToMDX (property-based)', () => {
  it('returns an object with pages array and sidebar', () => {
    fc.assert(
      fc.property(modulesArrayArb, outputDirArb, languageArb, (modules, outputDir, language) => {
        const result = transformToMDX(modules, { outputDir, language });
        expect(result).toHaveProperty('pages');
        expect(Array.isArray(result.pages)).toBe(true);
        expect(result).toHaveProperty('sidebar');
        expect(result.sidebar).toHaveProperty('label');
        expect(result.sidebar).toHaveProperty('items');
        expect(Array.isArray(result.sidebar.items)).toBe(true);
      }),
      { numRuns: 100, seed: 42 },
    );
  });

  it('number of pages equals modules + classes + functions per module', () => {
    fc.assert(
      fc.property(modulesArrayArb, outputDirArb, languageArb, (modules, outputDir, language) => {
        const result = transformToMDX(modules, { outputDir, language });
        let expectedPageCount = 0;
        for (const mod of modules) {
          expectedPageCount += 1; // module page
          expectedPageCount += mod.classes?.length ?? 0;
          expectedPageCount += mod.functions?.length ?? 0;
        }
        expect(result.pages).toHaveLength(expectedPageCount);
      }),
      { numRuns: 50, seed: 42 },
    );
  });

  it('all pages have non-empty title and string body', () => {
    fc.assert(
      fc.property(modulesArrayArb, outputDirArb, languageArb, (modules, outputDir, language) => {
        const result = transformToMDX(modules, { outputDir, language });
        for (const page of result.pages) {
          expect(page.frontmatter).toHaveProperty('title');
          expect(typeof page.frontmatter.title).toBe('string');
          expect(page.frontmatter.title.length).toBeGreaterThanOrEqual(1);
          expect(typeof page.body).toBe('string');
        }
      }),
      { numRuns: 100, seed: 42 },
    );
  });

  it('every page has pagefind: true in frontmatter', () => {
    fc.assert(
      fc.property(modulesArrayArb, outputDirArb, languageArb, (modules, outputDir, language) => {
        const result = transformToMDX(modules, { outputDir, language });
        for (const page of result.pages) {
          expect(page.frontmatter.pagefind).toBe(true);
        }
      }),
      { numRuns: 50, seed: 42 },
    );
  });

  it('sidebar items count equals number of modules', () => {
    fc.assert(
      fc.property(modulesArrayArb, outputDirArb, languageArb, (modules, outputDir, language) => {
        const result = transformToMDX(modules, { outputDir, language });
        expect(result.sidebar.items).toHaveLength(modules.length);
      }),
      { numRuns: 50, seed: 42 },
    );
  });

  it('each sidebar item has a label and link (ends with slash)', () => {
    fc.assert(
      fc.property(modulesArrayArb, outputDirArb, languageArb, (modules, outputDir, language) => {
        const result = transformToMDX(modules, { outputDir, language });
        for (const item of result.sidebar.items) {
          expect(item).toHaveProperty('label');
          expect(typeof item.label).toBe('string');
          expect(item).toHaveProperty('link');
          expect(typeof item.link).toBe('string');
          expect(item.link).toMatch(/\/$/);
        }
      }),
      { numRuns: 50, seed: 42 },
    );
  });

  it('page paths are unique (no duplicates)', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(identifierArb, { maxLength: 10, selector: (name) => name.toLowerCase() }),
        outputDirArb,
        languageArb,
        (moduleNames, outputDir, language) => {
        const modules: ASTModule[] = moduleNames.map((name) => ({ name }));
        const result = transformToMDX(modules, { outputDir, language });
        const paths = result.pages.map((p) => p.path);
        const uniquePaths = new Set(paths);
        expect(uniquePaths.size).toBe(paths.length);
      }),
      { numRuns: 100, seed: 42 },
    );
  });

  it('description in frontmatter is always a string', () => {
    fc.assert(
      fc.property(modulesArrayArb, outputDirArb, languageArb, (modules, outputDir, language) => {
        const result = transformToMDX(modules, { outputDir, language });
        for (const page of result.pages) {
          expect(typeof page.frontmatter.description).toBe('string');
        }
      }),
      { numRuns: 100, seed: 42 },
    );
  });

  it('empty modules array produces empty output', () => {
    fc.assert(
      fc.property(outputDirArb, languageArb, (outputDir, language) => {
        const result = transformToMDX([], { outputDir, language });
        expect(result.pages).toHaveLength(0);
        expect(result.sidebar.items).toHaveLength(0);
      }),
      { numRuns: 10, seed: 42 },
    );
  });

  it('modules with only a name (no docstring) still produce valid output', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            name: identifierArb,
            docstring: fc.constant(undefined),
            classes: fc.constant(undefined),
            functions: fc.constant(undefined),
            variables: fc.constant(undefined),
          }),
          { minLength: 1, maxLength: 5 },
        ),
        outputDirArb,
        languageArb,
        (modules, outputDir, language) => {
          const result = transformToMDX(modules, { outputDir, language });
          expect(result.pages.length).toBeGreaterThanOrEqual(modules.length);
          for (const page of result.pages) {
            expect(typeof page.frontmatter.title).toBe('string');
          }
        },
      ),
      { numRuns: 50, seed: 42 },
    );
  });
});
