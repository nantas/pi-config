# Issue tracker: OpenSpec

This repository uses **OpenSpec** as its task and change tracking system. All change proposals, specs, designs, tasks, and verification artifacts live under `openspec/`.

## Conventions

- **Change proposals**: `openspec/changes/<slug>/` — each contains:
  - `proposal.md` — problem statement and scope
  - `design.md` — technical design decisions
  - `tasks.md` — numbered, checkable implementation tasks
  - `binding.md` — cross-repo binding declarations
  - `specs/` — delta specs for this change
- **Main specs**: `openspec/specs/<slug>/` — normative capability specifications
- **Backlog**: `openspec/pkg-backlog.md` — package evaluation records
- **Reports**: `openspec/reports/` — verification and analysis outputs
- **Governance**: `openspec/config.yaml`, `openspec/manifest.yaml`
- **Archive**: `openspec/changes/archive/` — completed changes moved here after archive

## Mandatory: Use the official OpenSpec workflow

**All operations on OpenSpec artifacts MUST go through the official workflow.** Do not manually create, edit, or move openspec files — always use the CLI and prompt-driven skills below.

### CLI commands

| Command | Purpose |
|---------|---------|
| `openspec new change <name>` | Create a scaffolded change directory |
| `openspec status --change <name>` | Show artifact completion status |
| `openspec instructions <artifact> --change <name>` | Get enriched template/context for an artifact |
| `openspec list` | List active changes |
| `openspec show <name>` | View a change in detail |
| `openspec validate <name>` | Validate a change's artifacts |
| `openspec archive <name>` | Archive a completed change |
| `openspec spec` / `openspec schema` | Manage specs and schemas |

### Prompt-driven skills (preferred entry points)

These skills wrap the CLI into guided workflows. **Use them instead of running CLI commands directly when a matching skill exists.**

| Skill | Purpose |
|-------|---------|
| `/opsx-new` | Start a new change (scaffold only, no artifacts) |
| `/opsx-continue` | Create the next artifact for an existing change |
| `/opsx-ff` | Fast-forward: create all artifacts needed for implementation |
| `/opsx-propose` | Create change + all artifacts in one step |
| `/opsx-apply` | Implement tasks from a change |
| `/opsx-verify` | Verify implementation matches artifacts |
| `/opsx-archive` | Archive a completed change (with optional spec sync) |
| `/opsx-sync` | Sync delta specs from a change to main specs |
| `/opsx-explore` | Think through ideas without implementing (no artifacts required) |

### What "publish to the issue tracker" means

When a skill asks to publish to the issue tracker, use `/opsx-new` or `/opsx-propose` to create a change through the official workflow. Do not create files manually under `openspec/changes/`.

### What "fetch the relevant ticket" means

Read the files at `openspec/changes/<slug>/`. The user will normally provide the slug or path directly. Use `openspec show <name>` for a structured view.

## Workflow schemas

This project uses the `orbitos-change-v1` schema by default, with the artifact sequence:

```
binding → proposal → specs → design → tasks → verification → writeback
```

The `spec-driven` schema is also available as a simpler alternative:

```
proposal → specs → design → tasks
```

Use `openspec schemas` to list all available schemas.
