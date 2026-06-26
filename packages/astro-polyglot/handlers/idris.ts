import { transformToMDX } from "../core/mdx-generator";
import type { BaseHandlerOptions, Handler } from "../core/plugin";

export const idrisHandler: Handler = {
  name: "idris",
  async generate(options) {
    const output = (options as BaseHandlerOptions).output;
    return transformToMDX([], { outputDir: output, language: "idris" });
  },
  async validate() {
    return { valid: true, errors: [] };
  },
};
