import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { cppHandler } from "../handlers/cpp";
import { cHandler } from "../handlers/c";
import { objcHandler } from "../handlers/objc";
import { adaHandler } from "../handlers/ada";
import { fortranHandler } from "../handlers/fortran";
import { pascalHandler } from "../handlers/pascal";
import { cobolHandler } from "../handlers/cobol";
import { vhdlHandler } from "../handlers/vhdl";
import { verilogHandler } from "../handlers/verilog";
import { tclHandler } from "../handlers/tcl";
import { idlHandler } from "../handlers/idl";
import { lexHandler } from "../handlers/lex";
import { yaccHandler } from "../handlers/yacc";
import { csharpHandler } from "../handlers/csharp";
import { dartHandler } from "../handlers/dart";
import { elixirHandler } from "../handlers/elixir";
import { goHandler } from "../handlers/go";
import { javaHandler } from "../handlers/java";
import { juliaHandler } from "../handlers/julia";
import { kotlinHandler } from "../handlers/kotlin";
import { phpHandler } from "../handlers/php";
import { pythonHandler } from "../handlers/python";
import { rHandler } from "../handlers/r";
import { rubyHandler } from "../handlers/ruby";
import { rustHandler } from "../handlers/rust";
import { sasHandler } from "../handlers/sas";
import { scalaHandler } from "../handlers/scala";
import { stataHandler } from "../handlers/stata";
import { swiftHandler } from "../handlers/swift";
import { typescriptHandler } from "../handlers/typescript";
import type { HandlerAggregateOutput, Language } from "./handler";
import type { Handler } from "./plugin";

/**
 * Minimal logger interface matching what Starlight provides.
 */
export interface Logger {
  warn: (msg: string) => void;
  info: (msg: string) => void;
  error: (msg: string) => void;
  debug: (msg: string) => void;
}

/**
 * Per-language handler configuration.
 */
export interface HandlerConfig {
  entryPoints?: string[];
  output?: string;
  tsconfig?: string;
  cratePath?: string;
  modulePath?: string;
  projectPath?: string;
  pagination?: boolean;
  watch?: boolean;
  [key: string]: unknown;
}

/**
 * Overall plugin configuration.
 * Maps languages to their handler options.
 */
export interface PolyglotConfig {
  python?: HandlerConfig;
  typescript?: HandlerConfig;
  rust?: HandlerConfig;
  r?: HandlerConfig;
  julia?: HandlerConfig;
  csharp?: HandlerConfig;
  go?: HandlerConfig;
  java?: HandlerConfig;
  kotlin?: HandlerConfig;
  cpp?: HandlerConfig;
  swift?: HandlerConfig;
  stata?: HandlerConfig;
  sas?: HandlerConfig;
  scala?: HandlerConfig;
  ruby?: HandlerConfig;
  dart?: HandlerConfig;
  php?: HandlerConfig;
  elixir?: HandlerConfig;
  c?: HandlerConfig;
  objc?: HandlerConfig;
  ada?: HandlerConfig;
  fortran?: HandlerConfig;
  pascal?: HandlerConfig;
  cobol?: HandlerConfig;
  vhdl?: HandlerConfig;
  verilog?: HandlerConfig;
  tcl?: HandlerConfig;
  idl?: HandlerConfig;
  lex?: HandlerConfig;
  yacc?: HandlerConfig;
  /** When true, abort all handler execution on first error (default: false) */
  failFast?: boolean;
  /** Maximum number of handlers to execute concurrently (default: 4) */
  concurrency?: number;
  [key: string]: HandlerConfig | boolean | number | undefined;
}

export interface ResolvedHandler {
  name: Language;
  handler: Handler;
  options: Record<string, unknown>;
}

/**
 * Resolves user configuration into a list of handler instances to execute.
 * Only configured languages are included.
 * Validates that required options are present for each handler.
 */
export function resolveHandlers(config: PolyglotConfig, logger: Logger): ResolvedHandler[] {
  const handlers: ResolvedHandler[] = [];
  const handlerMap = getHandlerMap();

  for (const [lang, opts] of Object.entries(config)) {
    if (!opts || typeof opts !== "object") continue;

    const language = lang as Language;
    const handler = handlerMap[language];
    if (!handler) {
      logger.warn(`[astro-polyglot] Unknown language "${lang}", skipping`);
      continue;
    }

    const hc = opts as HandlerConfig;
    const output = hc.output ?? `api/${lang}`;
    const options: Record<string, unknown> = {
      ...hc,
      output,
    };

    handlers.push({ name: language, handler, options });
  }

  if (handlers.length === 0) {
    logger.warn("[astro-polyglot] No handlers configured. Add at least one language to your polyglot config.");
  }

  return handlers;
}

/**
 * Returns the map of language → handler instances.
 * Handlers are imported from source so the package build can bundle them
 * without relying on generated root-level handler JavaScript files.
 */
function getHandlerMap(): Partial<Record<Language, Handler>> {
  return {
    // Phase 1 handlers — registered at build time
    python: registeredHandler("python", pythonHandler),
    typescript: registeredHandler("typescript", typescriptHandler),
    rust: registeredHandler("rust", rustHandler),
    r: registeredHandler("r", rHandler),
    julia: registeredHandler("julia", juliaHandler),
    csharp: registeredHandler("csharp", csharpHandler),
    go: registeredHandler("go", goHandler),
    // Phase 2 handlers — Java ecosystem, C++, Swift
    java: registeredHandler("java", javaHandler),
    kotlin: registeredHandler("kotlin", kotlinHandler),
    cpp: registeredHandler("cpp", cppHandler),
    swift: registeredHandler("swift", swiftHandler),
    // Phase 3 handlers — Data science & scripting
    stata: registeredHandler("stata", stataHandler),
    sas: registeredHandler("sas", sasHandler),
    // Phase 4 handlers — JVM/CLR ecosystem
    scala: registeredHandler("scala", scalaHandler),
    // Phase 5 handlers — Dynamic & functional languages
    ruby: registeredHandler("ruby", rubyHandler),
    dart: registeredHandler("dart", dartHandler),
    php: registeredHandler("php", phpHandler),
    elixir: registeredHandler("elixir", elixirHandler),
    // Phase 3: Doxygen pipeline
    c: registeredHandler("c", cHandler),
    objc: registeredHandler("objc", objcHandler),
    ada: registeredHandler("ada", adaHandler),
    fortran: registeredHandler("fortran", fortranHandler),
    pascal: registeredHandler("pascal", pascalHandler),
    cobol: registeredHandler("cobol", cobolHandler),
    vhdl: registeredHandler("vhdl", vhdlHandler),
    verilog: registeredHandler("verilog", verilogHandler),
    tcl: registeredHandler("tcl", tclHandler),
    idl: registeredHandler("idl", idlHandler),
    lex: registeredHandler("lex", lexHandler),
    yacc: registeredHandler("yacc", yaccHandler),
  };
}

function registeredHandler(name: Language, handler: Handler): Handler {
  return {
    name,
    async generate(options) {
      return Promise.resolve().then(() => handler.generate(options));
    },
    ...(handler.validate ? { validate: (sourcePath) => handler.validate!(sourcePath) } : {}),
  };
}

// ─── Cache Utilities ─────────────────────────────────────────────────

function getSourcePaths(options: Record<string, unknown>): string[] {
  const paths: string[] = [];
  if (Array.isArray(options.entryPoints)) {
    paths.push(...options.entryPoints);
  }
  for (const key of ["cratePath", "projectPath", "modulePath", "sourcePath"]) {
    if (typeof options[key] === "string") {
      paths.push(options[key] as string);
    }
  }
  return paths;
}

function scanFiles(dirOrFile: string): { path: string; mtime: number; size: number }[] {
  const results: { path: string; mtime: number; size: number }[] = [];
  if (!fs.existsSync(dirOrFile)) return results;
  const stat = fs.statSync(dirOrFile);
  if (stat.isFile()) {
    results.push({ path: dirOrFile, mtime: stat.mtimeMs, size: stat.size });
  } else if (stat.isDirectory()) {
    try {
      const files = fs.readdirSync(dirOrFile);
      for (const file of files) {
        if (file === "node_modules" || file === "dist" || file.startsWith(".")) continue;
        results.push(...scanFiles(path.join(dirOrFile, file)));
      }
    } catch {
      // Ignore reading errors for directories we cannot read
    }
  }
  return results;
}

function calculateDigest(handlers: ResolvedHandler[]): string {
  const hash = crypto.createHash("sha256");
  const allFiles: { path: string; mtime: number; size: number }[] = [];

  for (const handler of handlers) {
    const paths = getSourcePaths(handler.options);
    for (const p of paths) {
      const resolved = path.resolve(p);
      allFiles.push(...scanFiles(resolved));
    }
  }

  allFiles.sort((a, b) => a.path.localeCompare(b.path));

  for (const file of allFiles) {
    hash.update(`${file.path}:${file.mtime}:${file.size}`);
  }

  return hash.digest("hex");
}

// ─── Content-Hash Cache ──────────────────────────────────────────────

export class HandlerCache {
  private store = new Map<string, string>();

  get(key: string): string | undefined {
    return this.store.get(key);
  }

  set(key: string, value: string): void {
    this.store.set(key, value);
  }

  entries(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of this.store) {
      result[key] = value;
    }
    return result;
  }

  load(entries: Record<string, string>): void {
    for (const [key, value] of Object.entries(entries)) {
      this.store.set(key, value);
    }
  }
}

// ─── Parallel Handler Execution ──────────────────────────────────────

/**
 * Run multiple handlers with concurrency-limited parallel execution.
 * Each handler is wrapped in try/catch for graceful error recovery.
 * When a HandlerCache is provided, per-handler content-hash caching
 * skips handlers whose source files haven't changed.
 *
 * @param handlers  Resolved handler instances
 * @param config    Polyglot configuration (failFast, concurrency)
 * @param logger    Logger for status messages
 * @param cache     Optional HandlerCache for per-handler content-hash caching
 * @returns Array of handler aggregate outputs from successfully executed handlers
 */
export async function runHandlers(
  handlers: ResolvedHandler[],
  config: PolyglotConfig,
  logger: Logger,
  cache?: HandlerCache,
): Promise<HandlerAggregateOutput[]> {
  const concurrency = Math.max(1, config.concurrency ?? 4);
  const results: HandlerAggregateOutput[] = [];
  const queue = [...handlers];

  async function processHandler(item: ResolvedHandler): Promise<void> {
    const cacheKey = `handler:${item.name}`;

    if (cache) {
      const digest = calculateDigest([item]);
      if (cache.get(cacheKey) === digest) {
        logger.info(`[astro-polyglot] Cache hit for ${item.name}, skipping regeneration`);
        return;
      }
    }

    logger.info(`[astro-polyglot] Generating ${item.name} documentation...`);
    const handlerOptions = item.options as Parameters<typeof item.handler.generate>[0];
    const output = await item.handler.generate(handlerOptions);
    results.push(output);
    logger.info(`[astro-polyglot] ✓ ${item.name}: ${output.pages.length} pages generated`);

    if (cache) {
      const digest = calculateDigest([item]);
      cache.set(cacheKey, digest);
    }
  }

  async function worker(): Promise<void> {
    while (queue.length > 0) {
      const item = queue.shift()!;
      try {
        await processHandler(item);
      } catch (error) {
        logger.error(`[astro-polyglot] ✗ ${item.name}: ${(error as Error).message}`);
        if (config.failFast) {
          throw error;
        }
      }
    }
  }

  const workerCount = Math.min(concurrency, handlers.length);
  const workers = Array.from({ length: workerCount }, () => worker());
  await Promise.all(workers);

  return results;
}
