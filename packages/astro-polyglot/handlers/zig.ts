import { transformToMDX } from "../core/mdx-generator";
import type { BaseHandlerOptions, Handler } from "../core/plugin";

export const zigHandler: Handler = {
  name: "zig",
  async generate(options) {
    const output = (options as BaseHandlerOptions).output;
    return transformToMDX([], { outputDir: output, language: "zig" });
  },
  async validate() {
    return { valid: true, errors: [] };
  },
};
