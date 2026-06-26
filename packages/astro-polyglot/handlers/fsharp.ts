import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { findXmlDocFile, parseDotNetXml, dotNetXmlToAST, resolveProjectFile } from "../core/dotnet-xml-utils";
import { transformToMDX } from "../core/mdx-generator";
import type { BaseHandlerOptions, Handler } from "../core/plugin";

interface FSharpOptions extends BaseHandlerOptions {
  projectPath: string;
}

export const fsharpHandler: Handler = {
  name: "fsharp",
  async generate(options) {
    const opts = options as unknown as FSharpOptions;
    if (!opts.projectPath) throw new Error("F# handler requires a projectPath option");
    if (!existsSync(opts.projectPath)) throw new Error(`Project path does not exist: ${opts.projectPath}`);

    const resolvedPath = path.resolve(opts.projectPath);
    const buildCmd = `dotnet build "${resolvedPath}" --configuration Release /p:GenerateDocumentationFile=true 2>&1`;
    execSync(buildCmd, { encoding: "utf-8", stdio: "pipe", timeout: 180_000 });

    const projectInfo = resolveProjectFile(resolvedPath);
    const xmlDocPath = findXmlDocFile(resolvedPath, projectInfo?.assemblyName);
    if (!xmlDocPath) throw new Error("Could not find XML documentation file for F# project");

    const xmlContent = await import("node:fs").then((fs) => fs.readFileSync(xmlDocPath, "utf-8"));
    const doc = parseDotNetXml(xmlContent);
    const modules = dotNetXmlToAST(doc);

    if (modules.length === 0) throw new Error("XML doc extraction produced no modules for F#");
    return transformToMDX(modules, {
      outputDir: opts.output,
      language: "fsharp",
      ...(opts.pagination !== undefined ? { pagination: opts.pagination } : {}),
    });
  },
  async validate() {
    try {
      execSync("dotnet --version", { encoding: "utf-8", stdio: "pipe" });
      return { valid: true, errors: [] };
    } catch {
      return { valid: false, errors: ["dotnet SDK not found"] };
    }
  },
};
