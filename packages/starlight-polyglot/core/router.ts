import type { Language, Handler } from './handler';

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
    logger.warn('[starlight-polyglot] No handlers configured. Add at least one language to your polyglot config.');
  }

  return handlers;
}

/**
 * Returns the map of language → handler instances.
 * Handlers are lazy-loaded (imported) to avoid unnecessary startup cost.
 */
function getHandlerMap(): Partial<Record<Language, Handler>> {
  // Handlers are imported dynamically so optional dependencies
  // (like typedoc) don't break users who only need Python/R/etc.
  return {
    // Phase 1 handlers — registered at build time
    python: lazyHandler('python'),
    typescript: lazyHandler('typescript'),
    rust: lazyHandler('rust'),
    r: lazyHandler('r'),
    julia: lazyHandler('julia'),
    csharp: lazyHandler('csharp'),
    go: lazyHandler('go'),
    // Phase 2 handlers — Java ecosystem, C++, Swift
    java: lazyHandler('java'),
    kotlin: lazyHandler('kotlin'),
    cpp: lazyHandler('cpp'),
    swift: lazyHandler('swift'),
    // Phase 3 handlers — Data science & scripting
    stata: lazyHandler('stata'),
    sas: lazyHandler('sas'),
    // Phase 4 handlers — JVM/CLR ecosystem
    scala: lazyHandler('scala'),
    // Phase 5 handlers — Dynamic & functional languages
    ruby: lazyHandler('ruby'),
    dart: lazyHandler('dart'),
    php: lazyHandler('php'),
    elixir: lazyHandler('elixir'),
  };
}

function lazyHandler(name: Language): Handler {
  return {
    name,
    async generate(options) {
      // Dynamic import defers loading of handler-specific dependencies.
      // Each handler exports a named export in the pattern: { pythonHandler, typescriptHandler, ... }
      const mod = await import(`../handlers/${name}.js`);
      const handlerName = `${name}Handler` as keyof typeof mod;
      const handler = mod[handlerName] as Handler | undefined;
      if (!handler) {
        throw new Error(
          `Handler "${String(handlerName)}" not found in module "../handlers/${name}.js". ` +
            `Ensure the module exports a named export called "${String(handlerName)}".`,
        );
      }
      if (typeof handler.generate !== 'function') {
        throw new Error(
          `Handler "${String(handlerName)}" does not have a "generate" method.`,
        );
      }
      return handler.generate(options);
    },
  };
}
