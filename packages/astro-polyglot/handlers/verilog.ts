import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { runDoxygen, parseDoxygenXmlDir, doxygenToAST } from "../core/doxygen-utils";
import { transformToMDX } from "../core/mdx-generator";
import type { BaseHandlerOptions, Handler } from "../core/plugin";

interface VerilogOptions extends BaseHandlerOptions {
  sourcePath: string;
}

export const verilogHandler: Handler = {
  name: "verilog",
  async generate(options) {
    const opts = options as unknown as VerilogOptions;
    if (!opts.sourcePath) throw new Error("Verilog handler requires a sourcePath option");
    if (!existsSync(opts.sourcePath)) throw new Error(`Source path does not exist: ${opts.sourcePath}`);
    const xmlDir = await runDoxygen({
      inputDir: opts.sourcePath,
      filePatterns: ["*.v", "*.sv", "*.svh"],
      projectName: "Verilog/SystemVerilog",
    });
    if (!xmlDir) throw new Error("Doxygen extraction failed for Verilog");
    const compounds = parseDoxygenXmlDir(xmlDir);
    const modules = doxygenToAST(compounds, "verilog");
    if (modules.length === 0) throw new Error("Doxygen extraction produced no modules for Verilog");
    return transformToMDX(modules, {
      outputDir: opts.output,
      language: "verilog",
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
