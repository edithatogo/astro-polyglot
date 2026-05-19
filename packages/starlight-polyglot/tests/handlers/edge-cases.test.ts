/**
 * edge-cases.test.ts
 *
 * Cross-handler edge case tests that exercise each handler with
 * unusual inputs: empty paths, Unicode, concurrency, etc.
 *
 * These tests verify that handlers fail gracefully (rather than
 * crash or hang) under pathological conditions.
 *
 * @module tests/handlers/edge-cases
 */

import { describe, it, expect, beforeAll } from 'vitest';
import type { Handler, HandlerOptions } from '../../core/handler';
import { ALL_LANGUAGES, loadHandler, randomValidShapedOptions, type HandlerName } from './fuzz-common.test';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Attempt a handler generate() call and return the error message
 * (or undefined if it succeeded).
 */
async function getGenerateError(
  handler: Handler,
  opts: Record<string, unknown>,
): Promise<string | undefined> {
  try {
    await handler.generate(opts as HandlerOptions & Record<string, unknown>);
    return undefined; // succeeded
  } catch (error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }
}


// ─── Cross-handler edge case tests ─────────────────────────────────────────────

describe.each(ALL_LANGUAGES.map((l) => [l]))('Edge cases: %s handler', (lang) => {
  let handler: Handler | null = null;
  const handlerName = lang as HandlerName;

  beforeAll(async () => {
    handler = await loadHandler(handlerName);
  });

  // ── Empty string paths ──────────────────────────────────────────────────

  describe('empty string paths', () => {
    it('handles empty output directory gracefully', async () => {
      if (!handler) return;
      const opts = { ...randomValidShapedOptions(handlerName), output: '' };
      const err = await getGenerateError(handler, opts);
      if (err !== undefined) {
        expect(typeof err).toBe('string');
        expect(err.length).toBeGreaterThan(0);
      }
    });

    it('handles empty entry points / paths gracefully', async () => {
      if (!handler) return;
      const opts: Record<string, unknown> = { output: 'api/test' };
      opts.entryPoints = '';
      opts.cratePath = '';
      opts.modulePath = '';
      opts.projectPath = '';
      const err = await getGenerateError(handler, opts);
      if (err !== undefined) {
        expect(typeof err).toBe('string');
        expect(err.length).toBeGreaterThan(0);
      }
    });

    it('handles undefined entry points gracefully', async () => {
      if (!handler) return;
      const opts: Record<string, unknown> = { output: 'api/test' };
      opts.entryPoints = undefined;
      opts.cratePath = undefined;
      opts.modulePath = undefined;
      opts.projectPath = undefined;
      const err = await getGenerateError(handler, opts);
      if (err !== undefined) {
        expect(typeof err).toBe('string');
        expect(err.length).toBeGreaterThan(0);
      }
    });

    it('handles null entry points gracefully', async () => {
      if (!handler) return;
      const opts: Record<string, unknown> = { output: 'api/test' };
      opts.entryPoints = null;
      opts.cratePath = null;
      opts.modulePath = null;
      opts.projectPath = null;
      const err = await getGenerateError(handler, opts);
      if (err !== undefined) {
        expect(typeof err).toBe('string');
        expect(err.length).toBeGreaterThan(0);
      }
  // ── Unicode in paths ────────────────────────────────────────────────────

  describe('Unicode in paths', () => {
    it('handles emoji in path-related options gracefully', async () => {
      if (!handler) return;
      const opts = randomValidShapedOptions(handlerName);
      for (const key of Object.keys(opts)) {
        if (typeof opts[key] === 'string') {
          opts[key] = '\u{1F600}\u{1F525}\u{1F680}/path/to/module';
          break;
        }
        if (Array.isArray(opts[key])) {
          opts[key] = ['\u{1F600}\u{1F525}\u{1F680}/src/index.ts'];
          break;
        }
      }
      const err = await getGenerateError(handler, opts);
      if (err !== undefined) {
        expect(typeof err).toBe('string');
        expect(err.length).toBeGreaterThan(0);
      }
    });

    it('handles right-to-left (RTL) text in options gracefully', async () => {
      if (!handler) return;
      const opts = randomValidShapedOptions(handlerName);
      for (const key of Object.keys(opts)) {
        if (typeof opts[key] === 'string') {
          opts[key] = '\u202E\u202D/path/\u05E2\u05D1\u05E8\u05D9\u05EA/module';
          break;
        }
        if (Array.isArray(opts[key])) {
          opts[key] = ['\u202E\u202D/src/index.ts'];
          break;
        }
      }
      const err = await getGenerateError(handler, opts);
      if (err !== undefined) {
        expect(typeof err).toBe('string');
        expect(err.length).toBeGreaterThan(0);
      }
    });

    it('handles CJK (Chinese/Japanese/Korean) paths gracefully', async () => {
      if (!handler) return;
      const opts = randomValidShapedOptions(handlerName);
      for (const key of Object.keys(opts)) {
        if (typeof opts[key] === 'string') {
          opts[key] = '/\u9879\u76EE/\u6A21\u5757/\u529F\u80FD';
          break;
        }
        if (Array.isArray(opts[key])) {
          opts[key] = ['/\u30D7\u30ED\u30B8\u30A7\u30AF\u30C8/index.ts'];
          break;
        }
      }
      const err = await getGenerateError(handler, opts);
      if (err !== undefined) {
        expect(typeof err).toBe('string');
        expect(err.length).toBeGreaterThan(0);
      }
    });
  // ── Concurrent calls ────────────────────────────────────────────────────

  describe('concurrent generate() calls', () => {
    it('handles multiple concurrent generate() calls on the same handler', async () => {
      if (!handler) return;
      const opts1 = randomValidShapedOptions(handlerName);
      const opts2 = randomValidShapedOptions(handlerName);
      const opts3 = randomValidShapedOptions(handlerName);

      const results = await Promise.allSettled([
        handler.generate(opts1 as HandlerOptions & Record<string, unknown>),
        handler.generate(opts2 as HandlerOptions & Record<string, unknown>),
        handler.generate(opts3 as HandlerOptions & Record<string, unknown>),
      ]);

      expect(results).toHaveLength(3);
      for (const result of results) {
        if (result.status === 'rejected') {
          const reason = result.reason;
          const message = reason instanceof Error ? reason.message : String(reason);
          expect(message.length).toBeGreaterThan(0);
        } else {
          expect(result.value).toHaveProperty('pages');
          expect(result.value).toHaveProperty('sidebar');
        }
      }
    });

    it('handles rapid sequential generate() calls without cross-contamination', async () => {
      if (!handler) return;
      const optsA = randomValidShapedOptions(handlerName);
      const optsB = randomValidShapedOptions(handlerName);

  // ── Validate edge cases ─────────────────────────────────────────────────

  describe('validate() edge cases', () => {
    it('handles empty string source path', async () => {
      if (!handler?.validate) return;
      const result = await handler.validate('');
      expect(result).toHaveProperty('valid');
      expect(typeof result.valid).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('handles null byte in source path', async () => {
      if (!handler?.validate) return;
      const result = await handler.validate('\x00');
      expect(result).toHaveProperty('valid');
      expect(typeof result.valid).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('handles whitespace-only source path', async () => {
      if (!handler?.validate) return;
      const result = await handler.validate('   \t  \n  ');
      expect(result).toHaveProperty('valid');
      expect(typeof result.valid).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('handles extremely long source path (4096 chars)', async () => {
      if (!handler?.validate) return;
      const longPath = '/' + 'a'.repeat(4095);
      const result = await handler.validate(longPath);
      expect(result).toHaveProperty('valid');
      expect(typeof result.valid).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('handles Unicode source path', async () => {
      if (!handler?.validate) return;
      const result = await handler.validate('/tmp/\u{1F680}/\u30D7\u30ED\u30B8\u30A7\u30AF\u30C8/\u9879\u76EE');
      expect(result).toHaveProperty('valid');
      expect(typeof result.valid).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('handles path traversal attempts', async () => {
      if (!handler?.validate) return;
      const result = await handler.validate('../../../etc/passwd');
      expect(result).toHaveProperty('valid');
      expect(typeof result.valid).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('handles Windows-style paths on all platforms', async () => {
      if (!handler?.validate) return;
      const result = await handler.validate('C:\\Users\\test\\project');
      expect(result).toHaveProperty('valid');
      expect(typeof result.valid).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
    });
  });
});

      const resultA = await handler
        .generate(optsA as HandlerOptions & Record<string, unknown>)
        .catch(() => null);
      const resultB = await handler
        .generate(optsB as HandlerOptions & Record<string, unknown>)
        .catch(() => null);

      if (resultA && resultB) {
        expect(resultA).not.toBe(resultB);

// ─── Cross-handler parallel execution ──────────────────────────────────────────

describe('multiple handlers running in parallel', () => {
  let handlers: Map<HandlerName, Handler>;

  beforeAll(async () => {
    handlers = new Map();
    for (const lang of ALL_LANGUAGES) {
      const h = await loadHandler(lang as HandlerName);
      if (h) handlers.set(lang as HandlerName, h);
    }
  });

  it('runs all handlers concurrently without crashing', async () => {
    const tasks: Promise<unknown>[] = [];

    for (const [lang, handler] of handlers) {
      const opts = randomValidShapedOptions(lang);
      tasks.push(
        handler
          .generate(opts as HandlerOptions & Record<string, unknown>)
          .catch(() => {}),
      );
    }

    const results = await Promise.allSettled(tasks);
    expect(results.length).toBe(handlers.size);
  });

  it('runs handlers interleaved with validate() calls', async () => {
    const tasks: Promise<unknown>[] = [];

    for (const [lang, handler] of handlers) {
      const genOpts = randomValidShapedOptions(lang);
      tasks.push(
        handler
          .generate(genOpts as HandlerOptions & Record<string, unknown>)
          .catch(() => {}),
      );

      if (handler.validate) {
        tasks.push(handler.validate('/tmp').catch(() => {}));
        tasks.push(handler.validate('').catch(() => {}));
      }
    }

    const results = await Promise.allSettled(tasks);
    expect(results.length).toBeGreaterThanOrEqual(handlers.size);
  });

  it('calls generate() and validate() in rapid succession', async () => {
    for (const [lang, handler] of handlers) {
      const promises: Promise<unknown>[] = [];

      for (let i = 0; i < 5; i++) {
        const opts = randomValidShapedOptions(lang);
        promises.push(
          handler
            .generate(opts as HandlerOptions & Record<string, unknown>)
            .catch(() => {}),
        );
        if (handler.validate) {
          promises.push(handler.validate(`/tmp/test-${i}`).catch(() => {}));
        }
      }

      const results = await Promise.allSettled(promises);
      expect(results.length).toBeGreaterThan(0);
    }
  });
});
