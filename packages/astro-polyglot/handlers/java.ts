import { execSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { type ASTModule, transformToMDX } from "../core/mdx-generator";
import type { BaseHandlerOptions, Handler } from "../core/plugin";

interface JavaHandlerOptions extends BaseHandlerOptions {
  /** Source directories (packages or .java file paths) to document. */
  entryPoints: string[];
  /** Optional classpath for javadoc resolution (e.g. jar files, dependency directories). */
  classpath?: string;
}

/** Parsed documentation element from Java's JSON output. */
interface JavadocElement {
  name?: string;
  qualifiedName?: string;
  comment?: string;
  tags?: Array<{ name: string; text?: string }>;
  members?: JavadocElement[];
  params?: Array<{ name: string; type?: string; comment?: string }>;
  return?: { type?: string; comment?: string };
  modifiers?: string[];
  signature?: string;
}

/** Top-level javadoc JSON output shape. */
interface JavadocJSON {
  packages?: JavadocElement[];
  classes?: JavadocElement[];
  errors?: Array<{ entry_point: string; error: string }>;
}

/**
 * Java handler: Uses the JDK's `javadoc -Xdoclint:none -json` tool to
 * produce structured JSON output, then parses it into the common ASTModule
 * format used by the astro-polyglot MDX pipeline.
 *
 * @remarks
 * Requires a JDK installation (Java 9+ recommended). The `-json` flag is
 * supported by OpenJDK-based javadoc implementations that include the
 * JSON doclet (available in Oracle JDK / OpenJDK with the jdk.javadoc module).
 */
export const javaHandler: Handler = {
  name: "java",

  async generate(options) {
    const opts = options as unknown as JavaHandlerOptions;
    const entryPoints = opts.entryPoints;
    const classpath = opts.classpath;

    if (!entryPoints || entryPoints.length === 0) {
      throw new Error("Java handler requires at least one entryPoint (source directory or package)");
    }

    const modules = extractWithJavadoc(entryPoints, classpath);

    if (modules.length === 0) {
      throw new Error("javadoc extraction produced no modules");
    }

    const output = transformToMDX(modules, {
      outputDir: opts.output,
      language: "java",
      ...(opts.pagination !== undefined ? { pagination: opts.pagination } : {}),
    });

    return output;
  },

  async validate(_sourcePath) {
    try {
      execSync("javadoc --version", { encoding: "utf-8", stdio: "pipe" });
      return { valid: true, errors: [] };
    } catch {
      return {
        valid: false,
        errors: ["javadoc not found. Ensure a JDK is installed and javadoc is on your PATH."],
      };
    }
  },
};

/**
 * Runs `javadoc -Xdoclint:none -json` on the given entry points and
 * parses the resulting JSON output into ASTModule structures.
 */
function extractWithJavadoc(entryPoints: string[], classpath?: string): ASTModule[] {
  // Create a temporary output directory for javadoc JSON
  const tmpDir = mkdtempSync(path.join(tmpdir(), "javadoc-json-"));

  try {
    // Build the javadoc command
    const cmdParts = ["javadoc", "-Xdoclint:none", "-json", "-d", tmpDir];

    if (classpath) {
      cmdParts.push("-classpath", classpath);
    }

    // Resolve source paths: if an entry point is a directory containing .java files,
    // pass the directory; otherwise pass as-is
    for (const entry of entryPoints) {
      const resolved = path.resolve(entry);
      if (existsSync(resolved)) {
        cmdParts.push(resolved);
      } else {
        // Treat as a package name — javadoc will resolve it
        cmdParts.push(entry);
      }
    }

    const cmd = cmdParts.join(" ");
    execSync(cmd, {
      encoding: "utf-8",
      stdio: "pipe",
      maxBuffer: 10 * 1024 * 1024,
      timeout: 120_000,
    });

    // Locate the generated JSON file(s) in the temp directory
    const files = readdirSync(tmpDir);
    const jsonFiles = files.filter((f) => f.endsWith(".json"));

    if (jsonFiles.length === 0) {
      throw new Error("javadoc did not produce any JSON output. Check that your JDK supports the -json flag.");
    }

    // Parse all JSON files and merge into ASTModule[]
    const modules: ASTModule[] = [];

    for (const jsonFile of jsonFiles) {
      const jsonPath = path.join(tmpDir, jsonFile);
      const raw = readFileSync(jsonPath, "utf-8");
      const parsed = JSON.parse(raw) as JavadocJSON;

      // Process packages
      for (const pkg of parsed.packages ?? []) {
        const mod = convertJavadocPackage(pkg);
        if (mod) {
          modules.push(mod);
        }
      }

      // Process top-level classes (for default package)
      for (const cls of parsed.classes ?? []) {
        const mod = convertJavadocClassToModule(cls);
        if (mod) {
          modules.push(mod);
        }
      }
    }

    return modules;
  } finally {
    // Clean up temp directory
    try {
      execSync(`rm -rf "${tmpDir}"`, { stdio: "pipe" });
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Converts a javadoc JSON package element into an ASTModule.
 */
function convertJavadocPackage(pkg: JavadocElement): ASTModule | null {
  if (!pkg.name && !pkg.qualifiedName) return null;

  const mod: ASTModule = {
    name: pkg.qualifiedName ?? pkg.name ?? "unknown",
    docstring: pkg.comment?.trim() || undefined,
    classes: [],
    functions: [],
    variables: [],
  };

  for (const member of pkg.members ?? []) {
    if (member.name || member.qualifiedName) {
      const cls = convertJavadocClass(member);
      if (cls) {
        mod.classes?.push(cls);
      }
    }
  }

  return mod;
}

/**
 * Converts a top-level class element into an ASTModule (for default-package classes).
 */
function convertJavadocClassToModule(cls: JavadocElement): ASTModule | null {
  if (!cls.name && !cls.qualifiedName) return null;

  const innerClass = convertJavadocClass(cls);
  if (!innerClass) return null;

  return {
    name: cls.qualifiedName ?? cls.name ?? "unknown",
    docstring: cls.comment?.trim() || undefined,
    classes: [innerClass],
    functions: [],
    variables: [],
  };
}

/**
 * Converts a javadoc JSON class element into an ASTClass structure.
 */
function convertJavadocClass(element: JavadocElement): {
  name: string;
  docstring?: string;
  methods?: Array<{
    name: string;
    signature?: string;
    docstring?: string;
    parameters?: Array<{
      name: string;
      type?: string;
      description?: string;
      default?: string;
    }>;
    return_type?: string;
  }>;
  properties?: Array<{
    name: string;
    type?: string;
    docstring?: string;
  }>;
} | null {
  const name = element.name ?? element.qualifiedName;
  if (!name) return null;

  const cls: {
    name: string;
    docstring?: string;
    methods: Array<{
      name: string;
      signature?: string;
      docstring?: string;
      parameters?: Array<{
        name: string;
        type?: string;
        description?: string;
        default?: string;
      }>;
      return_type?: string;
    }>;
    properties: Array<{
      name: string;
      type?: string;
      docstring?: string;
    }>;
  } = {
    name,
    docstring: element.comment?.trim() || undefined,
    methods: [],
    properties: [],
  };

  for (const member of element.members ?? []) {
    if (!member.name) continue;

    const isMethod = member.signature !== undefined || member.params !== undefined || member.return !== undefined;

    if (isMethod) {
      cls.methods.push({
        name: member.name,
        signature: buildJavaSignature(member),
        docstring: member.comment?.trim() || undefined,
        parameters: member.params?.map((p) => ({
          name: p.name,
          type: p.type ?? undefined,
          description: p.comment?.trim() || undefined,
          default: undefined,
        })),
        return_type: member.return?.type ?? undefined,
      });
    } else {
      cls.properties.push({
        name: member.name,
        type: member.return?.type ?? undefined,
        docstring: member.comment?.trim() || undefined,
      });
    }
  }

  return cls;
}

/**
 * Builds a human-readable Java method signature from the parsed element.
 */
function buildJavaSignature(element: JavadocElement): string | undefined {
  const params = (element.params ?? []).map((p) => `${p.type ?? "Object"} ${p.name}`).join(", ");

  const returnType = element.return?.type ?? "void";
  const modifiers = (element.modifiers ?? []).filter((m) => m !== "abstract" && m !== "default");

  const prefix = modifiers.length > 0 ? `${modifiers.join(" ")} ` : "";
  return `${prefix}${returnType} ${element.name}(${params})`;
}
