import { transformToMDX } from "../core/mdx-generator";
import type { BaseHandlerOptions, Handler } from "../core/plugin";

export const graphqlHandler: Handler = {
  name: "graphql",
  async generate(options) {
    const output = (options as BaseHandlerOptions).output;
    return transformToMDX([], { outputDir: output, language: "graphql" });
  },
  async validate() {
    return { valid: true, errors: [] };
  },
};
