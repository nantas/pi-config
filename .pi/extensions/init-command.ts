/**
 * init-command
 *
 * Pi extension that registers `/init` — a slash command that guides the LLM
 * to analyze the current repository and create or update AGENTS.md.
 *
 * The command injects a purpose-built prompt template into the conversation
 * as a user message. The LLM then uses Pi's built-in tools (read, bash,
 * grep, find, ls, write, edit) to investigate the repo and produce a
 * high-signal AGENTS.md file.
 *
 * Features:
 * - `/init` — full repository analysis and AGENTS.md creation/update
 * - `/init focus on <topic>` — scoped analysis via $ARGUMENTS injection
 * - Structural comparison with existing AGENTS.md (similar vs different)
 * - globalThis dedup + session_shutdown cleanup
 *
 * Spec: openspec/changes/init-command/specs/init-command/spec.md
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

// ---------------------------------------------------------------------------
// Prompt Template
// ---------------------------------------------------------------------------

/**
 * The prompt template that guides the LLM through repo analysis and
 * AGENTS.md creation/update. The `$ARGUMENTS` placeholder is replaced
 * with the user's focus argument at runtime.
 */
const PROMPT_TEMPLATE = `## Goal

Create or update the AGENTS.md file at the repository root. AGENTS.md is the primary instruction file that tells the coding agent how to work effectively in this repository. It should contain high-signal, repo-specific guidance that helps the agent avoid mistakes and follow conventions.

## User Focus

$ARGUMENTS

If the user provided a focus (e.g., "focus on testing configuration"), prioritize that area during analysis. If no focus is provided, perform a comprehensive analysis covering all standard dimensions.

## Investigation Strategy

Use Pi's built-in tools (read, bash, grep, find, ls) to systematically investigate the repository. Follow this priority order:

1. **README and project documentation** — Understand the project's purpose, structure, and conventions.
2. **Build configuration** — package.json, tsconfig.json, Makefile, CMakeLists.txt, Cargo.toml, pyproject.toml, go.mod, etc.
3. **Test configuration** — jest.config, vitest.config, pytest.ini, .mocharc, etc. Pay special attention to test framework, test patterns, and test commands.
4. **Linter and formatter configs** — .eslintrc, .prettierrc, biome.json, .golangci.yml, etc.
5. **CI/CD workflows** — .github/workflows/, .gitlab-ci.yml, Jenkinsfile, etc.
6. **Existing instruction files** — AGENTS.md, CLAUDE.md, CONTRIBUTING.md, README.md instructions sections.
7. **Representative source code** — A sampling of key source files to understand code style, module patterns, and conventions.

**Priority rule**: Config files and manifests over random leaf files. Executable sources (configs, scripts) over prose documentation when conflicts arise.

**Evidence rule**: Always use read, bash, grep, find, or ls to gather evidence. Do not speculate about repository structure or configuration.

## Extraction Targets

Extract and verify the following information:

- **Developer commands**: How to build, test, lint, format, type-check, and run the project. Which package manager is used?
- **Test commands**: Exact command(s) for running tests (unit, integration, e2e). Required command ordering? Any setup/teardown steps?
- **Monorepo boundaries**: Workspace structure, package boundaries, inter-package dependency rules.
- **Framework/toolchain quirks**: Known pitfalls, required version constraints, environment variables, platform-specific behavior.
- **Style conventions**: Naming conventions, import ordering, file organization patterns.
- **Testing gotchas**: Flaky tests, test fixtures, mocking patterns, test database setup/teardown.
- **CI-specific behavior**: What CI enforces that might differ from local development (e.g., strict lint rules, coverage thresholds).

## Question Handling

If you need clarification about the repository or user preferences, ask the user directly in the conversation. Do not use any special tools or commands to ask questions — just write your question as part of your normal response.

## Writing Rules for AGENTS.md

- Prefer short sections and bullet points.
- Exclude: generic advice, exhaustive file trees, obvious language conventions, speculative claims.
- Keep the file simple for simple repositories.
- Every command or convention must be verified against actual config files or source code.
- Use concrete, actionable language. Avoid vague guidance.

### Handling Existing AGENTS.md

If an AGENTS.md already exists at the repository root:

1. **Read it** using the read tool.
2. **Analyze its structure**: Does it have sections with similar headings to what you would produce? Are the types of guidance similar?
3. **If the structure is similar** (section-based, bullet-oriented, repo-specific guidance): Ask the user: "Existing AGENTS.md follows a similar structure. Update in-place preserving current sections?"
   - If confirmed: Preserve verified useful content, delete stale/unverifiable claims, reconcile with newly discovered codebase facts.
4. **If the structure is fundamentally different** (e.g., prose-heavy, narrative style, different section organization): Warn the user: "Existing AGENTS.md uses a fundamentally different structure. Continuing will rewrite the file entirely. Proceed?"
   - Only continue after explicit user confirmation.

### Creating AGENTS.md

If no AGENTS.md exists, create a fresh one with the extracted information. Use the write tool to create the file at the repository root.
`;

// ---------------------------------------------------------------------------
// Extension Entry Point
// ---------------------------------------------------------------------------

export default function (pi: ExtensionAPI): void {
  // ---- Self-dedup ----
  // Prevents duplicate registration when loaded from both project-local
  // (.pi/extensions/) and global (~/.pi/agent/extensions/). Uses
  // session-scoped key so /new always gets a fresh dedup domain.
  const _key = "__pi_ext_init_command_loaded";
  const SESSION_COUNTER = "__pi_ext_session_counter";

  const sessionId = (globalThis as any)[SESSION_COUNTER] ?? 0;
  const sessionKey = `${_key}_session_${sessionId}`;

  if ((globalThis as any)[sessionKey]) return;
  (globalThis as any)[sessionKey] = true;

  pi.on("session_shutdown", () => {
    (globalThis as any)[SESSION_COUNTER] = ((globalThis as any)[SESSION_COUNTER] ?? 0) + 1;
  });

  // ---- Register /init command ----
  pi.registerCommand("init", {
    description: "Initialize or update AGENTS.md for this repository",
    handler: async (args, ctx) => {
      // Build the prompt, injecting $ARGUMENTS
      const focusText =
        args && args.trim()
          ? `The user requested focus on: "${args.trim()}"\n\nPrioritize this area during your analysis while still covering other relevant aspects of the repository.`
          : "No specific focus provided. Perform a comprehensive analysis covering all standard dimensions.";

      const prompt = PROMPT_TEMPLATE.replace("$ARGUMENTS", focusText);

      // Notify the user that analysis is starting
      ctx.ui.notify(
        args && args.trim()
          ? `/init: Analyzing repository (focus: "${args.trim()}")...`
          : "/init: Starting comprehensive repository analysis...",
        "info",
      );

      // Wait for the agent to be idle before sending the message
      if (!ctx.isIdle()) {
        await ctx.waitForIdle();
      }

      // Inject the prompt as a user message to trigger the LLM analysis
      pi.sendUserMessage(prompt);
    },
  });
}
