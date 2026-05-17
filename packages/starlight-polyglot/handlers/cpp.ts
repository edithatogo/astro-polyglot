import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Handler, BaseHandlerOptions } from '../core/plugin';
import { transformToMDX, type ASTModule } from '../core/mdx-generator';

interface CppHandlerOptions extends BaseHandlerOptions {
  /** Path to the C/C++ project root containing a Doxyfile (or CMakeLists.txt with doxygen target). */
  projectPath: string;
  /** Optional path to a custom Doxyfile. Defaults to <projectPath>/Doxyfile. */
  doxyfilePath?: string;
  /** Additional Doxygen input directories, relative to projectPath. */
  inputDirs?: string[];
}

/**
 * Represents a compound definition (class, struct, union, interface) from Doxygen XML.
 */
interface DoxygenCompound {
  kind: string;
  name?: string;
  briefdescription?: string;
  detaileddescription?: string;
  sectiondef?: DoxygenSectionDef[];
  includes?: { name?: string }[];
}

/**
 * Represents a member definition (function, variable) from Doxygen XML.
 */
interface DoxygenMember {
  kind: string;
  name?: string;
  definition?: string;
  argsstring?: string;
  briefdescription?: string;
  detaileddescription?: string;
  type?: string;
  initializer?: string;
  param?: Array<{
    name?: string;
    type?: string;
    defval?: string;
    briefdescription?: string;
  }>;
}

interface DoxygenSectionDef {
  kind: string;
  memberdef?: DoxygenMember[];
}

/**
 * Top-level Doxygen XML compound output shape.
 */
interface DoxygenCompoundFile {
  compound?: DoxygenCompound;
  compounddef?: DoxygenCompound;
}

/**
 * C/C++ handler: Uses Doxygen to generate XML documentation, then parses
 * the XML output into structured ASTModule data for the starlight-polyglot
 * MDX pipeline.
 *
 * @remarks
 * Requires `doxygen` to be installed on the system. The handler runs
 * Doxygen with XML output enabled, then reads and parses the generated
 * XML files. Supports classes, structs, functions, variables, and enums.
 */
export const cppHandler: Handler = {
  name: 'cpp',

  async generate(options) {
    const opts = options as unknown as CppHandlerOptions;
    const projectPath = opts.projectPath;
    const doxyfilePath = opts.doxyfilePath;

    if (!projectPath) {
      throw new Error('C++ handler requires a projectPath option');
    }

    if (!existsSync(projectPath)) {
      throw new Error(`Project path does not exist: ${projectPath}`);
    }

    const modules = extractWithDoxygen(projectPath, doxyfilePath, opts.inputDirs);

    if (modules.length === 0) {
      throw new Error('Doxygen extraction produced no modules');
    }

    const output = transformToMDX(modules, {
      outputDir: opts.output,
      language: 'cpp',
      pagination: opts.pagination,
    });

    return output;
  },

  async validate(_sourcePath) {
    try {
      execSync('doxygen --version', { encoding: 'utf-8', stdio: 'pipe' });
      return { valid: true, errors: [] };
    } catch {
      return {
        valid: false,
        errors: [
          'doxygen not found. Install from https://www.doxygen.nl/download.html',
        ],
      };
    }
  },
};

/**
 * Runs Doxygen to produce XML documentation and parses it into ASTModule[].
 */
function extractWithDoxygen(
  projectPath: string,
  doxyfilePath?: string,
  inputDirs?: string[],
): ASTModule[] {
  const resolvedPath = path.resolve(projectPath);
  const outputDir = path.resolve(resolvedPath, 'doxygen_xml');

  const doxyfile = doxyfilePath
    ? path.resolve(doxyfilePath)
    : path.resolve(resolvedPath, 'Doxyfile');

  if (!existsSync(doxyfile)) {
    generateMinimalDoxyfile(resolvedPath, outputDir, inputDirs);
  }

  const doxygenCmd = `doxygen "${doxyfile}" 2>&1`;
  execSync(doxygenCmd, {
    encoding: 'utf-8',
    cwd: resolvedPath,
    stdio: 'pipe',
    timeout: 180_000,
  });

  if (!existsSync(outputDir)) {
    throw new Error(
      `Doxygen XML output directory not found at ${outputDir}. ` +
        'Ensure Doxygen is configured with GENERATE_XML=YES.',
    );
  }

  return parseDoxygenXml(outputDir);
}

/**
 * Generates a minimal Doxyfile inline if none exists.
 */
function generateMinimalDoxyfile(
  projectPath: string,
  xmlOutputDir: string,
  inputDirs?: string[],
): void {
  const input = inputDirs && inputDirs.length > 0
    ? inputDirs.map((d) => path.resolve(projectPath, d)).join(' ')
    : projectPath;

  const doxyfileContent = [
    'PROJECT_NAME           = "starlight-polyglot-cpp"',
    'OUTPUT_DIRECTORY       = ' + projectPath,
    'GENERATE_XML           = YES',
    'XML_OUTPUT             = doxygen_xml',
    'INPUT                  = ' + input,
    'RECURSIVE              = YES',
    'EXTRACT_ALL            = YES',
    'EXTRACT_STATIC         = YES',
    'EXTRACT_PRIVATE        = YES',
    'EXTRACT_PACKAGE        = YES',
    'SOURCE_BROWSER         = NO',
    'HTML_OUTPUT            = /dev/null',
    'QUIET                  = YES',
    'WARNINGS               = NO',
  ].join('\n');

  writeFileSync(path.join(projectPath, 'Doxyfile'), doxyfileContent, 'utf-8');
}

/**
 * Parses Doxygen XML output files into ASTModule[].
 */
function parseDoxygenXml(xmlDir: string): ASTModule[] {
  const modules: ASTModule[] = [];
  const files = readdirSync(xmlDir).filter(
    (f) => f.endsWith('.xml') && f !== 'index.xml' && f !== 'DoxygenLayout.xml',
  );

  for (const file of files) {
    const filePath = path.join(xmlDir, file);
    const raw = readFileSync(filePath, 'utf-8');

    try {
      const data = parseDoxygenXmlRaw(raw);
      if (data) {
        const mod = convertDoxygenCompound(data);
        if (mod) {
          modules.push(mod);
        }
      }
    } catch {
      continue;
    }
  }

  return modules;
}

/**
 * Parses raw Doxygen XML content into a structured compound object using regex.
 * Doxygen XML has a predictable structure that can be parsed without a full XML DOM.
 */
function parseDoxygenXmlRaw(xmlContent: string): DoxygenCompound | null {
  const compoundDefMatch = xmlContent.match(
    /<compounddef\s+kind="([^"]*)"[^>]*>([\s\S]*?)<\/compounddef>/,
  );
  if (!compoundDefMatch) return null;

  const kind = compoundDefMatch[1];
  const body = compoundDefMatch[2];

  const nameMatch = body.match(/<compoundname>([^<]*)<\/compoundname>/);
  const name = nameMatch ? nameMatch[1].trim() : undefined;

  const briefMatch = body.match(/<briefdescription>([\s\S]*?)<\/briefdescription>/);
  const briefdescription = extractParaText(briefMatch ? briefMatch[1] : '');

  const detailedMatch = body.match(/<detaileddescription>([\s\S]*?)<\/detaileddescription>/);
  const detaileddescription = extractParaText(detailedMatch ? detailedMatch[1] : '');

  const compound: DoxygenCompound = {
    kind,
    name,
    briefdescription,
    detaileddescription,
    sectiondef: [],
  };

  // Parse sectiondef blocks
  const sectionRegex = /<sectiondef\s+kind="([^"]*)">([\s\S]*?)<\/sectiondef>/g;
  let sectionMatch: RegExpExecArray | null;

  while ((sectionMatch = sectionRegex.exec(body)) !== null) {
    const sectionKind = sectionMatch[1];
    const sectionBody = sectionMatch[2];
    const members = parseMemberDefs(sectionBody);
    compound.sectiondef?.push({
      kind: sectionKind,
      memberdef: members.length > 0 ? members : undefined,
    });
  }

  return compound;
}

/**
 * Extracts text content from a <para>...</para> block, stripping HTML tags.
 */
function extractParaText(paraContent: string): string | undefined {
  const cleaned = paraContent
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || undefined;
}

/**
 * Parses <memberdef> blocks from a section body.
 */
function parseMemberDefs(sectionBody: string): DoxygenMember[] {
  const members: DoxygenMember[] = [];
  const memberRegex = /<memberdef\s+kind="([^"]*)"[^>]*>([\s\S]*?)<\/memberdef>/g;
/**
 * Converts a parsed Doxygen compound into an ASTModule.
 */
function convertDoxygenCompound(compound: DoxygenCompound): ASTModule | null {
  if (!compound.name) return null;

  const description = compound.detaileddescription ?? compound.briefdescription;

  const mod: ASTModule = {
    name: compound.name,
    docstring: description,
    classes: [],
    functions: [],
    variables: [],
  };

  for (const section of compound.sectiondef ?? []) {
    for (const member of section.memberdef ?? []) {
      if (!member.name) continue;

      if (member.kind === 'function' || member.kind === 'signal' || member.kind === 'slot') {
        mod.functions?.push({
          name: member.name,
          signature: `${member.definition ?? ''} ${member.argsstring ?? ''}`.trim() || undefined,
          docstring: member.detaileddescription ?? member.briefdescription ?? undefined,
          parameters: member.param?.map((p) => ({
            name: p.name ?? 'param',
            type: p.type ?? undefined,
            description: p.briefdescription ?? undefined,
            default: p.defval ?? undefined,
          })),
          return_type: member.type ?? undefined,
        });
      } else if (member.kind === 'variable' || member.kind === 'enumvalue') {
        mod.variables?.push({
          name: member.name,
          type: member.type ?? undefined,
          docstring: member.detaileddescription ?? member.briefdescription ?? undefined,
        });
      }
    }
  }

  // If this compound is a class/struct/union, add it as a class
  if (compound.kind === 'class' || compound.kind === 'struct' || compound.kind === 'union' || compound.kind === 'interface') {
    const cls: {
      name: string;
      docstring?: string;
      methods?: Array<{
        name: string;
        signature?: string;
        docstring?: string;
        parameters?: Array<{ name: string; type?: string; description?: string; default?: string }>;
        return_type?: string;
      }>;
      properties?: Array<{ name: string; type?: string; docstring?: string }>;
    } = {
      name: compound.name,
      docstring: description,
      methods: [],
      properties: [],
    };

    for (const section of compound.sectiondef ?? []) {
      for (const member of section.memberdef ?? []) {
        if (!member.name) continue;

        if (member.kind === 'function' || member.kind === 'signal' || member.kind === 'slot') {
          cls.methods?.push({
            name: member.name,
            signature: `${member.definition ?? ''} ${member.argsstring ?? ''}`.trim() || undefined,
            docstring: member.detaileddescription ?? member.briefdescription ?? undefined,
            parameters: member.param?.map((p) => ({
              name: p.name ?? 'param',
              type: p.type ?? undefined,
              description: p.briefdescription ?? undefined,
              default: p.defval ?? undefined,
            })),
            return_type: member.type ?? undefined,
          });
        } else if (member.kind === 'variable' || member.kind === 'enumvalue') {
          cls.properties?.push({
            name: member.name,
            type: member.type ?? undefined,
            docstring: member.detaileddescription ?? member.briefdescription ?? undefined,
          });
        }
      }
    }

    mod.functions = [];
    mod.classes?.push(cls);
  }

  return mod;
}

  let match: RegExpExecArray | null;

  while ((match = memberRegex.exec(sectionBody)) !== null) {
    const kind = match[1];
    const body = match[2];

    const nameMatch = body.match(/<name>([^<]*)<\/name>/);
    const name = nameMatch ? nameMatch[1].trim() : undefined;

    const defMatch = body.match(/<definition>([^<]*)<\/definition>/);
    const definition = defMatch ? defMatch[1].trim() : undefined;

    const argsMatch = body.match(/<argsstring>([^<]*)<\/argsstring>/);
    const argsstring = argsMatch ? argsMatch[1].trim() : undefined;

    const typeMatch = body.match(/<type>([\s\S]*?)<\/type>/);
    const type = typeMatch ? typeMatch[1].replace(/<[^>]*>/g, '').trim() : undefined;

    const briefMatch = body.match(/<briefdescription>([\s\S]*?)<\/briefdescription>/);
    const briefdescription = extractParaText(briefMatch ? briefMatch[1] : '');

    const detailedMatch = body.match(/<detaileddescription>([\s\S]*?)<\/detaileddescription>/);
    const detaileddescription = extractParaText(detailedMatch ? detailedMatch[1] : '');

    const initMatch = body.match(/<initializer>([^<]*)<\/initializer>/);
    const initializer = initMatch ? initMatch[1].trim() : undefined;

    // Parse parameters
    const params: Array<{ name?: string; type?: string; defval?: string; briefdescription?: string }> = [];
    const paramRegex = /<param>([\s\S]*?)<\/param>/g;
    let paramMatch: RegExpExecArray | null;

    while ((paramMatch = paramRegex.exec(body)) !== null) {
      const pBody = paramMatch[1];
      const pName = pBody.match(/<declname>([^<]*)<\/declname>/)?.[1]?.trim();
      const pType = pBody.match(/<type>([\s\S]*?)<\/type>/)?.[1]?.replace(/<[^>]*>/g, '').trim();
      const pDefval = pBody.match(/<defval>([^<]*)<\/defval>/)?.[1]?.trim();
      const pBrief = extractParaText(
        pBody.match(/<briefdescription>([\s\S]*?)<\/briefdescription>/)?.[1] ?? '',
      );
      params.push({ name: pName, type: pType, defval: pDefval, briefdescription: pBrief });
    }

    members.push({
      kind, name, definition, argsstring, briefdescription, detaileddescription,
      type, initializer, param: params.length > 0 ? params : undefined,
    });
  }

  return members;
}
