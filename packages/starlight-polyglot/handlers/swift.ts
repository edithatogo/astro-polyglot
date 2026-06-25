import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { type ASTClass, type ASTModule, type ASTParameter, transformToMDX } from "../core/mdx-generator";
import type { BaseHandlerOptions, Handler } from "../core/plugin";

interface SwiftHandlerOptions extends BaseHandlerOptions {
  /** Path to the Swift module (source root or .swiftmodule directory). */
  modulePath: string;
  /** Optional directory containing symbol graph JSON files (from swift-doc or DocC). */
  symbolGraphDir?: string;
}

/** A symbol from DocC / swift-doc symbol graph JSON. */
interface SymbolGraphSymbol {
  kind: { identifier: string; displayName?: string };
  identifier: { precise: string; interfaceLanguage?: string };
  names: { title: string; subtitle?: string; navigator?: string };
  pathComponents?: string[];
  docComment?: { lines?: Array<{ text: string }> };
  functionSignature?: {
    parameters?: Array<{ name: string; externalName?: string; declarationMeta?: { typeName?: string } }>;
    returns?: Array<{ name: string }>;
  };
  availability?: unknown[];
  mixins?: Record<string, unknown>;
}

/** Relationship between symbols in DocC JSON. */
interface SymbolGraphRelationship {
  kind: string;
  source: string;
  target: string;
  targetFallback?: string;
}

/** Top-level DocC / symbol-graph JSON shape. */
interface SymbolGraphDocument {
  metadata?: { formatVersion?: string; generator?: string };
  module?: { name: string; platforms?: unknown[] };
  symbols?: SymbolGraphSymbol[];
  relationships?: SymbolGraphRelationship[];
}

/**
 * Swift handler: Uses Apple's DocC (swift-doc) tooling to generate
 * symbol-graph JSON documentation for Swift modules, then parses
 * the output into the common ASTModule format.
 *
 * @remarks
 * Uses `swift-doc` or the Swift compiler's `-emit-symbol-graph` to
 * extract documentation. Falls back to `swift-doc` CLI if the
 * symbol graph directory is not explicitly provided.
 */
export const swiftHandler: Handler = {
  name: "swift",

  async generate(options) {
    const opts = options as unknown as SwiftHandlerOptions;
    const modulePath = opts.modulePath;
    const symbolGraphDir = opts.symbolGraphDir;

    if (!modulePath) {
      throw new Error("Swift handler requires a modulePath option");
    }

    if (!existsSync(modulePath)) {
      throw new Error(`Module path does not exist: ${modulePath}`);
    }

    const modules = extractWithSwiftDoc(modulePath, symbolGraphDir);

    if (modules.length === 0) {
      throw new Error("Swift doc extraction produced no modules");
    }

    const output = transformToMDX(modules, {
      outputDir: opts.output,
      language: "swift",
      ...(opts.pagination !== undefined ? { pagination: opts.pagination } : {}),
    });

    return output;
  },

  async validate(_sourcePath) {
    try {
      execSync("swift-doc --version", { encoding: "utf-8", stdio: "pipe" });
      return { valid: true, errors: [] };
    } catch {
      try {
        execSync("swift --version", { encoding: "utf-8", stdio: "pipe" });
        return { valid: true, errors: [] };
      } catch {
        return {
          valid: false,
          errors: [
            "Neither swift-doc nor swift toolchain found. Install swift-doc (https://github.com/SwiftDocOrg/swift-doc) or the Swift toolchain.",
          ],
        };
      }
    }
  },
};

/**
 * Runs swift-doc or reads symbol graph to produce ASTModule[].
 */
function extractWithSwiftDoc(modulePath: string, symbolGraphDir?: string): ASTModule[] {
  const resolvedPath = path.resolve(modulePath);

  if (symbolGraphDir && existsSync(symbolGraphDir)) {
    return parseSymbolGraphDir(symbolGraphDir);
  }

  const symbolGraphCandidates = findSymbolGraphFiles(resolvedPath);
  const firstCandidate = symbolGraphCandidates[0];
  if (firstCandidate) {
    return parseSymbolGraphDir(path.dirname(firstCandidate));
  }

  return runSwiftDoc(resolvedPath);
}

/**
 * Finds existing symbol graph files under the module path.
 */
function findSymbolGraphFiles(modulePath: string): string[] {
  const results: string[] = [];

  function searchDir(dir: string): void {
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
          searchDir(fullPath);
        } else if (entry.isFile() && (entry.name.endsWith(".symbolgraph.json") || entry.name.endsWith(".json"))) {
          results.push(fullPath);
        }
      }
    } catch {
      // Ignore permission errors
    }
  }

  const symbolGraphDir = path.join(modulePath, ".build", "symbolgraph");
  if (existsSync(symbolGraphDir)) {
    searchDir(symbolGraphDir);
  }

  searchDir(modulePath);
  return results;
}

/**
 * Runs swift-doc on the given module path to produce JSON output.
 */
function runSwiftDoc(modulePath: string): ASTModule[] {
  const tmpOutput = path.resolve(modulePath, ".build", "swift-doc-output");

  const cmd = `swift-doc --output "${tmpOutput}" --format json "${modulePath}" 2>&1`;
  execSync(cmd, {
    encoding: "utf-8",
    cwd: modulePath,
    stdio: "pipe",
    timeout: 180_000,
  });

  if (!existsSync(tmpOutput)) {
    throw new Error("swift-doc did not produce output. Ensure swift-doc is installed and the module path is correct.");
  }

  return parseSymbolGraphDir(tmpOutput);
}

/**
 * Parses a directory of symbol graph JSON files into ASTModule[].
 */
function parseSymbolGraphDir(symbolGraphDir: string): ASTModule[] {
  const modules: ASTModule[] = [];
  const files = readdirSync(symbolGraphDir).filter((f) => f.endsWith(".json") || f.endsWith(".symbolgraph.json"));

  for (const file of files) {
    const filePath = path.join(symbolGraphDir, file);
    const raw = readFileSync(filePath, "utf-8");

    try {
      const doc = JSON.parse(raw) as SymbolGraphDocument;
      const mod = convertSymbolGraph(doc);
      if (mod) {
        modules.push(mod);
      }
    } catch {}
  }

  return modules;
}

/**
 * Converts a single symbol graph document into an ASTModule.
 */
function convertSymbolGraph(doc: SymbolGraphDocument): ASTModule | null {
  const moduleName = doc.module?.name ?? "UnknownModule";

  const mod: ASTModule = {
    name: moduleName,
    docstring: undefined,
    classes: [],
    functions: [],
    variables: [],
  };

  if (!doc.symbols || doc.symbols.length === 0) return mod;

  // Build a map of symbol relationships: source -> parent target
  const parentMap = new Map<string, string>();
  for (const rel of doc.relationships ?? []) {
    if (rel.kind === "memberOf" && rel.target) {
      parentMap.set(rel.source, rel.target);
    }
  }

  // Group symbols by their parent
  const childSymbols = new Map<string, SymbolGraphSymbol[]>();
  const topLevelSymbols: SymbolGraphSymbol[] = [];

  for (const symbol of doc.symbols) {
    const parent = parentMap.get(symbol.identifier?.precise ?? "");
    if (parent) {
      const children = childSymbols.get(parent) ?? [];
      children.push(symbol);
      childSymbols.set(parent, children);
    } else {
      topLevelSymbols.push(symbol);
    }
  }

  // Process top-level symbols
  for (const symbol of topLevelSymbols) {
    const kind = symbol.kind?.identifier ?? "";
    const name = symbol.names?.title;
    if (!name) continue;

    const docComment = extractDocComment(symbol);

    if (kind === "class" || kind === "struct" || kind === "enum" || kind === "protocol" || kind === "extension") {
      const cls: ASTClass = {
        name,
        docstring: docComment,
        methods: [],
        properties: [],
      };

      const preciseId = symbol.identifier?.precise ?? "";
      const children = childSymbols.get(preciseId) ?? [];

      for (const child of children) {
        const childKind = child.kind?.identifier ?? "";
        const childName = child.names?.title;
        if (!childName) continue;

        const childDoc = extractDocComment(child);

        if (
          childKind === "method" ||
          childKind === "instanceMethod" ||
          childKind === "typeMethod" ||
          childKind === "constructor" ||
          childKind === "instanceSubscript"
        ) {
          cls.methods!.push({
            name: childName,
            signature: buildSwiftSignature(child),
            docstring: childDoc,
            parameters: extractSwiftParameters(child),
            return_type: extractSwiftReturnType(child),
          });
        } else if (
          childKind === "property" ||
          childKind === "instanceProperty" ||
          childKind === "typeProperty" ||
          childKind === "instanceVariable"
        ) {
          cls.properties!.push({
            name: childName,
            type: extractSwiftReturnType(child) ?? undefined,
            docstring: childDoc,
          });
        }
      }

      mod.classes?.push(cls);
    } else if (kind === "function" || kind === "operator" || kind === "instanceMethod" || kind === "typeMethod") {
      mod.functions?.push({
        name,
        signature: buildSwiftSignature(symbol),
        docstring: docComment,
        parameters: extractSwiftParameters(symbol),
        return_type: extractSwiftReturnType(symbol),
      });
    } else if (kind === "variable" || kind === "global" || kind === "typealias") {
      mod.variables?.push({
        name,
        type: extractSwiftReturnType(symbol) ?? undefined,
        docstring: docComment,
      });
    }
  }

  return mod;
}

/**
 * Extracts documentation comment text from a symbol graph symbol.
 */
function extractDocComment(symbol: SymbolGraphSymbol): string | undefined {
  if (!symbol.docComment?.lines) return undefined;
  const text = symbol.docComment.lines
    .map((l) => l.text)
    .join("")
    .trim();
  return text || undefined;
}

/**
 * Builds a human-readable Swift function/method signature.
 */
function buildSwiftSignature(symbol: SymbolGraphSymbol): string | undefined {
  const sig = symbol.functionSignature;
  if (!sig) return undefined;

  const params = (sig.parameters ?? [])
    .map((p) => {
      const external = p.externalName ?? "_";
      const type = p.declarationMeta?.typeName ?? "Any";
      return `${external} ${p.name}: ${type}`;
    })
    .join(", ");

  const returns = sig.returns && sig.returns.length > 0 ? ` -> ${sig.returns.map((r) => r.name).join(", ")}` : "";

  return `${symbol.names.title}(${params})${returns}`;
}

/**
 * Extracts parameters from a symbol graph function signature.
 */
function extractSwiftParameters(symbol: SymbolGraphSymbol): ASTParameter[] | undefined {
  const sig = symbol.functionSignature;
  if (!sig?.parameters || sig.parameters.length === 0) return undefined;

  return sig.parameters.map((p) => ({
    name: p.name,
    type: p.declarationMeta?.typeName ?? undefined,
    description: undefined,
    default: undefined,
  }));
}

/**
 * Extracts the return type from a symbol graph function signature.
 */
function extractSwiftReturnType(symbol: SymbolGraphSymbol): string | undefined {
  const returns = symbol.functionSignature?.returns;
  if (!returns || returns.length === 0) return undefined;
  return returns.map((r) => r.name).join(", ") || undefined;
}
