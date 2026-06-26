import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { runDoxygen, parseDoxygenXmlDir, doxygenToAST } from "../core/doxygen-utils";
import { transformToMDX } from "../core/mdx-generator";
import type { BaseHandlerOptions, Handler } from "../core/plugin";

interface YaccOptions extends BaseHandlerOptions {
  sourcePath: string;
}

export const yaccHandler: Handler = {
  name: "yacc",
  async generate(options) {
    const opts = options as unknown as YaccOptions;
    if (!opts.sourcePath) throw new Error("Yacc/Bison handler requires a sourcePath option");
    if (!existsSync(opts.sourcePath)) throw new Error(`Source path does not exist: ${opts.sourcePath}`);
    const xmlDir = await runDoxygen({ inputDir: opts.sourcePath, filePatterns: ["*.y", "*.yy", "*.yxx"], projectName: "Yacc/Bison" });
    if (!xmlDir) throw new Error("Doxygen extraction failed for Yacc/Bison");
    const compounds = parseDoxygenXmlDir(xmlDir);
    const modules = doxygenToAST(compounds, "yacc");
    if (modules.length === 0) throw new Error("Doxygen extraction produced no modules for Yacc/Bison");
    return transformToMDX(modules, { outputDir: opts.output, language: "yacc", ...(opts.pagination !== undefined ? { pagination: opts.pagination } : {}) });
  },
  async validate() {
    try { execSync("doxygen --version", { encoding: "utf-8", stdio: "pipe" }); return { valid: true, errors: [] }; }
    catch { return { valid: false, errors: ["doxygen not found"] }; }
  },
};
