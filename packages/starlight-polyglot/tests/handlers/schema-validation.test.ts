import { beforeAll, describe, expect, it } from 'vitest';
import type { Handler, HandlerAggregateOutput, HandlerPage, ValidationResult } from '../../core/handler';
import { ALL_LANGUAGES, loadHandler, randomValidShapedOptions, type HandlerName } from './fuzz-common';

function expectHandlerPage(page: HandlerPage): void {
  expect(typeof page.path).toBe('string');
  expect(page.frontmatter).toBeTruthy();
  expect(typeof page.frontmatter).toBe('object');
  expect(Array.isArray(page.frontmatter)).toBe(false);
  expect(typeof page.body).toBe('string');
}

function expectHandlerAggregateOutput(output: HandlerAggregateOutput): void {
  expect(Array.isArray(output.pages)).toBe(true);
  for (const page of output.pages) {
    expectHandlerPage(page);
  }

  expect(typeof output.sidebar.label).toBe('string');
  expect(Array.isArray(output.sidebar.items)).toBe(true);
  for (const item of output.sidebar.items) {
    expect(typeof item.label).toBe('string');
    expect(typeof item.link).toBe('string');
  }
}

function expectValidationResult(result: ValidationResult): void {
  expect(typeof result.valid).toBe('boolean');
  expect(Array.isArray(result.errors)).toBe(true);
  for (const error of result.errors) {
    expect(typeof error).toBe('string');
  }
}

async function loadHandlers(): Promise<Map<HandlerName, Handler>> {
  const handlers = new Map<HandlerName, Handler>();
  for (const language of ALL_LANGUAGES) {
    const handler = await loadHandler(language);
    if (handler) handlers.set(language, handler);
  }
  return handlers;
}

describe('Handler interface compliance', () => {
  let handlers: Map<HandlerName, Handler>;

  beforeAll(async () => {
    handlers = await loadHandlers();
  });

  it('discovers available handlers', () => {
    expect(handlers.size).toBeGreaterThanOrEqual(1);
  });

  it('every handler export matches the Handler interface shape', () => {
    for (const [language, handler] of handlers) {
      expect(handler.name).toBe(language);
      expect(ALL_LANGUAGES).toContain(handler.name);
      expect(typeof handler.generate).toBe('function');
      if (handler.validate !== undefined) {
        expect(typeof handler.validate).toBe('function');
      }
    }
  });

  it('generate() returns a Promise for valid-shaped options', () => {
    for (const [language, handler] of handlers) {
      const result = handler.generate(randomValidShapedOptions(language) as never);
      expect(result).toBeInstanceOf(Promise);
      result.catch(() => undefined);
    }
  });
});

describe('HandlerAggregateOutput contract', () => {
  let handlers: Map<HandlerName, Handler>;

  beforeAll(async () => {
    handlers = await loadHandlers();
  });

  it('validates output shape when a handler can generate in the local environment', async () => {
    for (const [language, handler] of handlers) {
      const result = await handler
        .generate(randomValidShapedOptions(language) as never)
        .catch(() => null);

      if (result) {
        expectHandlerAggregateOutput(result);
      }
    }
  });
});

describe('validate() contract', () => {
  let handlers: Map<HandlerName, Handler>;

  beforeAll(async () => {
    handlers = await loadHandlers();
  });

  it('returns Promise<ValidationResult> when validate is implemented', async () => {
    for (const handler of handlers.values()) {
      if (!handler.validate) continue;

      const result = handler.validate('/tmp/test');
      expect(result).toBeInstanceOf(Promise);
      expectValidationResult(await result);
    }
  });

  it('returns stable validation shape for repeated calls', async () => {
    for (const handler of handlers.values()) {
      if (!handler.validate) continue;

      const first = await handler.validate('/tmp/test');
      const second = await handler.validate('/tmp/test');
      expectValidationResult(first);
      expectValidationResult(second);
      expect(first.valid).toBe(second.valid);
    }
  });
});
