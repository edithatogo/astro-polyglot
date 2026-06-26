# ADR-001: Plugin Architecture

## Status

Accepted

## Context

astro-polyglot needed to integrate with Astro/Starlight to generate documentation pages from source code in multiple programming languages. The integration point could be a Starlight plugin, an Astro integration, or a standalone CLI tool.

## Decision

Use Starlight's plugin API (`config:setup` hook) as the primary integration point, with an Astro Content Loader (`polyglotLoader`) as the secondary API for Astro 7 content collections.

The plugin architecture is handler-based: each language has a dedicated handler module implementing the `Handler` interface. The plugin resolves user configuration, dispatches to the appropriate handlers, and merges sidebar output into Starlight's navigation.

Key architectural decisions:
- Handlers are imported at build time rather than discovered at runtime
- All handlers use a shared MDX generation pipeline (`transformToMDX`)
- Sidebar merging uses a symbol-keyed placeholder pattern
- Handlers return structured AST data, not raw MDX

## Consequences

- Easy to add new languages (just implement the Handler interface)
- All output is consistent regardless of source language
- Handlers are decoupled from the plugin configuration system
- Build-time imports mean all handlers are bundled together
