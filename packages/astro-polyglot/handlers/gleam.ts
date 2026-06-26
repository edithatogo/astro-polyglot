import { transformToMDX } from "../core/mdx-generator";
import type { BaseHandlerOptions, Handler } from "../core/plugin";

export const gleamHandler: Handler = {
  name: "gleam",
  async generate(options) {
    const output = (options as BaseHandlerOptions).output;
    return transformToMDX([], { outputDir: output, language: "gleam" });
  },
  async validate() {
    return { valid: true, errors: [] };
  },
};
