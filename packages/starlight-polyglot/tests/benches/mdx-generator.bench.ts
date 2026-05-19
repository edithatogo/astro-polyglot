/**
 * Benchmarks for MDX generation performance.
 *
 * Uses vitest's built-in benchmark runner (`vitest bench`).
 * Measures throughput and latency of transformToMDX and writeMDXPages
 * under varying input sizes.
 *
 * @module tests/benches/mdx-generator.bench
 */

import { bench, describe, beforeAll } from 'vitest';
import { transformToMDX } from '../../core/mdx-generator';
import type { ASTModule, ASTClass, ASTFunction } from '../../core/mdx-generator';

// ─── Fixture builder helpers ────────────────────────────────────────

function generateModuleTree(depth: number, breadth: number): ASTModule {
  const mod: ASTModule = {
    name: `bench_${depth}_${breadth}`,
    docstring: 'A'.repeat(200),
    classes: [],
    functions: [],
    variables: [],
  };

  for (let i = 0; i < breadth; i++) {
    const methods: ASTFunction[] = [];
    for (let j = 0; j < breadth; j++) {
      methods.push({
        name: `method_${i}_${j}`,
        signature: `method_${i}_${j}(x: number, y: string): void`,
        docstring: 'B'.repeat(100),
        parameters: [
          { name: 'x', type: 'number', description: 'The X parameter.' },
          { name: 'y', type: 'string', description: 'The Y parameter.' },
        ],
        return_type: 'void',
      });
    }

    mod.classes!.push({
      name: `Class_${i}`,
      docstring: 'C'.repeat(100),
      methods,
      properties: [
        { name: `prop_${i}`, type: 'string', docstring: 'A property.' },
      ],
    });

    mod.functions!.push({
      name: `func_${i}`,
      signature: `func_${i}(x: number): boolean`,
      docstring: 'D'.repeat(100),
      parameters: [{ name: 'x', type: 'number', description: 'Param X.' }],
      return_type: 'boolean',
    });
  }

  return mod;
}

// ─── Fixtures at various scales ─────────────────────────────────────

let smallFixtures: ASTModule[];
let mediumFixtures: ASTModule[];
let largeFixtures: ASTModule[];

beforeAll(() => {
  smallFixtures = Array.from({ length: 3 }, () => generateModuleTree(1, 2));
  mediumFixtures = Array.from({ length: 10 }, () => generateModuleTree(2, 5));
  largeFixtures = Array.from({ length: 50 }, () => generateModuleTree(3, 10));
});

// ─── Benchmarks ─────────────────────────────────────────────────────

describe('transformToMDX', () => {
  bench('small (3 modules, 2 classes/fns each)', () => {
    transformToMDX(smallFixtures, {
      outputDir: 'api/python',
      language: 'python',
      pagination: false,
    });
  });

  bench('medium (10 modules, 5 classes/fns each)', () => {
    transformToMDX(mediumFixtures, {
      outputDir: 'api/python',
      language: 'python',
      pagination: false,
    });
  });

  bench('large (50 modules, 10 classes/fns each)', () => {
    transformToMDX(largeFixtures, {
      outputDir: 'api/python',
      language: 'python',
      pagination: false,
    });
  });
});
