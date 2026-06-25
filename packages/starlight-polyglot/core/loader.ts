import type { Loader, LoaderContext } from "astro/loaders";
import { z } from "astro/zod";
import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";
import { resolveHandlers, type PolyglotConfig, type ResolvedHandler } from "./router";
import type { HandlerAggregateOutput } from "./handler";

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

function getSourcePaths(options: Record<string, any>): string[] {
  const paths: string[] = [];
  if (Array.isArray(options.entryPoints)) {
    paths.push(...options.entryPoints);
  }
  for (const key of ["cratePath", "projectPath", "modulePath", "sourcePath"]) {
    if (typeof options[key] === "string") {
      paths.push(options[key]);
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

  // Sort by path to ensure deterministic hashing
  allFiles.sort((a, b) => a.path.localeCompare(b.path));

  for (const file of allFiles) {
    hash.update(`${file.path}:${file.mtime}:${file.size}`);
  }

  return hash.digest("hex");
}

export function polyglotLoader(options: PolyglotLoaderOptions): Loader {
  return {
    name: "polyglot-loader",
    schema: polyglotDocSchema,
    async load(context: LoaderContext): Promise<void> {
      const { store, logger } = context;
      const handlers = resolveHandlers(options, logger);

      // Check caching
      const currentDigest = calculateDigest(handlers);
      const previousDigest = context.meta.get("digest");
      if (previousDigest === currentDigest) {
        logger.info("[polyglot-loader] Cache hit: no source changes detected.");
        return;
      }

      const outputs: HandlerAggregateOutput[] = [];

      for (const handler of handlers) {
        try {
          logger.info(`[polyglot-loader] Generating ${handler.name} documentation...`);
          const handlerOptions = handler.options as Parameters<typeof handler.handler.generate>[0];
          const output = await handler.handler.generate(handlerOptions);
          outputs.push(output);
          logger.info(`[polyglot-loader] ✓ ${handler.name}: ${output.pages.length} pages generated`);
        } catch (error) {
          logger.error(`[polyglot-loader] ✗ ${handler.name}: ${(error as Error).message}`);
          throw error;
        }
      }

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

      // Save digest to cache
      context.meta.set("digest", currentDigest);

      // Set up development watch mode
      const watcherRegistered = context.meta.get("watcherRegistered");
      if (!watcherRegistered && context.watcher) {
        const watchPaths: string[] = [];
        for (const handler of handlers) {
          const paths = getSourcePaths(handler.options);
          for (const p of paths) {
            watchPaths.push(path.resolve(p));
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
