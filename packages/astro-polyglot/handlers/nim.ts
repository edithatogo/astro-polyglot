import { transformToMDX } from "../core/mdx-generator";
import type { BaseHandlerOptions, Handler } from "../core/plugin";

export const nimHandler: Handler = {
  name: "nim",
  async generate(options) {
    const output = (options as BaseHandlerOptions).output;
    return transformToMDX([], { outputDir: output, language: "nim" });
  },
  async validate() {
    return { valid: true, errors: [] };
  },
};
