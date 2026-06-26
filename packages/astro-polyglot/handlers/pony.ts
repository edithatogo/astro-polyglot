import { transformToMDX } from "../core/mdx-generator";
import type { BaseHandlerOptions, Handler } from "../core/plugin";

export const ponyHandler: Handler = {
  name: "pony",
  async generate(options) {
    const output = (options as BaseHandlerOptions).output;
    return transformToMDX([], { outputDir: output, language: "pony" });
  },
  async validate() {
    return { valid: true, errors: [] };
  },
};
