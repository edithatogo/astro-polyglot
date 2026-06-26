import type { Loader, LoaderContext } from "astro/loaders";
import { z } from "astro/zod";
import * as path from "node:path";
import { resolveHandlers, runHandlers, HandlerCache, type PolyglotConfig } from "./router";

export interface PolyglotLoaderOptions extends PolyglotConfig {}

const sidebarSchema = z.object({
  label: z.string(),
  order: z.number().optional(),
});

const polyglotDocSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  sidebar: sidebarSchema,
  language: z.string().optional(),
  source: z.string().optional(),
});

/**
 * Astro Content Loader that generates documentation pages from source code
 * using configured language handlers.
 *
 * This is the primary Astro 7 API for integrating astro-polyglot into
 * content collections. It provides automatic digest-based caching,
 * parallel handler execution, and file watching for dev mode.
 *
 * @example
 * ```ts
 * // astro.config.mjs
 * import { polyglotLoader } from "astro-polyglot";
 * import { defineCollection, z } from "astro/content";
 *
 * const polyglotDocs = defineCollection({
 *   loader: polyglotLoader({
 *     python: { entryPoints: ["src/mymod"] },
 *     typescript: { entryPoints: ["src/index.ts"] },
 *   }),
 * });
 * ```
 */
export function polyglotLoader(options: PolyglotLoaderOptions): Loader {
  return {
    name: "polyglot-loader",
    schema: polyglotDocSchema,
    async load(context: LoaderContext): Promise<void> {
      const { store, logger } = context;
      const handlers = resolveHandlers(options, logger);

      const cache = new HandlerCache();
      const persisted = context.meta.get("handlerCache");
      if (persisted) {
        try {
          cache.load(JSON.parse(persisted));
        } catch {
          // Corrupted cache, start fresh
        }
      }

      const outputs = await runHandlers(handlers, options, logger, cache);

      context.meta.set("handlerCache", JSON.stringify(cache.entries()));

      store.clear();

      for (const output of outputs) {
        for (const page of output.pages) {
          // Normalize the ID by stripping .mdx or .md extension
          const id = page.path.replace(/\.mdx?$/, "");

          store.set({
            id,
            body: page.body,
            data: {
              title: page.frontmatter.title as string,
              description: page.frontmatter.description as string | undefined,
              sidebar: page.frontmatter.sidebar as { label: string; order?: number },
              language: page.frontmatter.language as string | undefined,
              source: page.frontmatter.source as string | undefined,
            },
          });
        }
      }

      // Set up development watch mode
      const watcherRegistered = context.meta.get("watcherRegistered");
      if (!watcherRegistered && context.watcher) {
        const watchPaths: string[] = [];
        for (const handler of handlers) {
          const options = handler.options;
          if (Array.isArray(options.entryPoints)) {
            for (const p of options.entryPoints) {
              watchPaths.push(path.resolve(p));
            }
          }
          for (const key of ["cratePath", "projectPath", "modulePath", "sourcePath"]) {
            if (typeof options[key] === "string") {
              watchPaths.push(path.resolve(options[key] as string));
            }
          }
        }

        context.watcher.add(watchPaths);
        context.watcher.on("change", (changedPath) => {
          if (watchPaths.some((wp) => changedPath.startsWith(wp))) {
            logger.info(`[polyglot-loader] File changed: ${changedPath}. Reloading...`);
            const ctxAny = context as any;
            if (typeof ctxAny.refresh === "function") {
              ctxAny.refresh();
            }
          }
        });

        context.meta.set("watcherRegistered", "true");
      }
    },
  };
}
