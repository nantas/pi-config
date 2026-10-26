# just-agent-lab — Approved Recipe set for the restricted just-worker agent.
# Recipes marked [metadata("agent:approved")] are runnable via the `just` tool.
# Recipe growth is driven by observed recurring capability gaps, not speculation.

# List available recipes (default; not agent-approved).
[private]
default:
    @just --list

# Working-tree status, read-only.
[metadata("agent:approved")]
status:
    git status --short

# Unstaged diff, read-only.
[metadata("agent:approved")]
diff:
    git --no-pager diff

# Run the just-agent-lab focused tests only.
[metadata("agent:approved")]
test:
    node --test tests/just-agent-lab.test.mjs

# Strict, non-interactive OpenSpec validation of open changes (pre-existing
# formal specs use a legacy header format that fails strict mode).
[metadata("agent:approved")]
validate-openspec:
    openspec validate --changes --strict --no-interactive

# Ephemeral Pi extension load check. Path must resolve inside .pi/extensions and end with .ts.
[metadata("agent:approved")]
check-extension path:
    #!/usr/bin/env bash
    set -euo pipefail
    target="$(realpath {{quote(path)}})"
    root="$(realpath ".pi/extensions")"
    case "$target" in
        "$root"/*) ;;
        *) echo "ERROR: check-extension path must resolve under $root (got: $target)"; exit 1 ;;
    esac
    case "$target" in
        *.ts) ;;
        *) echo "ERROR: check-extension supports only .ts targets (got: $target)"; exit 1 ;;
    esac
    pi --no-extensions -e "$target" -p --no-session </dev/null

# Aggregate verification: focused tests + strict OpenSpec validation.
[metadata("agent:approved")]
verify: test validate-openspec
