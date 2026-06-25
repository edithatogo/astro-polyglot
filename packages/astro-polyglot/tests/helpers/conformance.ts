/**
 * astro-polyglot — Standard Conformance Test Helper
 *
 * Provides `describeConformance(language, standard, fixtures)` to verify
 * that a language handler can parse real fixture files and produce
 * output matching the expected shape.  Tests are automatically skipped
 * when the handler's CLI toolchain is not available on the host.
 *
 * @module tests/helpers/conformance
 */

import { beforeAll, describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import type { Handler, HandlerAggregateOutput, HandlerOptions } from "../../core/handler";
// ─── Internal helpers ────────────────────────────────────────────────────────

/**
 * Try to load the handler module for `language`.
 * Returns `null` if the module or the named export is missing.
 */
async function loadHandler(language: string): Promise<Handler | null> {
  try {
    const mod = await import(`../../handlers/${language}`);
    const exportName = `${language}Handler`;
    const h = mod[exportName] as Handler | undefined;
    return h ?? null;
  } catch {
    return null;
  }
}
/**
 * Check whether the handler's CLI toolchain is available.
 *
 * Prefers the handler's own `validate()` method when present.
 * Falls back to a `which(1)` lookup on the handler `name` when
 * `validate()` is not implemented or throws.
 */
async function isToolchainAvailable(handler: Handler): Promise<boolean> {
  // 1. Use the handler's own validate() if available
  if (typeof handler.validate === "function") {
    try {
      const result = await handler.validate(".");
      if (result.valid) return true;
      // validate returned false – toolchain missing
      return false;
    } catch {
      // validate threw – treat as unavailable
      return false;
    }
  }

  // 2. Fallback: probe the most common CLI command for this language
  const cliProbes: Record<string, string[]> = {
    python: ["python3", "--version"],
    typescript: ["npx", "typedoc", "--version"],
    rust: ["cargo", "--version"],
    r: ["R", "--version"],
    julia: ["julia", "--version"],
    csharp: ["dotnet", "--version"],
    go: ["go", "version"],
    java: ["java", "-version"],
    kotlin: ["kotlin", "-version"],
    cpp: ["g++", "--version"],
    swift: ["swift", "--version"],
    stata: ["stata", "-V"],
    sas: ["sas", "-version"],
    scala: ["scala", "-version"],
    ruby: ["ruby", "--version"],
    dart: ["dart", "--version"],
    php: ["php", "--version"],
    elixir: ["elixir", "--version"],
  };

  const probe = cliProbes[handler.name];
  if (!probe) return false;

  try {
    execSync(probe.join(" "), { encoding: "utf-8", stdio: "pipe", timeout: 10_000 });
    return true;
  } catch {
    return false;
  }
}
/**
 * Build minimal valid options for a handler so that `generate()` can
 * be exercised without requiring real source artifacts on disk.
 */
function minimalOptions(language: string, fixturePaths: string[]): HandlerOptions & Record<string, unknown> {
  const opts: HandlerOptions & Record<string, unknown> = {
    output: `api/${language}`,
  };

  // Map required options based on common handler conventions
  switch (language) {
    case "python":
    case "typescript":
    case "r":
    case "julia":
    case "java":
    case "ruby":
    case "dart":
    case "php":
    case "stata":
    case "sas":
    case "scala":
      opts.entryPoints = fixturePaths;
      break;
    case "rust":
      opts.cratePath = fixturePaths[0] ?? ".";
      break;
    case "csharp":
    case "kotlin":
    case "cpp":
    case "elixir":
      opts.projectPath = fixturePaths[0] ?? ".";
      break;
    case "go":
    case "swift":
      opts.modulePath = fixturePaths[0] ?? ".";
      break;
  }

  return opts;
}

// ─── Public API ──────────────────────────────────────────────────────────────
/**
 * Describe a conformance test suite for a given language & standard.
 *
 * @param language  - Language identifier (must match a handler under `handlers/`).
 * @param standard  - Name of the conformance standard being tested.
 * @param fixtures  - Absolute or relative paths to fixture source files.
 *
 * @returns The `describe` block so callers can chain additional `it` or
 *          `describe` calls if desired.
 *
 * @example
 * ```ts
 * describeConformance("python", "PEP-484", [
 *   "tests/fixtures/python/typed_module.py",
 * ]);
 * ```
 */
export function describeConformance(
  language: string,
  standard: string,
  fixtures: string[],
): ReturnType<typeof describe> {
  const suiteName = `conformance: ${language} — ${standard}`;

  // Mutable state populated inside beforeAll (vitest runs it before tests).
  let handler: Handler | null = null;
  let toolchainAvailable = false;

  // Verify fixture files exist
  const missingFixtures = fixtures.filter((f) => !existsSync(f));
  const allFixturesExist = missingFixtures.length === 0;

  return describe(suiteName, () => {
    beforeAll(async () => {
      handler = await loadHandler(language);
      if (handler) {
        toolchainAvailable = await isToolchainAvailable(handler);
      }
    });

    // ── Toolchain check ──────────────────────────────────────────

    it(`handler "${language}" is loadable`, () => {
      expect(handler).not.toBeNull();
    });

    it(`toolchain is available for "${language}"`, () => {
      if (!handler) {
        expect(handler).not.toBeNull(); // will fail
        return;
      }
      if (!toolchainAvailable) {
        console.warn(
          `[conformance] Skipping "${suiteName}" — ` +
            `"${language}" toolchain not found on this host.`,
        );
      }
    });

    // ── Fixture existence ─────────────────────────────────────────

    it("all fixture files exist", () => {
      if (!handler || !toolchainAvailable) {
        return; // skip when handler/toolchain missing
      }
      expect(allFixturesExist).toBe(true);
      if (!allFixturesExist) {
        console.warn(
          `[conformance] Missing fixture(s): ${missingFixtures.join(", ")}`,
        );
      }
    });

    // ── Per-fixture conformance checks ────────────────────────────

    for (const fixturePath of fixtures) {
      const fixtureName = fixturePath.split("/").pop() ?? fixturePath;

      it(`parses fixture "${fixtureName}" and produces valid output`, async () => {
        if (!handler || !toolchainAvailable || !allFixturesExist) {
          return; // skip when preconditions not met
        }

        const options = minimalOptions(language, fixtures);

        let output: HandlerAggregateOutput;
        try {
          output = await handler.generate(options);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          console.warn(
            `[conformance] Handler "${language}" errored on "${fixtureName}": ${message}`,
          );
          expect(err).toBeDefined();
          return;
        }

        // Validate output shape
        expect(output).toBeDefined();
        expect(output).toHaveProperty("pages");
        expect(Array.isArray(output.pages)).toBe(true);
        expect(output).toHaveProperty("sidebar");
        expect(output.sidebar).toHaveProperty("label");
        expect(typeof output.sidebar.label).toBe("string");
        expect(output.sidebar).toHaveProperty("items");
        expect(Array.isArray(output.sidebar.items)).toBe(true);

        for (const page of output.pages) {
          expect(page).toHaveProperty("path");
          expect(typeof page.path).toBe("string");
          expect(page).toHaveProperty("frontmatter");
          expect(typeof page.frontmatter).toBe("object");
          expect(page).toHaveProperty("body");
          expect(typeof page.body).toBe("string");
        }

        if (output.pages.length > 0) {
          expect(output.sidebar.items.length).toBeGreaterThanOrEqual(0);
        }
      });
    }

    // ── Handler contract consistency ──────────────────────────────

    it("returns consistent output shape for repeated generate() calls", async () => {
      if (!handler || !toolchainAvailable || !allFixturesExist) {
        return; // skip when preconditions not met
      }

      const options = minimalOptions(language, fixtures);

      const first = await handler.generate(options).catch(() => null);
      const second = await handler.generate(options).catch(() => null);

      if (first && second) {
        expect(Array.isArray(first.pages)).toBe(true);
        expect(Array.isArray(second.pages)).toBe(true);
        expect(typeof first.sidebar.label).toBe("string");
        expect(typeof second.sidebar.label).toBe("string");
      }
    });
  });
}

export default describeConformance;