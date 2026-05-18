import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { Handler, BaseHandlerOptions } from '../core/plugin';
import { transformToMDX, type ASTModule } from '../core/mdx-generator';

interface RustHandlerOptions extends BaseHandlerOptions {
  cratePath: string;
}

/**
 * Rust handler: Uses `cargo +nightly rustdoc --output-format json` to
 * generate JSON-formatted rustdoc documentation, then parses it into ASTModule[].
 */
export const rustHandler: Handler = {
  name: 'rust',

  async generate(options) {
    const opts = options as unknown as RustHandlerOptions;
    const cratePath = opts.cratePath;

    if (!cratePath) {
      throw new Error('Rust handler requires a cratePath option');
    }

    if (!existsSync(cratePath)) {
      throw new Error(`Crate path does not exist: ${cratePath}`);
    }

    const modules = extractWithRustDoc(cratePath);

    if (modules.length === 0) {
      throw new Error('rustdoc extraction produced no modules');
    }

    const output = transformToMDX(modules, {
      outputDir: opts.output,
      language: 'rust',
      ...(opts.pagination !== undefined ? { pagination: opts.pagination } : {}),
    });

    return output;
  },

  async validate(_sourcePath) {
    try {
      execSync('cargo --version', { encoding: 'utf-8', stdio: 'pipe' });
      return { valid: true, errors: [] };
    } catch {
      return { valid: false, errors: ['cargo not found. Install Rust from https://rustup.rs/'] };
    }
  },
};


interface RustDocCrate {
  root: string;
  version: string;
}

interface RustDocItem {
  id: string;
  crate_id: number;
  name?: string;
  kind: string;
  visibility?: string;
  span?: { filename: string; begin: [number, number]; end: [number, number] };
  docs?: string;
  inner?: RustDocItem[];
  decl?: {
    params?: Array<{ name: string; type: string }>;
    output?: { name: string };
    generics?: { params?: Array<{ name: string }> };
  };
  header?: {
    constness?: string;
    asyncness?: string;
    safety?: string;
    abi?: string;
  };
  generics?: { params?: Array<{ name: string }> };
}

interface RustDocOutput {
  format_version: number;
  crate: RustDocCrate;
  index: Record<string, RustDocItem>;
  paths?: Record<string, { id: string; name: string; kind: string }>;
}

function buildRustSignature(item: RustDocItem): string | undefined {
  if (!item.decl) return undefined;

  const params = (item.decl.params ?? [])
    .map((p) => `${p.name}: ${p.type}`)
    .join(', ');

  const output = item.decl.output?.name ?? '';
  const header = item.header ?? {};

  let prefix = '';
  if (header.asyncness === 'async') prefix += 'async ';
  if (header.safety === 'unsafe') prefix += 'unsafe ';

  if (output && output !== '()' && output !== 'unit') {
    return `${prefix}fn ${item.name}(${params}) -> ${output}`;
  }
  return `${prefix}fn ${item.name}(${params})`;
}

function extractRustParameters(
  item: RustDocItem,
): Array<{ name: string; type?: string; description?: string; default?: string }> | undefined {
  if (!item.decl?.params || item.decl.params.length === 0) return undefined;

  return item.decl.params.map((p) => ({
    name: p.name,
    type: p.type,
    description: undefined,
    default: undefined,
  }));
}


function extractRustItem(item: RustDocItem, _index: Record<string, RustDocItem>): ASTModule | null {
  if (item.kind !== 'module' && item.kind !== 'crate') return null;

  const mod: ASTModule = {
    name: item.name ?? 'unknown',
    docstring: item.docs?.trim() || undefined,
    classes: [],
    functions: [],
    variables: [],
  };

  for (const child of item.inner ?? []) {
    if (child.kind === 'struct' || child.kind === 'enum' || child.kind === 'union' || child.kind === 'trait') {
      const clsItem: {
        name: string;
        docstring?: string;
        methods?: Array<{
          name: string;
          signature?: string;
          docstring?: string;
          parameters?: Array<{ name: string; type?: string; description?: string; default?: string }>;
          return_type?: string;
        }>;
        properties?: Array<{ name: string; type?: string; docstring?: string }>;
      } = {
        name: child.name ?? 'unknown',
        docstring: child.docs?.trim() || undefined,
        methods: [],
        properties: [],
      };

      for (const field of child.inner ?? []) {
        if (field.kind === 'field') {
          clsItem.properties?.push({
            name: field.name ?? 'unknown',
            type: field.decl?.output?.name ?? undefined,
            docstring: field.docs?.trim() || undefined,
          });
        } else if (field.kind === 'method') {
          clsItem.methods?.push({
            name: field.name ?? 'unknown',
            signature: buildRustSignature(field),
            docstring: field.docs?.trim() || undefined,
            parameters: extractRustParameters(field),
            return_type: field.decl?.output?.name ?? undefined,
          });
        }
      }

      mod.classes?.push(clsItem);
    } else if (child.kind === 'function') {
      mod.functions?.push({
        name: child.name ?? 'unknown',
        signature: buildRustSignature(child),
        docstring: child.docs?.trim() || undefined,
        parameters: extractRustParameters(child),
        return_type: child.decl?.output?.name ?? undefined,
      });
    } else if (child.kind === 'constant' || child.kind === 'static') {
      mod.variables?.push({
        name: child.name ?? 'unknown',
        type: child.decl?.output?.name ?? undefined,
        docstring: child.docs?.trim() || undefined,
      });
    }
  }

  return mod;
}

function extractWithRustDoc(cratePath: string): ASTModule[] {
  const resolvedPath = path.resolve(cratePath);

  // Run cargo +nightly rustdoc to produce JSON output
  const cmd = `cargo +nightly rustdoc --output-format json --manifest-path "${resolvedPath}/Cargo.toml" 2>/dev/null`;
  execSync(cmd, {
    encoding: 'utf-8',
    stdio: 'pipe',
    timeout: 120_000,
  });

  // Determine the target directory for the JSON output
  const crateName = path.basename(resolvedPath);
  const possiblePaths = [
    path.resolve(resolvedPath, 'target', 'doc', `${crateName}.json`),
    path.resolve(resolvedPath, '..', 'target', 'doc', `${crateName}.json`),
  ];

  let jsonPath = '';
  for (const p of possiblePaths) {
    if (existsSync(p)) {
      jsonPath = p;
      break;
    }
  }

  if (!jsonPath) {
    throw new Error(
      `Could not find rustdoc JSON output. Expected at target/doc/${crateName}.json in crate or parent.`,
    );
  }

  const raw = readFileSync(jsonPath, 'utf-8');
  const output = JSON.parse(raw) as RustDocOutput;

  const modules: ASTModule[] = [];

  // Process all items in the index
  for (const item of Object.values(output.index)) {
    if (item.kind === 'module' || item.kind === 'crate') {
      const mod = extractRustItem(item, output.index);
      if (mod && !modules.find((m) => m.name === mod.name)) {
        modules.push(mod);
      }
    }
  }

  return modules;
}
