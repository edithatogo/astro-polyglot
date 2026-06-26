import { transformToMDX } from "../core/mdx-generator";
import type { BaseHandlerOptions, Handler } from "../core/plugin";

export const groovyHandler: Handler = {
  name: "groovy",
  async generate(options) {
    const output = (options as BaseHandlerOptions).output;
    return transformToMDX([], { outputDir: output, language: "groovy" });
  },
  async validate() {
    return { valid: true, errors: [] };
  },
};
