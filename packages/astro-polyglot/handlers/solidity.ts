import { transformToMDX } from "../core/mdx-generator";
import type { BaseHandlerOptions, Handler } from "../core/plugin";

export const solidityHandler: Handler = {
  name: "solidity",
  async generate(options) {
    const output = (options as BaseHandlerOptions).output;
    return transformToMDX([], { outputDir: output, language: "solidity" });
  },
  async validate() {
    return { valid: true, errors: [] };
  },
};
