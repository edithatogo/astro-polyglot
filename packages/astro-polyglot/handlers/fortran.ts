import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { runDoxygen, parseDoxygenXmlDir, doxygenToAST } from "../core/doxygen-utils";
import { transformToMDX } from "../core/mdx-generator";
import type { BaseHandlerOptions, Handler } from "../core/plugin";

interface FortranOptions extends BaseHandlerOptions {
  sourcePath: string;
}

export const fortranHandler: Handler = {
  name: "fortran",
  async generate(options) {
    const opts = options as unknown as FortranOptions;
    if (!opts.sourcePath) throw new Error("Fortran handler requires a sourcePath option");
    if (!existsSync(opts.sourcePath)) throw new Error(`Source path does not exist: ${opts.sourcePath}`);
    const xmlDir = await runDoxygen({
      inputDir: opts.sourcePath,
      filePatterns: ["*.f", "*.f90", "*.f95", "*.f03"],
      projectName: "Fortran",
    });
    if (!xmlDir) throw new Error("Doxygen extraction failed for Fortran");
    const compounds = parseDoxygenXmlDir(xmlDir);
    const modules = doxygenToAST(compounds, "fortran");
    if (modules.length === 0) throw new Error("Doxygen extraction produced no modules for Fortran");
    return transformToMDX(modules, {
      outputDir: opts.output,
      language: "fortran",
      ...(opts.pagination !== undefined ? { pagination: opts.pagination } : {}),
    });
  },
  async validate() {
    try {
      execSync("doxygen --version", { encoding: "utf-8", stdio: "pipe" });
      return { valid: true, errors: [] };
    } catch {
      return { valid: false, errors: ["doxygen not found"] };
    }
  },
};
