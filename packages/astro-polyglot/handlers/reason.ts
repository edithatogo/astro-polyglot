import { transformToMDX } from "../core/mdx-generator";
import type { BaseHandlerOptions, Handler } from "../core/plugin";

export const reasonHandler: Handler = {
  name: "reason",
  async generate(options) {
    const output = (options as BaseHandlerOptions).output;
    return transformToMDX([], { outputDir: output, language: "reason" });
  },
  async validate() {
    return { valid: true, errors: [] };
  },
};
