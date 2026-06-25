import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { type ASTModule, transformToMDX } from "../core/mdx-generator";
import type { BaseHandlerOptions, Handler } from "../core/plugin";

interface KotlinHandlerOptions extends BaseHandlerOptions {
  /** Path to the Kotlin project root (containing build.gradle.kts or pom.xml). */
  projectPath: string;
  /** Optional output format for dokka. */
  outputFormat?: string;
}

/**
 * Represents a single documentation node from Dokka's JSON output.
 */
interface DokkaNode {
  name?: string;
  description?: string;
  kind?: string;
  children?: DokkaNode[];
  modifiers?: string[];
  parameters?: Array<{
    name: string;
    type: string;
    description?: string;
    defaultValue?: string;
  }>;
  receiver?: { type: string };
  returnType?: string;
}

/**
 * Top-level Dokka JSON output structure.
 */
interface DokkaOutput {
  documentation?: DokkaNode[];
  module?: string;
  errors?: Array<{ entry_point: string; error: string }>;
}

/**
 * Kotlin handler: Uses Dokka CLI to generate JSON documentation for
 * Kotlin source files, then parses that JSON into the common ASTModule
 * format for the starlight-polyglot MDX pipeline.
 *
 * @remarks
 * Dokka can be invoked via Gradle (`./gradlew dokkaJson`) or directly
 * via the Dokka CLI JAR. This handler attempts Gradle first, then falls
 * back to `dokka` CLI if available.
 */
export const kotlinHandler: Handler = {
  name: "kotlin",

  async generate(options) {
    const opts = options as unknown as KotlinHandlerOptions;
    const projectPath = opts.projectPath;

    if (!projectPath) {
      throw new Error("Kotlin handler requires a projectPath option");
    }

    if (!existsSync(projectPath)) {
      throw new Error(`Project path does not exist: ${projectPath}`);
    }

    const modules = extractWithDokka(projectPath, opts.outputFormat);

    if (modules.length === 0) {
      throw new Error("Dokka extraction produced no modules");
    }

    const output = transformToMDX(modules, {
      outputDir: opts.output,
      language: "kotlin",
      ...(opts.pagination !== undefined ? { pagination: opts.pagination } : {}),
    });

    return output;
  },

  async validate(_sourcePath) {
    try {
      execSync("dokka --version", { encoding: "utf-8", stdio: "pipe" });
      return { valid: true, errors: [] };
    } catch {
      try {
        execSync("gradle --version", { encoding: "utf-8", stdio: "pipe" });
        return { valid: true, errors: [] };
      } catch {
        return {
          valid: false,
          errors: [
            "Neither Dokka CLI nor Gradle found. Install Dokka from https://github.com/Kotlin/dokka or use Gradle.",
          ],
        };
      }
    }
  },
};

/**
 * Runs Dokka to produce JSON documentation and parses it into ASTModule[].
 */
function extractWithDokka(projectPath: string, _outputFormat?: string): ASTModule[] {
  const resolvedPath = path.resolve(projectPath);
  const outputDir = path.resolve(resolvedPath, "build", "dokka", "json");

  const gradleBuildFiles = ["build.gradle.kts", "build.gradle", "pom.xml"];
  const hasGradle = gradleBuildFiles.some((f) => existsSync(path.resolve(resolvedPath, f)));

  if (hasGradle) {
    runGradleDokka(resolvedPath);
  } else {
    runDokkaCli(resolvedPath, outputDir);
  }

  if (!existsSync(outputDir)) {
    throw new Error(
      `Dokka output directory not found at ${outputDir}. Ensure Dokka is configured to produce JSON output.`,
    );
  }

  return parseDokkaOutput(outputDir);
}

/**
 * Runs the Gradle dokkaJson task in the specified project directory.
 */
function runGradleDokka(projectPath: string): void {
  const gradleCmd = existsSync(path.join(projectPath, "gradlew")) ? "./gradlew" : "gradle";

  const cmd = `${gradleCmd} dokkaJson --no-daemon 2>&1`;
  execSync(cmd, {
    encoding: "utf-8",
    cwd: projectPath,
    stdio: "pipe",
    timeout: 300_000,
  });
}

/**
 * Runs the Dokka CLI directly.
 */
function runDokkaCli(projectPath: string, outputDir: string): void {
  const sourceDirs = findKotlinSourceDirs(projectPath);

  if (sourceDirs.length === 0) {
    throw new Error(
      `No Kotlin source directories found under ${projectPath}. ` +
        "Ensure your project has src/main/kotlin or similar.",
    );
  }

  const sourceArgs = sourceDirs.map((d) => `-src "${d}"`).join(" ");
  const cmd = `dokka -outputDir "${outputDir}" -format json ${sourceArgs} 2>&1`;

  execSync(cmd, {
    encoding: "utf-8",
    cwd: projectPath,
    stdio: "pipe",
    timeout: 180_000,
  });
}

/**
 * Finds Kotlin source directories under a project path.
 */
function findKotlinSourceDirs(projectPath: string): string[] {
  const candidates = ["src/main/kotlin", "src/commonMain/kotlin", "src/jvmMain/kotlin", "src/jsMain/kotlin", "src"];

  const dirs: string[] = [];
  for (const candidate of candidates) {
    const fullPath = path.resolve(projectPath, candidate);
    if (existsSync(fullPath)) {
      dirs.push(fullPath);
    }
  }
  return dirs;
}

/**
 * Parses Dokka JSON output files from the given directory into ASTModule[].
 */
function parseDokkaOutput(outputDir: string): ASTModule[] {
  const modules: ASTModule[] = [];
  const files = readdirSync(outputDir).filter((f) => f.endsWith(".json"));

  for (const file of files) {
    const filePath = path.join(outputDir, file);
    const raw = readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw) as DokkaOutput;

    const moduleName = data.module ?? path.basename(file, ".json");

    const mod: ASTModule = {
      name: moduleName,
      docstring: undefined,
      classes: [],
      functions: [],
      variables: [],
    };

    for (const node of data.documentation ?? []) {
      convertDokkaNode(node, mod);
    }

    modules.push(mod);
  }

  return modules;
}

/**
 * Recursively converts a Dokka documentation node into ASTModule entries.
 */
function convertDokkaNode(node: DokkaNode, mod: ASTModule): void {
  if (!node.name) return;

  const kind = node.kind ?? "";

  if (kind === "class" || kind === "interface" || kind === "object" || kind === "enum") {
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
      name: node.name,
      docstring: node.description?.trim() || undefined,
      methods: [],
      properties: [],
    };

    for (const child of node.children ?? []) {
      if (!child.name) continue;
      const childKind = child.kind ?? "";

      if (childKind === "function" || childKind === "method") {
        cls.methods.push({
          name: child.name,
          signature: buildKotlinSignature(child),
          docstring: child.description?.trim() || undefined,
          parameters: child.parameters?.map((p) => ({
            name: p.name,
            type: p.type ?? undefined,
            description: p.description?.trim() || undefined,
            default: p.defaultValue ?? undefined,
          })),
          return_type: child.returnType ?? undefined,
        });
      } else if (childKind === "property" || childKind === "field") {
        cls.properties.push({
          name: child.name,
          type: child.returnType ?? child.parameters?.[0]?.type ?? undefined,
          docstring: child.description?.trim() || undefined,
        });
      }
    }

    mod.classes?.push(cls);
  } else if (kind === "function") {
    mod.functions?.push({
      name: node.name,
      signature: buildKotlinSignature(node),
      docstring: node.description?.trim() || undefined,
      parameters: node.parameters?.map((p) => ({
        name: p.name,
        type: p.type ?? undefined,
        description: p.description?.trim() || undefined,
        default: p.defaultValue ?? undefined,
      })),
      return_type: node.returnType ?? undefined,
    });
  } else if (kind === "property" || kind === "field") {
    mod.variables?.push({
      name: node.name,
      type: node.returnType ?? undefined,
      docstring: node.description?.trim() || undefined,
    });
  }

  // Recurse into children for nested declarations
  for (const child of node.children ?? []) {
    convertDokkaNode(child, mod);
  }
}

/**
 * Builds a human-readable Kotlin function/method signature.
 */
function buildKotlinSignature(node: DokkaNode): string | undefined {
  const params = (node.parameters ?? [])
    .map((p) => {
      const defaultStr = p.defaultValue ? ` = ${p.defaultValue}` : "";
      return `${p.name}: ${p.type}${defaultStr}`;
    })
    .join(", ");

  const receiver = node.receiver ? `${node.receiver.type}.` : "";
  const returnType = node.returnType ? `: ${node.returnType}` : "";
  const modifiers = (node.modifiers ?? []).join(" ");

  const prefix = modifiers ? `${modifiers} ` : "";
  return `${prefix}${receiver}fun ${node.name}(${params})${returnType}`;
}
