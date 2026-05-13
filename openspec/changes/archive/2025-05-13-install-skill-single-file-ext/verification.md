# Verification: install-skill-single-file-ext

## Change Summary

Add single-file extension (`.ts`) support to the `install-from-pi-config` skill, covering source type detection, overwrite handling, npm dependency resolution, and installation verification.

## Verification Checkpoints

### VC-1: Phase 4 — Source Type Auto-Detection

**Requirement:** `extension-source-type-detection`

| Check | Expected | Status |
|-------|----------|--------|
| Single-file source detected | `[[ -f "$SOURCE_REPO/.pi/extensions/$NAME.ts" ]]` triggers `cp` | ✅ |
| Directory source detected | `[[ -d "$SOURCE_REPO/.pi/extensions/$NAME" ]]` triggers `cp -R` | ✅ |
| Source not found | Error message with both checked paths printed, `return 1` | ✅ |

### VC-2: Phase 4 — Single-File Overwrite Handling

**Requirement:** `single-file-overwrite-handling`

| Check | Expected | Status |
|-------|----------|--------|
| Target file exists | Prompts "Overwrite? (yes/no)", skips on non-yes | ✅ |
| Target file does not exist | Copies directly without prompt | ✅ |

### VC-3: Phase 5 — npm Dependency Resolution for Single-File Extensions

**Requirement:** `post-install-dep-resolution`

| Check | Expected | Status |
|-------|----------|--------|
| Import extraction | `grep -oP` extracts package names from `from '...'` syntax | ✅ |
| Node.js built-in exclusion | `grep -v '^node:'` skips `node:fs`, `node:path`, etc. | ✅ |
| Relative import exclusion | `grep -v '^\.'` + regex excludes `./` and `../` imports | ✅ |
| Scoped package support | Regex captures `@scope/pkg` via `@?[^"\'./]+[^"\']*` | ✅ |
| Batch install | `npm install "${PKG_LIST[@]}"` installs all packages in one call | ✅ |
| Package already installed | npm handles dedup natively | ✅ |

### VC-4: Phase 6 — Single-File Verification

**Requirement:** `single-file-verification`

| Check | Expected | Status |
|-------|----------|--------|
| Single-file check | `[[ -f ".pi/extensions/{{name}}.ts" ]]` as valid verification | ✅ |
| Coexists with directory check | Original `index.ts`/`index.js` checks retained | ✅ |

## Internal Consistency

| Aspect | Status |
|--------|--------|
| Workflow Overview table updated for Phase 5 | ✅ |
| No orphan references to removed phases | ✅ |
| All code blocks use consistent variable names | ✅ |
| Phase order: Phase 4 (install) → Phase 5 (deps) → Phase 6 (verify) maintained | ✅ |

## Verification Method

This change modifies a skill document (SKILL.md), not executable code. Verification is performed by:
1. **Spec coverage trace** — each requirement scenario mapped to SKILL.md code block
2. **Internal consistency check** — workflow table, phase ordering, variable naming
3. **No runtime testing required** — skill is agent guidance, executed adaptively by the LLM

## Result

**PASS** — All 4 requirement groups covered. SKILL.md is self-consistent and accurately reflects the spec delta.
