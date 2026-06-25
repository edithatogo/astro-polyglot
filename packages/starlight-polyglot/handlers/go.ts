import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { type ASTModule, transformToMDX } from "../core/mdx-generator";
import type { BaseHandlerOptions, Handler } from "../core/plugin";

interface GoHandlerOptions extends BaseHandlerOptions {
  modulePath: string;
}

/**
 * Go handler: Uses `gomarkdoc` to extract documentation from Go packages.
 * Spawns `gomarkdoc --output json ./...` in the specified module path.
 */
export const goHandler: Handler = {
  name: "go",

  async generate(options) {
    const opts = options as unknown as GoHandlerOptions;
    const modulePath = opts.modulePath;

    if (!modulePath) {
      throw new Error("Go handler requires a modulePath option");
    }

    if (!existsSync(modulePath)) {
      throw new Error(`Module path does not exist: ${modulePath}`);
    }

    const modules = extractWithGoMarkdoc(modulePath);

    if (modules.length === 0) {
      throw new Error("gomarkdoc extraction produced no modules");
    }

    const output = transformToMDX(modules, {
      outputDir: opts.output,
      language: "go",
      ...(opts.pagination !== undefined ? { pagination: opts.pagination } : {}),
    });

    return output;
  },

  async validate(_sourcePath) {
    try {
      execSync("gomarkdoc --version", { encoding: "utf-8", stdio: "pipe" });
      return { valid: true, errors: [] };
    } catch {
      return {
        valid: false,
        errors: ["gomarkdoc not found. Install: go install github.com/princjef/gomarkdoc/cmd/gomarkdoc@latest"],
      };
    }
  },
};

interface GoDocOutput {
  name?: string;
  description?: string;
  functions?: GoDocFunc[];
  types?: GoDocType[];
  examples?: GoDocExample[];
}

interface GoDocFunc {
  name: string;
  description?: string;
  signature?: string;
  params?: Array<{ name: string; type: string }>;
  returns?: Array<{ name?: string; type: string }>;
  examples?: GoDocExample[];
}

interface GoDocType {
  name: string;
  description?: string;
  methods?: GoDocFunc[];
  fields?: Array<{ name: string; type: string; description?: string; tag?: string }>;
}

interface GoDocExample {
  name: string;
  description?: string;
  code?: string;
  output?: string;
}

function extractWithGoMarkdoc(modulePath: string): ASTModule[] {
  const resolvedPath = path.resolve(modulePath);

  // Run gomarkdoc in the module path to output JSON
  const cmd = `gomarkdoc --output json ./...`;
  const result = execSync(cmd, {
    encoding: "utf-8",
    cwd: resolvedPath,
    maxBuffer: 10 * 1024 * 1024, // 10MB
    timeout: 120_000,
  });

  const parsed = JSON.parse(result) as Record<string, GoDocOutput>;

  const modules: ASTModule[] = [];

  // gomarkdoc outputs a map where keys are package import paths
  for (const [pkgPath, pkgDoc] of Object.entries(parsed)) {
    const mod: ASTModule = {
      name: pkgDoc.name ?? pkgPath.split("/").pop() ?? pkgPath,
      docstring: pkgDoc.description || undefined,
      classes: [],
      functions: [],
      variables: [],
    };

    // Process functions
    for (const fn of pkgDoc.functions ?? []) {
      mod.functions?.push({
        name: fn.name,
        signature: fn.signature ?? undefined,
        docstring: fn.description || undefined,
        parameters: fn.params?.map((p) => ({
          name: p.name,
          type: p.type,
          description: undefined,
          default: undefined,
        })),
        return_type: fn.returns?.map((r) => r.type).join(", ") || undefined,
      });
    }

    // Process types (structs/interfaces) as classes
    for (const typ of pkgDoc.types ?? []) {
      mod.classes?.push({
        name: typ.name,
        docstring: typ.description || undefined,
        methods: typ.methods?.map((m) => ({
          name: m.name,
          signature: m.signature ?? undefined,
          docstring: m.description || undefined,
          parameters: m.params?.map((p) => ({
            name: p.name,
            type: p.type,
            description: undefined,
            default: undefined,
          })),
          return_type: m.returns?.map((r) => r.type).join(", ") || undefined,
        })),
        properties: typ.fields?.map((f) => ({
          name: f.name,
          type: f.type,
          docstring: f.description || undefined,
        })),
      });
    }

    modules.push(mod);
  }

  return modules;
}
