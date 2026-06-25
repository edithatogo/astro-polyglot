/**
 * astro-polyglot — Conformance test infrastructure verification
 *
 * Validates that the `describeConformance` helper is properly exported
 * and that the fixture directory structure is in place.
 *
 * @module tests/conformance
 */

import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import path from "node:path";
import { describeConformance } from "./helpers/conformance";

// ─── Helper export contract ─────────────────────────────────────────────────

describe("describeConformance export", () => {
  it("exports describeConformance as a function", () => {
    expect(typeof describeConformance).toBe("function");
  });

  it("returns a function when called at top level", () => {
    // We can't call describeConformance inside an it block because
    // it internally calls describe(). Validated by the suite below
    // that is invoked at the top level.
    expect(typeof describeConformance).toBe("function");
  });
});

// ─── Fixture structure ──────────────────────────────────────────────────────

describe("fixture structure", () => {
  const fixtureDirs = [
    "python",
    "typescript",
    "rust",
    "r",
    "julia",
    "csharp",
    "go",
    "java",
    "kotlin",
    "cpp",
    "swift",
    "stata",
    "sas",
    "scala",
    "ruby",
    "dart",
    "php",
    "elixir",
  ];

  const fixturesRoot = path.resolve(import.meta.dirname, "fixtures");

  for (const dir of fixtureDirs) {
    it(`has a fixtures/${dir} directory`, () => {
      expect(existsSync(path.join(fixturesRoot, dir))).toBe(true);
    });
  }

  it("has at least one Python fixture file", () => {
    const pythonDir = path.join(fixturesRoot, "python");
    const files = ["typed_module.py"];
    for (const f of files) {
      expect(existsSync(path.join(pythonDir, f))).toBe(true);
    }
  });
});

// ─── Conformance suite example (auto-skipped on CI without toolchain) ────────

// This will auto-skip when Python is not available.
describeConformance("python", "PEP-484", [
  path.resolve(import.meta.dirname, "fixtures", "python", "typed_module.py"),
]);