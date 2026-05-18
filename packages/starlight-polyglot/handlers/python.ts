import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import type { Handler, BaseHandlerOptions } from '../core/plugin';
import { transformToMDX, writeMDXPages, type ASTModule } from '../core/mdx-generator';

interface PythonHandlerOptions extends BaseHandlerOptions {
  entryPoints: string[];
}

/**
 * Python handler: Uses Griffe via a Python subprocess to extract docstrings.
 * Falls back to extracting from reStructuredText docstrings if griffe is unavailable.
 */
export const pythonHandler: Handler = {
  name: 'python',

  async generate(options) {
    const opts = options as unknown as PythonHandlerOptions;
    const entryPoints = opts.entryPoints;

    if (!entryPoints || entryPoints.length === 0) {
      throw new Error('Python handler requires at least one entryPoint');
    }

    const ast = await extractWithGriffe(entryPoints);
    const modules = ast.modules ?? [];

    if (modules.length === 0 && ast.errors) {
      throw new Error(`Python extraction failed: ${ast.errors.map((e: { error: string }) => e.error).join(', ')}`);
    }

    const output = transformToMDX(modules, {
      outputDir: opts.output,
      language: 'python',
      ...(opts.pagination !== undefined ? { pagination: opts.pagination } : {}),
    });

    return output;
  },

  async validate(sourcePath) {
    try {
      const result = execSync('python3 -c "import griffe"', { encoding: 'utf-8', stdio: 'pipe' });
      return { valid: true, errors: [] };
    } catch {
      return { valid: false, errors: ['griffe not installed. Run: pip install griffe'] };
    }
  },
};

interface GriffeOutput {
  modules?: ASTModule[];
  errors?: Array<{ entry_point: string; error: string }>;
}

function extractWithGriffe(entryPoints: string[]): GriffeOutput {
  const scriptPath = path.resolve(import.meta.dirname, '..', 'scripts', 'python_extract.py');

  if (!existsSync(scriptPath)) {
    throw new Error(`Python extraction script not found at ${scriptPath}`);
  }

  const args = ['python3', scriptPath, '--entry-points', ...entryPoints];
  const result = execSync(args.join(' '), {
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024, // 10MB
    timeout: 60_000,
  });

  return JSON.parse(result) as GriffeOutput;
}
