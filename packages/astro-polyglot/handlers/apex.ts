import { transformToMDX } from "../core/mdx-generator";
import type { BaseHandlerOptions, Handler } from "../core/plugin";

export const apexHandler: Handler = {
  name: "apex",
  async generate(options) {
    const output = (options as BaseHandlerOptions).output;
    return transformToMDX([], { outputDir: output, language: "apex" });
  },
  async validate() {
    return { valid: true, errors: [] };
  },
};
