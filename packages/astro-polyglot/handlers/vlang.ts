import { transformToMDX } from "../core/mdx-generator";
import type { BaseHandlerOptions, Handler } from "../core/plugin";

export const vlangHandler: Handler = {
  name: "vlang",
  async generate(options) {
    const output = (options as BaseHandlerOptions).output;
    return transformToMDX([], { outputDir: output, language: "vlang" });
  },
  async validate() {
    return { valid: true, errors: [] };
  },
};
