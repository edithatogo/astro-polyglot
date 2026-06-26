import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { runDoxygen, parseDoxygenXmlDir, doxygenToAST } from "../core/doxygen-utils";
import { transformToMDX } from "../core/mdx-generator";
import type { BaseHandlerOptions, Handler } from "../core/plugin";

interface COptions extends BaseHandlerOptions {
  sourcePath: string;
}

export const cHandler: Handler = {
  name: "c",
  async generate(options) {
    const opts = options as unknown as COptions;
    if (!opts.sourcePath) throw new Error("C handler requires a sourcePath option");
    if (!existsSync(opts.sourcePath)) throw new Error(`Source path does not exist: ${opts.sourcePath}`);
    const xmlDir = await runDoxygen({ inputDir: opts.sourcePath, filePatterns: ["*.c", "*.h"], projectName: "C" });
    if (!xmlDir) throw new Error("Doxygen extraction failed for C");
    const compounds = parseDoxygenXmlDir(xmlDir);
    const modules = doxygenToAST(compounds, "c");
    if (modules.length === 0) throw new Error("Doxygen extraction produced no modules for C");
    return transformToMDX(modules, { outputDir: opts.output, language: "c", ...(opts.pagination !== undefined ? { pagination: opts.pagination } : {}) });
  },
  async validate() {
    try { execSync("doxygen --version", { encoding: "utf-8", stdio: "pipe" }); return { valid: true, errors: [] }; }
    catch { return { valid: false, errors: ["doxygen not found"] }; }
  },
};
