import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type ASTModule, transformToMDX, writeMDXPages } from "../core/mdx-generator";

function createTempDir(): string {
  return fs.mkdtemp(path.join(os.tmpdir(), "starlight-polyglot-"));
}

describe("transformToMDX()", () => {
  it("returns empty output for empty modules array", () => {
    const output = transformToMDX([], { outputDir: "api/test" });
    expect(output.pages).toHaveLength(0);
    expect(output.sidebar.items).toHaveLength(0);
    expect(output.sidebar.label).toBe("API");
  });

  it("produces one page per module with docstring", () => {
    const modules: ASTModule[] = [
      { name: "alpha", docstring: "Alpha module." },
      { name: "beta", docstring: "Beta module." },
    ];
    const output = transformToMDX(modules, { outputDir: "api/py", language: "python" });
    expect(output.pages).toHaveLength(2);
    const alphaPage = output.pages.find((p) => p.path === "api/py/alpha.mdx");
    expect(alphaPage).toBeDefined();
    expect(alphaPage!.frontmatter.title).toBe("alpha");
    expect(alphaPage!.frontmatter.description).toBe("Alpha module.");
    expect(alphaPage!.frontmatter.language).toBe("python");
    expect(alphaPage!.frontmatter.source).toBe("alpha");
    expect(alphaPage!.frontmatter.pagefind).toBe(true);
  });

  it("uses fallback description when docstring is missing", () => {
    const output = transformToMDX([{ name: "mymod" }], { outputDir: "api/py", language: "python" });
    expect(output.pages[0]!.frontmatter.description).toBe("python module: mymod");
  });

  it("generates class page for module with classes", () => {
    const modules: ASTModule[] = [
      {
        name: "mymodule",
        classes: [
          {
            name: "MyClass",
            docstring: "A sample class.",
            methods: [
              {
                name: "method_a",
                signature: "method_a(self, x: int) -> int",
                docstring: "Does something.",
                parameters: [{ name: "x", type: "int", description: "An integer" }],
                return_type: "int",
              },
            ],
            properties: [{ name: "prop1", type: "str", docstring: "A property." }],
          },
        ],
      },
    ];
    const output = transformToMDX(modules, { outputDir: "api/python", language: "python" });
    expect(output.pages).toHaveLength(2);
    const cp = output.pages.find((p) => p.path.startsWith("api/python/mymodule.myclass"));
    expect(cp).toBeDefined();
    expect(cp!.frontmatter.title).toBe("mymodule.MyClass");
    expect(cp!.frontmatter.description).toBe("A sample class.");
    expect(cp!.frontmatter.source).toBe("mymodule.MyClass");
    expect(cp!.body).toContain("method_a");
    expect(cp!.body).toContain("prop1");
  });

  it("generates function page for module with functions", () => {
    const modules: ASTModule[] = [
      {
        name: "utils",
        functions: [
          {
            name: "doStuff",
            signature: "doStuff(x: number): boolean",
            docstring: "Does stuff.",
            parameters: [{ name: "x", type: "number" }],
            return_type: "boolean",
          },
        ],
      },
    ];
    const output = transformToMDX(modules, { outputDir: "api/ts", language: "typescript" });
    expect(output.pages).toHaveLength(2);
    const fp = output.pages.find((p) => p.path.startsWith("api/ts/utils.dostuff"));
    expect(fp).toBeDefined();
    expect(fp!.frontmatter.title).toBe("utils.doStuff");
    expect(fp!.frontmatter.description).toBe("Does stuff.");
    expect(fp!.body).toContain("boolean");
  });
  it("generates module + class + function pages together", () => {
    const modules: ASTModule[] = [
      {
        name: "mymodule",
        functions: [{ name: "hello", docstring: "Say hello." }],
        classes: [{ name: "MyClass", docstring: "A class." }],
      },
    ];
    const output = transformToMDX(modules, { outputDir: "api/py", language: "python" });
    expect(output.pages).toHaveLength(3);
    expect(output.pages.some((p) => p.path === "api/py/mymodule.mdx")).toBe(true);
    expect(output.pages.some((p) => p.path.startsWith("api/py/mymodule.myclass"))).toBe(true);
    expect(output.pages.some((p) => p.path.startsWith("api/py/mymodule.hello"))).toBe(true);
  });

  it("capitalizes sidebar label from language", () => {
    const m = [{ name: "mod", docstring: "A module." }];
    const py = transformToMDX(m, { outputDir: "api/py", language: "python" });
    expect(py.sidebar.label).toBe("PYTHON");
    const ts = transformToMDX(m, { outputDir: "api/ts", language: "typescript" });
    expect(ts.sidebar.label).toBe("TYPESCRIPT");
  });

  it("uses default sidebar label when language omitted", () => {
    const output = transformToMDX([{ name: "mod" }], { outputDir: "api/sdk" });
    expect(output.sidebar.label).toBe("API");
  });

  it("produces sidebar items matching module pages", () => {
    const modules: ASTModule[] = [
      { name: "alpha", docstring: "Alpha module." },
      { name: "beta", docstring: "Beta module." },
    ];
    const output = transformToMDX(modules, { outputDir: "api/go", language: "go" });
    expect(output.sidebar.items).toHaveLength(2);
    expect(output.sidebar.items[0]!.label).toBe("alpha");
    expect(output.sidebar.items[0]!.link).toBe("api/go/alpha/");
    expect(output.sidebar.items[1]!.label).toBe("beta");
    expect(output.sidebar.items[1]!.link).toBe("api/go/beta/");
  });

  it("all pages have valid frontmatter fields", () => {
    const modules: ASTModule[] = [
      {
        name: "testmod",
        docstring: "Test module.",
        classes: [{ name: "TestClass", docstring: "A class." }],
        functions: [{ name: "testFn", docstring: "A function." }],
      },
    ];
    const output = transformToMDX(modules, { outputDir: "api/py", language: "python" });
    for (const page of output.pages) {
      expect(page.frontmatter).toHaveProperty("title");
      expect(typeof page.frontmatter.title).toBe("string");
      expect(page.frontmatter).toHaveProperty("sidebar");
      expect(page.frontmatter.sidebar).toHaveProperty("label");
      expect(page.frontmatter).toHaveProperty("pagefind");
      expect(page.frontmatter.pagefind).toBe(true);
      expect(page.frontmatter).toHaveProperty("language");
      expect(page.frontmatter).toHaveProperty("source");
      expect(typeof page.body).toBe("string");
    }
  });

  it("handles empty docstring gracefully", () => {
    const output = transformToMDX([{ name: "empty_doc", docstring: "" }], { outputDir: "api/py", language: "python" });
    // Empty docstring produces empty description since ''.split('\n')[0] is '' not undefined
    expect(typeof output.pages[0]!.frontmatter.description).toBe("string");
  });
});

describe("writeMDXPages()", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("writes a single page to disk", async () => {
    const output = {
      pages: [
        {
          path: "api/test/hello.mdx",
          frontmatter: { title: "hello", description: "Hello module.", sidebar: { label: "hello" }, pagefind: true },
          body: "Hello world content.",
        },
      ],
      sidebar: { label: "API", items: [] },
    };
    const written = await writeMDXPages(output, tempDir);
    expect(written).toHaveLength(1);
    const expectedPath = path.resolve(tempDir, "api/test/hello.mdx");
    expect(written[0]).toBe(expectedPath);
    const content = await fs.readFile(expectedPath, "utf-8");
    expect(content).toContain("---");
    expect(content).toContain("title:");
    expect(content).toContain("Hello module.");
    expect(content).toContain("pagefind: true");
    expect(content).toContain("Hello world content.");
  });

  it("writes multiple pages from full transformToMDX output", async () => {
    const modules: ASTModule[] = [
      {
        name: "mymodule",
        docstring: "My module.",
        functions: [{ name: "helper", docstring: "Helper fn." }],
        classes: [{ name: "MyClass", docstring: "My class." }],
      },
    ];
    const mdxOutput = transformToMDX(modules, { outputDir: "api/python", language: "python" });
    const written = await writeMDXPages(mdxOutput, tempDir);
    expect(written).toHaveLength(3);
    for (const filePath of written) {
      const content = await fs.readFile(filePath, "utf-8");
      expect(content).toMatch(/^---\n/);
      expect(content).toContain("title:");
      expect(content).toMatch(/\n---\n\n/);
    }
  });

  it("creates nested directories as needed", async () => {
    const output = {
      pages: [
        {
          path: "deeply/nested/path/api.mdx",
          frontmatter: { title: "api", sidebar: { label: "api" } },
          body: "Nested content.",
        },
      ],
      sidebar: { label: "API", items: [] },
    };
    const written = await writeMDXPages(output, tempDir);
    const expectedPath = path.resolve(tempDir, "deeply/nested/path/api.mdx");
    expect(written[0]).toBe(expectedPath);
    const stat = await fs.stat(expectedPath);
    expect(stat.isFile()).toBe(true);
    const content = await fs.readFile(expectedPath, "utf-8");
    expect(content).toContain("Nested content.");
  });
  it("preserves page order in returned file paths", async () => {
    const output = {
      pages: [
        { path: "first.mdx", frontmatter: { title: "first", sidebar: { label: "first" } }, body: "First." },
        { path: "second.mdx", frontmatter: { title: "second", sidebar: { label: "second" } }, body: "Second." },
        { path: "third.mdx", frontmatter: { title: "third", sidebar: { label: "third" } }, body: "Third." },
      ],
      sidebar: { label: "API", items: [] },
    };
    const written = await writeMDXPages(output, tempDir);
    expect(written).toHaveLength(3);
    expect(path.basename(written[0]!)).toBe("first.mdx");
    expect(path.basename(written[1]!)).toBe("second.mdx");
    expect(path.basename(written[2]!)).toBe("third.mdx");
  });

  it("writes nested YAML objects in frontmatter", async () => {
    const output = {
      pages: [
        {
          path: "obj.mdx",
          frontmatter: { title: "obj", sidebar: { label: "obj-label", order: 1 }, pagefind: true },
          body: "Body text.",
        },
      ],
      sidebar: { label: "API", items: [] },
    };
    const written = await writeMDXPages(output, tempDir);
    const content = await fs.readFile(written[0]!, "utf-8");
    expect(content).toContain("sidebar:");
    expect(content).toContain("label:");
    expect(content).toContain("obj-label");
    expect(content).toMatch(/^---/m);
    expect(content).toMatch(/---\n\n/);
  });

  it("handles pages with empty body", async () => {
    const output = {
      pages: [
        {
          path: "empty.mdx",
          frontmatter: { title: "empty", sidebar: { label: "empty" } },
          body: "",
        },
      ],
      sidebar: { label: "API", items: [] },
    };
    const written = await writeMDXPages(output, tempDir);
    const content = await fs.readFile(written[0]!, "utf-8");
    expect(content).toMatch(/---/);
    expect(content).toMatch(/---\n\n$/m);
  });
});
