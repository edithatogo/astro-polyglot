import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { VERSION } from "../core/version";

const here = dirname(fileURLToPath(import.meta.url));
const pkgPath = join(here, "..", "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as { version: string };

describe("VERSION (dynamic versioning)", () => {
  it("is a non-empty semantic-version string", () => {
    expect(typeof VERSION).toBe("string");
    expect(VERSION.length).toBeGreaterThan(0);
    // Must start with a numeric semver core (x.y.z), optionally with prerelease/build.
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("matches the version declared in package.json", () => {
    // Under vitest the build-time define is NOT applied, so the fallback
    // path reads package.json — therefore VERSION must equal pkg.version.
    expect(VERSION).toBe(pkg.version);
  });

  it("is a stable primitive (string), not an object or function", () => {
    expect(VERSION).not.toBeInstanceOf(Object);
    expect(typeof VERSION).not.toBe("function");
  });
});
