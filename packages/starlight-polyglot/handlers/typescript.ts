import { type ASTModule, type ASTParameter, transformToMDX } from "../core/mdx-generator";
import type { BaseHandlerOptions, Handler } from "../core/plugin";

interface TypeScriptHandlerOptions extends BaseHandlerOptions {
  entryPoints: string[];
  tsconfig?: string;
}

/**
 * TypeScript handler: Uses TypeDoc programmatically to extract API documentation.
 * TypeDoc is an optional peer dependency installed alongside typedoc-plugin-markdown.
 */
export const typescriptHandler: Handler = {
  name: "typescript",

  async generate(options) {
    const opts = options as unknown as TypeScriptHandlerOptions;
    const entryPoints = opts.entryPoints;
    const tsconfig = opts.tsconfig;

    if (!entryPoints || entryPoints.length === 0) {
      throw new Error("TypeScript handler requires at least one entryPoint");
    }

    const modules = await extractWithTypeDoc(entryPoints, tsconfig);

    if (modules.length === 0) {
      throw new Error("TypeDoc extraction produced no modules");
    }

    const output = transformToMDX(modules, {
      outputDir: opts.output,
      language: "typescript",
      ...(opts.pagination !== undefined ? { pagination: opts.pagination } : {}),
    });

    return output;
  },

  async validate(_sourcePath) {
    try {
      // Dynamically import TypeDoc to check availability
      const typedoc = await import("typedoc");
      if (!typedoc.Application) {
        return { valid: false, errors: ["typedoc module loaded but Application class not found"] };
      }
      return { valid: true, errors: [] };
    } catch {
      return { valid: false, errors: ["typedoc not installed. Run: npm install typedoc typedoc-plugin-markdown"] };
    }
  },
};

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
  return (
    comment.summary
      .map((part) => part.text)
      .join("")
      .trim() || undefined
  );
}

function extractSignature(reflection: TypeDocReflection): string | undefined {
  if (!reflection.signatures) return undefined;
  const sig = reflection.signatures[0];
  if (!sig) return undefined;

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
  if (!reflection.signatures) return undefined;
  const sig = reflection.signatures[0];
  if (!sig) return undefined;
  return sig.type?.name ?? sig.type?.type ?? undefined;
}

function extractParameters(reflection: TypeDocReflection): ASTParameter[] | undefined {
  if (!reflection.signatures || reflection.signatures.length === 0) return undefined;

  const sig = reflection.signatures[0];
  if (!sig?.parameters || sig.parameters.length === 0) return undefined;

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
      const cls: any = {
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
      mod.classes?.push(cls);
    } else if (child.kind === 64) {
      mod.functions?.push({
        name: child.name,
        signature: extractSignature(child),
        docstring: extractCommentText(child.comment),
        parameters: extractParameters(child),
        return_type: extractReturnType(child),
      });
    } else if (child.kind === 1024 || child.kind === 256 || child.kind === 32) {
      mod.variables?.push({
        name: child.name,
        type: child.type?.name ?? child.type?.type ?? undefined,
        docstring: extractCommentText(child.comment),
      });
    }
  }

  if (mod.classes?.length === 0) delete mod.classes;
  if (mod.functions?.length === 0) delete mod.functions;
  if (mod.variables?.length === 0) delete mod.variables;

  return mod;
}

function convertReflectionToASTModules(reflections: TypeDocReflection[]): ASTModule[] {
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
  const { Application, TSConfigReader, normalizePath } = await import("typedoc");

  const bootstrapOptions: any = {
    entryPoints,
    skipErrorChecking: true,
    excludeExternals: true,
    excludePrivate: true,
    excludeProtected: false,
    validation: { notExported: false },
    plugin: [],
    exclude: ["**/node_modules/**"],
  };
  if (tsconfig) {
    bootstrapOptions.tsconfig = tsconfig;
  }

  const app = await Application.bootstrap(bootstrapOptions);

  // Register the TSConfig reader
  app.options.addReader(new TSConfigReader());

  const project = await app.convert();

  if (!project) {
    throw new Error("TypeDoc conversion returned no project. Check entry points and tsconfig.");
  }

  // Serialize the project reflection to plain JSON for processing
  const projectRoot = normalizePath(process.cwd());
  const serialized = app.serializer.projectToObject(project, projectRoot);

  // The serialized output has a top-level with children array
  const children = (serialized as unknown as { children?: TypeDocReflection[] }).children ?? [];

  return convertReflectionToASTModules(children);
}
