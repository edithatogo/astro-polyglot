import { transformToMDX } from "../core/mdx-generator";
import type { BaseHandlerOptions, Handler } from "../core/plugin";

export const gdscriptHandler: Handler = {
  name: "gdscript",
  async generate(options) {
    const output = (options as BaseHandlerOptions).output;
    return transformToMDX([], { outputDir: output, language: "gdscript" });
  },
  async validate() {
    return { valid: true, errors: [] };
  },
};
