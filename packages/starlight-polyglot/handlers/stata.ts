import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { type ASTModule, transformToMDX } from "../core/mdx-generator";
import type { BaseHandlerOptions, Handler } from "../core/plugin";

interface StataHandlerOptions extends BaseHandlerOptions {
  /** Paths to Stata .ado or .pkg files to document */
  entryPoints: string[];
}

/**
 * Stata handler: Uses Stata's built-in help system and SMCL (Stata Markup and
 * Control Language) output to extract documentation. The handler runs a Stata
 * batch script (`stata -b do stata_extract.do`) for each entry point, then
 * parses the generated help output (plain text or SMCL format) into the
 * common ASTModule structure.
 *
 * @remarks
 * Requires `stata` or `stata-se` to be installed and available on PATH.
 * Entry points should point to .ado or .pkg files whose help files are
 * discoverable via Stata's ado-path.
 */
export const stataHandler: Handler = {
  name: "stata",

  async generate(options) {
    const opts = options as unknown as StataHandlerOptions;
    const entryPoints = opts.entryPoints;

    if (!entryPoints || entryPoints.length === 0) {
      throw new Error("Stata handler requires at least one entryPoint");
    }

    const modules = extractWithStata(entryPoints);

    if (modules.length === 0) {
      throw new Error("Stata extraction produced no modules");
    }

    const output = transformToMDX(modules, {
      outputDir: opts.output,
      language: "stata",
      ...(opts.pagination !== undefined ? { pagination: opts.pagination } : {}),
    });

    return output;
  },

  async validate(_sourcePath) {
    try {
      execSync("stata --version", { encoding: "utf-8", stdio: "pipe" });
      return { valid: true, errors: [] };
    } catch {
      try {
        execSync("stata-se --version", { encoding: "utf-8", stdio: "pipe" });
        return { valid: true, errors: [] };
      } catch {
        return {
          valid: false,
          errors: ["Stata not found. Install Stata from https://www.stata.com/ and ensure it is on your PATH."],
        };
      }
    }
  },
};

/**
 * Runs Stata help extraction on each entry point and parses the output
 * into ASTModule[].
 */
function extractWithStata(entryPoints: string[]): ASTModule[] {
  const modules: ASTModule[] = [];
  const scriptPath = path.resolve(import.meta.dirname, "..", "scripts", "stata_extract.do");

  if (!existsSync(scriptPath)) {
    throw new Error(`Stata extraction script not found at ${scriptPath}`);
  }

  for (const entry of entryPoints) {
    const resolvedEntry = path.resolve(entry);
    if (!existsSync(resolvedEntry)) {
      continue;
    }

    const cmd = `stata -b do "${scriptPath}" "${resolvedEntry}"`;
    const result = execSync(cmd, {
      encoding: "utf-8",
      cwd: path.dirname(scriptPath),
      maxBuffer: 10 * 1024 * 1024,
      timeout: 120_000,
      stdio: "pipe",
    });

    const mod = parseStataHelpOutput(result, resolvedEntry);
    if (mod) {
      modules.push(mod);
    }
  }

  return modules;
}

/**
 * Parses Stata help output (plain text or SMCL format) into an ASTModule.
 * Stata help files typically contain a command name, syntax description,
 * and option/parameter details.
 */
function parseStataHelpOutput(output: string, entryPath: string): ASTModule | null {
  const name = path.basename(entryPath, path.extname(entryPath));

  // Extract title from help output — usually the first non-empty line
  const lines = output
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;

  const mod: ASTModule = {
    name,
    docstring: undefined,
    classes: [],
    functions: [],
    variables: [],
  };

  // Try to locate "Syntax" / "Menu" / "Description" sections
  const syntaxIdx = lines.findIndex((l) => /^syntax/i.test(l) || /^---+/i.test(l));
  const descriptionEndIdx = syntaxIdx > 0 ? syntaxIdx : Math.min(lines.length, 5);

  // The lines before Syntax/Menu are the description
  const descriptionLines = lines.slice(0, descriptionEndIdx).filter((l) => !/^(help|title)/i.test(l) && l.length > 0);
  if (descriptionLines.length > 0) {
    mod.docstring = descriptionLines.join(" ").replace(/\s+/g, " ").trim();
  }

  // Parse options — look for lines starting with "-" or indicating parameters
  const optionLines = lines.filter((l) => /^\s*[-–—]\s+\w/.test(l) || /^\s*\w+\s+\(/.test(l));

  if (optionLines.length > 0) {
    mod.functions?.push({
      name,
      signature: `Syntax: ${lines[syntaxIdx] ?? name}`,
      docstring: mod.docstring,
      parameters: optionLines.map((line) => {
        const cleaned = line.replace(/^[\s\-–—]+/, "").trim();
        const colonIdx = cleaned.indexOf(":");
        const spaceIdx = cleaned.indexOf(" ");
        const splitIdx =
          colonIdx > 0 && (spaceIdx < 0 || colonIdx < spaceIdx) ? colonIdx : spaceIdx > 0 ? spaceIdx : cleaned.length;
        const paramName = cleaned.substring(0, splitIdx).trim();
        const paramDesc = cleaned
          .substring(splitIdx + 1)
          .replace(/^[: ]+/, "")
          .trim();
        return {
          name: paramName || "option",
          type: undefined,
          description: paramDesc || undefined,
          default: undefined,
        };
      }),
    });
  }

  return mod;
}
