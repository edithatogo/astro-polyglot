import { transformToMDX } from "../core/mdx-generator";
import type { BaseHandlerOptions, Handler } from "../core/plugin";

export const ocamlHandler: Handler = {
  name: "ocaml",
  async generate(options) {
    const output = (options as BaseHandlerOptions).output;
    return transformToMDX([], { outputDir: output, language: "ocaml" });
  },
  async validate() {
    return { valid: true, errors: [] };
  },
};
