import { transformToMDX } from "../core/mdx-generator";
import type { BaseHandlerOptions, Handler } from "../core/plugin";

export const haskellHandler: Handler = {
  name: "haskell",
  async generate(options) {
    const output = (options as BaseHandlerOptions).output;
    return transformToMDX([], { outputDir: output, language: "haskell" });
  },
  async validate() {
    return { valid: true, errors: [] };
  },
};
