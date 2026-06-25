import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { type ASTModule, transformToMDX } from "../core/mdx-generator";
import type { BaseHandlerOptions, Handler } from "../core/plugin";

interface JuliaHandlerOptions extends BaseHandlerOptions {
  entryPoints: string[];
}

/**
 * Julia handler: Spawns `julia scripts/julia_extract.jl` with entry points
 * to extract module/function/type documentation using Base.Docs.
 */
export const juliaHandler: Handler = {
  name: "julia",

  async generate(options) {
    const opts = options as unknown as JuliaHandlerOptions;
    const entryPoints = opts.entryPoints;

    if (!entryPoints || entryPoints.length === 0) {
      throw new Error("Julia handler requires at least one entryPoint");
    }

    const ast = await extractWithJulia(entryPoints);
    const modules = ast.modules ?? [];

    if (modules.length === 0 && ast.errors) {
      throw new Error(`Julia extraction failed: ${ast.errors.map((e: { error: string }) => e.error).join(", ")}`);
    }

    const output = transformToMDX(modules, {
      outputDir: opts.output,
      language: "julia",
      ...(opts.pagination !== undefined ? { pagination: opts.pagination } : {}),
    });

    return output;
  },

  async validate(_sourcePath) {
    try {
      execSync("julia --version", { encoding: "utf-8", stdio: "pipe" });
      return { valid: true, errors: [] };
    } catch {
      return { valid: false, errors: ["julia not found. Install Julia from https://julialang.org/"] };
    }
  },
};

interface JuliaExtractOutput {
  modules?: ASTModule[];
  errors?: Array<{ entry_point: string; error: string }>;
}

function extractWithJulia(entryPoints: string[]): JuliaExtractOutput {
  const scriptPath = path.resolve(import.meta.dirname, "..", "scripts", "julia_extract.jl");

  if (!existsSync(scriptPath)) {
    throw new Error(`Julia extraction script not found at ${scriptPath}`);
  }

  // Julia needs to load modules first, then run the extraction
  // We pass module names as arguments and rely on `using ModuleName` inside the script
  const args = ["julia", scriptPath, ...entryPoints];
  const result = execSync(args.join(" "), {
    encoding: "utf-8",
    maxBuffer: 10 * 1024 * 1024, // 10MB
    timeout: 120_000,
  });

  return JSON.parse(result) as JuliaExtractOutput;
}
