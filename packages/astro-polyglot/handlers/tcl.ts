import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { runDoxygen, parseDoxygenXmlDir, doxygenToAST } from "../core/doxygen-utils";
import { transformToMDX } from "../core/mdx-generator";
import type { BaseHandlerOptions, Handler } from "../core/plugin";

interface TclOptions extends BaseHandlerOptions {
  sourcePath: string;
}

export const tclHandler: Handler = {
  name: "tcl",
  async generate(options) {
    const opts = options as unknown as TclOptions;
    if (!opts.sourcePath) throw new Error("Tcl handler requires a sourcePath option");
    if (!existsSync(opts.sourcePath)) throw new Error(`Source path does not exist: ${opts.sourcePath}`);
    const xmlDir = await runDoxygen({ inputDir: opts.sourcePath, filePatterns: ["*.tcl", "*.tk"], projectName: "Tcl/Tk" });
    if (!xmlDir) throw new Error("Doxygen extraction failed for Tcl");
    const compounds = parseDoxygenXmlDir(xmlDir);
    const modules = doxygenToAST(compounds, "tcl");
    if (modules.length === 0) throw new Error("Doxygen extraction produced no modules for Tcl");
    return transformToMDX(modules, { outputDir: opts.output, language: "tcl", ...(opts.pagination !== undefined ? { pagination: opts.pagination } : {}) });
  },
  async validate() {
    try { execSync("doxygen --version", { encoding: "utf-8", stdio: "pipe" }); return { valid: true, errors: [] }; }
    catch { return { valid: false, errors: ["doxygen not found"] }; }
  },
};
