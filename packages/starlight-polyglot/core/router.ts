import { cppHandler } from "../handlers/cpp";
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
import type { Language } from "./handler";
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
  [key: string]: HandlerConfig | undefined;
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
    if (!opts) continue;

    const language = lang as Language;
    const handler = handlerMap[language];
    if (!handler) {
      logger.warn(`[starlight-polyglot] Unknown language "${lang}", skipping`);
      continue;
    }

    const output = opts.output ?? `api/${lang}`;
    const options: Record<string, unknown> = {
      ...opts,
      output,
    };

    handlers.push({ name: language, handler, options });
  }

  if (handlers.length === 0) {
    logger.warn("[starlight-polyglot] No handlers configured. Add at least one language to your polyglot config.");
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
