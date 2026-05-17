import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightLinksValidator from 'starlight-links-validator';
import starlightVersions from 'starlight-versions';
import starlightLlmsTxt from 'starlight-llms-txt';
import polyglot, { sidebarGroup } from 'starlight-polyglot';

export default defineConfig({
  site: 'https://edithatogo.github.io',
  base: '/starlight-polyglot',
  trailingSlash: 'always',
  integrations: [
    starlight({
      title: 'starlight-polyglot',
      logo: {
        alt: 'starlight-polyglot',
        src: './logo.svg',
        replacesTitle: false,
      },
      social: [
        { icon: 'gitHub', label: 'GitHub', href: 'https://github.com/edithatogo/starlight-polyglot' },
      ],
      editLink: {
        baseUrl: 'https://github.com/edithatogo/starlight-polyglot/edit/main/docs/astro-site/',
      },
      plugins: [
        polyglot({
          typescript: {
            entryPoints: ['../../packages/starlight-polyglot/index.ts'],
            tsconfig: '../../packages/starlight-polyglot/tsconfig.json',
            output: 'api/typescript',
          },
        }),
        starlightLinksValidator(),
        starlightVersions({
          versions: [{ slug: 'latest', label: 'latest' }],
        }),
        starlightLlmsTxt(),
      ],
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { label: 'Overview', link: '/' },
            { label: 'Installation & Setup', link: '/getting-started/' },
          ],
        },
        {
          label: 'Configuration',
          items: [{ label: 'Configuration Reference', link: '/configuration/' }],
        },
        {
          label: 'Supported Languages',
          items: [
            { label: 'Python', link: '/languages/python/' },
            { label: 'TypeScript', link: '/languages/typescript/' },
            { label: 'Rust', link: '/languages/rust/' },
            { label: 'R', link: '/languages/r/' },
            { label: 'Julia', link: '/languages/julia/' },
            { label: 'C#', link: '/languages/csharp/' },
            { label: 'Go', link: '/languages/go/' },
          ],
        },
        {
          label: 'Handler Development Guide',
          link: '/handler-development/',
        },
        sidebarGroup,
        {
          label: 'Architecture',
          link: '/architecture/',
        },
        {
          label: 'Contributing',
          link: '/contributing/',
        },
      ],
    }),
  ],
});
