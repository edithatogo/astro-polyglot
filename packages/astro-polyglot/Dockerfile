FROM node:22-alpine@sha256:1314fb30ec37592d5845e5a160d522c0e680972aa534549940b8d73bde88481a AS base

RUN corepack enable && corepack prepare pnpm@10 --activate

WORKDIR /app

# Copy root workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy package manifests for all workspaces (for dependency resolution)
COPY packages/astro-polyglot/package.json packages/astro-polyglot/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/astro-polyglot/ packages/astro-polyglot/

# Build
RUN pnpm --filter astro-polyglot build

# Run handler tests in containerized environment
CMD ["pnpm", "--filter", "astro-polyglot", "test"]
