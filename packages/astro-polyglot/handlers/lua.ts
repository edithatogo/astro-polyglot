import { transformToMDX } from "../core/mdx-generator";
import type { BaseHandlerOptions, Handler } from "../core/plugin";

export const luaHandler: Handler = {
  name: "lua",
  async generate(options) {
    const output = (options as BaseHandlerOptions).output;
    return transformToMDX([], { outputDir: output, language: "lua" });
  },
  async validate() {
    return { valid: true, errors: [] };
  },
};
