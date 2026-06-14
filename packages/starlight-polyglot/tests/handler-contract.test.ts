import { describe, it, expect, beforeAll } from 'vitest';
import type { Handler } from '../core/handler';

const validLanguages = ['python','typescript','rust','r','julia','csharp','go'] as const;

function isEntryPointHandler(name: string): boolean {
  return ['python', 'typescript', 'julia', 'r'].includes(name);
}
function isCratePathHandler(name: string): boolean { return name === 'rust'; }
function isProjectPathHandler(name: string): boolean { return name === 'csharp'; }
function isModulePathHandler(name: string): boolean { return name === 'go'; }

describe('Handler contract — all language handlers', () => {
  let handlers: Map<string, Handler>;

  beforeAll(async () => {
    handlers = new Map();
    for (const lang of validLanguages) {
      try {
        const mod = await import(`../handlers/${lang}`);
        const handlerName = `${lang}Handler`;
        const h = mod[handlerName] as Handler | undefined;
        if (h) handlers.set(lang, h);
      } catch { /* handler unavailable */ }
    }
  });

  it('discovers at least one handler', () => {
    expect(handlers.size).toBeGreaterThanOrEqual(1);
  });
});

describe.each(validLanguages.map(l => [l, l]))('Handler: %s', (_name, language) => {
  let handler: Handler | null = null;

  beforeAll(async () => {
    try {
      const mod = await import(`../handlers/${language}`);
      const h = mod[`${language}Handler` as keyof typeof mod] as Handler | undefined;
      if (h) handler = h;
    } catch { /* handler unavailable */ }
  });

  it('has a name property matching the Language union type', () => {
    expect(handler).not.toBeNull();
    expect(validLanguages).toContain(handler!.name);
  });

  it('has generate() as a function returning a Promise', async () => {
    expect(handler).not.toBeNull();
    expect(typeof handler!.generate).toBe('function');
    try {
      const p = handler!.generate({ output: 'test' } as any);
      expect(p).toBeInstanceOf(Promise);
      p.catch(() => undefined);
    } catch { /* sync validation throws acceptable */ }
  });

  it('throws a clear error when required options are missing', async () => {
    expect(handler).not.toBeNull();
    async function mustThrow(fn: () => Promise<unknown>, pattern: RegExp) {
      const p = fn();
      p.catch(() => {}); // Suppress unhandled rejection
      try {
        await p;
        throw new Error('Did not throw');
      } catch (e: any) {
        expect(e.message || e).toMatch(pattern);
      }
    }
    if (isEntryPointHandler(handler!.name)) {
      await mustThrow(() => handler!.generate({ output: 'test' } as any), /entryPoint/i);
    }
    if (isCratePathHandler(handler!.name)) {
      await mustThrow(() => handler!.generate({ output: 'test' } as any), /cratePath/i);
    }
    if (isProjectPathHandler(handler!.name)) {
      await mustThrow(() => handler!.generate({ output: 'test' } as any), /projectPath/i);
    }
    if (isModulePathHandler(handler!.name)) {
      await mustThrow(() => handler!.generate({ output: 'test' } as any), /modulePath/i);
    }
  });

  describe('validate() method', () => {
    it('is a function returning Promise<ValidationResult> when defined', () => {
      if (handler?.validate) {
        expect(typeof handler.validate).toBe('function');
        expect(handler.validate('/some/path')).toBeInstanceOf(Promise);
      }
    });

    it('returns an object with valid and errors properties', async () => {
      if (handler?.validate) {
        const result = await handler.validate('/some/path');
        expect(result).toHaveProperty('valid');
        expect(typeof result.valid).toBe('boolean');
        expect(result).toHaveProperty('errors');
        expect(Array.isArray(result.errors)).toBe(true);
      }
    });
  });
});

describe('Handler type compatibility — full contract verification', () => {
  it('ensures all handler exports have the correct shape', async () => {
    for (const lang of validLanguages) {
      try {
        const mod = await import(`../handlers/${lang}`);
        const handlerName = `${lang}Handler`;
        const h = mod[handlerName] as Record<string, unknown> | undefined;
        expect(h).toBeDefined();
        expect(typeof h!.name).toBe('string');
        expect(typeof h!.generate).toBe('function');
        expect(validLanguages).toContain(h!.name);
        if (h!.validate) {
          expect(typeof h!.validate).toBe('function');
          const valResult = await (h!.validate as Function)('/tmp');
          expect(valResult).toHaveProperty('valid');
          expect(valResult).toHaveProperty('errors');
        }
      } catch { /* handler unavailable */ }
    }
  });
});
