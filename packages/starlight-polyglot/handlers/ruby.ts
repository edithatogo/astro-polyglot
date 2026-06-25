import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { type ASTModule, transformToMDX } from "../core/mdx-generator";
import type { BaseHandlerOptions, Handler } from "../core/plugin";

interface RubyHandlerOptions extends BaseHandlerOptions {
  /** Paths to Ruby gem directories or source files to document */
  entryPoints: string[];
}

/**
 * Represents a single YARD JSON object from `yard doc --output-format json`.
 */
interface YARDObject {
  id?: string;
  name?: string;
  path?: string;
  kind?: string;
  namespace?: string;
  docstring?: string;
  docstring_html?: string;
  visibility?: string;
  type?: string;
  value?: string;
  tag_names?: string[];
  tags?: Array<{
    tag_name?: string;
    text?: string;
    types?: string[];
    name?: string;
  }>;
  params?: Array<{
    name?: string;
    types?: string[];
    default?: string;
    docstring?: string;
  }>;
  return_type?: string;
  return_types?: string[];
  inheritance?: string[];
  children?: YARDObject[];
}

/**
 * Ruby handler: Uses YARD (Yay! A Ruby Documentation tool) to generate
 * JSON documentation output, then parses the YARD JSON into structured
 * ASTModule data.
 *
 * The handler runs `yard doc --output-format json` on the specified entry
 * points (gem directories or `.rb` files).
 *
 * @remarks
 * Requires `yard` gem to be installed (`gem install yard`).
 * Entry points should be paths to Ruby gems (directories with .rb files)
 * or individual Ruby source files.
 */
export const rubyHandler: Handler = {
  name: "ruby",

  async generate(options) {
    const opts = options as unknown as RubyHandlerOptions;
    const entryPoints = opts.entryPoints;

    if (!entryPoints || entryPoints.length === 0) {
      throw new Error("Ruby handler requires at least one entryPoint");
    }

    const modules = extractWithYard(entryPoints);

    if (modules.length === 0) {
      throw new Error("YARD extraction produced no modules");
    }

    const output = transformToMDX(modules, {
      outputDir: opts.output,
      language: "ruby",
      ...(opts.pagination !== undefined ? { pagination: opts.pagination } : {}),
    });

    return output;
  },

  async validate(_sourcePath) {
    try {
      execSync("yard --version", { encoding: "utf-8", stdio: "pipe" });
      return { valid: true, errors: [] };
    } catch {
      return {
        valid: false,
        errors: ["YARD not found. Install with: gem install yard"],
      };
    }
  },
};

/**
 * Runs YARD on the entry points to produce JSON output and parses the result
 * into ASTModule[].
 */
function extractWithYard(entryPoints: string[]): ASTModule[] {
  const modules: ASTModule[] = [];

  for (const entry of entryPoints) {
    const resolvedEntry = path.resolve(entry);
    if (!existsSync(resolvedEntry)) {
      continue;
    }

    const tmpOutput = "/tmp/starlight-polyglot-yard";
    const cmd = `yard doc --output-format json --output "${tmpOutput}" "${resolvedEntry}" 2>&1`;

    execSync(cmd, {
      encoding: "utf-8",
      cwd: existsSync(resolvedEntry) && resolvedEntry.endsWith(".rb") ? path.dirname(resolvedEntry) : resolvedEntry,
      maxBuffer: 10 * 1024 * 1024,
      timeout: 180_000,
      stdio: "pipe",
    });

    const yardJsonPath = path.join(tmpOutput, "yard.json");
    if (existsSync(yardJsonPath)) {
      const raw = readFileSync(yardJsonPath, "utf-8");
      try {
        const yardData = JSON.parse(raw) as YARDObject[];
        const converted = convertYARDObjects(yardData);
        modules.push(...converted);
      } catch {}
    }
  }

  return modules;

  /**
   * Converts an array of YARD JSON objects into ASTModule[].
   */
  function convertYARDObjects(yardObjects: YARDObject[]): ASTModule[] {
    const modules: ASTModule[] = [];

    // Group by namespace (module/class hierarchy)
    const moduleGroups = new Map<string, YARDObject[]>();

    for (const obj of yardObjects) {
      if (!obj.name) continue;

      const namespace = obj.namespace ?? "Global";
      if (!moduleGroups.has(namespace)) {
        moduleGroups.set(namespace, []);
      }
      moduleGroups.get(namespace)!.push(obj);
    }

    for (const [namespace, objs] of moduleGroups) {
      const mod: ASTModule = {
        name: namespace.split("::").pop() ?? namespace,
        docstring: undefined,
        classes: [],
        functions: [],
        variables: [],
      };

      for (const obj of objs) {
        if (!obj.path) continue;

        if (obj.kind === "class" || obj.kind === "module") {
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
            name: obj.name ?? obj.path.split("::").pop() ?? "Unknown",
            docstring: obj.docstring?.trim() || undefined,
            methods: [],
            properties: [],
          };

          for (const child of obj.children ?? []) {
            if (child.kind === "method" || child.kind === "instance_method" || child.kind === "class_method") {
              cls.methods.push({
                name: child.name ?? "unknown",
                signature: buildRubySignature(child),
                docstring: child.docstring?.trim() || undefined,
                parameters: (child.params ?? []).map((p) => ({
                  name: p.name ?? "param",
                  type: p.types?.[0],
                  description: p.docstring?.trim() || undefined,
                  default: p.default ?? undefined,
                })),
                return_type: child.return_types?.[0] ?? child.return_type ?? undefined,
              });
            } else if (
              child.kind === "attribute" ||
              child.kind === "attr_accessor" ||
              child.kind === "attr_reader" ||
              child.kind === "attr_writer"
            ) {
              cls.properties.push({
                name: child.name ?? "unknown",
                type: child.return_types?.[0] ?? undefined,
                docstring: child.docstring?.trim() || undefined,
              });
            }
          }

          mod.classes?.push(cls);

          // Use class docstring as module docstring if none exists
          if (!mod.docstring && cls.docstring) {
            mod.docstring = cls.docstring;
          }
        } else if (obj.kind === "method" || obj.kind === "instance_method" || obj.kind === "class_method") {
          mod.functions?.push({
            name: obj.name ?? obj.path ?? "unknown",
            signature: buildRubySignature(obj),
            docstring: obj.docstring?.trim() || undefined,
            parameters: (obj.params ?? []).map((p) => ({
              name: p.name ?? "param",
              type: p.types?.[0],
              description: p.docstring?.trim() || undefined,
              default: p.default ?? undefined,
            })),
            return_type: obj.return_types?.[0] ?? obj.return_type ?? undefined,
          });
        } else if (obj.kind === "constant" || obj.kind === "variable" || obj.kind === "attr") {
          mod.variables?.push({
            name: obj.name ?? obj.path ?? "unknown",
            type: obj.return_types?.[0] ?? undefined,
            docstring: obj.docstring?.trim() || undefined,
          });
        }
      }

      modules.push(mod);
    }

    return modules;
  }

  /**
   * Builds a Ruby-style method signature string from a YARD object.
   */
  function buildRubySignature(obj: YARDObject): string | undefined {
    const params = (obj.params ?? [])
      .map((p) => {
        const base = p.name ?? "";
        if (p.default) return `${base} = ${p.default}`;
        return base;
      })
      .join(", ");

    const isClassMethod = obj.kind === "class_method";
    const prefix = isClassMethod ? "self." : "";
    return `${prefix}${obj.name}(${params})`;
  }
}
