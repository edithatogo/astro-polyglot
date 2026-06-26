import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { type ASTModule, transformToMDX } from "../core/mdx-generator";
import type { BaseHandlerOptions, Handler } from "../core/plugin";

interface SasHandlerOptions extends BaseHandlerOptions {
  /** Paths to SAS program (.sas) files to extract documentation from */
  entryPoints: string[];
}

/** Intermediate representation of a SAS macro / function extracted from output. */
interface SasDocumentedItem {
  name: string;
  type: "macro" | "function" | "dataset" | "variable";
  description?: string;
  parameters?: Array<{ name: string; type?: string; description?: string; default?: string }>;
  returns?: string;
}

/**
 * SAS handler: Uses SAS batch mode to run PROC CONTENTS and custom
 * documentation macros, then parses the SAS log/output for structured
 * documentation. The handler runs `sas -sysin sas_extract.sas` with the
 * provided entry points to extract macro/function documentation.
 *
 * @remarks
 * Requires `sas` to be installed and available on PATH.
 * Entry points should be paths to .sas program files.
 */
export const sasHandler: Handler = {
  name: "sas",

  async generate(options) {
    const opts = options as unknown as SasHandlerOptions;
    const entryPoints = opts.entryPoints;

    if (!entryPoints || entryPoints.length === 0) {
      throw new Error("SAS handler requires at least one entryPoint");
    }

    const modules = extractWithSas(entryPoints);

    if (modules.length === 0) {
      throw new Error("SAS extraction produced no modules");
    }

    const output = transformToMDX(modules, {
      outputDir: opts.output,
      language: "sas",
      ...(opts.pagination !== undefined ? { pagination: opts.pagination } : {}),
    });

    return output;
  },

  async validate(_sourcePath) {
    try {
      execSync("sas -version", { encoding: "utf-8", stdio: "pipe" });
      return { valid: true, errors: [] };
    } catch {
      try {
        execSync("sas --version", { encoding: "utf-8", stdio: "pipe" });
        return { valid: true, errors: [] };
      } catch {
        return {
          valid: false,
          errors: ["SAS not found. Install SAS from https://www.sas.com/ and ensure it is on your PATH."],
        };
      }
    }
  },
};

/**
 * Runs the SAS extraction script on each entry point and parses the output
 * into ASTModule[].
 */
function extractWithSas(entryPoints: string[]): ASTModule[] {
  const modules: ASTModule[] = [];
  const scriptPath = path.resolve(import.meta.dirname, "..", "scripts", "sas_extract.sas");

  if (!existsSync(scriptPath)) {
    throw new Error(`SAS extraction script not found at ${scriptPath}`);
  }

  for (const entry of entryPoints) {
    const resolvedEntry = path.resolve(entry);
    if (!existsSync(resolvedEntry)) {
      continue;
    }

    const cmd = `sas -sysin "${scriptPath}" -set SRC_FILE "${resolvedEntry}" -log /tmp/sas_extract.log -print /tmp/sas_extract.lst 2>&1`;
    const result = execSync(cmd, {
      encoding: "utf-8",
      cwd: path.dirname(scriptPath),
      maxBuffer: 10 * 1024 * 1024,
      timeout: 180_000,
      stdio: "pipe",
    });

    const mod = parseSasOutput(result, resolvedEntry);
    if (mod) {
      modules.push(mod);
    }
  }

  return modules;
}

/**
 * Parses SAS log/output to extract documented macros, functions, and datasets.
 * SAS documentation typically appears in comments (* ... ;) or as PROC
 * CONTENTS output that describes datasets and variables.
 */
function parseSasOutput(output: string, entryPath: string): ASTModule | null {
  const name = path.basename(entryPath, path.extname(entryPath));
  const mod: ASTModule = {
    name,
    docstring: undefined,
    classes: [],
    functions: [],
    variables: [],
  };

  const items: SasDocumentedItem[] = [];

  // Parse macro definitions: %macro name(param1, param2) / description;
  const macroRegex = /%\s*macro\s+(\w+)\s*\(([^)]*)\)\s*(?:\/\*\s*([^*]*)\s*\*\/)?/gi;
  let macroMatch: RegExpExecArray | null;
  while ((macroMatch = macroRegex.exec(output)) !== null) {
    const macroName = macroMatch[1];
    const paramStr = macroMatch[2];
    if (!macroName || paramStr === undefined) continue;
    const description = macroMatch[3]?.trim();

    const paramStrTrimmed = paramStr.trim();
    const params = paramStrTrimmed
      ? paramStrTrimmed.split(",").map((p) => {
          const parts = p.trim().split(/\s*=\s*/);
          return {
            name: parts[0]?.trim() || p.trim(),
            type: undefined,
            description: undefined,
            default: parts[1]?.trim() || undefined,
          };
        })
      : undefined;

    items.push({
      name: macroName,
      type: "macro",
      description: description || undefined,
      parameters: params && params.length > 0 ? params : undefined,
    });
  }

  // Parse PROC CONTENTS output patterns: # Variable / Type / Len
  const varRegex = /^\s*(\d+)\s+(\w+)\s+(\w+)\s+(\d+)/gm;
  while ((macroMatch = varRegex.exec(output)) !== null) {
    const varName = macroMatch[2];
    const varType = macroMatch[3];
    if (!varName || !varType) continue;
    items.push({
      name: varName,
      type: "variable",
      description: undefined,
      parameters: undefined,
      returns: varType,
    });
  }

  // Parse comment-based documentation: * description for function_name;
  const commentDocRegex = /\*\s*@(macro|function|dataset)\s+(\w+)\s*([^*]*)\*;/gi;
  while ((macroMatch = commentDocRegex.exec(output)) !== null) {
    const itemType = macroMatch[1] as "macro" | "function" | "dataset" | undefined;
    const itemName = macroMatch[2];
    if (!itemType || !itemName) continue;
    const itemDesc = macroMatch[3]?.trim();

    // Check if a matching item already exists
    const existing = items.find((i) => i.name === itemName);
    if (existing) {
      existing.description = itemDesc || existing.description;
    } else {
      items.push({
        name: itemName,
        type: itemType,
        description: itemDesc || undefined,
      });
    }
  }

  // Populate module from extracted items

  for (const item of items) {
    if (item.type === "macro" || item.type === "function") {
      mod.functions?.push({
        name: item.name,
        docstring: item.description,
        parameters: item.parameters,
        return_type: item.returns,
      });
    } else {
      mod.variables?.push({
        name: item.name,
        type: item.returns,
        docstring: item.description,
      });
    }
  }

  // Use the first function description as module docstring if available
  if (!mod.docstring && mod.functions && mod.functions.length > 0) {
    const firstFunc = mod.functions[0];
    if (firstFunc) {
      mod.docstring = firstFunc.docstring;
    }
  }

  return mod;
}
