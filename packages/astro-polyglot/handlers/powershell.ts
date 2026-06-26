import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { transformToMDX } from "../core/mdx-generator";
import { naturalDocsToAST, type LanguageConfig } from "../core/natural-docs-fallback";
import type { BaseHandlerOptions, Handler } from "../core/plugin";
import type { ASTModule } from "../core/mdx-generator";

interface PowerShellOptions extends BaseHandlerOptions {
  sourcePath: string;
}

const powerShellConfig: LanguageConfig = {
  extensions: [".ps1", ".psm1", ".psd1"],
  commentSyntaxes: [
    { linePrefix: "#", isDocSyntax: true },
    { blockStart: "<#", blockEnd: "#>", isDocSyntax: true },
  ],
};

export const powershellHandler: Handler = {
  name: "powershell",

  async generate(options) {
    const opts = options as unknown as PowerShellOptions;
    if (!opts.sourcePath) throw new Error("PowerShell handler requires a sourcePath option");
    if (!existsSync(opts.sourcePath)) throw new Error(`Source path does not exist: ${opts.sourcePath}`);

    const resolvedPath = resolve(opts.sourcePath);
    const modules: ASTModule[] = [];

    const walkDir = (dir: string) => {
      const entries = existsSync(dir) ? readdirSync(dir, { withFileTypes: true }) : [];
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          walkDir(fullPath);
        } else if (entry.name.endsWith(".ps1") || entry.name.endsWith(".psm1")) {
          const source = readFileSync(fullPath, "utf-8");
          const baseName = entry.name.replace(/\.(ps1|psm1)$/, "");
          const parsed = naturalDocsToAST(source, powerShellConfig, baseName);
          modules.push(...parsed);
        }
      }
    };

    walkDir(resolvedPath);

    if (modules.length === 0) {
      throw new Error("PowerShell extraction produced no modules");
    }

    return transformToMDX(modules, {
      outputDir: opts.output,
      language: "powershell",
      ...(opts.pagination !== undefined ? { pagination: opts.pagination } : {}),
    });
  },

  async validate() {
    return { valid: true, errors: [] };
  },
};
