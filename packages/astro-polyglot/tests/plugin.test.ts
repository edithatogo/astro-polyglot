import { beforeEach, describe, expect, it, type MockInstance, vi } from "vitest";
import * as routerModule from "../core/router";
import polyglotPlugin, { createPolyglotPlugin, sidebarGroup } from "../index";

interface MockLogger {
  warn: MockInstance;
  info: MockInstance;
  error: MockInstance;
  debug: MockInstance;
}

interface MockConfigSetupParams {
  astroConfig: Record<string, unknown>;
  command: string;
  config: { sidebar: unknown[] };
  logger: MockLogger;
  updateConfig: MockInstance;
}

function createMockParams(overrides?: Partial<MockConfigSetupParams>): MockConfigSetupParams {
  return {
    astroConfig: { root: "/tmp/test-root" },
    command: "dev",
    config: { sidebar: [] },
    logger: {
      warn: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
    updateConfig: vi.fn(),
    ...overrides,
  };
}

describe("astro-polyglot plugin", () => {
  let resolveHandlersSpy: MockInstance;

  beforeEach(() => {
    vi.restoreAllMocks();
    resolveHandlersSpy = vi.spyOn(routerModule, "resolveHandlers");
  });

  describe("plugin structure", () => {
    it("has the correct name", () => {
      const plugin = polyglotPlugin({});
      expect(plugin.name).toBe("astro-polyglot");
    });

    it("has a hooks object with config:setup", () => {
      const plugin = polyglotPlugin({});
      expect(plugin.hooks).toBeDefined();
      expect(typeof plugin.hooks["config:setup"]).toBe("function");
    });
  });

  describe("config:setup — dev command", () => {
    it("calls resolveHandlers with the provided options", async () => {
      resolveHandlersSpy.mockReturnValue([]);
      const options = { python: { entryPoints: ["mymod"] } };
      const plugin = polyglotPlugin(options);
      const params = createMockParams();
      await plugin.hooks["config:setup"](params as never);
      expect(resolveHandlersSpy).toHaveBeenCalledWith(options, params.logger);
    });

    it("updates sidebar when handlers produce output", async () => {
      const mockHandlers = [
        {
          name: "python" as const,
          handler: {
            name: "python" as const,
            generate: vi.fn().mockResolvedValue({
              pages: [
                {
                  path: "api/python/mymod.mdx",
                  frontmatter: { title: "mymod", sidebar: { label: "mymod" }, pagefind: true },
                  body: "",
                },
              ],
              sidebar: { label: "PYTHON", items: [{ label: "mymod", link: "api/python/mymod/" }] },
            }),
          },
          options: { output: "api/python", entryPoints: ["mymod"] },
        },
      ];
      resolveHandlersSpy.mockReturnValue(mockHandlers);
      const plugin = polyglotPlugin({ python: { entryPoints: ["mymod"] } });
      const params = createMockParams();
      await plugin.hooks["config:setup"](params as never);
      expect(params.updateConfig).toHaveBeenCalledTimes(1);
      const arg = (params.updateConfig as MockInstance).mock.calls[0]![0];
      expect(arg).toHaveProperty("sidebar");
      expect(arg.sidebar).toHaveLength(1);
      expect(arg.sidebar[0]).toHaveProperty("label", "PYTHON");
    });
  });

  describe("config:setup — preview command", () => {
    it("returns early without resolving handlers or updating config", async () => {
      const plugin = polyglotPlugin({ python: { entryPoints: ["mod"] } });
      const params = createMockParams({ command: "preview" });
      const callsBefore = resolveHandlersSpy.mock.calls.length;
      await plugin.hooks["config:setup"](params as never);
      expect(resolveHandlersSpy.mock.calls).toHaveLength(callsBefore);
      expect(params.updateConfig).not.toHaveBeenCalled();
    });
  });

  describe("config:setup — sidebar merging", () => {
    it("merges sidebars from multiple handlers", async () => {
      const mockHandlers = [
        {
          name: "python" as const,
          handler: {
            name: "python" as const,
            generate: vi.fn().mockResolvedValue({
              pages: [],
              sidebar: { label: "PYTHON", items: [{ label: "mod1", link: "api/python/mod1/" }] },
            }),
          },
          options: { output: "api/python" },
        },
        {
          name: "typescript" as const,
          handler: {
            name: "typescript" as const,
            generate: vi.fn().mockResolvedValue({
              pages: [],
              sidebar: { label: "TYPESCRIPT", items: [{ label: "mod2", link: "api/ts/mod2/" }] },
            }),
          },
          options: { output: "api/ts" },
        },
      ];
      resolveHandlersSpy.mockReturnValue(mockHandlers);
      const plugin = polyglotPlugin({ python: {}, typescript: {} });
      const params = createMockParams();
      await plugin.hooks["config:setup"](params as never);
      const arg = (params.updateConfig as MockInstance).mock.calls[0]![0];
      expect(arg.sidebar).toHaveLength(1);
      expect(arg.sidebar[0]).toHaveProperty("label", "API");
      expect(arg.sidebar[0].items).toHaveLength(2);
    });

    it("preserves existing sidebar items", async () => {
      const mockHandlers = [
        {
          name: "python" as const,
          handler: {
            name: "python" as const,
            generate: vi.fn().mockResolvedValue({
              pages: [],
              sidebar: { label: "PYTHON", items: [{ label: "mod1", link: "api/py/mod1/" }] },
            }),
          },
          options: { output: "api/python" },
        },
      ];
      resolveHandlersSpy.mockReturnValue(mockHandlers);
      const plugin = polyglotPlugin({ python: {} });
      const params = createMockParams({ config: { sidebar: [{ label: "Home", link: "/" }] } });
      await plugin.hooks["config:setup"](params as never);
      const arg = (params.updateConfig as MockInstance).mock.calls[0]![0];
      expect(arg.sidebar).toHaveLength(2);
      expect(arg.sidebar[0]).toEqual({ label: "Home", link: "/" });
      expect(arg.sidebar[1]).toHaveProperty("label", "PYTHON");
    });

    it("replaces placeholder sidebar group", async () => {
      const placeholder = sidebarGroup;
      const mockHandlers = [
        {
          name: "python" as const,
          handler: {
            name: "python" as const,
            generate: vi.fn().mockResolvedValue({
              pages: [],
              sidebar: { label: "PYTHON", items: [{ label: "a", link: "api/py/a/" }] },
            }),
          },
          options: { output: "api/python" },
        },
      ];
      resolveHandlersSpy.mockReturnValue(mockHandlers);
      const plugin = polyglotPlugin({ python: {} });
      const params = createMockParams({
        config: { sidebar: [{ label: "Home", link: "/" }, placeholder] },
      });
      await plugin.hooks["config:setup"](params as never);
      const arg = (params.updateConfig as MockInstance).mock.calls[0]![0];
      expect(arg.sidebar).toHaveLength(2);
      expect(arg.sidebar[1]).toHaveProperty("label", "PYTHON");
      const remaining = arg.sidebar.filter(
        (item: unknown) =>
          typeof item === "object" && item !== null && (item as Record<string, unknown>)._key === placeholder._key,
      );
      expect(remaining).toHaveLength(0);
    });
  });

  describe("config:setup — logging", () => {
    it("logs handler execution info", async () => {
      const mockHandlers = [
        {
          name: "python" as const,
          handler: {
            name: "python" as const,
            generate: vi.fn().mockResolvedValue({
              pages: [{ path: "a.mdx", frontmatter: { title: "a", sidebar: { label: "a" } }, body: "" }],
              sidebar: { label: "PY", items: [] },
            }),
          },
          options: { output: "api/python" },
        },
      ];
      resolveHandlersSpy.mockReturnValue(mockHandlers);
      const plugin = polyglotPlugin({ python: {} });
      const params = createMockParams();
      await plugin.hooks["config:setup"](params as never);
      expect(params.logger.info).toHaveBeenCalledWith(expect.stringContaining("Generating python"));
      expect(params.logger.info).toHaveBeenCalledWith(expect.stringContaining("1 pages"));
    });

    it("logs and re-throws handler errors", async () => {
      const mockHandlers = [
        {
          name: "python" as const,
          handler: { name: "python" as const, generate: vi.fn().mockRejectedValue(new Error("Boom")) },
          options: { output: "api/python" },
        },
      ];
      resolveHandlersSpy.mockReturnValue(mockHandlers);
      const plugin = polyglotPlugin({ python: {} });
      const params = createMockParams();
      await expect(plugin.hooks["config:setup"](params as never)).rejects.toThrow("Boom");
      expect(params.logger.error).toHaveBeenCalledWith(expect.stringContaining("python"));
    });
  });

  describe("sidebarGroup singleton", () => {
    it("has the correct structure", () => {
      expect(sidebarGroup).toHaveProperty("_key");
      expect(typeof sidebarGroup._key).toBe("symbol");
      expect(sidebarGroup).toHaveProperty("label", "API");
      expect(sidebarGroup.items).toEqual([{ label: "Placeholder", link: "/getting-started/" }]);
    });
  });

  describe("createPolyglotPlugin()", () => {
    it("returns [plugin, group] tuple", () => {
      const [pluginFn, group] = createPolyglotPlugin();
      expect(typeof pluginFn).toBe("function");
      const plugin = pluginFn({});
      expect(plugin.name).toBe("astro-polyglot");
      expect(group).toHaveProperty("_key");
      expect(typeof group._key).toBe("symbol");
      expect(group).toHaveProperty("label", "API");
    });

    it("produces unique keys each call", () => {
      const [, group1] = createPolyglotPlugin();
      const [, group2] = createPolyglotPlugin();
      expect(group1._key).not.toBe(group2._key);
    });
  });
});
