import { transformToMDX } from "../core/mdx-generator";
import type { BaseHandlerOptions, Handler } from "../core/plugin";

export const odinHandler: Handler = {
  name: "odin",
  async generate(options) {
    const output = (options as BaseHandlerOptions).output;
    return transformToMDX([], { outputDir: output, language: "odin" });
  },
  async validate() {
    return { valid: true, errors: [] };
  },
};
