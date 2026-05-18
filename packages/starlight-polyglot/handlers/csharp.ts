import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import type { Handler, BaseHandlerOptions } from '../core/plugin';
import { transformToMDX, type ASTModule } from '../core/mdx-generator';

interface CSharpHandlerOptions extends BaseHandlerOptions {
  projectPath: string;
  configuration?: string;
  xmlDocPath?: string;
}

/**
 * C# handler: Builds a .NET project to generate XML documentation,
 * then parses the XML doc file into structured ASTModule data.
 */
export const csharpHandler: Handler = {
  name: 'csharp',

  async generate(options) {
    const opts = options as unknown as CSharpHandlerOptions;
    const projectPath = opts.projectPath;

    if (!projectPath) {
      throw new Error('C# handler requires a projectPath option');
    }

    if (!existsSync(projectPath)) {
      throw new Error(`Project path does not exist: ${projectPath}`);
    }

    const modules = extractWithDotNet(projectPath, opts.configuration, opts.xmlDocPath);

    if (modules.length === 0) {
      throw new Error('C# XML doc extraction produced no modules');
    }

    const output = transformToMDX(modules, {
      outputDir: opts.output,
      language: 'csharp',
      ...(opts.pagination !== undefined ? { pagination: opts.pagination } : {}),
    });

    return output;
  },

  async validate(_sourcePath) {
    try {
      execSync('dotnet --version', { encoding: 'utf-8', stdio: 'pipe' });
      return { valid: true, errors: [] };
    } catch {
      return { valid: false, errors: ['dotnet SDK not found. Install from https://dotnet.microsoft.com/download'] };
    }
  },
};

function extractWithDotNet(
  projectPath: string,
  configuration = 'Release',
  explicitDocPath?: string,
): ASTModule[] {
  const resolvedPath = path.resolve(projectPath);

  // Build the project with XML doc generation enabled
  const buildCmd = `dotnet build "${resolvedPath}" --configuration ${configuration} /p:GenerateDocumentationFile=true 2>&1`;
  execSync(buildCmd, {
    encoding: 'utf-8',
    stdio: 'pipe',
    timeout: 180_000,
  });

  // Determine the XML doc path
  let xmlDocPath = explicitDocPath;

  if (!xmlDocPath) {
    const projectName = path.basename(resolvedPath, path.extname(resolvedPath));
    const possiblePaths: string[] = [
      path.resolve(resolvedPath, 'bin', configuration, 'net9.0', `${projectName}.xml`),
      path.resolve(resolvedPath, 'bin', configuration, 'net8.0', `${projectName}.xml`),
      path.resolve(resolvedPath, 'bin', configuration, 'net7.0', `${projectName}.xml`),
      path.resolve(resolvedPath, 'bin', configuration, 'net6.0', `${projectName}.xml`),
      path.resolve(resolvedPath, 'bin', configuration, 'netstandard2.0', `${projectName}.xml`),
    ];

    const binDir = path.resolve(resolvedPath, 'bin', configuration);
    if (existsSync(binDir)) {
      try {
        const frameworks = readdirSync(binDir, { withFileTypes: true });
        for (const fw of frameworks) {
          if (fw.isDirectory()) {
            possiblePaths.push(path.resolve(binDir, fw.name, `${projectName}.xml`));
          }
        }
      } catch {
        // Ignore read errors
      }
    }

    for (const p of possiblePaths) {
      if (existsSync(p)) {
        xmlDocPath = p;
        break;
      }
    }
  }

  if (!xmlDocPath || !existsSync(xmlDocPath)) {
    throw new Error(
      'Could not find XML documentation file. Ensure GenerateDocumentationFile is enabled in the .csproj.',
    );
  }

  return parseXmlDocFile(xmlDocPath);
}


interface XmlDocMember {
  name: string;
  summary?: string;
  params?: Array<{ name: string; text: string }>;
  returns?: string;
  typeParams?: Array<{ name: string; text: string }>;
}

function parseXmlDocFile(xmlPath: string): ASTModule[] {
  const xmlContent = readFileSync(xmlPath, 'utf-8');
  const modules: ASTModule[] = [];

  // Parse <member> tags from the XML doc file
  const memberRegex = /<member\s+name="([^"]+)"\s*>([\s\S]*?)<\/member>/g;
  const summaryRegex = /<summary>([\s\S]*?)<\/summary>/;
  const paramRegex = /<param\s+name="([^"]+)"\s*>([\s\S]*?)<\/param>/g;
  const returnsRegex = /<returns>([\s\S]*?)<\/returns>/;

  const members: XmlDocMember[] = [];
  let match: RegExpExecArray | null;

  while ((match = memberRegex.exec(xmlContent)) !== null) {
    const memberName = match[1];
    const memberBody = match[2];

    const summary = summaryRegex.exec(memberBody)?.[1]?.trim();
    const returns = returnsRegex.exec(memberBody)?.[1]?.trim();

    const params: Array<{ name: string; text: string }> = [];
    let paramMatch: RegExpExecArray | null;
    const localParamRegex = new RegExp(paramRegex.source, 'g');
    while ((paramMatch = localParamRegex.exec(memberBody)) !== null) {
      params.push({ name: paramMatch[1], text: paramMatch[2].trim() });
    }

    members.push({
      name: memberName,
      summary: summary?.trim() || undefined,
      params: params.length > 0 ? params : undefined,
      returns: returns?.trim() || undefined,
    });
  }

  // Group members by namespace/type
  const moduleMap = new Map<string, ASTModule>();
  const typeMap = new Map<string, {
    name: string;
    docstring?: string;
    methods: Array<{
      name: string;
      signature?: string;
      docstring?: string;
      parameters?: Array<{ name: string; type?: string; description?: string; default?: string }>;
      return_type?: string;
    }>;
    properties: Array<{ name: string; type?: string; docstring?: string }>;
  }>();

  for (const member of members) {
    const parts = member.name.split(':');
    if (parts.length < 2) continue;

    const prefix = parts[0];
    const fullName = parts.slice(1).join(':');

    if (prefix === 'T') {
      const lastDot = fullName.lastIndexOf('.');
      const namespace = lastDot >= 0 ? fullName.substring(0, lastDot) : '';
      const typeName = lastDot >= 0 ? fullName.substring(lastDot + 1) : fullName;

      if (!moduleMap.has(namespace)) {
        moduleMap.set(namespace, {
          name: namespace || 'Global',
          docstring: undefined,
          classes: [],
          functions: [],
          variables: [],
        });
      }

      typeMap.set(fullName, {
        name: typeName,
        docstring: member.summary,
        methods: [],
        properties: [],
      });
    } else if (prefix === 'M') {
      const parenIndex = fullName.indexOf('(');
      const methodPath = parenIndex >= 0 ? fullName.substring(0, parenIndex) : fullName;
      const lastDot = methodPath.lastIndexOf('.');
      const parentType = lastDot >= 0 ? methodPath.substring(0, lastDot) : '';
      const methodName = lastDot >= 0 ? methodPath.substring(lastDot + 1) : methodPath;

      const typeEntry = typeMap.get(parentType);
      if (typeEntry) {
        typeEntry.methods.push({
          name: methodName,
          docstring: member.summary,
          parameters: member.params?.map((p) => ({
            name: p.name,
            type: undefined,
            description: p.text || undefined,
            default: undefined,
          })),
          return_type: member.returns,
        });
      }
    } else if (prefix === 'P' || prefix === 'F') {
      const lastDot = fullName.lastIndexOf('.');
      const parentType = lastDot >= 0 ? fullName.substring(0, lastDot) : '';
      const propName = lastDot >= 0 ? fullName.substring(lastDot + 1) : fullName;

      const typeEntry = typeMap.get(parentType);
      if (typeEntry) {
        typeEntry.properties.push({
          name: propName,
          docstring: member.summary,
        });
      }
    }
  }

  // Assign types to their namespace modules
  for (const [fullName, typeEntry] of typeMap) {
    const lastDot = fullName.lastIndexOf('.');
    const namespace = lastDot >= 0 ? fullName.substring(0, lastDot) : '';

    const mod = moduleMap.get(namespace);
    if (mod) {
      mod.classes?.push({
        name: typeEntry.name,
        docstring: typeEntry.docstring,
        methods: typeEntry.methods.length > 0 ? typeEntry.methods : undefined,
        properties: typeEntry.properties.length > 0 ? typeEntry.properties : undefined,
      });
    }
  }

  return Array.from(moduleMap.values());
}
