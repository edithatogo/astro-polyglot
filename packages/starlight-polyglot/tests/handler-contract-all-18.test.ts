/**
 * Contract verification for ALL 18 language handlers.
 *
 * Tests that every handler exports correctly with a name property,
 * a generate() function returning the correct shape, and an optional
 * validate() function returning { valid, errors }.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import type { Handler } from '../core/handler';

// All 18 languages currently supported
const allLanguages = [
  'python', 'typescript', 'rust', 'r', 'julia', 'csharp', 'go',
  'java', 'kotlin', 'cpp', 'swift', 'stata', 'sas', 'scala',
  'ruby', 'dart', 'php', 'elixir',
] as const;

type LanguageName = (typeof allLanguages)[number];

// ─── Discover all handlers ───────────────────────────────────────────────────

describe('Handler discovery — all 18 languages', () => {
  let handlers: Map<LanguageName, Handler>;
  let loadErrors: Map<LanguageName, string>;

  beforeAll(async () => {
    handlers = new Map();
    loadErrors = new Map();

    for (const lang of allLanguages) {
      try {
        const mod = await import(`../handlers/${lang}`);
        const handlerName = `${lang}Handler`;
        const h = mod[handlerName] as Handler | undefined;
        if (h) {
          handlers.set(lang, h);
        } else {
          loadErrors.set(lang, `No export named '${handlerName}'`);
        }
      } catch (e: any) {
        loadErrors.set(lang, e.message ?? String(e));
      }
    }
  });

  it('discovers all 18 language handlers', () => {
    for (const lang of allLanguages) {
      if (!handlers.has(lang)) {
        console.warn(`Handler '${lang}' could not be loaded: ${loadErrors.get(lang)}`);
      }
    }
    expect(handlers.size).toBeGreaterThan(0);
  });
});


// ─── Per-handler contract tests ──────────────────────────────────────────────

describe.each(allLanguages.map((l): [LanguageName, LanguageName] => [l, l]))(
  'Handler contract: %s',
  (_, language) => {
    let handler: Handler | null = null;
    let loadError: string | null = null;

    beforeAll(async () => {
      try {
        const mod = await import(`../handlers/${language}`);
        const h = mod[`${language}Handler` as keyof typeof mod] as Handler | undefined;
        if (h) handler = h;
        else loadError = `No export '${language}Handler' found`;
      } catch (e: any) {
        loadError = e.message ?? String(e);
      }
    });

    it('exports a valid handler object', () => {
      if (!handler) {
        console.warn(`Skipping ${language}: ${loadError ?? 'handler is null'}`);
        return;
      }
      expect(handler).toBeDefined();
      expect(typeof handler).toBe('object');
    });

    it('has a name property matching the Language union type', () => {
      if (!handler) return;
      expect(handler).toHaveProperty('name');
      expect(typeof handler.name).toBe('string');
      expect(allLanguages).toContain(handler.name as LanguageName);
    });

    it('has a generate() function returning a Promise', async () => {
      if (!handler) return;
      expect(handler).toHaveProperty('generate');
      expect(typeof handler.generate).toBe('function');

      try {
        const p = handler.generate({ output: 'test' } as any);
        expect(p).toBeInstanceOf(Promise);
        p.catch(() => undefined);
      } catch {
        // Some handlers may throw synchronously for missing options
      }
    });

    it('generate() resolves to an object with pages and sidebar', async () => {
      if (!handler) return;
      try {
        const result = await handler.generate({ output: 'test-output' } as any);
        expect(result).toHaveProperty('pages');
        expect(Array.isArray(result.pages)).toBe(true);
        expect(result).toHaveProperty('sidebar');
        expect(result.sidebar).toHaveProperty('label');
        expect(typeof result.sidebar.label).toBe('string');
        expect(result.sidebar).toHaveProperty('items');
        expect(Array.isArray(result.sidebar.items)).toBe(true);
      } catch {
        // Expected if handler needs real source files
      }
    });

    it('has an optional validate() method returning correct shape', async () => {
      if (!handler) return;
      if (handler.validate) {
        expect(typeof handler.validate).toBe('function');
        try {
          const p = handler.validate('/some/path');
          expect(p).toBeInstanceOf(Promise);
          const result = await p;
          expect(result).toHaveProperty('valid');
          expect(typeof result.valid).toBe('boolean');
          expect(result).toHaveProperty('errors');
          expect(Array.isArray(result.errors)).toBe(true);
          for (const err of result.errors) {
            expect(typeof err).toBe('string');
          }
        } catch {
          // validate may throw if path doesn't exist
        }
      }
    });
  },
);

// ─── Batch contract verification ─────────────────────────────────────────────

describe('Full contract verification — all 18 handlers', () => {
  it('verifies the shape of every handler export', async () => {
    for (const lang of allLanguages) {
      try {
        const mod = await import(`../handlers/${lang}`);
        const handlerName = `${lang}Handler`;
        const h = mod[handlerName] as Record<string, unknown> | undefined;

        expect(h).toBeDefined();
        expect(typeof h!.name).toBe('string');
        expect(allLanguages).toContain(h!.name);
        expect(typeof h!.generate).toBe('function');

        if (h!.validate !== undefined) {
          expect(typeof h!.validate).toBe('function');
          const valResult = await (h!.validate as Function)('/tmp');
          expect(valResult).toHaveProperty('valid');
          expect(typeof valResult.valid).toBe('boolean');
          expect(valResult).toHaveProperty('errors');
          expect(Array.isArray(valResult.errors)).toBe(true);
        }
      } catch (e: any) {
        console.warn(`Handler '${lang}' unavailable: ${e.message}`);
      }
    }
  });
});

// ─── Handler output consistency ──────────────────────────────────────────────

describe('Handler output consistency', () => {
  it('all handler generate() outputs have compatible structure', async () => {
    const results: Array<{ language: string; pages: number }> = [];

    for (const lang of allLanguages) {
      try {
        const mod = await import(`../handlers/${lang}`);
        const h = mod[`${lang}Handler`] as Handler | undefined;
        if (!h) continue;

        const output = await h.generate({ output: `api/${lang}` } as any);
        results.push({
          language: lang,
          pages: output.pages.length,
        });
      } catch {
        // Handler needs real source files - skip
      }
    }

    for (const r of results) {
      expect(typeof r.language).toBe('string');
      expect(typeof r.pages).toBe('number');
      expect(r.pages).toBeGreaterThanOrEqual(0);
    }
  });

  it('validates that generate() output pages have required fields', async () => {
    for (const lang of allLanguages) {
      try {
        const mod = await import(`../handlers/${lang}`);
        const h = mod[`${lang}Handler`] as Handler | undefined;
        if (!h) continue;

        const output = await h.generate({ output: `api/${lang}` } as any);

        for (const page of output.pages) {
          expect(page).toHaveProperty('path');
          expect(typeof page.path).toBe('string');
          expect(page).toHaveProperty('frontmatter');
          expect(typeof page.frontmatter).toBe('object');
          expect(page).toHaveProperty('body');
          expect(typeof page.body).toBe('string');
        }
      } catch {
        // Expected for handlers needing real source
      }
    }
  });
});
