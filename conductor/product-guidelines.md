# Product Guidelines

## Brand
- **Name**: astro-polyglot
- **Description**: One plugin, every language. Starlight-native API docs from any source code.
- **License**: MIT
- **Registry**: npm (`astro-polyglot`)

## Language
- Use clear, direct language
- Document options with JSDoc/TSDoc (same style as starlight-typedoc)
- Error messages must be actionable: "Could not find Python in PATH" not "Handler failed"

## Code Style
- TypeScript strict mode
- ESLint flat config (extends from starlight-typedoc patterns)
- Prettier for formatting
- 2-space indent
- Named exports, no default exports
