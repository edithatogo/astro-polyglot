import { transformToMDX } from "../core/mdx-generator";
import type { BaseHandlerOptions, Handler } from "../core/plugin";

export const gmlHandler: Handler = {
  name: "gml",
  async generate(options) {
    const output = (options as BaseHandlerOptions).output;
    return transformToMDX([], { outputDir: output, language: "gml" });
  },
  async validate() {
    return { valid: true, errors: [] };
  },
};
