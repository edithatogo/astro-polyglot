import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import type { Handler, BaseHandlerOptions } from '../core/plugin';
import { transformToMDX, type ASTModule } from '../core/mdx-generator';

interface ElixirHandlerOptions extends BaseHandlerOptions {
  /** Path to the Mix project root (containing mix.exs). */
  projectPath: string;
}

/**
 * Represents an ExDoc JSON output module/formatter element.
 * ExDoc's JSON formatter produces a structured document tree.
 */
interface ExDocModule {
  id?: string;
  module?: string;
  moduledoc?: string | null;
  type?: string;
  functions?: ExDocFunction[];
  callbacks?: ExDocFunction[];
  types?: ExDocType[];
  tasks?: ExDocFunction[];
}

interface ExDocFunction {
  name: string;
  doc?: string | null;
  spec?: string;
  type?: string;
  signature?: string;
  defaults?: Record<string, string>;
  source?: {
    line?: number;
    file?: string;
  };
}

interface ExDocType {
  name: string;
  doc?: string | null;
  spec?: string;
  type?: string;
}

interface ExDocOutput {
  modules?: ExDocModule[];
  groups_for_modules?: Record<string, string[]>;
  language?: string;
  version?: string;
}

/**
 * Elixir handler: Uses ExDoc to generate JSON documentation output for
 * Mix projects. The handler runs `mix docs --formatter json` in the
 * specified project directory, then parses the generated ExDoc JSON into
 * structured ASTModule data.
 *
 * @remarks
 * Requires Elixir (with `mix`) to be installed.
 * The project path should point to an Elixir Mix project root containing
 * `mix.exs`. The handler adds `ex_doc` as a dependency if not present
 * and runs the docs generator with the JSON formatter.
 */
export const elixirHandler: Handler = {
  name: 'elixir',

  async generate(options) {
    const opts = options as unknown as ElixirHandlerOptions;
    const projectPath = opts.projectPath;

    if (!projectPath) {
      throw new Error('Elixir handler requires a projectPath option');
    }

    if (!existsSync(projectPath)) {
      throw new Error(`Project path does not exist: ${projectPath}`);
    }

    const mixExsPath = path.join(projectPath, 'mix.exs');
    if (!existsSync(mixExsPath)) {
      throw new Error(`No mix.exs found at ${projectPath}. Ensure the path is an Elixir Mix project root.`);
    }

    const modules = extractWithExDoc(projectPath);

    if (modules.length === 0) {
      throw new Error('ExDoc extraction produced no modules');
    }

    const output = transformToMDX(modules, {
      outputDir: opts.output,
      language: 'elixir',
      ...(opts.pagination !== undefined ? { pagination: opts.pagination } : {}),
    });

    return output;
  },

  async validate(_sourcePath) {
    try {
      execSync('elixir --version', { encoding: 'utf-8', stdio: 'pipe' });
      execSync('mix --version', { encoding: 'utf-8', stdio: 'pipe' });
      return { valid: true, errors: [] };
    } catch {
      return {
        valid: false,
        errors: [
          'Elixir not found. Install from https://elixir-lang.org/install.html',
        ],
      };
    }
  },
};

/**
 * Runs ExDoc to produce JSON output for the Mix project and parses
 * the result into ASTModule[].
 */
function extractWithExDoc(projectPath: string): ASTModule[] {
  const resolvedPath = path.resolve(projectPath);

  // Ensure ex_doc is available as a dependency by checking deps
  execSync('mix deps.get', {
    encoding: 'utf-8',
    cwd: resolvedPath,
    stdio: 'pipe',
    timeout: 120_000,
  });

  // Generate docs with JSON formatter
  const cmd = 'mix docs --formatter json 2>&1';
  execSync(cmd, {
    encoding: 'utf-8',
    cwd: resolvedPath,
    maxBuffer: 10 * 1024 * 1024,
    timeout: 180_000,
    stdio: 'pipe',
  });

  // ExDoc JSON output is typically written to doc/ex_doc.json or similar
  const docDir = path.join(resolvedPath, 'doc');
  const jsonPaths = [
    path.join(docDir, 'ex_doc.json'),
    path.join(docDir, 'docs.json'),
    ...(existsSync(docDir)
      ? readdirSync(docDir).filter((f) => f.endsWith('.json')).map((f) => path.join(docDir, f))
      : []),
  ];

  for (const jsonPath of jsonPaths) {
    if (existsSync(jsonPath)) {
      const raw = readFileSync(jsonPath, 'utf-8');
      try {
        const exDocData = JSON.parse(raw) as ExDocOutput;
        return convertExDocModules(exDocData.modules ?? []);
      } catch {
        continue;
      }
    }
  }

  throw new Error(
    'ExDoc did not produce JSON output. Ensure ex_doc is configured in mix.exs and the project compiles.',
  );
}


/**
 * Converts ExDoc module entries into ASTModule[].
 */
function convertExDocModules(exDocModules: ExDocModule[]): ASTModule[] {
  const modules: ASTModule[] = [];

  for (const exMod of exDocModules) {
    const mod: ASTModule = {
      name: exMod.module ?? exMod.id ?? 'Unknown',
      docstring: exMod.moduledoc?.trim() || undefined,
      classes: [],
      functions: [],
      variables: [],
    };

    // Process functions (public and private)
    for (const fn of exMod.functions ?? []) {
      const params = parseExDocSignature(fn.spec ?? fn.signature);

      mod.functions?.push({
        name: fn.name,
        signature: fn.spec ?? fn.signature ?? undefined,
        docstring: fn.doc?.trim() || undefined,
        parameters: params && params.length > 0 ? params : undefined,
        return_type: extractExDocReturnType(fn.spec ?? fn.signature),
      });
    }

    // Process callbacks as functions too
    for (const cb of exMod.callbacks ?? []) {
      const params = parseExDocSignature(cb.spec ?? cb.signature);
      mod.functions?.push({
        name: cb.name,
        signature: cb.spec ?? cb.signature ?? `callback ${cb.name}`,
        docstring: cb.doc?.trim() || undefined,
        parameters: params && params.length > 0 ? params : undefined,
        return_type: extractExDocReturnType(cb.spec ?? cb.signature),
      });
    }

    // Process types
    for (const tp of exMod.types ?? []) {
      mod.variables?.push({
        name: tp.name,
        type: tp.spec ?? tp.type ?? 'type',
        docstring: tp.doc?.trim() || undefined,
      });
    }

    // Process tasks as functions
    for (const task of exMod.tasks ?? []) {
      mod.functions?.push({
        name: task.name,
        signature: task.signature ?? task.spec ?? undefined,
        docstring: task.doc?.trim() || undefined,
        parameters: parseExDocSignature(task.signature),
        return_type: undefined,
      });
    }

    modules.push(mod);
  }

  return modules;
}

/**
 * Parses an Elixir function spec/signature into parameter descriptions.
 * Handles patterns like: `function_name(param1, param2) :: return_type`
 */
function parseExDocSignature(
  sig?: string,
): Array<{ name: string; type?: string; description?: string; default?: string }> | undefined {
  if (!sig) return undefined;

  // Extract the params portion between the first ( and its matching )
  let depth = 0;
  let startIdx = -1;
  let endIdx = -1;

  for (let i = 0; i < sig.length; i++) {
    if (sig[i] === '(') {
      if (depth === 0) startIdx = i;
      depth++;
    } else if (sig[i] === ')') {
      depth--;
      if (depth === 0 && startIdx >= 0) {
        endIdx = i;
        break;
      }
    }
  }

  if (startIdx < 0 || endIdx < 0) return undefined;

  const paramsStr = sig.substring(startIdx + 1, endIdx);
  if (!paramsStr.trim()) return undefined;

  // Parse comma-separated params
  return paramsStr.split(',').map((p) => {
    const trimmed = p.trim();
    const parts = trimmed.split(/::|\\s+/);
    return {
      name: parts[0]?.trim() || trimmed,
      type: parts[1]?.trim() || undefined,
      description: undefined,
      default: undefined,
    };
  });
}

/**
 * Extracts the return type from an Elixir spec string.
 * Pattern: `function(...) :: return_type`
 */
function extractExDocReturnType(sig?: string): string | undefined {
  if (!sig) return undefined;
  const idx = sig.indexOf('::');
  if (idx < 0) return undefined;
  return sig.substring(idx + 2).trim() || undefined;
}
