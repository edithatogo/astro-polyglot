import starlight from "@astrojs/starlight";
import polyglot, { sidebarGroup } from "astro-polyglot";
import { defineConfig } from "astro/config";
import starlightLinksValidator from "starlight-links-validator";
import starlightLlmsTxt from "starlight-llms-txt";
import starlightVersions from "starlight-versions";

export default defineConfig({
  site: "https://edithatogo.github.io",
  base: "/astro-polyglot",
  trailingSlash: "always",
  integrations: [
    starlight({
      title: "astro-polyglot",
      logo: {
        alt: "astro-polyglot",
        src: "./src/logo.svg",
        replacesTitle: false,
      },
      social: [{ icon: "github", label: "GitHub", href: "https://github.com/edithatogo/astro-polyglot" }],
      editLink: {
        baseUrl: "https://github.com/edithatogo/astro-polyglot/edit/main/docs/astro-site/",
      },
      plugins: [
        polyglot({
          typescript: {
            entryPoints: ["../../packages/astro-polyglot/core/router.ts"],
            tsconfig: "../../packages/astro-polyglot/tsconfig.typedoc.json",
            output: "api/typescript",
          },
        }),
        starlightLinksValidator(),
        starlightVersions({
          versions: [{ slug: "latest", label: "latest" }],
        }),
        starlightLlmsTxt(),
      ],
      sidebar: [
        {
          label: "Getting Started",
          items: [
            { label: "Overview", link: "/" },
            { label: "Installation & Setup", link: "/getting-started/" },
          ],
        },
        {
          label: "Configuration",
          items: [{ label: "Configuration Reference", link: "/configuration/" }],
        },
        {
          label: "Supported Languages",
          items: [
            { label: "Python", link: "/languages/python/" },
            { label: "TypeScript", link: "/languages/typescript/" },
            { label: "Rust", link: "/languages/rust/" },
            { label: "R", link: "/languages/r/" },
            { label: "Julia", link: "/languages/julia/" },
            { label: "C#", link: "/languages/csharp/" },
            { label: "Go", link: "/languages/go/" },
          ],
        },
        {
          label: "Handler Development Guide",
          link: "/handler-development/",
        },
        sidebarGroup,
        {
          label: "Architecture",
          link: "/architecture/",
        },
        {
          label: "Contributing",
          link: "/contributing/",
        },
      ],
    }),
  ],
});
