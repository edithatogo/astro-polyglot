import type { Logger } from "@astrojs/starlight/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveHandlers } from "../core/router";

/**
 * Creates a mock logger that captures all log output.
 */
function createMockLogger(): Logger {
  const logs: { level: "warn" | "info" | "error"; message: string }[] = [];
  const logger: Logger = {
    warn: vi.fn((msg: string) => logs.push({ level: "warn", message: msg })),
    info: vi.fn((msg: string) => logs.push({ level: "info", message: msg })),
    error: vi.fn((msg: string) => logs.push({ level: "error", message: msg })),
    debug: vi.fn((msg: string) => logs.push({ level: "info", message: msg })),
  };
  return Object.assign(logger, { logs }) as Logger & { logs: typeof logs };
}

describe("resolveHandlers()", () => {
  let logger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    logger = createMockLogger();
  });

  it("resolves a single language handler", () => {
    const handlers = resolveHandlers({ python: { entryPoints: ["mymod"] } }, logger);

    expect(handlers).toHaveLength(1);
    expect(handlers[0]!.name).toBe("python");
    expect(handlers[0]!.handler).toBeDefined();
    expect(typeof handlers[0]!.handler.generate).toBe("function");
  });

  it("resolves multiple language handlers", () => {
    const handlers = resolveHandlers(
      {
        python: { entryPoints: ["mymod"] },
        typescript: { entryPoints: ["src/index.ts"] },
        rust: { cratePath: "/tmp/crate" },
      },
      logger,
    );

    expect(handlers).toHaveLength(3);
    const names = handlers.map((h) => h.name).sort();
    expect(names).toEqual(["python", "rust", "typescript"]);
  });

  it("resolves all 7 supported languages", () => {
    const handlers = resolveHandlers(
      {
        python: { entryPoints: ["mod"] },
        typescript: { entryPoints: ["src/index.ts"] },
        rust: { cratePath: "/tmp/crate" },
        r: { entryPoints: ["pkg"] },
        julia: { entryPoints: ["Module"] },
        csharp: { projectPath: "/tmp/proj" },
        go: { modulePath: "/tmp/mod" },
      },
      logger,
    );

    expect(handlers).toHaveLength(7);
    const names = handlers.map((h) => h.name).sort();
    expect(names).toEqual(["csharp", "go", "julia", "python", "r", "rust", "typescript"]);
  });

  it("returns empty array and logs a warning when config is empty", () => {
    const handlers = resolveHandlers({}, logger);

    expect(handlers).toEqual([]);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringMatching(/No handlers configured/i));
  });

  it("returns empty array and logs a warning when config has only disabled entries", () => {
    const handlers = resolveHandlers({ python: undefined } as Record<string, undefined>, logger);

    expect(handlers).toEqual([]);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringMatching(/No handlers configured/i));
  });

  it("logs a warning for an unknown language and skips it", () => {
    const handlers = resolveHandlers(
      { unknown_lang: { entryPoints: ["x"] } } as Record<string, { entryPoints: string[] }>,
      logger,
    );

    expect(handlers).toHaveLength(0);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringMatching(/unknown/i));
    expect(logger.warn).toHaveBeenCalledWith(expect.stringMatching(/No handlers configured/i));
  });

  it("filters out unknown languages while keeping valid ones", () => {
    const localLogger = createMockLogger();
    const handlers = resolveHandlers(
      {
        python: { entryPoints: ["mod"] },
        foobar: { entryPoints: ["x"] },
        rust: { cratePath: "/tmp/crate" },
      } as Record<string, { entryPoints?: string[]; cratePath?: string }>,
      localLogger,
    );

    expect(handlers).toHaveLength(2);
    const names = handlers.map((h) => h.name).sort();
    expect(names).toEqual(["python", "rust"]);
    // One warn for unknown, no "no handlers" warn
    const warnMessages = localLogger.logs.map((entry) => entry.message);
    expect(warnMessages.some((msg) => /foobar/i.test(msg))).toBe(true);
    expect(warnMessages.some((msg) => /No handlers configured/i.test(msg))).toBe(false);
  });

  it("sets default output to api/{language} when not specified", () => {
    const handlers = resolveHandlers({ python: { entryPoints: ["mod"] } }, logger);

    expect(handlers).toHaveLength(1);
    expect(handlers[0]!.options.output).toBe("api/python");
  });

  it("preserves user-specified output option", () => {
    const handlers = resolveHandlers({ python: { entryPoints: ["mod"], output: "docs/py" } }, logger);

    expect(handlers).toHaveLength(1);
    expect(handlers[0]!.options.output).toBe("docs/py");
  });

  it("forwards all extra options to handler options", () => {
    const handlers = resolveHandlers(
      {
        python: {
          entryPoints: ["mod"],
          output: "api/py",
          pagination: true,
          watch: true,
          extraKey: "extra-value",
        },
      },
      logger,
    );

    expect(handlers).toHaveLength(1);
    expect(handlers[0]!.options.entryPoints).toEqual(["mod"]);
    expect(handlers[0]!.options.pagination).toBe(true);
    expect(handlers[0]!.options.watch).toBe(true);
    expect(handlers[0]!.options.extraKey).toBe("extra-value");
  });

  it("lazy loads handlers — handler.generate is an async function", async () => {
    const handlers = resolveHandlers({ python: { entryPoints: ["mod"] } }, logger);

    expect(handlers).toHaveLength(1);
    expect(handlers[0]!.handler.generate.constructor.name).toBe("AsyncFunction");
  });
});
