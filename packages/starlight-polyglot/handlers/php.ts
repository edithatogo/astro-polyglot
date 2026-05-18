import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import type { Handler, BaseHandlerOptions } from '../core/plugin';
import { transformToMDX, type ASTModule } from '../core/mdx-generator';

interface PhpHandlerOptions extends BaseHandlerOptions {
  /** Paths to PHP source files or directories to document */
  entryPoints: string[];
}

/**
 * Represents a single element from phpDocumentor's JSON output structure
 * (phpdoc --template="xml" or the structured JSON output).
 */
interface PhpDocElement {
  name?: string;
  type?: string;
  fullyQualifiedStructuralElementName?: string;
  filename?: string;
  namespace?: string;
  summary?: string;
  description?: string;
  tags?: Array<{
    name: string;
    value?: string;
    description?: string;
    variable?: string;
    types?: string[];
    version?: string;
  }>;
  arguments?: Array<{
    name: string;
    type?: string;
    default?: string;
    description?: string;
    byReference?: boolean;
    isVariadic?: boolean;
  }>;
  return?: {
    type?: string;
    description?: string;
  };
  parents?: string[];
  implements?: string[];
  methods?: PhpDocElement[];
  properties?: Array<{
    name: string;
    type?: string;
    default?: string;
    summary?: string;
    description?: string;
    visibility?: string;
  }>;
  constants?: Array<{
    name: string;
    value?: string;
    summary?: string;
    description?: string;
    type?: string;
  }>;
  errors?: string[];
}

/**
 * PHP handler: Uses phpDocumentor (phpdoc) to generate structured JSON
 * documentation output, then parses the output into common ASTModule data.
 *
 * Runs `phpdoc -t /tmp/phpdoc-output` on the specified entry points with
 * the JSON template (`--template="xml"` combined with structured output).
 *
 * @remarks
 * Requires `phpDocumentor` (`phpdoc`) to be installed.
 * Install via: `composer global require phpdocumentor/phpdocumentor`
 * Entry points should be paths to PHP files or directories containing .php files.
 */
export const phpHandler: Handler = {
  name: 'php',

  async generate(options) {
    const opts = options as unknown as PhpHandlerOptions;
    const entryPoints = opts.entryPoints;

    if (!entryPoints || entryPoints.length === 0) {
      throw new Error('PHP handler requires at least one entryPoint');
    }

    const modules = extractWithPhpDoc(entryPoints);

    if (modules.length === 0) {
      throw new Error('phpDocumentor extraction produced no modules');
    }

    const output = transformToMDX(modules, {
      outputDir: opts.output,
      language: 'php',
      ...(opts.pagination !== undefined ? { pagination: opts.pagination } : {}),
    });

    return output;
  },

  async validate(_sourcePath) {
    try {
      execSync('phpdoc --version', { encoding: 'utf-8', stdio: 'pipe' });
      return { valid: true, errors: [] };
    } catch {
      return {
        valid: false,
        errors: [
          'phpDocumentor not found. Install with: composer global require phpdocumentor/phpdocumentor',
        ],
      };
    }
  },
};

/**
 * Runs phpDocumentor on the entry points and parses the JSON output into ASTModule[].
 */
function extractWithPhpDoc(entryPoints: string[]): ASTModule[] {
  const modules: ASTModule[] = [];
  const tmpOutput = '/tmp/starlight-polyglot-phpdoc';

  const entries = entryPoints.map((e) => `"${path.resolve(e)}"`).join(' ');
  const cmd = `phpdoc -t "${tmpOutput}" --template="xml" -f ${entries} -d "" 2>&1`;

  execSync(cmd, {
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024,
    timeout: 180_000,
    stdio: 'pipe',
  });

  // phpDocumentor generates structured XML files; we parse the file-level structure
  if (existsSync(tmpOutput)) {
    const xmlFiles = readdirSync(tmpOutput)
      .filter((f) => f.endsWith('.xml'))
      .map((f) => path.join(tmpOutput, f));

    for (const xmlFile of xmlFiles) {
      const raw = readFileSync(xmlFile, 'utf-8');
      const elements = parsePhpDocXml(raw);
      const converted = convertPhpDocElements(elements);
      modules.push(...converted);
    }
  }

  return modules;
}

/**
 * Parses phpDocumentor XML content into a list of PhpDocElement objects.
 * Uses simple regex-based parsing since the XML structure is predictable.
 */
function parsePhpDocXml(xmlContent: string): PhpDocElement[] {
  const elements: PhpDocElement[] = [];
  const fileRegex = /<file[^>]*path="([^"]*)"[^>]*>([\s\S]*?)<\/file>/g;
  let fileMatch: RegExpExecArray | null;

  while ((fileMatch = fileRegex.exec(xmlContent)) !== null) {
    const fileBody = fileMatch[2];

    // Parse classes
    const classRegex = /<class[^>]*>([\s\S]*?)<\/class>/g;
    let classMatch: RegExpExecArray | null;
    while ((classMatch = classRegex.exec(fileBody)) !== null) {
      const classBody = classMatch[1];
      const className = classBody.match(/<full_name>([^<]*)<\/full_name>/)?.[1]?.trim();
      const classSummary = classBody.match(/<summary>([\s\S]*?)<\/summary>/)?.[1]?.trim();
      const classDesc = classBody.match(/<description>([\s\S]*?)<\/description>/)?.[1]?.trim();

      const element: PhpDocElement = {
        name: className,
        type: 'class',
        summary: classSummary,
        description: classDesc,
        methods: [],
        properties: [],
        constants: [],
      };

      // Parse methods
      const methodRegex = /<method[^>]*>([\s\S]*?)<\/method>/g;
      let methodMatch: RegExpExecArray | null;
      while ((methodMatch = methodRegex.exec(classBody)) !== null) {
        const methodBody = methodMatch[1];
        const mName = methodBody.match(/<name>([^<]*)<\/name>/)?.[1]?.trim() ?? 'unknown';
        const mSummary = methodBody.match(/<summary>([\s\S]*?)<\/summary>/)?.[1]?.trim();
        const mDesc = methodBody.match(/<description>([\s\S]*?)<\/description>/)?.[1]?.trim();

        // Parse method arguments
        const args: Array<{ name: string; type?: string; default?: string; description?: string }> = [];
        const argRegex = /<argument[^>]*>([\s\S]*?)<\/argument>/g;
        let argMatch: RegExpExecArray | null;
        while ((argMatch = argRegex.exec(methodBody)) !== null) {
          const argBody = argMatch[1];
          const aName = argBody.match(/<name>([^<]*)<\/name>/)?.[1]?.trim() ?? 'param';
          const aType = argBody.match(/<type>([^<]*)<\/type>/)?.[1]?.trim();
          const aDefault = argBody.match(/<default>([^<]*)<\/default>/)?.[1]?.trim();
          const aDesc = argBody.match(/<description>([^<]*)<\/description>/)?.[1]?.trim();
          args.push({ name: aName, type: aType || undefined, default: aDefault || undefined, description: aDesc || undefined });
        }

        // Parse return type
        const returnMatch = methodBody.match(/<return[^>]*>([\s\S]*?)<\/return>/);
        let returnType: string | undefined;
        if (returnMatch) {
          returnType = returnMatch[1].match(/<type>([^<]*)<\/type>/)?.[1]?.trim() || undefined;
        }

        element.methods?.push({
          name: mName,
          type: 'method',
          summary: mSummary,
          description: mDesc,
          arguments: args.length > 0 ? args : undefined,
          return: returnType ? { type: returnType } : undefined,
        });
      }

      // Parse properties
      const propRegex = /<property[^>]*>([\s\S]*?)<\/property>/g;
      let propMatch: RegExpExecArray | null;
      while ((propMatch = propRegex.exec(classBody)) !== null) {
        const propBody = propMatch[1];
        const pName = propBody.match(/<name>([^<]*)<\/name>/)?.[1]?.trim() ?? 'unknown';
        const pType = propBody.match(/<type>([^<]*)<\/type>/)?.[1]?.trim();
        const pDefault = propBody.match(/<default>([^<]*)<\/default>/)?.[1]?.trim();
        const pSummary = propBody.match(/<summary>([^<]*)<\/summary>/)?.[1]?.trim();
        element.properties?.push({
          name: pName,
          type: pType || undefined,
          default: pDefault || undefined,
          summary: pSummary || undefined,
        });
      }

      if (element.name) {
        elements.push(element);
      }
    }

    // Parse functions
    const funcRegex = /<function[^>]*>([\s\S]*?)<\/function>/g;
    let funcMatch: RegExpExecArray | null;
    while ((funcMatch = funcRegex.exec(fileBody)) !== null) {
      const funcBody = funcMatch[1];
      const fName = funcBody.match(/<name>([^<]*)<\/name>/)?.[1]?.trim() ?? 'unknown';
      const fSummary = funcBody.match(/<summary>([^<]*)<\/summary>/)?.[1]?.trim();
      const fDesc = funcBody.match(/<description>([^<]*)<\/description>/)?.[1]?.trim();

      const args: Array<{ name: string; type?: string; default?: string; description?: string }> = [];
      const argRegex = /<argument[^>]*>([\s\S]*?)<\/argument>/g;
      let argMatch: RegExpExecArray | null;
      while ((argMatch = argRegex.exec(funcBody)) !== null) {
        const argBody = argMatch[1];
        const aName = argBody.match(/<name>([^<]*)<\/name>/)?.[1]?.trim() ?? 'param';
        const aType = argBody.match(/<type>([^<]*)<\/type>/)?.[1]?.trim();
        const aDefault = argBody.match(/<default>([^<]*)<\/default>/)?.[1]?.trim();
        args.push({ name: aName, type: aType || undefined, default: aDefault || undefined });
      }

      const returnMatch = funcBody.match(/<return[^>]*>([\s\S]*?)<\/return>/);
      let returnType: string | undefined;
      if (returnMatch) {
        returnType = returnMatch[1].match(/<type>([^<]*)<\/type>/)?.[1]?.trim() || undefined;
      }

      elements.push({
        name: fName,
        type: 'function',
        summary: fSummary,
        description: fDesc,
        arguments: args.length > 0 ? args : undefined,
        return: returnType ? { type: returnType } : undefined,
      });
    }
  }

  return elements;
}


/**
 * Converts parsed phpDocumentor elements into ASTModule[].
 */
function convertPhpDocElements(elements: PhpDocElement[]): ASTModule[] {
  const moduleMap = new Map<string, ASTModule>();

  for (const el of elements) {
    const namespace = el.namespace ?? 'Global';
    const modName = namespace.split('\\').pop() ?? namespace;

    if (!moduleMap.has(modName)) {
      moduleMap.set(modName, {
        name: modName,
        docstring: undefined,
        classes: [],
        functions: [],
        variables: [],
      });
    }

    const mod = moduleMap.get(modName)!;

    if (el.type === 'class' || el.type === 'interface' || el.type === 'trait') {
      const cls: {
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
        name: el.name ?? 'Unknown',
        docstring: el.summary || el.description || undefined,
        methods: [],
        properties: [],
      };

      for (const method of el.methods ?? []) {
        cls.methods.push({
          name: method.name ?? 'unknown',
          signature: buildPhpSignature(method),
          docstring: method.summary || method.description || undefined,
          parameters: (method.arguments ?? []).map((a) => ({
            name: a.name,
            type: a.type ?? undefined,
            description: a.description ?? undefined,
            default: a.default ?? undefined,
          })),
          return_type: method.return?.type ?? undefined,
        });
      }

      for (const prop of el.properties ?? []) {
        cls.properties.push({
          name: prop.name,
          type: prop.type ?? undefined,
          docstring: prop.summary || prop.description || undefined,
        });
      }

      mod.classes?.push(cls);

      if (!mod.docstring && cls.docstring) {
        mod.docstring = cls.docstring;
      }
    } else if (el.type === 'function') {
      mod.functions?.push({
        name: el.name ?? 'unknown',
        signature: buildPhpSignature(el),
        docstring: el.summary || el.description || undefined,
        parameters: (el.arguments ?? []).map((a) => ({
          name: a.name,
          type: a.type ?? undefined,
          description: a.description ?? undefined,
          default: a.default ?? undefined,
        })),
        return_type: el.return?.type ?? undefined,
      });
    }
  }

  return Array.from(moduleMap.values());
}

/**
 * Builds a PHP-style function/method signature string.
 */
function buildPhpSignature(el: PhpDocElement): string | undefined {
  const params = (el.arguments ?? [])
    .map((a) => {
      const typeStr = a.type ? `${a.type} ` : '';
      const defaultStr = a.default !== undefined ? ` = ${a.default}` : '';
      return `${typeStr}$${a.name}${defaultStr}`;
    })
    .join(', ');

  const returnType = el.return?.type ? `: ${el.return.type}` : '';
  return `function ${el.name}(${params})${returnType}`;
}
