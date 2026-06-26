import { transformToMDX } from "../core/mdx-generator";
import type { BaseHandlerOptions, Handler } from "../core/plugin";

export const dHandler: Handler = {
  name: "d",
  async generate(options) {
    const output = (options as BaseHandlerOptions).output;
    return transformToMDX([], { outputDir: output, language: "d" });
  },
  async validate() {
    return { valid: true, errors: [] };
  },
};
