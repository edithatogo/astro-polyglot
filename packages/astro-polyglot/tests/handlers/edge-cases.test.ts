import { beforeAll, describe, expect, it } from "vitest";
import type { Handler, HandlerOptions } from "../../core/handler";
import { ALL_LANGUAGES, type HandlerName, loadHandler, randomValidShapedOptions } from "./fuzz-common";

async function getGenerateError(handler: Handler, opts: Record<string, unknown>): Promise<string | undefined> {
  try {
    await handler.generate(opts as HandlerOptions & Record<string, unknown>);
    return undefined;
  } catch (error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }
}

describe.each(ALL_LANGUAGES.map((language) => [language]))("Edge cases: %s handler", (language) => {
  let handler: Handler | null = null;
  const handlerName = language as HandlerName;

  beforeAll(async () => {
    handler = await loadHandler(handlerName);
  });

  it("handles empty and null path-like options gracefully", async () => {
    if (!handler) return;

    for (const value of ["", undefined, null]) {
      const error = await getGenerateError(handler, {
        output: "api/test",
        entryPoints: value,
        cratePath: value,
        modulePath: value,
        projectPath: value,
      });

      if (error !== undefined) {
        expect(error.length).toBeGreaterThan(0);
      }
    }
  });

  it("handles Unicode path-like options gracefully", async () => {
    if (!handler) return;

    const opts = randomValidShapedOptions(handlerName);
    for (const key of Object.keys(opts)) {
      if (typeof opts[key] === "string") {
        opts[key] = "/tmp/unicode/🚀/项目";
      } else if (Array.isArray(opts[key])) {
        opts[key] = ["/tmp/unicode/🚀/项目"];
      }
    }

    const error = await getGenerateError(handler, opts);
    if (error !== undefined) {
      expect(error.length).toBeGreaterThan(0);
    }
  });

  it("handles concurrent generate() calls without hanging", async () => {
    if (!handler) return;

    const results = await Promise.allSettled([
      handler.generate(randomValidShapedOptions(handlerName) as never),
      handler.generate(randomValidShapedOptions(handlerName) as never),
      handler.generate(randomValidShapedOptions(handlerName) as never),
    ]);

    expect(results).toHaveLength(3);
    for (const result of results) {
      if (result.status === "rejected") {
        const message = result.reason instanceof Error ? result.reason.message : String(result.reason);
        expect(message.length).toBeGreaterThan(0);
      } else {
        expect(result.value).toHaveProperty("pages");
        expect(result.value).toHaveProperty("sidebar");
      }
    }
  }, 120_000);

  it("validate() handles path edge cases when implemented", async () => {
    if (!handler?.validate) return;

    for (const sourcePath of ["", "\x00", "   \t  \n  ", `/${"a".repeat(4095)}`, "../../../etc/passwd"]) {
      const result = await handler.validate(sourcePath);
      expect(typeof result.valid).toBe("boolean");
      expect(Array.isArray(result.errors)).toBe(true);
    }
  });
});

describe("multiple handlers running in parallel", () => {
  let handlers: Map<HandlerName, Handler>;

  beforeAll(async () => {
    handlers = new Map();
    for (const language of ALL_LANGUAGES) {
      const handler = await loadHandler(language);
      if (handler) handlers.set(language, handler);
    }
  });

  it("runs all available handlers concurrently without crashing the runner", async () => {
    const tasks = [...handlers].map(([language, handler]) =>
      handler.generate(randomValidShapedOptions(language) as never).catch(() => undefined),
    );

    const results = await Promise.allSettled(tasks);
    expect(results).toHaveLength(handlers.size);
  });
});
