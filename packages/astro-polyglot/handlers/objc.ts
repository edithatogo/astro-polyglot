import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { runDoxygen, parseDoxygenXmlDir, doxygenToAST } from "../core/doxygen-utils";
import { transformToMDX } from "../core/mdx-generator";
import type { BaseHandlerOptions, Handler } from "../core/plugin";

interface ObjCOptions extends BaseHandlerOptions {
  sourcePath: string;
}

export const objcHandler: Handler = {
  name: "objc",
  async generate(options) {
    const opts = options as unknown as ObjCOptions;
    if (!opts.sourcePath) throw new Error("Objective-C handler requires a sourcePath option");
    if (!existsSync(opts.sourcePath)) throw new Error(`Source path does not exist: ${opts.sourcePath}`);
    const xmlDir = await runDoxygen({
      inputDir: opts.sourcePath,
      filePatterns: ["*.m", "*.mm", "*.h"],
      projectName: "Objective-C",
    });
    if (!xmlDir) throw new Error("Doxygen extraction failed for Objective-C");
    const compounds = parseDoxygenXmlDir(xmlDir);
    const modules = doxygenToAST(compounds, "objc");
    if (modules.length === 0) throw new Error("Doxygen extraction produced no modules for Objective-C");
    return transformToMDX(modules, {
      outputDir: opts.output,
      language: "objc",
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
