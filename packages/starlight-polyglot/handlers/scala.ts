import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import type { Handler, BaseHandlerOptions } from '../core/plugin';
import { transformToMDX, type ASTModule, type ASTClass } from '../core/mdx-generator';

interface ScalaHandlerOptions extends BaseHandlerOptions {
  /** Paths to Scala source files or directories to document */
  entryPoints: string[];
  /** Optional classpath for scaladoc */
  classpath?: string;
}

/**
 * Represents a Scaladoc JSON document member (class, def, val, etc.).
 */
interface ScaladocDocument {
  name: string;
  kind: string;
  qualifiedName: string;
  comment?: {
    body?: {
      text?: string;
      blocks?: Array<{ text?: string; tag?: string }>;
    };
    tags?: Array<{
      tag: string;
      text?: string;
      paramName?: string;
    }>;
  };
  members?: ScaladocDocument[];
  valueType?: string;
  resultType?: string;
  params?: Array<{
    name: string;
    typeName?: string;
    defaultValue?: string;
  }>;
}

/**
 * Scala handler: Uses `scaladoc` CLI to generate JSON documentation output,
 * then parses the generated JSON files into structured ASTModule data.
 *
 * @remarks
 * Requires `scaladoc` (shipped with the Scala toolchain) to be installed.
 * Entry points should point to Scala source files or directories containing
 * `.scala` files. The handler runs `scaladoc -d /tmp/scaladoc-json` with
 * the `--json` flag to produce machine-readable output.
 */
export const scalaHandler: Handler = {
  name: 'scala',

  async generate(options) {
    const opts = options as unknown as ScalaHandlerOptions;
    const entryPoints = opts.entryPoints;

    if (!entryPoints || entryPoints.length === 0) {
      throw new Error('Scala handler requires at least one entryPoint');
    }

    const modules = extractWithScaladoc(entryPoints, opts.classpath);

    if (modules.length === 0) {
      throw new Error('Scaladoc extraction produced no modules');
    }

    const output = transformToMDX(modules, {
      outputDir: opts.output,
      language: 'scala',
      ...(opts.pagination !== undefined ? { pagination: opts.pagination } : {}),
    });

    return output;
  },

  async validate(_sourcePath) {
    try {
      execSync('scaladoc --version', { encoding: 'utf-8', stdio: 'pipe' });
      return { valid: true, errors: [] };
    } catch {
      return {
        valid: false,
        errors: [
          'scaladoc not found. Install the Scala toolchain from https://www.scala-lang.org/download/',
        ],
      };
    }
  },
};

/**
 * Runs scaladoc to produce JSON output and parses it into ASTModule[].
 */
function extractWithScaladoc(
  entryPoints: string[],
  classpath?: string,
): ASTModule[] {
  const tmpDir = '/tmp/starlight-polyglot-scaladoc';
  const entries = entryPoints.map((e) => `"${path.resolve(e)}"`).join(' ');

  const cpFlag = classpath ? ` -classpath "${classpath}"` : '';
  const cmd = `scaladoc -d "${tmpDir}" -json${cpFlag} ${entries} 2>&1`;

  execSync(cmd, {
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024,
    timeout: 180_000,
    stdio: 'pipe',
  });

  if (!existsSync(tmpDir)) {
    throw new Error(
      'scaladoc did not produce output. Ensure scaladoc is installed and entry points are valid.',
    );
  }

  return parseScaladocDir(tmpDir);
}

/**
 * Reads all Scaladoc JSON files from the output directory and converts them.
 */
function parseScaladocDir(dir: string): ASTModule[] {
  const modules: ASTModule[] = [];
  const files = readdirSync(dir).filter((f) => f.endsWith('.json'));

  for (const file of files) {
    const filePath = path.join(dir, file);
    const raw = readFileSync(filePath, 'utf-8');

    try {
      const doc = JSON.parse(raw) as ScaladocDocument;
      const mod = convertScaladocDocument(doc);
      if (mod) {
        modules.push(mod);
      }
    } catch {
      continue;
    }
  }

  return modules;

/**
 * Converts a single Scaladoc JSON document into an ASTModule.
 */
function convertScaladocDocument(doc: ScaladocDocument): ASTModule | null {
  if (!doc.name) return null;

  const mod: ASTModule = {
    name: doc.name,
    docstring: extractScaladocBody(doc.comment),
    classes: [],
    functions: [],
    variables: [],
  };

  for (const member of doc.members ?? []) {
    const memberDoc = extractScaladocBody(member.comment);

    if (
      member.kind === 'class' ||
      member.kind === 'trait' ||
      member.kind === 'object' ||
      member.kind === 'case class'
    ) {
      const cls: ASTClass = {
        name: member.name,
        docstring: memberDoc,
        methods: [],
        properties: [],
      };

      for (const sub of member.members ?? []) {
        const subDoc = extractScaladocBody(sub.comment);
        if (
          sub.kind === 'def' ||
          sub.kind === 'method' ||
          sub.kind === 'function'
        ) {
          cls.methods!.push({
            name: sub.name,
            signature: buildScalaSignature(sub),
            docstring: subDoc,
            parameters: sub.params?.map((p) => ({
              name: p.name,
              type: p.typeName ?? undefined,
              description: extractParamDescription(sub.comment, p.name),
              default: p.defaultValue ?? undefined,
            })),
            return_type: sub.resultType ?? undefined,
          });
        } else if (
          sub.kind === 'val' ||
          sub.kind === 'var' ||
          sub.kind === 'lazy val'
        ) {
          cls.properties!.push({
            name: sub.name,
            type: sub.resultType ?? sub.valueType ?? undefined,
            docstring: subDoc,
          });
        }
      }

      mod.classes?.push(cls);
    } else if (member.kind === 'def' || member.kind === 'function' || member.kind === 'method') {
      mod.functions?.push({
        name: member.name,
        signature: buildScalaSignature(member),
        docstring: memberDoc,
        parameters: member.params?.map((p) => ({
          name: p.name,
          type: p.typeName ?? undefined,
          description: extractParamDescription(member.comment, p.name),
          default: p.defaultValue ?? undefined,
        })),
        return_type: member.resultType ?? undefined,
      });
    } else if (member.kind === 'val' || member.kind === 'var') {
      mod.variables?.push({
        name: member.name,
        type: member.resultType ?? member.valueType ?? undefined,
        docstring: memberDoc,
      });
    }
  }

  return mod;
}

/**
 * Extracts the body text from a Scaladoc comment object.
 */
function extractScaladocBody(comment?: ScaladocDocument['comment']): string | undefined {
  if (!comment) return undefined;
  const text = comment.body?.text ?? comment.body?.blocks?.map((b) => b.text).join('\n') ?? '';
  return text.trim() || undefined;
}

/**
 * Extracts the description for a specific parameter from Scaladoc @param tags.
 */
function extractParamDescription(
  comment?: ScaladocDocument['comment'],
  paramName?: string,
): string | undefined {
  if (!comment?.tags || !paramName) return undefined;
  const tag = comment.tags.find(
    (t) => t.tag === '@param' && t.paramName === paramName,
  );
  return tag?.text?.trim() || undefined;
}

/**
 * Builds a Scala-style function/method signature string.
 */
function buildScalaSignature(member: ScaladocDocument): string | undefined {
  const params = (member.params ?? [])
    .map((p) => `${p.name}: ${p.typeName ?? 'Any'}`)
    .join(', ');

  const returnType = member.resultType ? `: ${member.resultType}` : '';
  return `${member.name}(${params})${returnType}`;
}

}
