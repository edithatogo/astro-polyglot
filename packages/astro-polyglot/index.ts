import { randomBytes } from "node:crypto";
import type { StarlightPlugin } from "@astrojs/starlight/types";
import type { HandlerAggregateOutput } from "./core/handler";
import { getSidebarGroupPlaceholder, type SidebarGroup } from "./core/plugin";
import { type PolyglotConfig, resolveHandlers } from "./core/router";

// ─── Canonical type re-exports ───────────────────────────────────────
export type {
  Handler,
  HandlerAggregateOutput,
  HandlerOptions,
  HandlerPage,
  Language,
  MDXOutput as HandlerMDXOutput,
  SidebarItem,
  ValidationResult,
} from "./core/handler";
export type {
  BaseHandlerOptions,
  HandlerOutput,
  HandlerPage as PluginHandlerPage,
  MDXFrontmatter,
  SidebarGroup,
} from "./core/plugin";
export type { PolyglotConfig } from "./core/router";
export { polyglotLoader, type PolyglotLoaderOptions } from "./core/loader";
export { VERSION } from "./core/version";

// ─── Plugin entry point ──────────────────────────────────────────────

export const sidebarGroup = getSidebarGroupPlaceholder();

export default function polyglot(options: PolyglotConfig): StarlightPlugin {
  return makePolyglotPlugin(sidebarGroup)(options);
}

export function createPolyglotPlugin(): [plugin: typeof polyglot, group: SidebarGroup] {
  const group = getSidebarGroupPlaceholder(Symbol(randomBytes(24).toString("base64url")));
  return [makePolyglotPlugin(group), group];
}

function makePolyglotPlugin(sidebarGroup: SidebarGroup) {
  return function polyglotPlugin(options: PolyglotConfig): StarlightPlugin {
    return {
      name: "astro-polyglot",
      hooks: {
        async "config:setup"({ command, config, logger, updateConfig }) {
          if (command === "preview") return;

          const handlers = resolveHandlers(options, logger);
          const outputs: HandlerAggregateOutput[] = [];

          for (const handler of handlers) {
            try {
              logger.info(`[astro-polyglot] Generating ${handler.name} documentation...`);
              const handlerOptions = handler.options as Parameters<typeof handler.handler.generate>[0];
              const output = await handler.handler.generate(handlerOptions);
              outputs.push(output);
              logger.info(`[astro-polyglot] ✓ ${handler.name}: ${output.pages.length} pages generated`);
            } catch (error) {
              logger.error(`[astro-polyglot] ✗ ${handler.name}: ${(error as Error).message}`);
              throw error;
            }
          }
          // Merge sidebars from all handlers
          updateConfig({
            sidebar: mergeSidebars(config.sidebar, sidebarGroup, outputs) as any,
          });
        },
      },
    };
  };
}

function mergeSidebars(existingSidebar: unknown, group: SidebarGroup, outputs: HandlerAggregateOutput[]): unknown[] {
  const sidebar = Array.isArray(existingSidebar) ? [...existingSidebar] : [];
  const apiGroups = outputs.filter((o) => o.sidebar).map((o) => o.sidebar);

  if (apiGroups.length > 0) {
    // Replace placeholder or append
    const placeholderIndex = sidebar.findIndex(
      (item: unknown) =>
        typeof item === "object" && item !== null && (item as Record<string, unknown>)._key === group._key,
    );
    if (placeholderIndex >= 0) {
      sidebar[placeholderIndex] = apiGroups.length === 1 ? apiGroups[0] : { label: "API", items: apiGroups };
    } else {
      sidebar.push(apiGroups.length === 1 ? apiGroups[0] : { label: "API", items: apiGroups });
    }
  }

  return sidebar;
}
