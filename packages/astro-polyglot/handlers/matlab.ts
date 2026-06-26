import { transformToMDX } from "../core/mdx-generator";
import type { BaseHandlerOptions, Handler } from "../core/plugin";

export const matlabHandler: Handler = {
  name: "matlab",
  async generate(options) {
    const output = (options as BaseHandlerOptions).output;
    return transformToMDX([], { outputDir: output, language: "matlab" });
  },
  async validate() {
    return { valid: true, errors: [] };
  },
};
