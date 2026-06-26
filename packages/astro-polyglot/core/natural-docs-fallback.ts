/**
 * astro-polyglot — Language-Agnostic Fallback (Natural Docs style)
 *
 * Provides a universal comment parser for languages without a dedicated
 * handler or Doxygen configuration. Supports common comment syntaxes:
 *   - `///` (C#-style, Rust, etc.)
 *   - `/** ... *​/` (JSDoc, Java, etc.)
 *   - `--[[ ... ]]` (Lua)
 *   - `#` (Python, Ruby, shell, R, etc.)
 *   - `%` (MATLAB, Julia, Prolog, etc.)
 *   - `(* ... *)` (Pascal, OCaml, AppleScript)
 *   - `;` (Assembly, Lisp, Clojure)
 *   - `"""` (Python / Julia docstrings)
 *   - `//!` (Rust inner doc attrs)
 *
 * @module core/natural-docs-fallback
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import type { ASTClass, ASTFunction, ASTModule } from "./mdx-generator";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface CommentBlock {
  text: string;
  line: number;
  target?: string;
}

export interface ParsedDocBlock {
  summary?: string;
  description?: string;
  tags: DocTag[];
}

export interface DocTag {
  name: string;
  value?: string;
  body?: string;
}

export interface LanguageConfig {
  extensions: string[];
  commentSyntaxes: CommentSyntax[];
  docStringDelimiters?: string[];
}

export interface CommentSyntax {
  /** Line-comment prefix (e.g. `//`, `#`). Omitted for block-only syntaxes. */
  linePrefix?: string;
  blockStart?: string;
  blockEnd?: string;
  isDocSyntax: boolean;
}

// ─── Language Comment Configs ──────────────────────────────────────────────

const languageConfigs: Record<string, LanguageConfig> = {
  python: {
    extensions: [".py", ".pyw"],
    commentSyntaxes: [{ linePrefix: "#", isDocSyntax: false }],
    docStringDelimiters: ['"""', "''"],
  },
  julia: {
    extensions: [".jl"],
    commentSyntaxes: [{ linePrefix: "#", isDocSyntax: false }],
    docStringDelimiters: ['"""'],
  },
  lua: {
    extensions: [".lua"],
    commentSyntaxes: [
      { linePrefix: "--", isDocSyntax: false },
      { blockStart: "--[[", blockEnd: "]]", isDocSyntax: true },
    ],
  },
  matlab: {
    extensions: [".m"],
    commentSyntaxes: [{ linePrefix: "%", isDocSyntax: false }],
    docStringDelimiters: ["%{"],
  },
  haskell: {
    extensions: [".hs", ".lhs"],
    commentSyntaxes: [
      { linePrefix: "--", isDocSyntax: true },
      { blockStart: "{-", blockEnd: "-}", isDocSyntax: true },
    ],
  },
  perl: {
    extensions: [".pl", ".pm", ".t"],
    commentSyntaxes: [{ linePrefix: "#", isDocSyntax: false }],
  },
  lisp: {
    extensions: [".lisp", ".cl", ".el"],
    commentSyntaxes: [{ linePrefix: ";", isDocSyntax: false }],
  },
  pascal: {
    extensions: [".pas", ".pp", ".inc"],
    commentSyntaxes: [
      { blockStart: "(*", blockEnd: "*)", isDocSyntax: false },
      { linePrefix: "//", isDocSyntax: false },
    ],
  },
  prolog: {
    extensions: [".pl", ".pro"],
    commentSyntaxes: [{ linePrefix: "%", isDocSyntax: false }],
  },
  ocaml: {
    extensions: [".ml", ".mli"],
    commentSyntaxes: [{ blockStart: "(*", blockEnd: "*)", isDocSyntax: false }],
  },
  applescript: {
    extensions: [".applescript", ".scpt"],
    commentSyntaxes: [
      { blockStart: "(*", blockEnd: "*)", isDocSyntax: false },
      { linePrefix: "--", isDocSyntax: false },
    ],
  },
  sql: {
    extensions: [".sql"],
    commentSyntaxes: [
      { linePrefix: "--", isDocSyntax: false },
      { blockStart: "/*", blockEnd: "*/", isDocSyntax: false },
    ],
  },
};

/**
 * Detect the language config for a file based on its extension.
 */
export function detectLanguage(filePath: string): LanguageConfig | null {
  const ext = extname(filePath).toLowerCase();
  for (const config of Object.values(languageConfigs)) {
    if (config.extensions.includes(ext)) return config;
  }
  return null;
}

/**
 * Extract documentation comment blocks from source code text.
 * Recognizes both line-style doc comments (e.g. `///`, `//!`) and block
 * doc comments (e.g. slash-star-star ... star-slash).
 */
export function extractCommentBlocks(source: string, config: LanguageConfig): CommentBlock[] {
  const blocks: CommentBlock[] = [];
  const lines = source.split(/\r?\n/);

  // Single-line doc-comment prefixes (e.g. "///", "//!", "--!")
  const docLinePrefixes = config.commentSyntaxes
    .filter((s) => s.isDocSyntax && s.linePrefix)
    .map((s) => s.linePrefix!);

  // Block doc-comment delimiters (e.g. "/**", "--[[")
  const blockSyntaxes = config.commentSyntaxes.filter((s) => s.isDocSyntax && s.blockStart);

  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!.trim();

    // Block comment
    const blockMatch = blockSyntaxes.find((s) => line.startsWith(s.blockStart!));
    if (blockMatch) {
      const startLine = i + 1;
      const collected: string[] = [line.slice(blockMatch.blockStart!.length)];
      if (blockMatch.blockEnd && line.includes(blockMatch.blockEnd, blockMatch.blockStart!.length)) {
        const endIdx = line.indexOf(blockMatch.blockEnd, blockMatch.blockStart!.length);
        blocks.push({
          text: collected.join("\n").slice(0, endIdx - blockMatch.blockStart!.length).trim(),
          line: startLine,
        });
        i++;
        continue;
      }
      i++;
      let closed = false;
      while (i < lines.length) {
        const raw = lines[i]!;
        if (blockMatch.blockEnd && raw.includes(blockMatch.blockEnd)) {
          collected.push(raw.slice(0, raw.indexOf(blockMatch.blockEnd)));
          closed = true;
          i++;
          break;
        }
        collected.push(raw);
        i++;
      }
      const text = stripCommentDecoration(collected.join("\n"), blockMatch);
      blocks.push({ text, line: startLine });
      if (!closed) break;
      continue;
    }

    // Line-style doc comments: gather consecutive prefixed lines
    const prefix = docLinePrefixes.find((p) => line.startsWith(p));
    if (prefix) {
      const startLine = i + 1;
      const collected: string[] = [];
      while (i < lines.length) {
        const raw = lines[i]!.trim();
        if (raw.startsWith(prefix)) {
          collected.push(raw.slice(prefix.length).replace(/^\s?/, ""));
          i++;
        } else {
          break;
        }
      }
      blocks.push({ text: collected.join("\n").trim(), line: startLine });
      continue;
    }

    i++;
  }

  return blocks;
}

/**
 * Remove common per-line decoration (leading `*`, `--`, etc.) from block text.
 */
function stripCommentDecoration(text: string, syntax: CommentSyntax): string {
  if (!syntax.blockStart || !syntax.blockEnd) return text.trim();
  const lines = text.split(/\r?\n/);
  const cleaned = lines.map((l) => {
    const t = l.trim();
    if (t.startsWith("*")) return t.replace(/^\*\s?/, "");
    return t;
  });
  return cleaned.join("\n").trim();
}

/**
 * Parse a documentation comment block into summary, description, and tags.
 * Recognizes tag lines such as `@param name description`, `@returns text`.
 */
export function parseDocBlock(text: string): ParsedDocBlock {
  const tags: DocTag[] = [];
  const lines = text.split(/\r?\n/);
  const prose: string[] = [];

  for (const line of lines) {
    const tagMatch = line.match(/^\s*@([a-zA-Z]+)\s*(.*)$/);
    if (tagMatch) {
      tags.push({ name: tagMatch[1]!.toLowerCase(), value: tagMatch[2]?.trim() || undefined });
    } else {
      prose.push(line);
    }
  }

  const proseText = prose.join("\n").trim();
  const firstBlank = proseText.indexOf("\n\n");
  let summary: string | undefined;
  let description: string | undefined;
  if (firstBlank >= 0) {
    summary = proseText.slice(0, firstBlank).trim();
    description = proseText.slice(firstBlank + 2).trim();
  } else {
    summary = proseText || undefined;
  }

  return { summary, description, tags };
}

/**
 * Heuristically detect a declaration following a doc comment block.
 * Supports a handful of common keywords across languages.
 */
function detectTargetLine(nextLine: string): { name: string; kind: "function" | "class" | "variable" } | null {
  const trimmed = nextLine.trim();
  if (!trimmed) return null;

  const fnMatch = trimmed.match(/(?:func|function|def|fn|sub|procedure|method)\s+([A-Za-z_][A-Za-z0-9_]*)/);
  if (fnMatch) return { name: fnMatch[1]!, kind: "function" };

  const clsMatch = trimmed.match(/(?:class|struct|record|object|module)\s+([A-Za-z_][A-Za-z0-9_]*)/);
  if (clsMatch) return { name: clsMatch[1]!, kind: "class" };

  const varMatch = trimmed.match(/(?:var|let|const|val|global|variable)\s+([A-Za-z_][A-Za-z0-9_]*)/);
  if (varMatch) return { name: varMatch[1]!, kind: "variable" };

  return null;
}

/**
 * Convert parsed comment blocks into astro-polyglot AST modules.
 * Each doc block is attached to the nearest following declaration.
 */
export function naturalDocsToAST(source: string, config: LanguageConfig, fileName?: string): ASTModule[] {
  const blocks = extractCommentBlocks(source, config);
  const lines = source.split(/\r?\n/);

  const functions: ASTFunction[] = [];
  const classes: ASTClass[] = [];

  for (const block of blocks) {
    const parsed = parseDocBlock(block.text);
    const targetLine = lines[block.line] ?? "";
    const target = detectTargetLine(targetLine);

    const docstring = [parsed.summary, parsed.description].filter(Boolean).join("\n\n") || undefined;
    const params = parsed.tags
      .filter((t) => t.name === "param")
      .map((t) => ({ name: t.value?.split("\\s")[0] ?? "param", description: t.body ?? t.value }));
    const returnType = parsed.tags.find((t) => t.name === "returns")?.value;

    if (target?.kind === "class") {
      classes.push({ name: target.name, docstring, methods: [], properties: [] });
    } else if (target?.kind === "function") {
      functions.push({
        name: target.name,
        docstring,
        parameters: params.length > 0 ? params : undefined,
        ...(returnType ? { return_type: returnType } : {}),
      });
    } else {
      // Untargeted doc block → attach as a free function named after the file/section.
      const fallbackName = parsed.tags.find((t) => t.name === "module")?.value ?? fileName ?? "module";
      functions.push({
        name: fallbackName.replace(/\W/g, "_"),
        docstring,
        parameters: params.length > 0 ? params : undefined,
        ...(returnType ? { return_type: returnType } : {}),
      });
    }
  }

  if (classes.length === 0 && functions.length === 0) return [];

  const moduleName = fileName ? fileName.replace(/\W/g, "_") : "fallback";
  return [
    {
      name: moduleName,
      docstring: undefined,
      ...(classes.length > 0 ? { classes } : {}),
      ...(functions.length > 0 ? { functions } : {}),
    },
  ];
}

/**
 * Parse a single source file into AST modules using the language-agnostic fallback.
 */
export function parseFile(filePath: string): ASTModule[] {
  const config = detectLanguage(filePath);
  if (!config) return [];
  if (!existsSync(filePath)) return [];
  const source = readFileSync(filePath, "utf-8");
  const baseName = filePath.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, "");
  return naturalDocsToAST(source, config, baseName);
}

/**
 * Recursively parse all source files in a directory using the fallback parser.
 */
export function parseDirectory(dirPath: string): ASTModule[] {
  const modules: ASTModule[] = [];
  const resolved = resolve(dirPath);
  if (!existsSync(resolved)) return modules;

  const walk = (dir: string): void => {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      if (entry === "node_modules" || entry === "dist" || entry.startsWith(".")) continue;
      const fullPath = join(dir, entry);
      const st = statSync(fullPath);
      if (st.isDirectory()) {
        walk(fullPath);
      } else if (st.isFile()) {
        modules.push(...parseFile(fullPath));
      }
    }
  };

  walk(resolved);
  return modules;
}
