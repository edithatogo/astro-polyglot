import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { Handler, BaseHandlerOptions } from '../core/plugin';
import { transformToMDX, type ASTModule } from '../core/mdx-generator';

interface DartHandlerOptions extends BaseHandlerOptions {
  /** Paths to Dart package directories or .dart files to document */
  entryPoints: string[];
}

/**
 * Represents a dartdoc JSON output element.
 * The dartdoc `--json` flag produces a list of documented elements.
 */
interface DartdocElement {
  name?: string;
  kind?: string;
  qualifiedName?: string;
  href?: string;
  description?: string;
  documentation?: string;
  type?: string;
  parameters?: Array<{
    name: string;
    type?: string;
    isOptional?: boolean;
    isNamed?: boolean;
    defaultValue?: string;
  }>;
  returnType?: string;
  isStatic?: boolean;
  isFinal?: boolean;
  isConst?: boolean;
  isAbstract?: boolean;
  enclosingElement?: {
    name?: string;
    qualifiedName?: string;
  };
  typeParameters?: Array<{ name: string }>;
}

/**
 * Dart handler: Uses `dart doc` with JSON output (`dart doc --json`) to
 * extract API documentation from Dart packages, then parses the generated
 * JSON into structured ASTModule data.
 *
 * @remarks
 * Requires the Dart SDK (`dart`) to be installed.
 * Entry points should be paths to Dart package directories (containing
 * pubspec.yaml) or individual .dart files.
 */
export const dartHandler: Handler = {
  name: 'dart',

  async generate(options) {
    const opts = options as unknown as DartHandlerOptions;
    const entryPoints = opts.entryPoints;

    if (!entryPoints || entryPoints.length === 0) {
      throw new Error('Dart handler requires at least one entryPoint');
    }

    const modules = extractWithDartdoc(entryPoints);

    if (modules.length === 0) {
      throw new Error('dartdoc extraction produced no modules');
    }

    const output = transformToMDX(modules, {
      outputDir: opts.output,
      language: 'dart',
      ...(opts.pagination !== undefined ? { pagination: opts.pagination } : {}),
    });

    return output;
  },

  async validate(_sourcePath) {
    try {
      execSync('dart --version', { encoding: 'utf-8', stdio: 'pipe' });
      // Also check that dart doc is available
      execSync('dart doc --help', { encoding: 'utf-8', stdio: 'pipe' });
      return { valid: true, errors: [] };
    } catch {
      return {
        valid: false,
        errors: [
          'Dart SDK not found. Install from https://dart.dev/get-dart',
        ],
      };
    }
  },
};

/**
 * Runs dartdoc on the entry points and parses the JSON output into ASTModule[].
 */
function extractWithDartdoc(entryPoints: string[]): ASTModule[] {
  const modules: ASTModule[] = [];

  for (const entry of entryPoints) {
    const resolvedEntry = path.resolve(entry);
    if (!existsSync(resolvedEntry)) {
      continue;
    }

    // dart doc generates HTML output by default, --json-output produces a JSON file
    const jsonOutputPath = '/tmp/starlight-polyglot-dartdoc.json';
    const cmd = `dart doc --json-output "${jsonOutputPath}" --output /tmp/starlight-polyglot-dartdoc-html "${resolvedEntry}" 2>&1`;

    execSync(cmd, {
      encoding: 'utf-8',
      cwd: existsSync(path.join(resolvedEntry, 'pubspec.yaml'))
        ? resolvedEntry
        : path.dirname(resolvedEntry),
      maxBuffer: 10 * 1024 * 1024,
      timeout: 180_000,
      stdio: 'pipe',
    });

    if (existsSync(jsonOutputPath)) {
      const raw = readFileSync(jsonOutputPath, 'utf-8');
      try {
        const dartdocData = JSON.parse(raw) as DartdocElement[];
        const converted = convertDartdocElements(dartdocData);
        modules.push(...converted);
      } catch {
        continue;
      }
    }
  }

  return modules;

/**
 * Converts an array of dartdoc JSON elements into ASTModule[].
 * Groups elements by their containing library/class to form modules.
 */
function convertDartdocElements(elements: DartdocElement[]): ASTModule[] {
  const modules: ASTModule[] = [];

  // Group by enclosing library
  const libraryMap = new Map<string, DartdocElement[]>();

  for (const el of elements) {
    const libName = el.enclosingElement?.qualifiedName ?? el.qualifiedName?.split('.').shift() ?? 'Global';
    if (!libraryMap.has(libName)) {
      libraryMap.set(libName, []);
    }
    libraryMap.get(libName)!.push(el);
  }

  for (const [libName, libElements] of libraryMap) {
    const mod: ASTModule = {
      name: libName,
      docstring: undefined,
      classes: [],
      functions: [],
      variables: [],
    };

    // Process top-level classes
    const classes = libElements.filter(
      (e) =>
        (e.kind === 'class' || e.kind === 'mixin' || e.kind === 'enum' || e.kind === 'extension') &&
        (!e.enclosingElement || !e.enclosingElement.name),
    );

    for (const cls of classes) {
      const clsDoc = extractDartdocDoc(cls);
      const clsResult: {
        name: string;
        docstring?: string;
        methods: Array<{
          name: string;
          signature?: string;
          docstring?: string;
          parameters?: Array<{ name: string; type?: string; description?: string; default?: string }>;
          return_type?: string;
        }>;
        properties: Array<{ name: string; type?: string; docstring?: string }>;
      } = {
        name: cls.name ?? 'Unknown',
        docstring: clsDoc,
        methods: [],
        properties: [],
      };

      // Find members belonging to this class
      const members = libElements.filter(
        (e) => e.enclosingElement?.name === cls.name,
      );

      for (const member of members) {
        const memberDoc = extractDartdocDoc(member);
        if (
          member.kind === 'method' ||
          member.kind === 'constructor' ||
          member.kind === 'method_operator'
        ) {
          clsResult.methods.push({
            name: member.name ?? 'unknown',
            signature: buildDartSignature(member),
            docstring: memberDoc,
            parameters: (member.parameters ?? []).map((p) => ({
              name: p.name,
              type: p.type ?? undefined,
              description: undefined,
              default: p.defaultValue ?? undefined,
            })),
            return_type: member.returnType ?? undefined,
          });
        } else if (
          member.kind === 'property' ||
          member.kind === 'field' ||
          member.kind === 'constant'
        ) {
          clsResult.properties.push({
            name: member.name ?? 'unknown',
            type: member.returnType ?? member.type ?? undefined,
            docstring: memberDoc,
          });
        }
      }

      mod.classes?.push(clsResult);

      if (!mod.docstring && clsDoc) {
        mod.docstring = clsDoc;
      }
    }

    // Process top-level functions (not inside a class)
    const functions = libElements.filter(
      (e) =>
        (e.kind === 'function' || e.kind === 'top_level_function' || e.kind === 'method') &&
        (!e.enclosingElement || !e.enclosingElement.name),
    );

    for (const fn of functions) {
      mod.functions?.push({
        name: fn.name ?? 'unknown',
        signature: buildDartSignature(fn),
        docstring: extractDartdocDoc(fn),
        parameters: (fn.parameters ?? []).map((p) => ({
          name: p.name,
          type: p.type ?? undefined,
          description: undefined,
          default: p.defaultValue ?? undefined,
        })),
        return_type: fn.returnType ?? undefined,
      });
    }

    // Process top-level variables/constants
    const variables = libElements.filter(
      (e) =>
        (e.kind === 'constant' || e.kind === 'top_level_variable' || e.kind === 'variable') &&
        (!e.enclosingElement || !e.enclosingElement.name),
    );

    for (const v of variables) {
      mod.variables?.push({
        name: v.name ?? 'unknown',
        type: v.returnType ?? v.type ?? undefined,
        docstring: extractDartdocDoc(v),
      });
    }

    if (
      (mod.classes && mod.classes.length > 0) ||
      (mod.functions && mod.functions.length > 0) ||
      (mod.variables && mod.variables.length > 0)
    ) {
      modules.push(mod);
    }
  }

  return modules;
}

/**
 * Extracts documentation text from a dartdoc element.
 */
function extractDartdocDoc(el: DartdocElement): string | undefined {
  return el.documentation?.trim() || el.description?.trim() || undefined;
}

/**
 * Builds a Dart-style function/method signature string.
 */
function buildDartSignature(el: DartdocElement): string | undefined {
  const params = (el.parameters ?? [])
    .map((p) => {
      const typeStr = p.type ? ` ${p.type}` : '';
      const optional = p.isOptional ? '?' : '';
      return `${p.name}${optional}:${typeStr}`;
    })
    .join(', ');

  const returnType = el.returnType ? ` → ${el.returnType}` : '';
  return `${el.name}(${params})${returnType}`;
}

}
