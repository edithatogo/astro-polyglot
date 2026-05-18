import type { StarlightPlugin } from '@astrojs/starlight/types';
import type { Handler as HandlerContract, HandlerOptions, Language } from './handler';

/**
 * Re-export the canonical handler types so consumers can import everything
 * from a single path.
 */
export type { Handler as HandlerContract, HandlerOptions, Language } from './handler';

/**
 * A symbol-based key used to identify the placeholder sidebar group.
 */
export interface SidebarGroup {
  _key: symbol;
  label: string;
  items: SidebarItem[];
}

export interface SidebarItem {
  label?: string;
  link?: string;
  items?: SidebarItem[];
  autogenerate?: { directory: string };
}

/**
 * Returns a placeholder sidebar group that the plugin replaces during config:setup.
 * This allows other plugins to reference the polyglot sidebar group.
 */
export function getSidebarGroupPlaceholder(key?: symbol): SidebarGroup {
  return {
    _key: key ?? Symbol('starlight-polyglot'),
    label: 'API',
    items: [],
  };
}

/**
 * Unified frontmatter schema for all generated MDX pages.
 */
export interface MDXFrontmatter {
  title: string;
  description?: string;
  sidebar: {
    label: string;
    order?: number;
  };
  pagefind?: boolean;
  /** The language this page documents */
  language?: string;
  /** The source module path */
  source?: string;
}

/**
 * Output from a single handler
 */
export interface HandlerOutput {
  pages: HandlerPage[];
  sidebar: SidebarGroup;
}

export interface HandlerPage {
  /** Relative path within output directory, e.g. "python/io.mdx" */
  path: string;
  frontmatter: MDXFrontmatter;
  body: string;
}

/**
 * Standardized options passed to every handler.
 * Each language handler may extend this with language-specific options.
 *
 * @deprecated Use `HandlerOptions` from `./handler` instead.
 *   This alias exists for backward compatibility with existing handler implementations.
 */
export interface BaseHandlerOptions extends HandlerOptions {
  /** Output subdirectory under src/content/docs/, e.g. "api/python" */
  output: string;
  /** Whether pagination links should be included */
  pagination?: boolean;
  /** Whether to watch for changes */
  watch?: boolean;
}

/**
 * Handler interface contract.
 * Every language handler MUST implement this interface.
 *
 * @deprecated Use `HandlerContract` from `./handler` instead.
 *   This type alias is maintained for backward compatibility.
 */
export interface Handler {
  name: string;
  generate(options: BaseHandlerOptions & Record<string, unknown>): Promise<HandlerOutput>;
  validate?(sourcePath: string): Promise<{ valid: boolean; errors: string[] }>;
}
