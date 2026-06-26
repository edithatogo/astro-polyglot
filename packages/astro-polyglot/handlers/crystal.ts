import { transformToMDX } from "../core/mdx-generator";
import type { BaseHandlerOptions, Handler } from "../core/plugin";

export const crystalHandler: Handler = {
  name: "crystal",
  async generate(options) {
    const output = (options as BaseHandlerOptions).output;
    return transformToMDX([], { outputDir: output, language: "crystal" });
  },
  async validate() {
    return { valid: true, errors: [] };
  },
};
