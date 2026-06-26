# Contributing to astro-polyglot

Thank you for your interest in contributing! This guide covers how to add new language handlers, set up your development environment, and submit changes.

## Table of Contents

- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Adding a New Language Handler](#adding-a-new-language-handler)
- [Handler Contract](#handler-contract)
- [Testing Requirements](#testing-requirements)
- [Pull Request Process](#pull-request-process)
- [Code Style](#code-style)
- [Commit Conventions](#commit-conventions)

## Development Setup

### Prerequisites

- **Node.js** >= 22.12.0
- **pnpm** >= 10.32.1

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/edithatogo/astro-polyglot.git
cd astro-polyglot

# Install dependencies
pnpm install

# Build the plugin
pnpm build

# Run tests
pnpm test

# Run linting
pnpm lint
```

### Available Scripts

| Script          | Description                                  |
|-----------------|----------------------------------------------|
| `pnpm build`    | Build all packages using tsup                |
| `pnpm dev`      | Watch mode for development                   |
| `pnpm test`     | Run Vitest test suite                        |
| `pnpm lint`     | Run ESLint with zero-warnings policy         |
| `pnpm format`   | Format code with Prettier                    |
| `pnpm typecheck`| Run TypeScript type checking                 |
| `pnpm clean`    | Remove dist/ and build artifacts             |


## Project Structure

```
astro-polyglot/
├── .changeset/                  # Changeset configuration for versioning
├── .github/
│   ├── workflows/               # CI/CD workflows
│   └── ISSUE_TEMPLATE/          # Issue templates
├── conductor/                   # Project design documents & requirements
├── docs/
│   └── astro-site/              # Starlight documentation site (dogfood)
├── packages/
│   └── astro-polyglot/      # Main plugin package
│       ├── core/                # Core plugin logic
│       │   ├── handler.ts       # Handler contract types
│       │   ├── plugin.ts        # Plugin setup & sidebar management
│       │   ├── router.ts        # Handler resolution & configuration
│       │   └── mdx-generator.ts # MDX output pipeline
│       ├── handlers/            # Language handler implementations
│       │   ├── python.ts        # Python handler (phase 1)
│       │   └── ...              # Additional handlers
│       └── scripts/             # Language-specific extractor scripts
│           └── python_extract.py # Python AST extractor
├── package.json                 # Root monorepo configuration
├── pnpm-workspace.yaml          # pnpm workspace definition
├── eslint.config.mjs            # ESLint flat configuration
├── .prettierrc                  # Prettier configuration
├── tsconfig.json                # TypeScript configuration
└── renovate.json                # Renovate dependency bot config
```


## Adding a New Language Handler

Adding support for a new programming language involves these steps:

### 1. Understand the Handler Contract

Each handler must implement the `Handler` interface defined in [`packages/astro-polyglot/core/handler.ts`](packages/astro-polyglot/core/handler.ts):

```typescript
interface Handler {
  /** Language identifier (must match the Language union type) */
  name: Language;

  /**
   * Generate MDX documentation pages from source code.
   * @param options - Handler-specific configuration and output settings
   * @returns An array of MDXOutput pages ready for writing to disk
### 2. Add the Language to the Type System

1. Add your language to the `Language` union type in `packages/astro-polyglot/core/handler.ts`:

   ```typescript
   export type Language =
     | 'python'
     | 'typescript'
     | 'rust'
     | 'r'
     | 'julia'
     | 'csharp'
     | 'go'
     | 'your-language'; // ← Add yours here
   ```

2. Add the configuration type to the `PolyglotConfig` interface in `packages/astro-polyglot/core/router.ts`:

   ```typescript
   export interface PolyglotConfig {
     python?: HandlerConfig;
     // ... existing languages ...
     'your-language'?: HandlerConfig & { /* language-specific fields */ };
   }
   ```

### 3. Create the Handler File

Create a new file in `packages/astro-polyglot/handlers/` named `<language>.ts`:

```typescript
// packages/astro-polyglot/handlers/your-language.ts

import type { Handler, HandlerOptions, MDXOutput, ValidationResult } from '../core/handler';

export interface YourLanguageOptions extends HandlerOptions {
  /** Path to source files or project configuration */
  entryPoints: string[];
  /** Optional path to tsconfig / build config */
  configFile?: string;
}

const handler: Handler = {
  name: 'your-language',

  async generate(options: YourLanguageOptions): Promise<MDXOutput[]> {
    // 1. Parse or extract documentation from source code
    // 2. Convert to the shared AST representation
    // 3. Use transformToMDX() from core/mdx-generator to produce MDX
    // 4. Return the MDXOutput array

    throw new Error('Not implemented yet');
  },

  async validate?(sourcePath: string): Promise<ValidationResult> {
    // Check that required CLI tools are available
### 4. Register the Handler in the Router

In `packages/astro-polyglot/core/router.ts`, add your handler to `getHandlerMap()`:

```typescript
function getHandlerMap(): Partial<Record<Language, Handler>> {
  return {
    // ... existing handlers ...
    'your-language': lazyHandler('your-language'),
  };
}
```

### 5. Handle Optional Dependencies

If your handler requires heavyweight npm packages (e.g., a language parser or SDK), use dynamic imports in the handler file to avoid impacting users of other languages:

```typescript
async function generate(options: YourLanguageOptions): Promise<MDXOutput[]> {
  const heavyParser = await import('heavy-parser-package');
  // Use heavyParser here
}
```

### 6. Add an Extractor Script (If Needed)

If your language requires a companion script (like `python_extract.py` for Python), add it to `packages/astro-polyglot/scripts/`. The handler should shell out to this script and parse its stdout JSON output.

### 7. Write Tests

See [Testing Requirements](#testing-requirements) below.

### 8. Update the Documentation

- Add a usage example to the Starlight docs site (`docs/astro-site/`)
- Update any relevant configuration reference pages


    // Check that source files exist
    return { valid: true, errors: [] };
  },
};

export default handler;
```

### Handler Lifecycle

Handlers go through a defined lifecycle from proposal to stable release:

| Stage | Requirements | Label |
|-------|-------------|-------|
| **Experimental** | Conformance tests pass for basic fixtures | `experimental` |
| **Beta** | Full conformance suite passes, basic unit tests | `beta` |
| **Stable** | >80% line coverage, validated against real projects, CI passes | `stable` |

See [packages/astro-polyglot/docs/handler-lifecycle.md](packages/astro-polyglot/docs/handler-lifecycle.md) for the full lifecycle process.

### Using the Scaffold Scripts

Instead of manually creating handler files, you can use the automation scripts:

```bash
# Scaffold a new handler
pnpm --filter astro-polyglot generate:handler <language>

# Register the handler in the type system and router
pnpm --filter astro-polyglot register:handler <language>

# Generate conformance test only
pnpm --filter astro-polyglot generate:conformance <language>
```

### Maturity Badges

Run the badge generator to create maturity badges for all handlers:

```bash
pnpm --filter astro-polyglot badges:maturity
```


   */
## Handler Contract

### Input: `HandlerOptions`

| Field        | Type      | Required | Description                                           |
|--------------|-----------|----------|-------------------------------------------------------|
| `output`     | `string`  | Yes      | Output subdirectory under `src/content/docs/`         |
| `pagination` | `boolean` | No       | Include pagination links between pages                |
| `watch`      | `boolean` | No       | Watch source files for changes (dev mode)             |
| `[key]`      | `unknown` | No       | Language-specific additional options                  |

### Output: `MDXOutput`

| Field          | Type                      | Description                                |
|----------------|---------------------------|--------------------------------------------|
| `content`      | `string`                  | Raw MDX content (frontmatter + body)       |
| `frontmatter`  | `Record<string, unknown>` | Parsed frontmatter metadata                |
| `outputPath`   | `string`                  | Relative output path, e.g. `api/python/io.mdx` |

### Output: Shared AST (for `transformToMDX`)

If you use the shared `transformToMDX()` pipeline from `core/mdx-generator`, your handler needs to produce `ASTModule[]`:

```typescript
interface ASTModule {
  name: string;
  docstring?: string;
  classes?: ASTClass[];
  functions?: ASTFunction[];
  variables?: ASTVariable[];
}
```

This is the **recommended approach** — it ensures consistent output formatting, sidebar generation, and frontmatter across all languages. Handlers that cannot use the shared pipeline must return raw `MDXOutput[]` directly.
## Testing Requirements

### Unit Tests

- All handlers must have unit tests covering:
  - Normal operation (valid input produces expected output)
  - Edge cases (empty modules, missing docstrings, special characters)
  - Error handling (missing source files, invalid configuration)
- Core module tests covering:
  - Handler resolution logic
  - MDX generation pipeline
  - Sidebar merging

### Coverage Threshold

- **Line coverage**: minimum **90%**
- Run coverage: `pnpm --filter astro-polyglot test -- --coverage`
- Coverage reports are generated in `packages/astro-polyglot/coverage/`

### End-to-End Tests

- E2E tests using Playwright are in `packages/astro-polyglot/tests/e2e/`
- These test the full build pipeline with a real Starlight project
- Run them with: `pnpm --filter astro-polyglot test:e2e`

### Test Fixtures

Place test fixtures (sample source code, mock configurations) in `packages/astro-polyglot/tests/fixtures/`.


### Test Fixtures

Place test fixtures (sample source code, mock configurations) in `packages/astro-polyglot/tests/fixtures/`.

### Conformance Testing

Every language handler must pass **standard conformance tests** that validate it correctly parses its target docstring standard. The `describeConformance(language, standard, fixtures)` helper in `tests/helpers/conformance.ts` provides a standardized testing pattern.

#### How `describeConformance` Works

```typescript
import { describeConformance } from "../helpers/conformance";
import path from "node:path";

describeConformance("python", "PEP-484 / Google-style", [
  path.resolve(import.meta.dirname, "fixtures", "python", "typed_module.py"),
]);
```

When invoked at the top level of a test file, `describeConformance` automatically:

1. **Loads the handler** — Imports `handlers/{language}` and extracts the `{language}Handler` export
2. **Checks toolchain availability** — Calls the handler's `validate()` method or probes for its CLI command; skips the suite if unavailable
3. **Validates fixture files** — Asserts all referenced fixture paths exist on disk
4. **Runs per-fixture generation** — Calls `handler.generate(options)` for each fixture and validates the output shape (`.pages[]`, `.sidebar`, frontmatter, body)
5. **Checks consistency** — Verifies repeated `generate()` calls return consistent output shapes

Results are reported as standard Vitest tests in the `Conformance: {standard}` describe block.

#### Adding Conformance for a New Handler

When adding a new language handler:

1. Create fixture source files in `tests/fixtures/{language}/` using the target docstring standard
2. Add a `describeConformance(...)` call in `tests/conformance.test.ts`
3. Run locally: `pnpm --filter astro-polyglot test:conformance`
4. The CI pipeline runs all conformance suites automatically via the `conformance` job

#### Supported Standard Variants by Handler

| Handler | Standard(s) | Fixture Path | Risk |
|---------|-------------|-------------|------|
| Python | Google-style, NumPy-style, Sphinx reST | `fixtures/python/` | Medium |
| TypeScript | JSDoc | `fixtures/typescript/` | Low |
| Rust | Rustdoc CommonMark | `fixtures/rust/` | Low |
| Go | Go comments | `fixtures/go/` | Low |
| Java | Javadoc | `fixtures/java/` | Low |
| Kotlin | KDoc | `fixtures/kotlin/` | Low |
| C# | .NET XML | `fixtures/csharp/` | Low |
| Swift | DocC | `fixtures/swift/` | Low |
| Julia | Base.Docs | `fixtures/julia/` | Medium |
| R | roxygen2 | `fixtures/r/` | Low |
| Scala | Scaladoc | `fixtures/scala/` | Low |
| Ruby | YARD | `fixtures/ruby/` | Low |
| Dart | dartdoc | `fixtures/dart/` | Low |
| PHP | PHPDoc | `fixtures/php/` | Low |
| Elixir | ExDoc | `fixtures/elixir/` | Low |
| Stata | .sthlp custom | `fixtures/stata/` | High |
| SAS | Macro comments | `fixtures/sas/` | High |

> **Note:** Tests automatically skip when the handler's CLI toolchain is not installed on the host. This allows CI to pass even without every language runtime, while still validating fixture structure and handler exports.


## Pull Request Process

1. **Fork and branch**: Create a feature branch from `main` named `feat/your-feature` or `fix/your-fix`.

2. **Make your changes**: Follow the [Code Style](#code-style) guidelines.

3. **Write tests**: Ensure your changes are covered by tests. Run the full test suite:

   ```bash
   pnpm test
   pnpm lint
   pnpm typecheck
   pnpm format
   ```

4. **Add a changeset**: Describe your changes for the changelog:

   ```bash
   pnpm changeset
   ```

   Choose the appropriate semver bump:
   - `patch` for bug fixes
   - `minor` for new features (new language handlers, non-breaking additions)
   - `major` for breaking changes

5. **Commit your changes**: Use [conventional commits](https://www.conventionalcommits.org/):

   ```
   feat(python): support package-level __init__ docs
   fix(router): handle missing handler gracefully
   docs: add Swift handler guide
   ```

6. **Open a pull request**: Fill out the PR template. Link any related issues.

7. **Address review feedback**: Make requested changes and push to your branch.

8. **Merge**: Once approved, a maintainer will merge your PR. The changeset will trigger a release PR.


  generate(options: HandlerOptions): Promise<MDXOutput[]>;

  /**
   * Optional pre-flight validation to check that the handler's
   * runtime environment is available.
   * @param sourcePath - Path to the source code or project root
   * @returns Validation result indicating any issues
   */
  validate?(sourcePath: string): Promise<ValidationResult>;
}
```


## Code Style

- **TypeScript**: Strict mode with `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`
- **Formatting**: Prettier with 2-space tabs, single quotes, trailing commas
- **Linting**: ESLint with `@typescript-eslint/strict-type-checked` — zero warnings
- **Imports**: Prefer `import type` for type-only imports. Use inline type imports:

  ```typescript
  import { type Handler, type HandlerOptions, type MDXOutput } from '../core/handler';
  ```

- **Naming**: camelCase for variables/functions, PascalCase for types/interfaces, kebab-case for files

## Commit Conventions

This project uses [Changesets](https://github.com/changesets/changesets) for versioning. Every PR that modifies the package should include a changeset.

The changeset description should be written in plain English, as it will appear in the changelog. Use the imperative mood ("Add", "Fix", "Update").

### Commit Format

```
<type>(<scope>): <description>

[optional body]
[optional footer]
```

Types: `feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `style`, `perf`

### Examples

```
feat(python): add support for package-level __init__ docs
fix(router): handle empty handler map gracefully
docs: add contributing guide
test(mdx-generator): add tests for edge cases
chore(deps): update typedoc to v0.28
```

## Additional Resources

- [Starlight Plugin API](https://starlight.astro.build/reference/plugins/)
- [Astro Documentation](https://docs.astro.build/)
- [Project Design Document](conductor/design.md)
- [Product Requirements](conductor/requirements.md)

---

Thank you for contributing! 🎉
