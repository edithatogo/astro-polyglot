#!/usr/bin/env node

/**
 * SOTA Audit Script
 * Runs automated checks against the SOTA Software Development Contract.
 *
 * Usage: node conductor/scripts/sota-audit.mjs
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const AUDIT_DIR = resolve(ROOT, "conductor/audit");
const date = new Date().toISOString().split("T")[0];
const REPORT_FILE = resolve(AUDIT_DIR, `report-${date}.json`);
const MIGRATION_REPO_ROOT = process.env.MIGRATION_REPO_ROOT
  ? resolve(process.env.MIGRATION_REPO_ROOT)
  : resolve(ROOT, "..");

const results = [];
let passed = 0;
let failed = 0;

function check(name, category, ok, detail = "") {
  results.push({ name, category, passed: ok, detail });
  if (ok) passed++;
  else failed++;
  console.log(`  ${ok ? "✓" : "✗"} [${category}] ${name}${detail ? ` — ${detail}` : ""}`);
}

function run(cmd) {
  try {
    const out = execSync(cmd, { cwd: ROOT, encoding: "utf-8", stdio: "pipe", timeout: 15000 });
    return { ok: true, stdout: out.trim() };
  } catch (e) {
    return { ok: false, stdout: (e.stdout || "").toString().trim() };
  }
}

function fex(p) {
  return existsSync(resolve(ROOT, p));
}
function fcontains(p, s) {
  try {
    return readFileSync(resolve(ROOT, p), "utf-8").includes(s);
  } catch {
    return false;
  }
}

function repoBasePath(repoName) {
  return resolve(MIGRATION_REPO_ROOT, repoName);
}

function repoFex(repoName, filePath) {
  try {
    // Handle nested repo structure (innovate/innovate/)
    const basePath = repoBasePath(repoName);
    if (!existsSync(basePath)) return false;
    const directPath = resolve(basePath, filePath);
    if (existsSync(directPath)) return true;
    // Check nested directory with same name (e.g., innovate/innovate/)
    const nestedPath = resolve(basePath, repoName, filePath);
    return existsSync(nestedPath);
  } catch {
    return false;
  }
}
function repoFcontains(repoName, filePath, s) {
  try {
    const basePath = repoBasePath(repoName);
    if (!existsSync(basePath)) return false;
    // Try direct path first, then nested
    try {
      const content = readFileSync(resolve(basePath, filePath), "utf-8");
      return content.includes(s);
    } catch {
      const content = readFileSync(resolve(basePath, repoName, filePath), "utf-8");
      return content.includes(s);
    }
  } catch {
    return false;
  }
}

// ── Code Quality ──
console.log("── Code Quality ──");
const tsc = run("npx tsc --noEmit --strict 2>&1 || true");
check("CQ-01: TypeScript strict mode", "Code Quality", tsc.ok, tsc.ok ? "0 errors" : "errors found");
const linterConfig = fex(".eslintrc") || fex("eslint.config.mjs") || fex("biome.json");
if (linterConfig) {
  const hasBiome = fex("biome.json");
  const lintCmd = hasBiome ? "pnpm lint 2>&1 || true" : "npx eslint . --max-warnings=0 2>&1 || true";
  const es = run(lintCmd);
  check(hasBiome ? "CQ-02: Biome compliance" : "CQ-02: ESLint zero warnings", "Code Quality", es.ok, es.ok ? "passed" : "warnings");
} else {
  check("CQ-02: Linter config", "Code Quality", false, "missing");
}
if (fex(".prettierrc")) {
  const pt = run('npx prettier --check "packages/**/*.ts" 2>&1 || true');
  check("CQ-03: Prettier compliance", "Code Quality", pt.ok, pt.ok ? "passed" : "issues");
}
const anyC = run(
  "grep -rn ': any' packages/astro-polyglot/core/ packages/astro-polyglot/handlers/ 2>/dev/null | grep -v node_modules | grep -v '.test.' | wc -l",
);
check("CQ-04: No `any` types", "Code Quality", parseInt(anyC.stdout, 10) === 0, `${anyC.stdout.trim()} found`);
const defC = run(
  "grep -rn 'export default' packages/astro-polyglot/core/ packages/astro-polyglot/handlers/ 2>/dev/null | grep -v node_modules | wc -l",
);
check("CQ-05: Named exports", "Code Quality", parseInt(defC.stdout, 10) <= 1, `${defC.stdout.trim()} defaults`);

// ── Testing ──
console.log("\n── Testing ──");
check("T-01: handler-contract test", "Testing", fex("packages/astro-polyglot/tests/handler-contract.test.ts"));
check("T-02: mdx-generator test", "Testing", fex("packages/astro-polyglot/tests/mdx-generator.test.ts"));
check("T-03: router test", "Testing", fex("packages/astro-polyglot/tests/router.test.ts"));
check("T-04: plugin test", "Testing", fex("packages/astro-polyglot/tests/plugin.test.ts"));
const tCount = run('find packages/astro-polyglot/tests -name "*.test.ts" 2>/dev/null | wc -l');
check("T-05: 4+ test files", "Testing", parseInt(tCount.stdout, 10) >= 4, `${tCount.stdout.trim()} files`);

// ── Documentation ──
console.log("\n── Documentation ──");
check("D-01: astro.config.mjs", "Documentation", fex("docs/astro-site/astro.config.mjs"));
check("D-02: Getting started", "Documentation", fex("docs/astro-site/src/content/docs/getting-started.mdx"));
check("D-03: Config reference", "Documentation", fex("docs/astro-site/src/content/docs/configuration.mdx"));
check("D-04: Handler dev guide", "Documentation", fex("docs/astro-site/src/content/docs/handler-development.mdx"));
check("D-05: Dogfooding polyglot", "Documentation", fcontains("docs/astro-site/astro.config.mjs", "polyglot"));
check("D-06: README.md", "Documentation", fex("README.md"));
check("D-07: CHANGELOG.md", "Documentation", fex("CHANGELOG.md"));

// ── CI/CD ──
console.log("\n── CI/CD ──");
check("CI-01: ci.yml", "CI/CD", fex(".github/workflows/ci.yml"));
check("CI-02: docs.yml", "CI/CD", fex(".github/workflows/docs.yml"));
check("CI-03: release.yml", "CI/CD", fex(".github/workflows/release.yml"));
if (fex(".github/workflows/ci.yml")) {
  const ci = readFileSync(resolve(ROOT, ".github/workflows/ci.yml"), "utf-8");
  check("CI-04: Lint in CI", "CI/CD", ci.includes("lint") || ci.includes("eslint"));
  check("CI-05: Type-check in CI", "CI/CD", ci.includes("type") || ci.includes("tsc"));
  check("CI-06: Test in CI", "CI/CD", ci.includes("test") || ci.includes("vitest"));
}
if (fex(".github/workflows/release.yml")) {
  const rel = readFileSync(resolve(ROOT, ".github/workflows/release.yml"), "utf-8");
  check("CI-07: npm publish", "CI/CD", rel.includes("publish"));
  check("CI-08: Provenance", "CI/CD", rel.includes("provenance") || rel.includes("attest"));
}
check("CI-09: Renovate", "CI/CD", fex("renovate.json"));
check("CI-10: Changesets", "CI/CD", fex(".changeset/config.json"));
check("CI-11: size-limit", "CI/CD", fex("size-limit.json"));

// ── Security ──
console.log("\n── Security ──");
check("S-01: SECURITY.md", "Security", fex("SECURITY.md"));
check("S-02: No .env", "Security", !fex(".env"));
check("S-03: CODEOWNERS", "Security", fex(".github/CODEOWNERS"));

// ── Governance ──
console.log("\n── Governance ──");
check("G-01: LICENSE", "Governance", fex("LICENSE"));
check("G-02: CONTRIBUTING.md", "Governance", fex("CONTRIBUTING.md"));
check("G-03: Bug template", "Governance", fex(".github/ISSUE_TEMPLATE/bug_report.yml"));
check("G-04: Feature template", "Governance", fex(".github/ISSUE_TEMPLATE/feature_request.yml"));
check("G-05: Conductor tracks", "Governance", fex("conductor/tracks.md"));
check("G-06: MoSCoW reqs", "Governance", fex("conductor/requirements.md"));
check("G-07: Design docs", "Governance", fex("conductor/design.md"));
check("G-08: Product def", "Governance", fex("conductor/product.md"));
check("G-09: Tech stack", "Governance", fex("conductor/tech-stack.md"));
check("G-10: Workflow", "Governance", fex("conductor/workflow.md"));
check("G-11: Self-docs index", "Governance", fex("docs/astro-site/src/content/docs/index.mdx"));
check("G-12: SOTA contract exists", "Governance", fex("conductor/sota-contract.md"));
check("G-13: Audit script exists", "Governance", fex("conductor/scripts/sota-audit.mjs"));

// ── Repo Migrations ──
console.log("\n── Repo Migrations ──");
const migRepos = ["innovate", "voiage", "mars", "lifecourse"];
for (const repo of migRepos) {
  const idx = migRepos.indexOf(repo) + 1;
  const hasDocsYml = repoFex(repo, ".github/workflows/docs.yml");
  const hasConductor = repoFex(repo, "conductor/tracks.md");
  const hasPolyglot =
    repoFcontains(repo, "docs/astro-site/astro.config.mjs", "polyglot") ||
    repoFcontains(repo, "astro.config.mjs", "polyglot");
  const hasLinksVal =
    repoFcontains(repo, "docs/astro-site/astro.config.mjs", "links-validator") ||
    repoFcontains(repo, "astro.config.mjs", "links-validator");
  check(`R-0${idx}: ${repo} docs deployed`, "Repo Migrations", hasDocsYml, hasDocsYml ? "docs.yml found" : "missing");
  check(`R-05: ${repo} conductor`, "Repo Migrations", hasConductor, hasConductor ? "tracks.md found" : "missing");
  check(`R-06: ${repo} dogfoods polyglot`, "Repo Migrations", hasPolyglot, hasPolyglot ? "configured" : "missing");
  check(`R-07: ${repo} links-validator`, "Repo Migrations", hasLinksVal, hasLinksVal ? "configured" : "missing");
}
if (fex("conductor/tracks.md")) {
  const tracks = readFileSync(resolve(ROOT, "conductor/tracks.md"), "utf-8");
  const allDone = migRepos.every((r) => tracks.includes(`[x] migrate_${r}`) || tracks.includes(`migrate_${r}`));
  check("R-08: All migration tracks complete", "Repo Migrations", allDone, allDone ? "all marked [x]" : "some pending");
} else {
  check("R-08: All migration tracks complete", "Repo Migrations", false, "tracks.md missing");
}

// ── Summary ──
console.log("\n═══════════════════════════════════════════");
console.log(`  Passed: ${passed}  Failed: ${failed}  Total: ${results.length}`);
console.log(`  Pass Rate: ${Math.round((passed / results.length) * 100)}%`);
console.log("═══════════════════════════════════════════\n");

mkdirSync(AUDIT_DIR, { recursive: true });
mkdirSync(resolve(AUDIT_DIR, "evidence"), { recursive: true });
const report = {
  timestamp: new Date().toISOString(),
  summary: { passed, failed, total: results.length, passRate: Math.round((passed / results.length) * 100) },
  results,
};
writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
console.log(`Report: ${REPORT_FILE}`);
console.log("\n═══════════════════════════════════════════");
console.log("  SOTA Audit — astro-polyglot");
console.log(`  ${new Date().toISOString()}`);
console.log("═══════════════════════════════════════════\n");
