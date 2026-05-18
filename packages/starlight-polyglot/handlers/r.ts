import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import type { Handler, BaseHandlerOptions } from '../core/plugin';
import { transformToMDX, type ASTModule } from '../core/mdx-generator';

interface RHandlerOptions extends BaseHandlerOptions {
  entryPoints: string[];
}

/**
 * R handler: Spawns `Rscript scripts/r_extract.R` with entry points to
 * extract function/class documentation from R packages.
 */
export const rHandler: Handler = {
  name: 'r',

  async generate(options) {
    const opts = options as unknown as RHandlerOptions;
    const entryPoints = opts.entryPoints;

    if (!entryPoints || entryPoints.length === 0) {
      throw new Error('R handler requires at least one entryPoint');
    }

    const ast = await extractWithRScript(entryPoints);
    const modules = ast.modules ?? [];

    if (modules.length === 0 && ast.errors) {
      throw new Error(
        `R extraction failed: ${ast.errors.map((e: { error: string }) => e.error).join(', ')}`,
      );
    }

    const output = transformToMDX(modules, {
      outputDir: opts.output,
      language: 'r',
      ...(opts.pagination !== undefined ? { pagination: opts.pagination } : {}),
    });

    return output;
  },

  async validate(_sourcePath) {
    try {
      execSync('Rscript --version', { encoding: 'utf-8', stdio: 'pipe' });
      return { valid: true, errors: [] };
    } catch {
      return { valid: false, errors: ['Rscript not found. Install R from https://www.r-project.org/'] };
    }
  },
};

interface RExtractOutput {
  modules?: ASTModule[];
  errors?: Array<{ entry_point: string; error: string }>;
}

function extractWithRScript(entryPoints: string[]): RExtractOutput {
  const scriptPath = path.resolve(import.meta.dirname, '..', 'scripts', 'r_extract.R');

  if (!existsSync(scriptPath)) {
    throw new Error(`R extraction script not found at ${scriptPath}`);
  }

  const args = ['Rscript', scriptPath, ...entryPoints];
  const result = execSync(args.join(' '), {
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024, // 10MB
    timeout: 120_000,
  });

  return JSON.parse(result) as RExtractOutput;
}
