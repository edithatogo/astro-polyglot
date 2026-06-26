import { describe, it, expect, vi } from "vitest";
import { polyglotLoader } from "../core/loader";
import type { LoaderContext } from "astro/loaders";

const mockHandlerConfig = {
  name: "typescript",
  options: { output: "api/typescript" },
  handler: {
    generate: async () => ({
      pages: [
        {
          path: "api/typescript/index.mdx",
          frontmatter: { title: "API Reference", sidebar: { label: "API" } },
          body: "Hello World",
        },
      ],
      sidebar: { label: "API", items: [] },
    }),
  },
};

// Mock handler execution to avoid real subprocesses during test
vi.mock("../core/router", () => {
  class MockHandlerCache {
    private store = new Map<string, string>();
    get(key: string) { return this.store.get(key); }
    set(key: string, value: string) { this.store.set(key, value); }
    entries() {
      const result: Record<string, string> = {};
      for (const [k, v] of this.store) result[k] = v;
      return result;
    }
    load(entries: Record<string, string>) {
      for (const [k, v] of Object.entries(entries)) this.store.set(k, v);
    }
  }

  return {
    resolveHandlers: () => [mockHandlerConfig],
    runHandlers: async (_handlers: any, _config: any, _logger: any, cache?: any) => {
      // Simulate per-handler caching
      const cacheKey = "handler:typescript";
      if (cache?.get(cacheKey)) {
        // Cache hit — return no outputs
        return [];
      }
      const output = await mockHandlerConfig.handler.generate();
      if (cache) {
        cache.set(cacheKey, "mock-digest");
      }
      return [output];
    },
    HandlerCache: MockHandlerCache,
  };
});

describe("polyglotLoader", () => {
  it("implements Astro Loader interface", () => {
    const loader = polyglotLoader({
      typescript: {
        entryPoints: ["src/index.ts"],
      },
    });
    expect(loader).toHaveProperty("name", "polyglot-loader");
    expect(typeof loader.load).toBe("function");
  });

  it("populates the Astro store with loader entries", async () => {
    const loader = polyglotLoader({
      typescript: {
        entryPoints: ["src/index.ts"],
      },
    });

    const mockStore = {
      set: vi.fn(),
      clear: vi.fn(),
      get: vi.fn(),
      keys: vi.fn(),
    };

    const mockContext = {
      store: mockStore,
      logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      },
      meta: {
        get: vi.fn(),
        set: vi.fn(),
      },
    } as unknown as LoaderContext;

    await loader.load(mockContext);

    expect(mockStore.set).toHaveBeenCalledWith({
      id: "api/typescript/index",
      body: "Hello World",
      data: {
        title: "API Reference",
        sidebar: { label: "API" },
      },
    });
  });

  it("skips generation on cache hit", async () => {
    const loader = polyglotLoader({
      typescript: {
        entryPoints: ["src/index.ts"],
      },
    });

    const mockStore = {
      set: vi.fn(),
      clear: vi.fn(),
      get: vi.fn(),
      keys: vi.fn(),
    };

    const mockMetaMap = new Map();
    // Pre-populate with matching digest
    const mockContext = {
      store: mockStore,
      logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      },
      meta: {
        get: (key: string) => mockMetaMap.get(key),
        set: (key: string, val: any) => mockMetaMap.set(key, val),
      },
    } as unknown as LoaderContext;

    // First load sets the digest
    await loader.load(mockContext);
    expect(mockStore.set).toHaveBeenCalled();

    mockStore.set.mockClear();

    // Second load has cache hit
    await loader.load(mockContext);
    expect(mockStore.set).not.toHaveBeenCalled();
  });

  it("registers dev file watcher", async () => {
    const loader = polyglotLoader({
      typescript: {
        entryPoints: ["src/index.ts"],
      },
    });

    const mockStore = {
      set: vi.fn(),
      clear: vi.fn(),
      get: vi.fn(),
      keys: vi.fn(),
    };

    const mockWatcher = {
      add: vi.fn(),
      on: vi.fn(),
    };

    const mockMetaMap = new Map();
    const mockContext = {
      store: mockStore,
      logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      },
      meta: {
        get: (key: string) => mockMetaMap.get(key),
        set: (key: string, val: any) => mockMetaMap.set(key, val),
      },
      watcher: mockWatcher,
    } as unknown as LoaderContext;

    await loader.load(mockContext);

    expect(mockWatcher.add).toHaveBeenCalled();
    expect(mockWatcher.on).toHaveBeenCalledWith("change", expect.any(Function));
    expect(mockMetaMap.get("watcherRegistered")).toBe("true");
  });
});
