import { transformToMDX } from "../core/mdx-generator";
import type { BaseHandlerOptions, Handler } from "../core/plugin";

export const mojoHandler: Handler = {
  name: "mojo",
  async generate(options) {
    const output = (options as BaseHandlerOptions).output;
    return transformToMDX([], { outputDir: output, language: "mojo" });
  },
  async validate() {
    return { valid: true, errors: [] };
  },
};
