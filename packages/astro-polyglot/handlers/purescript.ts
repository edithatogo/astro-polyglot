import { transformToMDX } from "../core/mdx-generator";
import type { BaseHandlerOptions, Handler } from "../core/plugin";

export const purescriptHandler: Handler = {
  name: "purescript",
  async generate(options) {
    const output = (options as BaseHandlerOptions).output;
    return transformToMDX([], { outputDir: output, language: "purescript" });
  },
  async validate() {
    return { valid: true, errors: [] };
  },
};
