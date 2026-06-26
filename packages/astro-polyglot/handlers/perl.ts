import { transformToMDX } from "../core/mdx-generator";
import type { BaseHandlerOptions, Handler } from "../core/plugin";

export const perlHandler: Handler = {
  name: "perl",
  async generate(options) {
    const output = (options as BaseHandlerOptions).output;
    return transformToMDX([], { outputDir: output, language: "perl" });
  },
  async validate() {
    return { valid: true, errors: [] };
  },
};
