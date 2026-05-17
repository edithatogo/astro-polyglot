/**
 * starlight-polyglot — Handler Interface
 *
 * Defines the contract that every language handler must implement.
 * Handlers are responsible for extracting API documentation from
 * a language's source code and producing Starlight-compatible MDX output.
 *
 * @module core/handler
 */

/**
 * Supported programming languages.
 */
export type Language =
  | 'python'
  | 'typescript'
  | 'rust'
  | 'r'
  | 'julia'
  | 'csharp'
  | 'go'
  | 'java'
  | 'kotlin'
  | 'cpp'
  | 'swift';

/**
 * A single MDX output page produced by a handler.
 */
export interface MDXOutput {
  /** Raw MDX content (frontmatter + body) */
  content: string;
  /** Parsed frontmatter metadata */
  frontmatter: Record<string, unknown>;
  /** Relative output path under the Starlight content directory, e.g. "api/python/io.mdx" */
  outputPath: string;
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
 * discoverable and executable by the starlight-polyglot plugin.
 */
export interface Handler {
  /** Language identifier matching the Language union type */
  name: Language;
  /**
   * Generate MDX documentation pages from source code.
   *
   * @param options - Handler-specific configuration and output settings
   * @returns An array of MDXOutput pages ready for writing to disk
   */
  generate(options: HandlerOptions): Promise<MDXOutput[]>;
  /**
   * Optional pre-flight validation to check that the handler's
   * runtime environment (e.g., CLI tools, SDKs) is available.
   *
   * @param sourcePath - Path to the source code or project root
   * @returns Validation result indicating any issues
   */
  validate?(sourcePath: string): Promise<ValidationResult>;
}
