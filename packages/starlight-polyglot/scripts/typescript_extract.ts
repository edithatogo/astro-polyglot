#!/usr/bin/env npx tsx

/**
 * Extract TypeScript API documentation using TypeDoc.
 * Outputs JSON matching the ASTModule schema from starlight-polyglot.
 *
 * Usage:
 *   npx tsx scripts/typescript_extract.ts --entry-points src/index.ts --output output.json
 *   npx tsx scripts/typescript_extract.ts --entry-points src/index.ts src/main.ts
 *
 * This script:
 *   1. Bootstraps TypeDoc Application with the given entry points
 *   2. Converts the project to a reflection tree
 *   3. Outputs ASTModule JSON structure to stdout (or file with --output)
 */

import * as fs from "node:fs";
import * as path from "node:path";

interface ASTModule {
  name: string;
  docstring?: string;
  classes?: ASTClass[];
  functions?: ASTFunction[];
  variables?: ASTVariable[];
}

interface ASTClass {
  name: string;
  docstring?: string;
  methods?: ASTFunction[];
  properties?: ASTVariable[];
}

interface ASTFunction {
  name: string;
  signature?: string;
  docstring?: string;
  parameters?: ASTParameter[];
  return_type?: string;
}

interface ASTParameter {
  name: string;
  type?: string;
  description?: string;
  default?: string;
}

interface ASTVariable {
  name: string;
  type?: string;
  docstring?: string;
}

interface ExtractionError {
  entry_point: string;
  error: string;
}

interface Output {
  modules?: ASTModule[];
  errors?: ExtractionError[];
}

/** TypeDoc reflection shape for serialised JSON */
interface TypeDocReflection {
  id: number;
  name: string;
  kind: number;
  kindString?: string;
  comment?: {
    summary?: Array<{ kind: string; text: string }>;
  };
  children?: TypeDocReflection[];
  signatures?: TypeDocReflection[];
  parameters?: TypeDocReflection[];
  type?: { name?: string; type?: string; elementType?: TypeDocReflection };
  defaultValue?: string;
  flags?: { isExported?: boolean };
}

function extractCommentText(comment?: { summary?: Array<{ kind: string; text: string }> }): string | undefined {
  if (!comment?.summary) return undefined;
  const text = comment.summary
    .map((part) => part.text)
    .join("")
    .trim();
  return text || undefined;
}

function extractSignature(reflection: TypeDocReflection): string | undefined {
  if (!reflection.signatures || reflection.signatures.length === 0) return undefined;
  const sig = reflection.signatures[0]!;
  const params = (sig.parameters ?? [])
    .map((p) => {
      const typeName = p.type?.name ?? p.type?.type ?? "any";
      return `${p.name}: ${typeName}`;
    })
    .join(", ");
  const returnType = sig.type?.name ?? sig.type?.type ?? "void";
  return `${reflection.name}(${params}): ${returnType}`;
}

function extractReturnType(reflection: TypeDocReflection): string | undefined {
  if (!reflection.signatures || reflection.signatures.length === 0) return undefined;
  const sig = reflection.signatures[0]!;
  return sig.type?.name ?? sig.type?.type ?? undefined;
}

function extractParameters(reflection: TypeDocReflection): ASTParameter[] | undefined {
  if (!reflection.signatures || reflection.signatures.length === 0) return undefined;
  const sig = reflection.signatures[0]!;
  if (!sig.parameters || sig.parameters.length === 0) return undefined;
  return sig.parameters.map((p) => ({
    name: p.name,
    type: p.type?.name ?? p.type?.type ?? undefined,
    description: extractCommentText(p.comment),
    default: p.defaultValue ?? undefined,
  }));
}

function parseModule(name: string, docstring: string | undefined, children: TypeDocReflection[]): ASTModule {
  const mod: ASTModule = {
    name,
    docstring,
    classes: [],
    functions: [],
    variables: [],
  };

  for (const child of children) {
    if (child.kind === 128) {
      const cls: ASTClass = {
        name: child.name,
        docstring: extractCommentText(child.comment),
        methods: child.children
          ?.filter((m) => m.kind === 256 || m.kind === 512)
          .map((m) => ({
            name: m.name,
            signature: extractSignature(m),
            docstring: extractCommentText(m.comment),
            parameters: extractParameters(m),
            return_type: extractReturnType(m),
          })),
        properties: child.children
          ?.filter((m) => m.kind === 1024)
          .map((m) => ({
            name: m.name,
            type: m.type?.name ?? m.type?.type ?? undefined,
            docstring: extractCommentText(m.comment),
          })),
      };
      mod.classes!.push(cls);
    } else if (child.kind === 64) {
      mod.functions!.push({
        name: child.name,
        signature: extractSignature(child),
        docstring: extractCommentText(child.comment),
        parameters: extractParameters(child),
        return_type: extractReturnType(child),
      });
    } else if (child.kind === 1024 || child.kind === 256 || child.kind === 32) {
      mod.variables!.push({
        name: child.name,
        type: child.type?.name ?? child.type?.type ?? undefined,
        docstring: extractCommentText(child.comment),
      });
    }
  }

  if (mod.classes!.length === 0) delete mod.classes;
  if (mod.functions!.length === 0) delete mod.functions;
  if (mod.variables!.length === 0) delete mod.variables;

  return mod;
}

function _convertReflectionToASTModules(reflections: TypeDocReflection[]): ASTModule[] {
  const modules: ASTModule[] = [];
  const topLevelChildren: TypeDocReflection[] = [];

  for (const ref of reflections) {
    if (ref.kind === 1 || ref.kind === 2) {
      modules.push(parseModule(ref.name, extractCommentText(ref.comment), ref.children ?? []));
    } else {
      topLevelChildren.push(ref);
    }
  }

  if (topLevelChildren.length > 0) {
    modules.push(parseModule("API", undefined, topLevelChildren));
  }

  return modules;
}

async function extractWithTypeDoc(entryPoints: string[], tsconfig?: string): Promise<ASTModule[]> {
  let typedoc: typeof import("typedoc");
  try {
    typedoc = await import("typedoc");
  } catch {
    throw new Error("typedoc not installed. Run: npm install typedoc (or pnpm add typedoc)");
  }

  const { Application, TSConfigReader, normalizePath } = typedoc;
  const app = await Application.bootstrap({
    entryPoints,
    tsconfig,
    skipErrorChecking: true,
    excludeExternals: true,
    excludePrivate: true,
    excludeProtected: false,
    validation: { notExported: false },
    plugin: [],
    exclude: ["**/node_modules/**"],
  });

  app.options.addReader(new TSConfigReader());
  const project = await app.convert();

  if (!project) {
    throw new Error("TypeDoc conversion returned no project.");
  }

  const projectRoot = normalizePath(process.cwd());
  const serialized = app.serializer.projectToObject(project, projectRoot);
  const children = (serialized as unknown as { children?: TypeDocReflection[] }).children ?? [];
  return _convertReflectionToASTModules(children);
}

async function main() {
  const cliArgs = process.argv.slice(2);
  const { entryPoints, output, tsconfig } = parseArgs(cliArgs);

  if (entryPoints.length === 0) {
    const errOutput: Output = {
      errors: [
        {
          entry_point: "",
          error: "No --entry-points provided. Usage: npx tsx scripts/typescript_extract.ts --entry-points src/index.ts",
        },
      ],
    };
    console.log(JSON.stringify(errOutput, null, 2));
    process.exit(1);
  }

  const resolvedEntryPoints = entryPoints.map((ep) => path.resolve(ep));

  for (const ep of resolvedEntryPoints) {
    if (!fs.existsSync(ep)) {
      const errOutput: Output = {
        errors: [{ entry_point: ep, error: `Entry point does not exist: ${ep}` }],
      };
      console.log(JSON.stringify(errOutput, null, 2));
      process.exit(1);
    }
  }

  try {
    const resolvedTsconfig = tsconfig ? path.resolve(tsconfig) : undefined;
    const modules = await extractWithTypeDoc(resolvedEntryPoints, resolvedTsconfig);

    const outputData: Output = {
      modules: modules.length > 0 ? modules : undefined,
    };

    const json = JSON.stringify(outputData, null, 2);

    if (output) {
      fs.writeFileSync(path.resolve(output), json, "utf-8");
    } else {
      console.log(json);
    }
  } catch (err) {
    const errOutput: Output = {
      errors: [{ entry_point: entryPoints.join(", "), error: String(err) }],
    };
    console.log(JSON.stringify(errOutput, null, 2));
    process.exit(1);
  }
}

main();

function parseArgs(args: string[]): { entryPoints: string[]; output?: string; tsconfig?: string } {
  const result: { entryPoints: string[]; output?: string; tsconfig?: string } = { entryPoints: [] };
  let i = 0;
  while (i < args.length) {
    if (args[i] === "--entry-points") {
      i++;
      while (i < args.length && !args[i]!.startsWith("--")) {
        result.entryPoints.push(args[i]!);
        i++;
      }
    } else if (args[i] === "--output" && i + 1 < args.length) {
      result.output = args[i + 1]!;
      i += 2;
    } else if (args[i] === "--tsconfig" && i + 1 < args.length) {
      result.tsconfig = args[i + 1]!;
      i += 2;
    } else {
      i++;
    }
  }
  return result;
}
