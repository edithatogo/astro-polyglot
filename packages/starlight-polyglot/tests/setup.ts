/**
 * starlight-polyglot — Shared Test Infrastructure
 *
 * Provides mock factories, Faker-based random data generators,
 * common fixtures, and global lifecycle hooks for all test suites.
 *
 * @module tests/setup
 */

import { beforeAll, afterAll, vi } from 'vitest';
import { randomBytes, randomUUID } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';

// ─── Re-export canonical types ──────────────────────────────────────

import type {
  ASTModule,
  ASTClass,
  ASTFunction,
  ASTParameter,
  ASTVariable,
} from '../core/mdx-generator';

export type {
  ASTModule,
  ASTClass,
  ASTFunction,
  ASTParameter,
  ASTVariable,
};

import type {
  HandlerAggregateOutput,
  HandlerPage,
  HandlerOptions,
  SidebarItem,
  Language,
} from '../core/handler';

export type {
  HandlerAggregateOutput,
  HandlerPage,
  HandlerOptions,
  SidebarItem,
  Language,
};

import type { HandlerOutput, MDXFrontmatter } from '../core/plugin';
export type { HandlerOutput, MDXFrontmatter };

// ─── Global lifecycle hooks ─────────────────────────────────────────

beforeAll(() => {
  process.env.NODE_ENV = 'test';
  vi.useFakeTimers({ shouldAdvanceTime: false });
});

afterAll(() => {
  vi.useRealTimers();
});

// ─── Temp directory helpers ─────────────────────────────────────────

/**
 * Create a temporary directory for test file I/O.
 * Automatically cleaned up on test teardown via the returned disposer.
 */
export async function createTempDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'starlight-polyglot-test-'));
}

/**
 * Recursively remove a temporary directory.
 */
export async function removeTempDir(dir: string): Promise<void> {
  await fs.rm(dir, { recursive: true, force: true, maxRetries: 3 });
}

// ─── Mock AST factories ─────────────────────────────────────────────

/**
 * Creates a fully defaulted ASTModule for testing.
 * Every field is set to a sensible default so tests don't
 * need to repeat boilerplate.
 */
export function createMockModule(overrides?: Partial<ASTModule>): ASTModule {
  return {
    name: 'test_module',
    docstring: 'A test module for unit testing.',
    classes: [],
    functions: [],
    variables: [],
    ...overrides,
  };
}

/**
 * Creates a mock ASTClass with sensible defaults.
 */
export function createMockClass(overrides?: Partial<ASTClass>): ASTClass {
  return {
    name: 'TestClass',
    docstring: 'A test class.',
    methods: [],
    properties: [],
    ...overrides,
  };
}

/**
 * Creates a mock ASTFunction with sensible defaults.
 */
export function createMockFunction(
  overrides?: Partial<ASTFunction>,
): ASTFunction {
  return {
    name: 'testFunction',
    signature: 'testFunction(x: number): string',
    docstring: 'A test function.',
    parameters: [],
    return_type: 'string',
    ...overrides,
  };
}

/**
 * Creates a mock ASTParameter with sensible defaults.
 */
export function createMockParameter(
  overrides?: Partial<ASTParameter>,
): ASTParameter {
  return {
    name: 'param',
    type: 'string',
    description: 'A parameter.',
    default: undefined,
    ...overrides,
  };
}

/**
 * Creates a mock ASTVariable with sensible defaults.
 */
export function createMockVariable(
  overrides?: Partial<ASTVariable>,
): ASTVariable {
  return {
    name: 'variable',
    type: 'string',
    docstring: 'A variable.',
    ...overrides,
  };
}

// ─── Random data generators (crypto-secure, no Faker dependency) ──

/**
 * Generate a random module tree of configurable depth and breadth.
 * Useful for property-based tests that need non-trivial AST input.
 */
export function generateRandomModuleTree(
  depth = 0,
  maxDepth = 3,
  maxWidth = 5,
): ASTModule {
  const mod: ASTModule = {
    name: `mod_${randomBytes(4).toString('hex')}`,
    docstring:
      depth === 0
        ? 'Root module for randomized testing.'
        : `Nested module at depth ${depth}`,
    classes: [],
    functions: [],
    variables: [],
  };

  if (depth < maxDepth) {
    const classCount = Math.min(pickRandomInt(1, maxWidth), maxWidth);
    for (let i = 0; i < classCount; i++) {
      mod.classes!.push({
        name: `Class${i}_${randomBytes(2).toString('hex')}`,
        docstring: `Random class ${i} at depth ${depth}`,
        methods: [
          {
            name: `method${i}_${randomBytes(2).toString('hex')}`,
            signature: `method${i}(x: number, y: string): ${pickRandom(['void', 'number', 'boolean', 'string'])}`,
            docstring: `Method ${i} documentation.`,
            parameters: [
              { name: 'x', type: 'number', description: 'The first param.' },
              { name: 'y', type: 'string', description: 'The second param.' },
            ],
            return_type: pickRandom(['void', 'number', 'boolean']),
          },
        ],
        properties: [
          {
            name: `prop${i}`,
            type: pickRandom(['string', 'number', 'boolean', 'int', 'float']),
            docstring: `Property ${i}.`,
          },
        ],
      });
    }

    const fnCount = Math.min(pickRandomInt(1, maxWidth), maxWidth);
    for (let i = 0; i < fnCount; i++) {
      mod.functions!.push({
        name: `func${i}_${randomBytes(2).toString('hex')}`,
        signature: `func${i}(x: number): ${pickRandom(['void', 'number', 'boolean'])}`,
        docstring: `Random function ${i} at depth ${depth}.`,
        parameters: [
          { name: 'x', type: 'number', description: 'A number.' },
        ],
        return_type: pickRandom(['void', 'number', 'boolean']),
      });
    }
  }

  return mod;
}

/**
 * Generate an array of random AST modules of the given count.
 */
export function generateRandomModules(count = 3): ASTModule[] {
  return Array.from({ length: count }, () =>
    generateRandomModuleTree(0, 2, 3),
  );
}

// ─── Pick helper ────────────────────────────────────────────────────

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function pickRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}


// ─── Common test fixtures (edge cases, unicode, etc.) ──────────────

/**
 * Unicode-heavy module names and docstrings for internationalization testing.
 */
export const UNICODE_FIXTURES: ASTModule[] = [
  {
    name: 'unicode_模块',
    docstring: '一个测试模块 · Unicode support ✓ 日本語 中文 русский',
    classes: [
      {
        name: 'Класс',
        docstring: 'Это класс с кириллическими именами.',
        methods: [
          {
            name: ' método',
            signature: 'método(x: número): texto',
            docstring: 'Un método con caracteres acentuados.',
            parameters: [{ name: 'x', type: 'número', description: 'Un número.' }],
            return_type: 'texto',
          },
        ],
        properties: [{ name: 'propiedad', type: 'texto', docstring: 'Una propiedad.' }],
      },
    ],
    functions: [
      {
        name: '函数',
        signature: '函数(x: int) -> str',
        docstring: '一个中文函数。',
        parameters: [{ name: 'x', type: 'int', description: '一个整数' }],
        return_type: 'str',
      },
    ],
    variables: [{ name: '变量', type: 'str', docstring: '一个变量。' }],
  },
  {
    name: 'emoji_🎯_module',
    docstring: 'Module with emoji 🎉 in docstring 😊 and special chars: ∑∏∫',
    functions: [
      {
        name: '🔥_hot_fn',
        signature: 'hot_fn(temp: number): string',
        docstring: 'A 🔥 function with emoji.',
        parameters: [{ name: 'temp', type: 'number', description: 'Temperature 🌡️' }],
        return_type: 'string',
      },
    ],
  },
];

/**
 * Edge-case modules that test boundaries of the system.
 */
export const EDGE_CASE_FIXTURES: ASTModule[] = [
  { name: 'empty_module', docstring: '', classes: [], functions: [], variables: [] },
  {
    name: 'classes_only',
    docstring: 'Only classes module.',
    classes: [
      {
        name: 'EmptyClass',
        docstring: '',
        methods: [],
        properties: [],
      },
      {
        name: 'FullClass',
        docstring: 'A class with everything.',
        methods: [
          {
            name: 'method1',
            signature: '',
            docstring: '',
            parameters: [],
            return_type: undefined,
          },
        ],
        properties: [
          { name: 'prop1', type: 'int', docstring: '' },
        ],
      },
    ],
    functions: [],
  },
  {
    name: 'functions_only',
    docstring: 'Only functions module.',
    functions: [
      {
        name: 'bare_fn',
        signature: undefined,
        docstring: undefined,
        parameters: undefined,
        return_type: undefined,
      },
    ],
    classes: [],
  },
  { name: 'minimal' },
  {
    name: 'deep_nest',
    docstring: 'Deep nesting test.',
    classes: [
      {
        name: 'Outer',
        docstring: 'Outer class.',
        methods: [
          {
            name: 'inner_method',
            signature: 'inner_method(a: int, b?: string, c: float = 1.0): void',
            docstring: 'Deep method.',
            parameters: [
              { name: 'a', type: 'int', description: 'Required param.' },
              { name: 'b', type: 'string', description: 'Optional param.', default: 'undefined' },
              { name: 'c', type: 'float', description: 'Default param.', default: '1.0' },
            ],
            return_type: 'void',
          },
        ],
        properties: [
          { name: 'prop_a', type: 'int' },
          { name: 'prop_b', type: 'string', docstring: 'String property.' },
        ],
      },
    ],
  },
  {
    name: 'special_chars_$-_-@-!',
    docstring: 'Module with special chars in name.',
    functions: [
      {
        name: 'fn_with_$pecial',
        signature: 'fn(param_1: int): $pecialType',
        docstring: 'Function with $ in name.',
        parameters: [{ name: 'param_1', type: 'int', description: 'A param.' }],
        return_type: '$pecialType',
      },
    ],
  },
  {
    name: 'a'.repeat(100),
    docstring: 'x'.repeat(500),
    functions: [
      {
        name: 'b'.repeat(80),
        signature: 'c'.repeat(200),
        docstring: 'd'.repeat(300),
        parameters: Array.from({ length: 10 }, (_, i) => ({
          name: `param_${i}`,
          type: `Type${i}`,
          description: `Description for param ${i}.`,
          default: i % 2 === 0 ? `default_${i}` : undefined,
        })),
        return_type: 'VeryLongReturnTypeThatCouldWrapAroundLinesInTheGeneratedMDXOutput',
      },
    ],
  },
];

/**
 * All fixtures combined for easy iteration.
 */
export const ALL_FIXTURES: ASTModule[] = [
  ...EDGE_CASE_FIXTURES,
  ...UNICODE_FIXTURES,
];


// ─── Mock output helpers ────────────────────────────────────────────

/**
 * Create a mock HandlerPage for testing.
 */
export function createMockHandlerPage(
  overrides?: Partial<HandlerPage>,
): HandlerPage {
  return {
    path: 'api/test/hello.mdx',
    frontmatter: {
      title: 'hello',
      description: 'A test page.',
      sidebar: { label: 'hello' },
      pagefind: true,
      language: 'python',
      source: 'hello',
    },
    body: 'Test body content.',
    ...overrides,
  };
}

/**
 * Create a mock HandlerAggregateOutput for testing.
 */
export function createMockHandlerOutput(
  overrides?: Partial<HandlerAggregateOutput>,
): HandlerAggregateOutput {
  return {
    pages: [createMockHandlerPage()],
    sidebar: {
      label: 'PYTHON',
      items: [{ label: 'hello', link: 'api/test/hello/' }],
    },
    ...overrides,
  };
}

/**
 * Generate a unique test ID for traceability across runs.
 */
export function testId(): string {
  return randomUUID().split('-')[0]!;
}

