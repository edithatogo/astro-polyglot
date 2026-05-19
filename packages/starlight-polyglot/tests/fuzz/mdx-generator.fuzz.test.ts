/**
 * Fuzz tests for the MDX generator.
 *
 * Throws random (and sometimes pathological) inputs at the system
 * to find edge cases and crashes. Uses node:crypto for randomness
 * to avoid external dependencies.
 *
 * @module tests/fuzz/mdx-generator.fuzz
 */

import { describe, it, expect } from 'vitest';
import { randomBytes, randomInt } from 'node:crypto';
import { transformToMDX } from '../../core/mdx-generator';
import type { ASTModule } from '../../core/mdx-generator';

// ─── Fuzz generators ────────────────────────────────────────────────

/**
 * Generate a random string (may contain any bytes, including nulls,
 * high unicode, and control characters).
 */
function fuzzString(maxLen: number): string {
  const len = randomInt(0, maxLen);
  const chars: string[] = [];
  for (let i = 0; i < len; i++) {
    const mode = randomInt(0, 4);
    switch (mode) {
      case 0: chars.push(String.fromCharCode(randomInt(0x20, 0x7e))); break;
      case 1: chars.push(String.fromCharCode(randomInt(0x80, 0x10ff))); break;
      case 2: chars.push(String.fromCharCode(randomInt(0x2000, 0x206f))); break;
      case 3: chars.push(String.fromCharCode(randomInt(0, 31))); break;
      case 4: chars.push(String.fromCharCode(0xfeff)); break;
    }
  }
  return chars.join('');
/**
 * Generate a (possibly malformed) ASTModule with random data.
 */
function fuzzModule(): ASTModule {
  const methodsCount = randomInt(0, 8);
  const classesCount = randomInt(0, 6);
  const functionsCount = randomInt(0, 6);

  const methods = Array.from({ length: methodsCount }, () => ({
    name: fuzzString(20),
    signature: fuzzString(50),
    docstring: fuzzString(100),
    parameters: Array.from({ length: randomInt(0, 4) }, () => ({
      name: fuzzString(15),
      type: fuzzString(10),
      description: fuzzString(50),
      default: Math.random() > 0.5 ? fuzzString(10) : undefined,
    })),
    return_type: Math.random() > 0.3 ? fuzzString(15) : undefined,
  }));

  const classes = Array.from({ length: classesCount }, () => ({
    name: fuzzString(30),
    docstring: fuzzString(100),
    methods,
    properties: Array.from({ length: randomInt(0, 4) }, () => ({
      name: fuzzString(15),
      type: fuzzString(10),
      docstring: fuzzString(50),
    })),
  }));

  const functions = Array.from({ length: functionsCount }, () => ({
    name: fuzzString(30),
    signature: fuzzString(80),
    docstring: fuzzString(150),
    parameters: Array.from({ length: randomInt(0, 5) }, () => ({
      name: fuzzString(20),
      type: Math.random() > 0.2 ? fuzzString(12) : undefined,
      description: Math.random() > 0.3 ? fuzzString(60) : undefined,
      default: Math.random() > 0.6 ? fuzzString(15) : undefined,
    })),
    return_type: Math.random() > 0.3 ? fuzzString(15) : undefined,
  }));

  return {
    name: fuzzString(50),
    docstring: Math.random() > 0.1 ? fuzzString(200) : undefined,
    classes: Math.random() > 0.1 ? classes : undefined,
    functions: Math.random() > 0.1 ? functions : undefined,
    variables: Math.random() > 0.3
      ? Array.from({ length: randomInt(0, 4) }, () => ({
          name: fuzzString(20), type: fuzzString(10), docstring: fuzzString(50),
        }))
      : undefined,
  };
}

}

function fuzzOutputDir(): string {
  const parts = Array.from({ length: randomInt(1, 5) }, () => fuzzString(15));
  return parts.join('/');
}

function fuzzLanguage(): string {
  const languages = [
    'python', 'typescript', 'rust', 'r', 'julia', 'csharp', 'go',
    'java', 'kotlin', 'cpp', 'swift', 'ruby', 'dart', 'php', 'elixir',
    '', fuzzString(20), 'py-thon', 'python3',
  ];
  return languages[randomInt(0, languages.length - 1)]!;
}

const FUZZ_ITERATIONS = process.env.CI ? 200 : 50;

// ─── Fuzz test runner ──────────────────────────────────────────────

describe('MDX generator fuzz tests', () => {
  it('handles random modules without throwing', () => {
    for (let run = 0; run < FUZZ_ITERATIONS; run++) {
      const modules = Array.from({ length: randomInt(0, 8) }, () => fuzzModule());
      const outputDir = fuzzOutputDir();
      const language = fuzzLanguage();

      expect(() => {
        const result = transformToMDX(modules, { outputDir, language });
        expect(Array.isArray(result.pages)).toBe(true);
        expect(result.sidebar).toBeDefined();
        expect(result.sidebar.label).toBeDefined();
        expect(Array.isArray(result.sidebar.items)).toBe(true);
        for (const page of result.pages) {
          expect(page).toHaveProperty('path');
          expect(page).toHaveProperty('frontmatter');
          expect(page).toHaveProperty('body');
          expect(typeof page.body).toBe('string');
          expect(page.frontmatter).toHaveProperty('title');
          expect(typeof page.frontmatter.title).toBe('string');
        }
      }).not.toThrow();
    }
  });

  it('handles extremely large docstrings', () => {
    const hugeDocstring = 'X'.repeat(100_000);
    const mod: ASTModule = {
      name: 'huge_doc',
      docstring: hugeDocstring,
      functions: [{
        name: 'huge_fn', docstring: hugeDocstring,
        signature: 'huge_fn(): void',
        parameters: [{ name: 'p', type: 'string', description: hugeDocstring.slice(0, 1000) }],
      }],
      classes: [{
        name: 'HugeClass', docstring: hugeDocstring,
        methods: [{ name: 'huge_method', docstring: hugeDocstring, signature: 'huge_method(): void' }],
        properties: [{ name: 'huge_prop', type: 'string', docstring: hugeDocstring.slice(0, 1000) }],
      }],
    };
    expect(() => {
      const result = transformToMDX([mod], { outputDir: 'api/test', language: 'python' });
      expect(result.pages.length).toBeGreaterThan(0);
      for (const page of result.pages) {
        expect(typeof page.body).toBe('string');
        expect(page.body.length).toBeGreaterThan(0);
      }
    }).not.toThrow();
  });

  it('handles modules with deeply nested undefined values', () => {
    const pathological: ASTModule = {
      name: 'weird',
      docstring: undefined as unknown as string,
      classes: [{
        name: 'WeirdClass',
        docstring: undefined as unknown as string,
        methods: [{
          name: 'weird_method',
          signature: undefined as unknown as string,
          docstring: undefined as unknown as string,
          parameters: undefined as unknown as { name: string; type?: string; description?: string; default?: string }[],
          return_type: undefined as unknown as string,
        }],
        properties: undefined as unknown as { name: string; type?: string; docstring?: string }[],
      }],
      functions: [{
        name: 'weird_fn', signature: undefined as unknown as string,
        docstring: undefined as unknown as string,
        parameters: undefined as unknown as { name: string; type?: string; description?: string; default?: string }[],
        return_type: undefined as unknown as string,
      }],
      variables: undefined as unknown as { name: string; type?: string; docstring?: string }[],
    };
    expect(() => {
      const result = transformToMDX([pathological], { outputDir: 'api/test', language: 'python' });
      expect(result.pages.length).toBeGreaterThan(0);
    }).not.toThrow();
  });

  it('handles empty strings for all string fields', () => {
    const emptyStrMod: ASTModule = {
      name: '', docstring: '',
      classes: [{
        name: '', docstring: '',
        methods: [{ name: '', signature: '', docstring: '', parameters: [{ name: '', type: '', description: '', default: '' }], return_type: '' }],
        properties: [{ name: '', type: '', docstring: '' }],
      }],
      functions: [{ name: '', signature: '', docstring: '', parameters: [{ name: '', type: '', description: '', default: '' }], return_type: '' }],
      variables: [{ name: '', type: '', docstring: '' }],
    };
    expect(() => {
      const result = transformToMDX([emptyStrMod], { outputDir: 'api/test', language: 'python' });
      expect(result.pages.length).toBeGreaterThan(0);
    }).not.toThrow();
  });
});

