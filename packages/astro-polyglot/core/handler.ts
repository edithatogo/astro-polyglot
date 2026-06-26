/**
 * astro-polyglot — Handler Interface
 *
 * Defines the contract that every language handler must implement.
 * Handlers are responsible for extracting API documentation from
 * a language's source code and producing Astro-compatible MDX output
 * (renderable in Starlight, blog themes, or any Astro theme).
 *
 * @module core/handler
 */

/**
 * Supported programming languages.
 */
export type Language =
  | "python"
  | "typescript"
  | "rust"
  | "r"
  | "julia"
  | "csharp"
  | "go"
  | "java"
  | "kotlin"
  | "cpp"
  | "swift"
  | "stata"
  | "sas"
  | "scala"
  | "ruby"
  | "dart"
  | "php"
  | "elixir"
  // Phase 3 languages
  | "c"
  | "objc"
  | "ada"
  | "fortran"
  | "pascal"
  | "cobol"
  | "vhdl"
  | "verilog"
  | "tcl"
  | "idl"
  | "lex"
  | "yacc"
  | "vbnet"
  | "fsharp"
  | "javascript"
  | "powershell";

/**
 * A single MDX output page produced by a handler, used internally
 * when writing files to disk. This is the per-page representation.
 */
export interface MDXOutput {
  /** Raw MDX content (frontmatter + body) */
  content: string;
  /** Parsed frontmatter metadata */
  frontmatter: Record<string, unknown>;
  /** Relative output path under the content directory, e.g. "api/python/io.mdx" */
  outputPath: string;
}

/**
 * A sidebar item linking to a generated page.
 */
export interface SidebarItem {
  label: string;
  link: string;
}

/**
 * A handler page with minimal frontmatter properties needed for
 * sidebar integration. The full MDX frontmatter is generated
 * during the MDX writing phase.
 */
export interface HandlerPage {
  path: string;
  frontmatter: Record<string, unknown>;
  body: string;
}

/**
 * Aggregate output from a handler, containing pages and sidebar.
 * This is what handlers actually return (from transformToMDX).
 * The pages array contains per-page data, and the sidebar
 * provides navigation structure for Starlight.
 */
export interface HandlerAggregateOutput {
  pages: HandlerPage[];
  sidebar: { label: string; items: SidebarItem[] };
}

/**
 * Options passed to a handler's `generate()` method.
 * Each language handler may extend this with language-specific options.
 */
export interface HandlerOptions {
  /** Output subdirectory under src/content/docs/, e.g. "api/python" */
  output: string;
  /** Whether to include pagination links between pages */
  pagination?: boolean;
  /** Whether to watch source files for changes */
  watch?: boolean;
  /** Arbitrary additional options forwarded from user configuration */
  [key: string]: unknown;
}

/**
 * Result of an optional handler validation step.
 */
export interface ValidationResult {
  /** Whether the handler's environment/preconditions are satisfied */
  valid: boolean;
  /** Human-readable error messages describing what's missing */
  errors: string[];
}

/**
 * Handler contract.
 *
 * Every language handler MUST implement this interface to be
 * discoverable and executable by the astro-polyglot plugin.
 */
export interface Handler {
  /** Language identifier matching the Language union type */
  name: Language;
  /**
   * Generate MDX documentation pages from source code.
   *
   * @param options - Handler-specific configuration and output settings
   * @returns Aggregate output with pages array and sidebar configuration
   */
  generate(options: HandlerOptions): Promise<HandlerAggregateOutput>;
  /**
   * Optional pre-flight validation to check that the handler's
   * runtime environment (e.g., CLI tools, SDKs) is available.
   *
   * @param sourcePath - Path to the source code or project root
   * @returns Validation result indicating any issues
   */
  validate?(sourcePath: string): Promise<ValidationResult>;
}
