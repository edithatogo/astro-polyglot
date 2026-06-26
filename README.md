# astro-polyglot

[![npm version](https://img.shields.io/npm/v/astro-polyglot.svg?style=flat-square&logo=npm&color=CB3837)](https://www.npmjs.com/package/astro-polyglot)
[![CI](https://img.shields.io/github/actions/workflow/status/edithatogo/astro-polyglot/ci.yml?style=flat-square&logo=github&label=CI)](https://github.com/edithatogo/astro-polyglot/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/edithatogo/astro-polyglot?style=flat-square&color=blue)](LICENSE)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/astro-polyglot?style=flat-square&label=bundle)](https://bundlephobia.com/package/astro-polyglot)

**Astro/Starlight integration to generate documentation from any programming language using its native toolchain.**

Write source code in Python, TypeScript, Rust, R, Julia, C#, Go — or add your own language — and astro-polyglot automatically generates Starlight-native MDX documentation pages, sidebars, and search indexes.

---

## Quick Start

```bash
# Install the plugin
npm install astro-polyglot

# In your Astro config (astro.config.mjs):
import starlight from '@astrojs/starlight';
import polyglot from 'astro-polyglot';
import { defineConfig } from 'astro/config';

export default defineConfig({
  integrations: [
    starlight({
      title: 'My API Docs',
      plugins: [
        polyglot({
          python: {
            entryPoints: ['src/mylib'],
          },
          typescript: {
            entryPoints: ['src/index.ts'],
            tsconfig: 'tsconfig.json',
          },
        }),
      ],
    }),
  ],
});
```

That's it. Run `astro dev` or `astro build` and the plugin will generate documentation pages under `src/content/docs/api/python/` and `src/content/docs/api/typescript/`, automatically injected into your Starlight sidebar.


## Supported Languages

| Language     | Status       | Doc Standard                      | Toolchain                   | Requires                                                |
|--------------|--------------|-----------------------------------|-----------------------------|---------------------------------------------------------|
| Python       | ✅ Implemented | Google, NumPy, Sphinx reST        | Griffe                    | Python 3.11+ `pip install griffe`                       |
| TypeScript   | ✅ Implemented | JSDoc                             | TypeDoc                  | `npm install typedoc typedoc-plugin-markdown`           |
| Rust         | ✅ Implemented | Rustdoc CommonMark                | rustdoc JSON             | Rust nightly `cargo +nightly rustdoc`                   |
| Go           | ✅ Implemented | Go comments                       | gomarkdoc                | `go install github.com/princjef/gomarkdoc`              |
| Java         | ✅ Implemented | Javadoc                           | javadoc-json             | JDK 11+                                                  |
| Kotlin       | ✅ Implemented | KDoc                              | Dokka                    | Kotlin compiler + Dokka CLI                             |
| C# (.NET)    | ✅ Implemented | .NET XML doc                      | .NET SDK                | .NET SDK                                                |
| C++          | ✅ Implemented | Doxygen (Javadoc + QT style)      | Doxygen XML              | Doxygen                                                 |
| Swift        | ✅ Implemented | DocC                              | DocC                     | Swift 5.9+ with DocC                                    |
| Julia        | ✅ Implemented | Base.Docs                         | Base.Docs                | Julia runtime                                           |
| R            | ✅ Implemented | roxygen2                          | roxygen2 / Rscript       | R runtime + roxygen2                                    |
| Scala        | ✅ Implemented | Scaladoc                          | Scaladoc                 | Scala compiler                                          |
| Ruby         | ✅ Implemented | YARD                              | YARD                     | Ruby runtime + `gem install yard`                       |
| Dart         | ✅ Implemented | dartdoc                           | dartdoc                  | Dart SDK                                                |
| PHP          | ✅ Implemented | PHPDoc                            | phpDocumentor            | PHP 8.1+ `composer require phpdocumentor`              |
| Elixir       | ✅ Implemented | ExDoc                             | ExDoc                    | Elixir runtime + ExDoc                                  |
| Stata        | ✅ Implemented | .sthlp help system                | Stata CLI                | Stata (MP/SE) 17+                                       |
| SAS          | ✅ Implemented | SAS macro comments                | SAS CLI                  | SAS 9.4+                                                |

> All 18 language handlers are implemented, registered, and bundled with the package. Install required toolchains per language as needed.

## Handler Lifecycle

Handlers progress through three maturity tiers:

| Tier | Description | Languages |
|------|-------------|-----------|
| **Stable** | Production-ready, full test coverage, CI validated | Python, TypeScript, Rust, Go, C#, Java, Kotlin, R |
| **Beta** | Feature-complete, partial edge-case coverage | C++, Swift, Julia, Scala, Ruby, Dart, PHP, Elixir |
| **Experimental** | Proof-of-concept, limited testing | Stata, SAS |

See [packages/astro-polyglot/docs/handler-lifecycle.md](packages/astro-polyglot/docs/handler-lifecycle.md) for the full lifecycle process.

![cpp](https://img.shields.io/badge/cpp-beta-yellow) ![csharp](https://img.shields.io/badge/csharp-stable-brightgreen) ![dart](https://img.shields.io/badge/dart-beta-yellow) ![elixir](https://img.shields.io/badge/elixir-beta-yellow) ![go](https://img.shields.io/badge/go-stable-brightgreen) ![java](https://img.shields.io/badge/java-stable-brightgreen) ![julia](https://img.shields.io/badge/julia-beta-yellow) ![kotlin](https://img.shields.io/badge/kotlin-stable-brightgreen) ![php](https://img.shields.io/badge/php-beta-yellow) ![python](https://img.shields.io/badge/python-stable-brightgreen) ![r](https://img.shields.io/badge/r-stable-brightgreen) ![ruby](https://img.shields.io/badge/ruby-beta-yellow) ![rust](https://img.shields.io/badge/rust-stable-brightgreen) ![sas](https://img.shields.io/badge/sas-experimental-orange) ![scala](https://img.shields.io/badge/scala-beta-yellow) ![stata](https://img.shields.io/badge/stata-experimental-orange) ![swift](https://img.shields.io/badge/swift-beta-yellow) ![typescript](https://img.shields.io/badge/typescript-stable-brightgreen)

## Handler Ownership

Handler ownership is documented in [packages/astro-polyglot/HANDLERS.md](packages/astro-polyglot/HANDLERS.md).

## Plugin Architecture

astro-polyglot uses a **handler-based plugin architecture**. Each programming language has a dedicated handler that:

1. **Extracts** documentation from source code using the language's native toolchain
2. **Transforms** the extracted data into a shared AST representation
3. **Generates** Starlight-compatible MDX pages with proper frontmatter and sidebar entries

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐     ┌─────────────┐
│   Python     │────▶│  python.ts   │────▶│              │     │             │
│   Sources    │     │   Handler    │     │              │     │  Starlight  │
├─────────────┤     ├──────────────┤     │   Shared     │     │   MDX +     │
│ TypeScript   │────▶│ typescript.ts│────▶│   MDX Gen   │────▶│  Sidebar    │
│   Sources    │     │   Handler    │     │              │     │             │
├─────────────┤     ├──────────────┤     │  Pipeline    │     │   Pages     │
│   Rust       │────▶│   rust.ts    │────▶│              │     │             │
│   Sources    │     │   Handler    │     │              │     │             │
└─────────────┘     └──────────────┘     └──────────────┘     └─────────────┘
```

### Core Components

- **Handler Interface** (`core/handler.ts`): Contract every language handler must implement
- **Plugin Setup** (`index.ts`): Astro-Starlight plugin entry point with `config:setup` hook
- **Router** (`core/router.ts`): Resolves user configuration to handler instances, parallel execution (`runHandlers`), content-hash caching (`HandlerCache`), and error recovery (`failFast`)
- **Content Loader** (`core/loader.ts`): Astro 7 content collection loader (`polyglotLoader`) with persistent caching and file watching
- **MDX Generator** (`core/mdx-generator.ts`): Shared pipeline transforming AST data to MDX pages

### Configuration Reference

```typescript
interface PolyglotConfig {
  python?: {
    entryPoints: string[];     // Python module paths or files
    output?: string;           // Output subdirectory (default: "api/python")
    pagination?: boolean;      // Include prev/next pagination
  };
  typescript?: {
    entryPoints: string[];     // TypeScript entry files
    tsconfig?: string;         // Path to tsconfig.json
    output?: string;           // Output subdirectory (default: "api/typescript")
  };
  rust?: {
    cratePath?: string;        // Path to Cargo.toml or crate directory
    output?: string;           // Output subdirectory (default: "api/rust")
  };
  r?: {
    modulePath?: string;       // Path to R package
    output?: string;           // Output subdirectory (default: "api/r")
  };
  julia?: {
    projectPath?: string;      // Path to Julia project
    output?: string;           // Output subdirectory (default: "api/julia")
  };
  csharp?: {
    projectPath?: string;      // Path to .csproj or solution file
    output?: string;           // Output subdirectory (default: "api/csharp")
  };
  go?: {
    entryPoints?: string[];    // Go package paths
    output?: string;           // Output subdirectory (default: "api/go")
  };
}
```

### Scaffold Scripts

New language handlers can be bootstrapped using the included automation scripts:

```bash
# Scaffold handler file, fixture directory, and conformance test
pnpm --filter astro-polyglot generate:handler <language>

# Register in the type system and router
pnpm --filter astro-polyglot register:handler <language>

# Generate maturity badges
pnpm --filter astro-polyglot badges:maturity
```

### Advanced Usage: Multi-Plugin Setup

```typescript
import starlight from '@astrojs/starlight';
import { createPolyglotPlugin } from 'astro-polyglot';
import { defineConfig } from 'astro/config';

const [polyglot, sidebarGroup] = createPolyglotPlugin();

export default defineConfig({
  integrations: [
    starlight({
      plugins: [
        polyglot({
          python: { entryPoints: ['src/backend'] },
          typescript: { entryPoints: ['src/frontend'] },
        }),
      ],
      sidebar: [
        { label: 'Docs', items: ['/docs'] },
        sidebarGroup,  // ← polyglot will replace this with generated sidebar items
      ],
    }),
  ],
## Documentation

Full documentation is available at **https://astro-polyglot.vercel.app/** (dogfood site — built with Starlight and astro-polyglot itself).

- [Getting Started Guide](https://astro-polyglot.vercel.app/getting-started)
- [Language Handlers](https://astro-polyglot.vercel.app/handlers)
- [Configuration Reference](https://astro-polyglot.vercel.app/configuration)
- [Plugin API](https://astro-polyglot.vercel.app/api)
- [Contributing Guide](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)

## 🐕 Dogfood

This project's own documentation site (at `docs/astro-site/`) is built with **Starlight** and uses **astro-polyglot** to generate its API reference pages. We eat our own dog food — every release validates that the plugin works end-to-end with a real Starlight project.

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for:

- How to add a new language handler
- Development setup instructions
- Handler contract documentation
- Testing requirements
- Pull request process

## Security

See [SECURITY.md](SECURITY.md) for our security policy and vulnerability reporting process.

## License

MIT © 2026 Dylan A Mordaunt. See [LICENSE](LICENSE) for details.

## Support

- [GitHub Issues](https://github.com/edithatogo/astro-polyglot/issues) — bug reports and feature requests
- [GitHub Discussions](https://github.com/edithatogo/astro-polyglot/discussions) — questions and ideas
- [SUPPORT.md](SUPPORT.md) — more support resources

});
```
