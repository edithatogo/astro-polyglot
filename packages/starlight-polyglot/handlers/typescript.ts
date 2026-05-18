import type { Handler, BaseHandlerOptions } from '../core/plugin';
import { transformToMDX, type ASTModule } from '../core/mdx-generator';

interface TypeScriptHandlerOptions extends BaseHandlerOptions {
  entryPoints: string[];
  tsconfig?: string;
}

/**
 * TypeScript handler: Uses TypeDoc programmatically to extract API documentation.
 * TypeDoc is an optional peer dependency installed alongside typedoc-plugin-markdown.
 */
export const typescriptHandler: Handler = {
  name: 'typescript',

  async generate(options) {
    const opts = options as unknown as TypeScriptHandlerOptions;
    const entryPoints = opts.entryPoints;
    const tsconfig = opts.tsconfig;

    if (!entryPoints || entryPoints.length === 0) {
      throw new Error('TypeScript handler requires at least one entryPoint');
    }

    const modules = await extractWithTypeDoc(entryPoints, tsconfig);

    if (modules.length === 0) {
      throw new Error('TypeDoc extraction produced no modules');
    }

    const output = transformToMDX(modules, {
      outputDir: opts.output,
      language: 'typescript',
      ...(opts.pagination !== undefined ? { pagination: opts.pagination } : {}),
    });

    return output;
  },

  async validate(_sourcePath) {
    try {
      // Dynamically import TypeDoc to check availability
      const typedoc = await import('typedoc');
      if (!typedoc.Application) {
        return { valid: false, errors: ['typedoc module loaded but Application class not found'] };
      }
      return { valid: true, errors: [] };
    } catch {
      return { valid: false, errors: ['typedoc not installed. Run: npm install typedoc typedoc-plugin-markdown'] };
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
  return comment.summary.map((part) => part.text).join('').trim() || undefined;
}

function extractSignature(reflection: TypeDocReflection): string | undefined {
  if (!reflection.signatures || reflection.signatures.length === 0) return undefined;

  const sig = reflection.signatures[0];
  const params = (sig.parameters ?? [])
    .map((p) => {
      const typeName = p.type?.name ?? p.type?.type ?? 'any';
      return `${p.name}: ${typeName}`;
    })
    .join(', ');

  const returnType = sig.type?.name ?? sig.type?.type ?? 'void';
  return `${reflection.name}(${params}): ${returnType}`;
}

function extractReturnType(reflection: TypeDocReflection): string | undefined {
  if (!reflection.signatures || reflection.signatures.length === 0) return undefined;
  return reflection.signatures[0].type?.name ?? reflection.signatures[0].type?.type ?? undefined;
}

function extractParameters(reflection: TypeDocReflection): Array<{ name: string; type?: string; description?: string; default?: string }> | undefined {
  if (!reflection.signatures || reflection.signatures.length === 0) return undefined;

  const sig = reflection.signatures[0];
  if (!sig.parameters || sig.parameters.length === 0) return undefined;

  return sig.parameters.map((p) => ({
    name: p.name,
    type: p.type?.name ?? p.type?.type ?? undefined,
    description: extractCommentText(p.comment),
    default: p.defaultValue ?? undefined,
  }));
}


function convertReflectionToASTModules(reflections: TypeDocReflection[]): ASTModule[] {
  const modules: ASTModule[] = [];

  for (const ref of reflections) {
    // kind=1 is Module, kind=2 is Namespace, kind=128 is Class, kind=64 is Function
    if (ref.kind === 1 || ref.kind === 2) {
      const mod: ASTModule = {
        name: ref.name,
        docstring: extractCommentText(ref.comment),
        classes: [],
        functions: [],
        variables: [],
      };

      for (const child of ref.children ?? []) {
        if (child.kind === 128) {
          // Class
          mod.classes?.push({
            name: child.name,
            docstring: extractCommentText(child.comment),
            methods: child.children
              ?.filter((m) => m.kind === 256 || m.kind === 512) // Method or Constructor
              .map((m) => ({
                name: m.name,
                signature: extractSignature(m),
                docstring: extractCommentText(m.comment),
                parameters: extractParameters(m),
                return_type: extractReturnType(m),
              })),
            properties: child.children
              ?.filter((m) => m.kind === 1024) // Property
              .map((m) => ({
                name: m.name,
                type: m.type?.name ?? m.type?.type ?? undefined,
                docstring: extractCommentText(m.comment),
              })),
          });
        } else if (child.kind === 64) {
          // Function
          mod.functions?.push({
            name: child.name,
            signature: extractSignature(child),
            docstring: extractCommentText(child.comment),
            parameters: extractParameters(child),
            return_type: extractReturnType(child),
          });
        } else if (child.kind === 1024) {
          // Variable
          mod.variables?.push({
            name: child.name,
            type: child.type?.name ?? child.type?.type ?? undefined,
            docstring: extractCommentText(child.comment),
          });
        }
      }

      modules.push(mod);
    }
  }

  return modules;
}

async function extractWithTypeDoc(
  entryPoints: string[],
  tsconfig?: string,
): Promise<ASTModule[]> {
  const { Application, TSConfigReader } = await import('typedoc');

  const app = await Application.bootstrap({
    entryPoints,
    tsconfig,
    skipErrorChecking: false,
    excludeExternals: true,
    excludePrivate: true,
    excludeProtected: false,
    validation: { notExported: false },
    plugin: [],
  });

  // Register the TSConfig reader
  app.options.addReader(new TSConfigReader());

  const project = await app.convert();

  if (!project) {
    throw new Error('TypeDoc conversion returned no project. Check entry points and tsconfig.');
  }

  // Serialize the project reflection to plain JSON for processing
  const serialized = app.serializer.projectToObject(project);

  // The serialized output has a top-level with children array
  const children = (serialized as unknown as { children?: TypeDocReflection[] }).children ?? [];

  return convertReflectionToASTModules(children);
}
