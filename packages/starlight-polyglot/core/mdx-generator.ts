import fs from 'node:fs/promises';
import path from 'node:path';
import { slug } from 'github-slugger';
import type { HandlerOutput, HandlerPage, MDXFrontmatter } from './plugin';

export interface MDXOutput {
  pages: HandlerPage[];
  sidebar: {
    label: string;
    items: { label: string; link: string }[];
  };
}

export interface ASTModule {
  name: string;
  docstring?: string | undefined;
  classes?: ASTClass[] | undefined;
  functions?: ASTFunction[] | undefined;
  variables?: ASTVariable[] | undefined;
}

export interface ASTClass {
  name: string;
  docstring?: string | undefined;
  methods?: ASTFunction[] | undefined;
  properties?: ASTVariable[] | undefined;
}

export interface ASTFunction {
  name: string;
  signature?: string | undefined;
  docstring?: string | undefined;
  parameters?: ASTParameter[] | undefined;
  return_type?: string | undefined;
}

export interface ASTParameter {
  name: string;
  type?: string | undefined;
  description?: string | undefined;
  default?: string | undefined;
}

export interface ASTVariable {
  name: string;
  type?: string | undefined;
  docstring?: string | undefined;
}

/**
 * Transforms structured AST data into Starlight-native MDX files.
 * Shared output pipeline used by ALL language handlers.
 */
export function transformToMDX(
  modules: ASTModule[],
  options: { outputDir: string; language?: string; pagination?: boolean },
): HandlerOutput {
  const pages: HandlerPage[] = [];
  const sidebarItems: { label: string; link: string }[] = [];
  const { outputDir, language } = options;

  for (const mod of modules) {
    const modSlug = slug(mod.name);
    const modLink = `${outputDir}/${modSlug}/`;

    pages.push({
      path: `${outputDir}/${modSlug}.mdx`,
      frontmatter: {
        title: mod.name,
        description: mod.docstring?.split('\n')[0] ?? `${language ?? ''} module: ${mod.name}`,
        sidebar: { label: mod.name },
        pagefind: true,
        ...(language ? { language } : {}),
        source: mod.name,
      },
      body: generateModuleBody(mod),
    });

    sidebarItems.push({ label: mod.name, link: modLink });

    // Class pages
    for (const cls of mod.classes ?? []) {
      const clsSlug = `${modSlug}.${slug(cls.name)}`;
      pages.push({
        path: `${outputDir}/${clsSlug}.mdx`,
        frontmatter: {
          title: `${mod.name}.${cls.name}`,
          description: cls.docstring?.split('\n')[0] ?? `Class ${cls.name}`,
          sidebar: { label: cls.name },
          pagefind: true,
          ...(language ? { language } : {}),
          source: `${mod.name}.${cls.name}`,
        },
        body: generateClassBody(cls),
      });
    }

    // Function pages (for top-level functions)
    for (const fn of mod.functions ?? []) {
      const fnSlug = `${modSlug}.${slug(fn.name)}`;
      pages.push({
        path: `${outputDir}/${fnSlug}.mdx`,
        frontmatter: {
          title: `${mod.name}.${fn.name}`,
          description: fn.docstring?.split('\n')[0] ?? `Function ${fn.name}`,
          sidebar: { label: fn.name },
          pagefind: true,
          ...(language ? { language } : {}),
          source: `${mod.name}.${fn.name}`,
        },
        body: generateFunctionBody(fn),
      });
    }
  }

  return {
    pages,
    sidebar: {
      label: (language ?? 'API').toUpperCase(),
      items: sidebarItems,
    },
  };
}

/**
 * Writes generated MDX pages to disk under the Starlight content directory.
 */
export async function writeMDXPages(
  output: HandlerOutput,
  docsDir: string,
): Promise<string[]> {
  const written: string[] = [];

  for (const page of output.pages) {
    const filePath = path.resolve(docsDir, page.path);
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    const content = [
      '---',
      ...Object.entries(page.frontmatter)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => {
          if (typeof v === 'object') {
            return `${k}:\n${renderYAMLValue(v, 2)}`;
          }
          return `${k}: ${renderYAMLValue(v)}`;
        }),
      '---',
      '',
      page.body,
    ].join('\n');

    await fs.writeFile(filePath, content, 'utf-8');
    written.push(filePath);
  }

  return written;
}

function renderYAMLValue(value: unknown, indent = 0): string {
  if (value === null || value === undefined) return '~';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') {
    if (value.includes('"') || value.includes('\n')) {
      return `|-\n${' '.repeat(indent)}${value}`;
    }
    return `"${value.replace(/"/g, '\\"')}"`;
  }
  if (Array.isArray(value)) {
    return value.map((v) => `\n${' '.repeat(indent)}- ${renderYAMLValue(v, indent + 2)}`).join('');
  }
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `\n${' '.repeat(indent)}${k}: ${renderYAMLValue(v, indent + 2)}`)
      .join('');
  }
  return String(value);
}

function generateModuleBody(mod: ASTModule): string {
  const parts: string[] = [];

  if (mod.docstring) {
    parts.push(mod.docstring, '');
  }

  if (mod.classes && mod.classes.length > 0) {
    parts.push('## Classes', '');
    for (const cls of mod.classes) {
      parts.push(`- [${cls.name}](${slug(mod.name)}.${slug(cls.name)}/) ${cls.docstring?.split('\n')[0] ?? ''}`);
    }
    parts.push('');
  }

  if (mod.functions && mod.functions.length > 0) {
    parts.push('## Functions', '');
    for (const fn of mod.functions) {
      parts.push(`- [${fn.name}](${slug(mod.name)}.${slug(fn.name)}/)\n  ${fn.docstring?.split('\n')[0] ?? ''}`);
    }
    parts.push('');
  }

  return parts.join('\n');
}

function generateClassBody(cls: ASTClass): string {
  const parts: string[] = [];

  if (cls.docstring) {
    parts.push(cls.docstring, '');
  }

  if (cls.methods && cls.methods.length > 0) {
    parts.push('## Methods', '');
    for (const method of cls.methods) {
      parts.push(generateFunctionBody(method));
    }
  }

  if (cls.properties && cls.properties.length > 0) {
    parts.push('## Properties', '');
    for (const prop of cls.properties) {
      parts.push(`### ${prop.name}`);
      if (prop.type) parts.push(`- **Type**: \`${prop.type}\``);
      if (prop.docstring) parts.push(`- ${prop.docstring}`);
      parts.push('');
    }
  }

  return parts.join('\n');
}

function generateFunctionBody(fn: ASTFunction): string {
  const parts: string[] = [];

  parts.push(`### ${fn.name}`);
  if (fn.signature) {
    parts.push('', '```', fn.signature, '```', '');
  }

  if (fn.docstring) {
    parts.push(fn.docstring, '');
  }

  if (fn.parameters && fn.parameters.length > 0) {
    parts.push('**Parameters:**', '');
    for (const param of fn.parameters) {
      const defaultStr = param.default ? ` (default: \`${param.default}\`)` : '';
      const typeStr = param.type ? `\`${param.type}\`` : '';
      parts.push(`- \`${param.name}\`${typeStr ? ` ${typeStr}` : ''}${defaultStr}`);
      if (param.description) parts.push(`  - ${param.description}`);
    }
    parts.push('');
  }

  if (fn.return_type) {
    parts.push(`**Returns:** \`${fn.return_type}\``, '');
  }

  return parts.join('\n');
}
