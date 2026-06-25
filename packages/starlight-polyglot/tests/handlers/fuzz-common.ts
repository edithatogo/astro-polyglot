/**
 * starlight-polyglot — Shared fuzz/property test helpers
 *
 * Exposes reusable generators and assertions for handler contract tests.
 *
 * @module tests/handlers/fuzz-common
 */

import { expect } from "vitest";
import type { Handler, HandlerOptions, ValidationResult } from "../../core/handler";

export const ALL_LANGUAGES = [
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
] as const;

export type HandlerName = (typeof ALL_LANGUAGES)[number];

export const REQUIRED_OPTIONS: Record<HandlerName, string[]> = {
  python: ["entryPoints"],
  typescript: ["entryPoints"],
  rust: ["cratePath"],
  r: ["entryPoints"],
  julia: ["entryPoints"],
  csharp: ["projectPath"],
  go: ["modulePath"],
  java: ["entryPoints"],
  kotlin: ["projectPath"],
  cpp: ["projectPath"],
  swift: ["modulePath"],
  stata: ["entryPoints"],
  sas: ["entryPoints"],
  scala: ["entryPoints"],
  ruby: ["entryPoints"],
  dart: ["entryPoints"],
  php: ["entryPoints"],
  elixir: ["projectPath"],
};

export async function loadHandler(language: HandlerName): Promise<Handler | null> {
  try {
    const module = await import(`../../handlers/${language}`);
    const exportName = `${language}Handler`;
    const handler = module[exportName] as Handler | undefined;
    return handler ?? null;
  } catch {
    return null;
  }
}

export function randomGarbageString(): string {
  const values = [
    "",
    " ",
    "\n",
    "\0",
    "../traversal",
    "<script>alert(1)</script>",
    "x; rm -rf /",
    "unicode-π-λ-🚀",
    "a".repeat(2048),
  ];
  return values[Math.floor(Math.random() * values.length)] ?? "";
}

export function randomOptions(): Record<string, unknown> {
  const opts: Record<string, unknown> = {};
  if (Math.random() > 0.5) opts.output = randomGarbageString();
  if (Math.random() > 0.5) opts.pagination = Math.random() > 0.5;
  if (Math.random() > 0.5) opts.watch = Math.random() > 0.5;
  if (Math.random() > 0.5) opts.entryPoints = [randomGarbageString()];
  if (Math.random() > 0.5) opts.cratePath = randomGarbageString();
  if (Math.random() > 0.5) opts.modulePath = randomGarbageString();
  if (Math.random() > 0.5) opts.projectPath = randomGarbageString();
  return opts;
}

export async function assertValidateContract(handler: Handler, sourcePath = "."): Promise<void> {
  if (!handler.validate) return;
  const result: ValidationResult = await handler.validate(sourcePath);
  expect(typeof result.valid).toBe("boolean");
  expect(Array.isArray(result.errors)).toBe(true);
  for (const error of result.errors) {
    expect(typeof error).toBe("string");
  }
}

export async function assertMissingRequiredOption(handler: Handler, handlerName: HandlerName): Promise<void> {
  const required = REQUIRED_OPTIONS[handlerName];
  const minimalOptions = { output: "api/test" } as HandlerOptions & Record<string, unknown>;

  try {
    await handler.generate(minimalOptions);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";

    const keyMentioned = required.some((key) => message.toLowerCase().includes(key.toLowerCase()));
    expect(keyMentioned).toBe(true);
  }
}

export function randomValidShapedOptions(handlerName: HandlerName): Record<string, unknown> {
  const required = REQUIRED_OPTIONS[handlerName];
  const opts: Record<string, unknown> = { output: "api/test" };

  if (Math.random() > 0.5) opts.pagination = true;
  if (Math.random() > 0.3) opts.watch = false;

  for (const key of required) {
    if (key === "entryPoints") {
      opts[key] = Math.random() > 0.5 ? ["src/index.ts"] : ["lib/main.py", "lib/utils.py"];
    } else if (key === "cratePath") {
      opts[key] = "/tmp/fake-crate";
    } else if (key === "modulePath") {
      opts[key] = "/tmp/fake-module";
    } else if (key === "projectPath") {
      opts[key] = "/tmp/fake-project";
    }
  }

  return opts;
}

export function randomMissingOptions(handlerName: HandlerName): Record<string, unknown> {
  const required = REQUIRED_OPTIONS[handlerName];
  const opts: Record<string, unknown> = { output: "api/test" };

  if (Math.random() > 0.5) opts.pagination = Math.random() > 0.5;
  if (Math.random() > 0.7) opts.watch = Math.random() > 0.5;
  if (Math.random() > 0.6) opts.extraKey = randomGarbageString();
  if (Math.random() > 0.3) opts.unknownOption = Math.floor(Math.random() * 100);

  for (const key of required) {
    if (Math.random() > 0.5) opts[key] = undefined;
  }

  return opts;
}
